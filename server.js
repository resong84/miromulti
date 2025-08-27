// server.js

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(cors({
  origin: "https://miromulti.pages.dev" 
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://miromulti.pages.dev",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

let players = {};
let rooms = {};
let playerRooms = {};

const CHARACTER_LIST = ['🐎', '🐇', '🐢', '🐕', '🐈', '🐅'];

const createPlayerObject = (socketId, nickname, isMaster = false) => ({
    id: socketId,
    nickname: nickname,
    isMaster: isMaster,
    isReady: false,
    character: null,
    hasProblem: false,
});


const updateLobbyState = (roomId) => {
    if (rooms[roomId]) {
        io.to(roomId).emit('lobbyStateUpdate', rooms[roomId]);
    }
};

const broadcastRoomList = () => {
    const roomList = Object.values(rooms)
        .filter(room => !room.gameStarted)
        .map(room => ({
            id: room.id,
            playerCount: Object.keys(room.players).length,
            maxPlayers: room.maxPlayers
        }));
    io.emit('roomListUpdate', roomList);
};

const resetRoomForNewGame = (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    console.log(`[진단] ${roomId} 방의 게임 상태를 초기화합니다.`);
    if (room.forceStartTimer) {
        clearTimeout(room.forceStartTimer);
        room.forceStartTimer = null;
    }
    if (room.timeoutId) {
        clearTimeout(room.timeoutId);
        room.timeoutId = null;
    }
    room.gameStarted = false;
    room.finishers = [];
    
    Object.values(room.players).forEach(player => {
        player.isReady = false;
        player.hasProblem = false;
    });

    updateLobbyState(roomId);
    broadcastRoomList();
};

const startGame = (roomId) => {
    const room = rooms[roomId];
    if (!room || room.gameStarted) return;

    const master = Object.values(room.players).find(p => p.isMaster);
    if (!master || !master.character) {
        console.log(`[진단] 방장이 캐릭터를 선택하지 않아 ${roomId} 게임 시작이 취소되었습니다.`);
        return;
    }

    const gameData = room.lastGameData;
    if (!gameData) {
        console.error(`${roomId} 방의 게임 데이터가 없어 자동 시작에 실패했습니다.`);
        return;
    }

    room.gameStarted = true;
    broadcastRoomList();
    io.to(roomId).emit('gameCountdown');
    
    setTimeout(() => {
        console.log(`[진단] ${roomId} 방 게임 시작!`);
        gameData.players = room.players;
        io.to(roomId).emit('gameStartingWithData', gameData);
    }, 5000);
};

const checkAndHandleGameStartConditions = (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    if (room.forceStartTimer) {
        clearTimeout(room.forceStartTimer);
        room.forceStartTimer = null;
    }

    const guests = Object.values(room.players).filter(p => !p.isMaster);
    const readyGuestsCount = guests.filter(p => p.isReady).length;
    const totalGuestsCount = guests.length;
    const master = Object.values(room.players).find(p => p.isMaster);

    if (totalGuestsCount === 0 || !master || !master.character) {
        return;
    }

    if (readyGuestsCount === totalGuestsCount) {
        console.log(`[진단] ${roomId} 방의 모든 게스트가 준비 완료. 5초 후 자동 시작합니다.`);
        io.to(roomId).emit('forceStartCountdown', { type: 'auto' });
        room.forceStartTimer = setTimeout(() => {
            startGame(roomId);
        }, 5000);
        return;
    }

    if (totalGuestsCount > 1 && readyGuestsCount === totalGuestsCount - 1) {
        console.log(`[진단] ${roomId} 방의 N-1명 게스트가 준비 완료. 5초 후 방장에게 시작 권한을 부여합니다.`);
        io.to(roomId).emit('forceStartCountdown', { type: 'manual' });
        room.forceStartTimer = setTimeout(() => {
            if (rooms[roomId] && !rooms[roomId].gameStarted) {
                io.to(master.id).emit('masterCanStart');
            }
        }, 5000);
    }
};


const endGame = (roomId, timedOut) => {
    const room = rooms[roomId];
    if (!room || !room.gameStarted) return;

    const finalRankings = [...room.finishers];
    finalRankings.sort((a, b) => a.rank - b.rank);

    const finisherIds = new Set(room.finishers.map(p => p.id));
    const allPlayerIds = Object.keys(room.players);
    
    let retireRank = finalRankings.length + 1;
    allPlayerIds.forEach(playerId => {
        if (!finisherIds.has(playerId)) {
            finalRankings.push({
                id: playerId,
                rank: retireRank,
                nickname: players[playerId]?.nickname || 'Unknown',
                finishTime: 'retire'
            });
        }
    });

    const finalData = {
        clearTime: room.finishers[0]?.finishTime || 'N/A',
        mazeSize: `${room.settings.width} x ${room.settings.height}`,
        rankings: finalRankings
    };

    io.to(roomId).emit('gameOver', finalData);
    resetRoomForNewGame(roomId);
};

const handlePlayerLeave = (socket) => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    if (room) {
        const disconnectedPlayer = room.players[socket.id];
        const wasMaster = disconnectedPlayer?.isMaster;

        delete room.players[socket.id];
        room.playerCount--;

        if (room.playerCount === 0) {
            if (room.forceStartTimer) clearTimeout(room.forceStartTimer);
            if (room.timeoutId) clearTimeout(room.timeoutId);
            delete rooms[roomId];
            console.log(`[진단] ${roomId} 방이 비어서 삭제됨.`);
        } else {
            if (wasMaster) {
                const newMasterId = Object.keys(room.players)[0];
                if(newMasterId) {
                    room.players[newMasterId].isMaster = true;
                    console.log(`[진단] ${newMasterId}가 새로운 방장이 됨.`);
                }
            }

            if (room.gameStarted && room.playerCount === room.finishers.length) {
                console.log(`[진단] 플레이어(${socket.id}) 퇴장 후, 남은 인원이 모두 완주하여 ${roomId} 게임 종료.`);
                endGame(roomId, false);
            } else {
                 updateLobbyState(roomId);
                 checkAndHandleGameStartConditions(roomId);
            }
        }
        broadcastRoomList();
    }
    delete playerRooms[socket.id];
};


io.on('connection', (socket) => {
  console.log(`[진단] 플레이어 접속 성공: ${socket.id}`);

  players[socket.id] = { id: socket.id, nickname: `Player_${socket.id.substring(0,4)}` };
  
  socket.on('setNickname', ({ nickname }) => {
      if (players[socket.id]) {
          players[socket.id].nickname = nickname;
      }
  });

  socket.on('createGame', (settings) => {
    const roomId = uuidv4().substring(0, 6);
    socket.join(roomId);
    playerRooms[socket.id] = roomId;

    rooms[roomId] = {
        id: roomId,
        players: { [socket.id]: createPlayerObject(socket.id, players[socket.id].nickname, true) },
        settings: settings,
        gameStarted: false,
        finishers: [],
        playerCount: 1,
        maxPlayers: 4,
        timeoutId: null,
        forceStartTimer: null,
        lastGameData: null
    };
    console.log(`[진단] 방 생성됨: ${roomId}`);
    socket.emit('roomCreated', { roomId });
    updateLobbyState(roomId);
    broadcastRoomList();
  });

  socket.on('joinGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && !room.gameStarted) {
        if (room.playerCount >= room.maxPlayers) {
            socket.emit('joinError', { message: '방이 가득 찼습니다.' });
            return;
        }

        socket.join(roomId);
        playerRooms[socket.id] = roomId;
        room.players[socket.id] = createPlayerObject(socket.id, players[socket.id].nickname, false);
        room.playerCount++;
        
        console.log(`[진단] ${socket.id}가 ${roomId} 방에 참여함.`);
        socket.emit('joinSuccess', { room });
        updateLobbyState(roomId);
        broadcastRoomList();
    } else {
        socket.emit('joinError', { message: '참여할 수 없는 방입니다.' });
    }
  });

  socket.on('leaveRoom', () => {
    handlePlayerLeave(socket);
  });

  socket.on('requestRoomList', () => {
    broadcastRoomList();
  });

  socket.on('selectCharacter', ({ character }) => {
      const roomId = playerRooms[socket.id];
      const room = rooms[roomId];
      if (!room) return;

      const player = room.players[socket.id];
      if (!player) return;

      const isCharacterTaken = Object.values(room.players).some(p => p.character === character && p.id !== socket.id);
      
      if (!isCharacterTaken && CHARACTER_LIST.includes(character)) {
          player.character = character;
          player.hasProblem = false; // 캐릭터를 바꾸는 행위는 문제가 해결된 것으로 간주
          updateLobbyState(roomId);
          checkAndHandleGameStartConditions(roomId);
      }
  });

  socket.on('playerReady', () => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    const player = room?.players[socket.id];
    if (player && player.character) {
        player.isReady = !player.isReady;
        player.hasProblem = false; // 준비/준비 취소 시 문제 상태 해제
        updateLobbyState(roomId);
        checkAndHandleGameStartConditions(roomId);
    }
  });

  socket.on('settingsChanged', (newSettings) => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    if (room && room.players[socket.id]?.isMaster) {
        if (room.forceStartTimer) {
            clearTimeout(room.forceStartTimer);
            room.forceStartTimer = null;
        }
        room.settings = newSettings;
        Object.values(room.players).forEach(player => { 
            player.isReady = false;
            player.hasProblem = false;
        });
        updateLobbyState(roomId);
    }
  });

  socket.on('resetLobby', () => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    if (room && room.players[socket.id]?.isMaster) {
        console.log(`[진단] 방장(${socket.id})이 ${roomId} 로비를 초기화합니다.`);
        Object.values(room.players).forEach(p => {
            p.isReady = false;
            p.hasProblem = false;
        });
        if (room.forceStartTimer) {
            clearTimeout(room.forceStartTimer);
            room.forceStartTimer = null;
        }
        updateLobbyState(roomId);
    }
  });

  socket.on('reportProblem', () => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    const player = room?.players[socket.id];
    if (player && !player.isMaster) {
        player.hasProblem = !player.hasProblem;
        updateLobbyState(roomId);
    }
  });

  socket.on('gameDataReady', (data) => {
      const roomId = playerRooms[socket.id];
      const room = rooms[roomId];
      if (room && room.players[socket.id]?.isMaster) {
          room.lastGameData = data;
          
          if (room.forceStartTimer) {
              clearTimeout(room.forceStartTimer);
              room.forceStartTimer = null;
          }
          startGame(roomId);
      }
  });

  socket.on('playerFinished', ({ finishTime }) => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    if (room && room.gameStarted && !room.finishers.some(p => p.id === socket.id)) {
        const rank = room.finishers.length + 1;
        room.finishers.push({ id: socket.id, rank, nickname: players[socket.id].nickname, finishTime });
        
        if (room.finishers.length === 1 && room.playerCount > 1) {
            console.log(`[진단] ${roomId} 방의 첫번째 플레이어 도착. 20초 카운트다운 시작.`);
            room.timeoutId = setTimeout(() => {
                console.log(`[진단] ${roomId} 방 20초 시간 초과. 게임을 종료합니다.`);
                endGame(roomId, true);
            }, 20000); 
        }

        if (room.finishers.length === room.playerCount) {
             console.log(`[진단] ${roomId} 방의 모든 플레이어 도착. 게임을 종료합니다.`);
            if (room.timeoutId) {
                clearTimeout(room.timeoutId);
            }
            endGame(roomId, false);
        }
    }
  });

  socket.on('playerMovement', (movementData) => {
    const roomId = playerRooms[socket.id];
    const player = players[socket.id];
    const roomPlayer = rooms[roomId]?.players[socket.id];
    if (roomId && player && roomPlayer) {
        socket.to(roomId).emit('playerMoved', { 
            id: socket.id, 
            character: roomPlayer.character,
            ...movementData 
        });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[진단] 플레이어 접속 해제: ${socket.id}`);
    handlePlayerLeave(socket);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});