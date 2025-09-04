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

const CHARACTER_LIST = [
    { id: 'horse', icon: '🐎' },
    { id: 'rabbit', icon: '🐇' },
    { id: 'turtle', icon: '🐢' },
    { id: 'dog', icon: '🐕' },
    { id: 'cat', icon: '🐈' },
    { id: 'tiger', icon: '🐅' },
    { id: 'mouse', icon: 'icon/mouse_standing.jpg' }
];
const CHARACTER_IDS = CHARACTER_LIST.map(c => c.id);


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

const calculateAndBroadcastCommonMaxSize = (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    const playersInRoom = Object.values(room.players);
    const validPlayers = playersInRoom.filter(p => p.maxWidth != null && p.maxHeight != null);

    if (validPlayers.length === 0) return;

    const commonMaxWidth = Math.min(...validPlayers.map(p => p.maxWidth));
    const commonMaxHeight = Math.min(...validPlayers.map(p => p.maxHeight));

    io.to(roomId).emit('updateCommonMaxSize', { maxWidth: commonMaxWidth, maxHeight: commonMaxHeight });
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

        if (disconnectedPlayer && disconnectedPlayer.character) {
            room.availableCharacters.push(disconnectedPlayer.character);
        }

        delete room.players[socket.id];

        if (Object.keys(room.players).length === 0) {
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

            if (room.gameStarted && Object.keys(room.players).length === room.finishers.length) {
                console.log(`[진단] 플레이어(${socket.id}) 퇴장 후, 남은 인원이 모두 완주하여 ${roomId} 게임 종료.`);
                endGame(roomId, false);
            } else {
                 updateLobbyState(roomId);
                 checkAndHandleGameStartConditions(roomId);
                 calculateAndBroadcastCommonMaxSize(roomId); // 인원 변경 시 재계산
            }
        }
        broadcastRoomList();
    }
    delete playerRooms[socket.id];
};


io.on('connection', (socket) => {
  console.log(`[진단] 플레이어 접속 성공: ${socket.id}`);

  players[socket.id] = { id: socket.id, x: 0, y: 0, nickname: `Player_${socket.id.substring(0,4)}`, character: null };
  
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
        players: { [socket.id]: { 
            id: socket.id, isReady: false, isMaster: true, 
            nickname: players[socket.id].nickname, character: null,
            maxWidth: null, maxHeight: null // 플레이어별 최대 크기 저장
        } },
        settings: settings,
        gameStarted: false,
        finishers: [],
        maxPlayers: 4,
        availableCharacters: [...CHARACTER_IDS],
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
        if (Object.keys(room.players).length >= room.maxPlayers) {
            socket.emit('joinError', { message: '방이 가득 찼습니다.' });
            return;
        }

        socket.join(roomId);
        playerRooms[socket.id] = roomId;
        room.players[socket.id] = { 
            id: socket.id, isReady: false, isMaster: false, 
            nickname: players[socket.id].nickname, character: null,
            maxWidth: null, maxHeight: null // 플레이어별 최대 크기 저장
        };
        
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
    const roomList = Object.values(rooms)
        .filter(room => !room.gameStarted)
        .map(room => ({
            id: room.id,
            playerCount: Object.keys(room.players).length,
            maxPlayers: room.maxPlayers
        }));
    socket.emit('roomListUpdate', roomList);
  });

  socket.on('reportMaxSize', ({ maxWidth, maxHeight }) => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    if (room && room.players[socket.id]) {
        room.players[socket.id].maxWidth = maxWidth;
        room.players[socket.id].maxHeight = maxHeight;
        calculateAndBroadcastCommonMaxSize(roomId);
    }
  });

  socket.on('selectCharacter', ({ character }) => {
      const roomId = playerRooms[socket.id];
      const room = rooms[roomId];
      if (!room) return;

      const player = room.players[socket.id];
      if (!player) return;

      const isCharacterTaken = Object.values(room.players).some(p => p.character === character);
      if (!isCharacterTaken && CHARACTER_IDS.includes(character)) {
          if (player.character) {
              room.availableCharacters.push(player.character);
          }
          player.character = character;
          room.availableCharacters = room.availableCharacters.filter(c => c !== character);
          
          if(players[socket.id]) {
              players[socket.id].character = character;
          }

          updateLobbyState(roomId);
          checkAndHandleGameStartConditions(roomId);
      }
  });

  socket.on('playerReady', () => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    const player = room?.players[socket.id];
    if (player) {
        if (!player.isReady && !player.character) {
            return; 
        }
        player.isReady = !player.isReady;
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
        Object.values(room.players).forEach(player => { player.isReady = false; });
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
        
        if (room.finishers.length === 1 && Object.keys(room.players).length > 1) {
            console.log(`[진단] ${roomId} 방의 첫번째 플레이어 도착. 20초 카운트다운 시작.`);
            room.timeoutId = setTimeout(() => {
                console.log(`[진단] ${roomId} 방 20초 시간 초과. 게임을 종료합니다.`);
                endGame(roomId, true);
            }, 20000); 
        }

        if (room.finishers.length === Object.keys(room.players).length) {
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
    if (roomId) {
        const player = players[socket.id];
        if (player) {
            socket.to(roomId).emit('playerMoved', { 
                id: socket.id, 
                character: player.character,
                ...movementData 
            });
        }
    }
  });

  // New Ability Handlers
  socket.on('useAbilityQ', () => {
    const roomId = playerRooms[socket.id];
    if (roomId) {
        socket.to(roomId).emit('abilityQUsed');
    }
  });

  socket.on('useAbilityW', () => {
    const roomId = playerRooms[socket.id];
    if (roomId) {
        socket.to(roomId).emit('abilityWUsed');
    }
  });

  socket.on('useAbilityE', () => {
    const roomId = playerRooms[socket.id];
    if (roomId) {
        socket.to(roomId).emit('abilityEUsed');
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