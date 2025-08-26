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

const resetRoomForRematch = (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    room.gameStarted = false;
    room.gameEnded = false;
    room.finishers = [];
    if (room.timeoutId) {
        clearTimeout(room.timeoutId);
        room.timeoutId = null;
    }
    Object.values(room.players).forEach(player => {
        player.isReady = false;
    });

    console.log(`[진단] ${roomId} 방이 리매치를 위해 초기화되었습니다.`);
    broadcastRoomList();
    io.to(roomId).emit('returnToLobby', room);
};


const endGame = (roomId, timedOut) => {
    const room = rooms[roomId];
    if (!room || room.gameEnded) return;
    room.gameEnded = true;

    const finalRankings = [...room.finishers];
    finalRankings.sort((a, b) => a.rank - b.rank);

    if (timedOut) {
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
    }

    const finalData = {
        clearTime: room.finishers[0]?.finishTime || 'N/A',
        mazeSize: `${room.settings.width} x ${room.settings.height}`,
        rankings: finalRankings
    };

    io.to(roomId).emit('gameOver', finalData);
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
        players: { [socket.id]: { id: socket.id, isReady: false, isMaster: true, nickname: players[socket.id].nickname, character: null } },
        settings: settings,
        gameStarted: false,
        gameEnded: false,
        finishers: [],
        playerCount: 1,
        maxPlayers: 4,
        availableCharacters: [...CHARACTER_LIST],
        timeoutId: null
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
        room.players[socket.id] = { id: socket.id, isReady: false, isMaster: false, nickname: players[socket.id].nickname, character: null };
        room.playerCount++;
        
        console.log(`[진단] ${socket.id}가 ${roomId} 방에 참여함.`);
        socket.emit('joinSuccess', { room });
        updateLobbyState(roomId);
        broadcastRoomList();
    } else {
        socket.emit('joinError', { message: '참여할 수 없는 방입니다.' });
    }
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

      const isCharacterTaken = Object.values(room.players).some(p => p.character === character);
      if (!isCharacterTaken && CHARACTER_LIST.includes(character)) {
          if (player.character) {
              room.availableCharacters.push(player.character);
          }
          player.character = character;
          room.availableCharacters = room.availableCharacters.filter(c => c !== character);
          
          if(players[socket.id]) {
              players[socket.id].character = character;
          }

          updateLobbyState(roomId);
      }
  });

  socket.on('playerReady', ({ isReady }) => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    const player = room?.players[socket.id];
    if (player) {
        if (isReady && !player.character) {
            return; 
        }
        player.isReady = isReady;
        updateLobbyState(roomId);
    }
  });

  socket.on('settingsChanged', (newSettings) => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    if (room && room.players[socket.id]?.isMaster) {
        room.settings = newSettings;
        Object.values(room.players).forEach(player => { player.isReady = false; });
        io.to(roomId).emit('unReadyAllPlayers');
        updateLobbyState(roomId);
    }
  });

  socket.on('gameDataReady', (data) => {
      const roomId = playerRooms[socket.id];
      const room = rooms[roomId];
      if (room && room.players[socket.id]?.isMaster) {
          if (!room.players[socket.id].character) return;

          const guests = Object.values(room.players).filter(p => !p.isMaster);
          if (guests.every(p => p.isReady)) {
              room.gameStarted = true;
              room.gameEnded = false;
              broadcastRoomList();
              io.to(roomId).emit('gameCountdown');
              
              setTimeout(() => {
                  console.log(`[진단] ${roomId} 방 게임 시작!`);
                  data.players = room.players;
                  io.to(roomId).emit('gameStartingWithData', data);
              }, 5000);
          }
      }
  });

  socket.on('playerFinished', ({ finishTime }) => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    if (room && room.gameStarted && !room.finishers.some(p => p.id === socket.id)) {
        const rank = room.finishers.length + 1;
        room.finishers.push({ id: socket.id, rank, nickname: players[socket.id].nickname, finishTime });
        
        // [추가] 다른 플레이어들에게 실시간 랭킹 업데이트 전송
        io.to(roomId).emit('rankingUpdate', room.finishers);

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

  socket.on('requestRematch', () => {
      const roomId = playerRooms[socket.id];
      if (rooms[roomId]) {
          resetRoomForRematch(roomId);
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

  socket.on('disconnect', () => {
    console.log(`[진단] 플레이어 접속 해제: ${socket.id}`);
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    if (room) {
        const disconnectedPlayer = room.players[socket.id];
        const wasMaster = disconnectedPlayer?.isMaster;

        if (disconnectedPlayer && disconnectedPlayer.character) {
            room.availableCharacters.push(disconnectedPlayer.character);
        }

        delete room.players[socket.id];
        room.playerCount--;

        if (room.playerCount === 0) {
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

            if (room.gameStarted && !room.gameEnded && room.playerCount === room.finishers.length) {
                console.log(`[진단] 플레이어(${socket.id}) 퇴장 후, 남은 인원이 모두 완주하여 ${roomId} 게임 종료.`);
                if (room.timeoutId) clearTimeout(room.timeoutId);
                endGame(roomId, false);
            } else {
                 updateLobbyState(roomId);
            }
        }
        broadcastRoomList();
    }
    delete players[socket.id];
    delete playerRooms[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});