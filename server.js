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

// 모든 클라이언트에게 현재 방 목록을 브로드캐스트하는 함수
const broadcastRoomList = () => {
    const roomList = Object.values(rooms).map(room => ({
        id: room.id,
        playerCount: Object.keys(room.players).length
    }));
    io.emit('roomListUpdate', roomList);
};

io.on('connection', (socket) => {
  console.log(`[진단] 플레이어 접속 성공: ${socket.id}`);

  players[socket.id] = { id: socket.id, x: 0, y: 0 };
  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('createGame', (settings) => {
    const roomId = uuidv4().substring(0, 6);
    socket.join(roomId);
    playerRooms[socket.id] = roomId;

    rooms[roomId] = {
        id: roomId,
        players: { [socket.id]: { id: socket.id, isReady: false, isMaster: true } },
        settings: { width: settings.width, height: settings.height }
    };
    console.log(`[진단] 방 생성됨: ${roomId}, Master: ${socket.id}`);
    socket.emit('roomCreated', { roomId });
    updateLobbyState(roomId);
    broadcastRoomList(); // 새 방이 생겼으므로 목록 전체 전파
  });

  socket.on('joinGame', ({ roomId }) => {
    if (rooms[roomId]) {
        socket.join(roomId);
        playerRooms[socket.id] = roomId;
        rooms[roomId].players[socket.id] = { id: socket.id, isReady: false, isMaster: false };
        
        console.log(`[진단] ${socket.id}가 ${roomId} 방에 참여함.`);
        socket.emit('joinSuccess');
        updateLobbyState(roomId);
        broadcastRoomList(); // 플레이어 수가 변경되었으므로 목록 전체 전파
    } else {
        socket.emit('joinError', { message: '해당 방을 찾을 수 없습니다.' });
    }
  });

  // 클라이언트가 방 목록을 요청할 때 현재 목록을 보내주는 핸들러
  socket.on('requestRoomList', () => {
    const roomList = Object.values(rooms).map(room => ({
        id: room.id,
        playerCount: Object.keys(room.players).length
    }));
    socket.emit('roomListUpdate', roomList);
  });

  socket.on('playerReady', ({ isReady }) => {
    const roomId = playerRooms[socket.id];
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
        rooms[roomId].players[socket.id].isReady = isReady;
        updateLobbyState(roomId);
    }
  });

  socket.on('settingsChanged', (newSettings) => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    if (room && room.players[socket.id] && room.players[socket.id].isMaster) {
        room.settings = newSettings;
        Object.values(room.players).forEach(player => { player.isReady = false; });
        io.to(roomId).emit('unReadyAllPlayers');
        updateLobbyState(roomId);
    }
  });

  socket.on('startGame', () => {
    const roomId = playerRooms[socket.id];
    const room = rooms[roomId];
    if (room && room.players[socket.id] && room.players[socket.id].isMaster) {
        if (Object.values(room.players).every(p => p.isReady)) {
            io.to(roomId).emit('gameStarting', room.settings);
            delete rooms[roomId];
            broadcastRoomList(); // 게임이 시작되어 방이 사라졌으므로 목록 전체 전파
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
        broadcastRoomList(); // 플레이어가 나가서 방이 사라지거나 인원이 변경됐으므로 목록 전파
    }
    delete players[socket.id];
    delete playerRooms[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});