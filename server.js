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
            playerCount: Object.keys(room.players).length
        }));
    io.emit('roomListUpdate', roomList);
};

io.on('connection', (socket) => {
  console.log(`[진단] 플레이어 접속 성공: ${socket.id}`);

  players[socket.id] = { id: socket.id, x: 0, y: 0, nickname: `Player_${socket.id.substring(0,4)}` };
  
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
        players: { [socket.id]: { id: socket.id, isReady: false, isMaster: true, nickname: players[socket.id].nickname } },
        settings: { width: settings.width, height: settings.height },
        gameStarted: false,
        finishers: [],
        playerCount: 1
    };
    console.log(`[진단] 방 생성됨: ${roomId}`);
    socket.emit('roomCreated', { roomId });
    updateLobbyState(roomId);
    broadcastRoomList();
  });

  socket.on('joinGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && !room.gameStarted) {
        socket.join(roomId);
        playerRooms[socket.id] = roomId;
        room.players[socket.id] = { id: socket.id, isReady: false, isMaster: false, nickname: players[socket.id].nickname };
        room.playerCount++;
        
        console.log(`[진단] ${socket.id}가 ${roomId} 방에 참여함.`);
        socket.emit('joinSuccess');
        updateLobbyState(roomId);
        broadcastRoomList();
    } else {
        socket.emit('joinError', { message: '참여할 수 없는 방입니다.' });
    }
  });

  socket.on('requestRoomList', () => {
    const roomList = Object.values(rooms)
        .filter(room => !room.gameStarted)
        .map(room => ({
            id: room.id,
            playerCount: Object.keys(room.players).length
        }));
    socket.emit('roomListUpdate', roomList);
  });

  socket.on('playerReady', ({ isReady }) => {
    const roomId = playerRooms[socket.id];
    if (rooms[roomId]?.players[socket.id]) {
        rooms[roomId].players[socket.id].isReady = isReady;
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
          room.mazeData = data;
          if (Object.values(room.players).every(p => p.isReady)) {
              room.gameStarted = true;
              broadcastRoomList();
              io.to(roomId).emit('gameCountdown');
              
              setTimeout(() => {
                  console.log(`[진단] ${roomId} 방 게임 시작!`);
                  io.to(roomId).emit('gameStartingWithData', room.mazeData);
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
        
        if (room.finishers.length === room.playerCount) {
            const finalData = {
                clearTime: room.finishers[0].finishTime, // 1등의 클리어 시간
                mazeSize: `${room.settings.width} x ${room.settings.height}`,
                rankings: room.finishers
            };
            io.to(roomId).emit('gameOver', finalData);
            delete rooms[roomId];
        }
    }
  });

  socket.on('playerMovement', (movementData) => {
    const roomId = playerRooms[socket.id];
    if (roomId) {
        socket.to(roomId).emit('playerMoved', { id: socket.id, ...movementData });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[진단] 플레이어 접속 해제: ${socket.id}`);
    const roomId = playerRooms[socket.id];
    if (rooms[roomId]) {
        delete rooms[roomId].players[socket.id];
        rooms[roomId].playerCount--;
        if (Object.keys(rooms[roomId].players).length === 0) {
            delete rooms[roomId];
            console.log(`[진단] ${roomId} 방이 비어서 삭제됨.`);
        } else {
            updateLobbyState(roomId);
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