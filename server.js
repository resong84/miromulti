// server.js

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors'); // CORS 미들웨어 추가

const app = express();
// CORS 설정: Cloudflare로 배포된 실제 게임 주소를 허용해야 합니다.
app.use(cors({
  origin: "https://mirotest.pages.dev/" // 예: "https://maze-game.pages.dev"
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "YOUR_GAME_URL_ON_CLOUDFLARE", // 클라이언트 주소
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// 모든 플레이어의 정보를 저장할 객체
let players = {};

// 클라이언트가 서버에 접속했을 때 실행될 로직
io.on('connection', (socket) => {
  console.log(`플레이어 접속: ${socket.id}`);

  // 1. 새로운 플레이어 정보 생성 및 저장
  players[socket.id] = {
    id: socket.id,
    x: 0, // 초기 위치 (게임 로직에 맞게 수정 필요)
    y: 0,
  };

  // 2. 현재까지 접속한 모든 플레이어 정보를 새 플레이어에게 전송
  socket.emit('currentPlayers', players);

  // 3. 새로운 플레이어의 등장을 다른 모든 플레이어에게 알림
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // 4. 플레이어가 움직였다는 정보를 받았을 때 처리
  socket.on('playerMovement', (movementData) => {
    const player = players[socket.id] || {};
    player.x = movementData.x;
    player.y = movementData.y;
    // 다른 모든 클라이언트에게 해당 플레이어가 움직였다고 알림
    socket.broadcast.emit('playerMoved', player);
  });

  // 5. 플레이어가 접속을 끊었을 때 처리
  socket.on('disconnect', () => {
    console.log(`플레이어 접속 해제: ${socket.id}`);
    // players 객체에서 해당 플레이어 정보 삭제
    delete players[socket.id];
    // 다른 모든 클라이언트에게 누가 나갔는지 알림
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});