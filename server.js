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

io.on('connection', (socket) => {
  console.log(`[진단] 플레이어 접속 성공: ${socket.id}`);

  players[socket.id] = { id: socket.id, x: 0, y: 0 };
  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('createGame', (settings) => {
    const roomId = uuidv4().substring(0, 6); // 더 짧은 ID로 변경
    socket.join(roomId);
    playerRooms[socket.id] = roomId;

    rooms[roomId] = {
        id: roomId,
        players: {
            [socket.id]: { id: socket.id, isReady: false, isMaster: true }
        },
        settings: { width: settings.width, height: settings.height }
    };
    console.log(`[진단] 방 생성됨: ${roomId}, Master: ${socket.id}`);
    socket.emit('roomCreated', { roomId });
    updateLobbyState(roomId);
  });

  // 게임 참여 로직 추가
  socket.on('joinGame', ({ roomId }) => {
    if (rooms[roomId]) {
        socket.join(roomId);
        playerRooms[socket.id] = roomId;
        rooms[roomId].players[socket.id] = { id: socket.id, isReady: false, isMaster: false };
        
        console.log(`[진단] ${socket.id}가 ${roomId} 방에 참여함.`);
        socket.emit('joinSuccess');
        updateLobbyState(roomId); // 새로운 플레이어가 참여했음을 모두에게 알림
    } else {
        socket.emit('joinError', { message: '해당 방을 찾을 수 없습니다. ID를 다시 확인해주세요.' });
    }
  });

  socket.on('playerReady', ({ isReady }) => {
    const roomId = playerRooms[socket.id];
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
        rooms[roomId].players[socket.id].isReady = isReady;
        console.log(`[진단] ${socket.id} 준비 상태 변경: ${isReady}`);
        updateLobbyState(roomId);
    }
  });

  socket.on('settingsChanged', (newSettings) => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    if (room && room.players[socket.id] && room.players[socket.id].isMaster) {
        room.settings = newSettings;
        Object.values(room.players).forEach(player => {
            player.isReady = false;
        });
        console.log(`[진단] ${roomId} 방 설정 변경됨. 모든 플레이어 준비 취소.`);
        io.to(roomId).emit('unReadyAllPlayers');
        updateLobbyState(roomId);
    }
  });

  socket.on('startGame', () => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    if (room && room.players[socket.id] && room.players[socket.id].isMaster) {
        const allReady = Object.values(room.players).every(p => p.isReady);
        if (allReady) {
            console.log(`[진단] ${roomId} 방 게임 시작!`);
            io.to(roomId).emit('gameStarting', room.settings);
            delete rooms[roomId];
        }
    }
  });

  socket.on('playerMovement', (movementData) => {
    const player = players[socket.id] || {};
    player.x = movementData.x;
    player.y = movementData.y;
    socket.broadcast.emit('playerMoved', player);
  });

  socket.on('disconnect', () => {
    console.log(`[진단] 플레이어 접속 해제: ${socket.id}`);
    const roomId = playerRooms[socket.id];
    if (rooms[roomId]) {
        delete rooms[roomId].players[socket.id];
        if (Object.keys(rooms[roomId].players).length === 0) {
            delete rooms[roomId];
            console.log(`[진단] ${roomId} 방이 비어서 삭제됨.`);
        } else {
            updateLobbyState(roomId);
        }
    }
    delete players[socket.id];
    delete playerRooms[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});