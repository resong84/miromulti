// server.js

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

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

// ===================================================================
// 미로 생성 로직 (클라이언트에서 가져옴)
// ===================================================================
const PATH_SIZE = 5;
const WALL_SIZE = 1;
const STEP = PATH_SIZE + WALL_SIZE;
const CENTER_OFFSET = WALL_SIZE + Math.floor(PATH_SIZE / 2);

function generateMazeData(MAZE_WIDTH, MAZE_HEIGHT) {
    let maze = Array(MAZE_HEIGHT).fill(0).map(() => Array(MAZE_WIDTH).fill(1));
    const metaWidth = Math.floor((MAZE_WIDTH - WALL_SIZE) / STEP);
    const metaHeight = Math.floor((MAZE_HEIGHT - WALL_SIZE) / STEP);

    if (metaWidth <= 0 || metaHeight <= 0) {
        return { maze: Array(MAZE_HEIGHT).fill(0).map(() => Array(MAZE_WIDTH).fill(0)), startPos: null, endPos: null };
    }

    let metaVisited = Array(metaHeight).fill(0).map(() => Array(metaWidth).fill(false));
    let stack = [{ x: Math.floor(Math.random() * metaWidth), y: Math.floor(Math.random() * metaHeight) }];
    metaVisited[stack[0].y][stack[0].x] = true;

    let startX = WALL_SIZE + stack[0].x * STEP;
    let startY = WALL_SIZE + stack[0].y * STEP;
    for (let r = 0; r < PATH_SIZE; r++) {
        for (let c = 0; c < PATH_SIZE; c++) {
            if (startY + r < MAZE_HEIGHT && startX + c < MAZE_WIDTH) {
                maze[startY + r][startX + c] = 0;
            }
        }
    }
    
    while (stack.length > 0) {
        let current = stack[stack.length - 1];
        let neighbors = [];
        const directions = [ { x: 0, y: -1, dir: 'N' }, { x: 0, y: 1, dir: 'S' }, { x: -1, y: 0, dir: 'W' }, { x: 1, y: 0, dir: 'E' } ];
        
        for(const {x, y, dir} of directions) {
            const nx = current.x + x;
            const ny = current.y + y;
            if (ny >= 0 && ny < metaHeight && nx >= 0 && nx < metaWidth && !metaVisited[ny][nx]) {
                 neighbors.push({ x: nx, y: ny, dir });
            }
        }

        if (neighbors.length > 0) {
            let next = neighbors[Math.floor(Math.random() * neighbors.length)];
            let currentMazeX = WALL_SIZE + current.x * STEP;
            let currentMazeY = WALL_SIZE + current.y * STEP;

            if (next.dir === 'N') {
                for (let i = 0; i < WALL_SIZE; i++) for (let j = 0; j < PATH_SIZE; j++) maze[currentMazeY - 1 - i][currentMazeX + j] = 0;
            } else if (next.dir === 'S') {
                for (let i = 0; i < WALL_SIZE; i++) for (let j = 0; j < PATH_SIZE; j++) maze[currentMazeY + PATH_SIZE + i][currentMazeX + j] = 0;
            } else if (next.dir === 'W') {
                for (let i = 0; i < WALL_SIZE; i++) for (let j = 0; j < PATH_SIZE; j++) maze[currentMazeY + j][currentMazeX - 1 - i] = 0;
            } else if (next.dir === 'E') {
                for (let i = 0; i < WALL_SIZE; i++) for (let j = 0; j < PATH_SIZE; j++) maze[currentMazeY + j][currentMazeX + PATH_SIZE + i] = 0;
            }

            let nextMazeX = WALL_SIZE + next.x * STEP;
            let nextMazeY = WALL_SIZE + next.y * STEP;
            for (let r = 0; r < PATH_SIZE; r++) for (let c = 0; c < PATH_SIZE; c++) if (nextMazeY + r < MAZE_HEIGHT && nextMazeX + c < MAZE_WIDTH) maze[nextMazeY + r][nextMazeX + c] = 0;
            
            metaVisited[next.y][next.x] = true;
            stack.push(next);
        } else {
            stack.pop();
        }
    }

    // 시작/종료 지점 설정
    let startPos, endPos;
    const VIRTUAL_GRID_COLS = 4, VIRTUAL_GRID_ROWS = 4;
    const blockWidth = MAZE_WIDTH / VIRTUAL_GRID_COLS;
    const blockHeight = MAZE_HEIGHT / VIRTUAL_GRID_ROWS;
    
    const getRandomCenterInBlock = (virtualX, virtualY) => {
        const validPositions = [];
        const startX = Math.floor(virtualX * blockWidth);
        const startY = Math.floor(virtualY * blockHeight);
        const endX = Math.floor(startX + blockWidth);
        const endY = Math.floor(startY + blockHeight);
        for (let r = startY; r < endY && r < MAZE_HEIGHT; r++) {
            for (let c = startX; c < endX && c < MAZE_WIDTH; c++) {
                if ((c - CENTER_OFFSET) % STEP === 0 && (r - CENTER_OFFSET) % STEP === 0 && maze[r][c] === 0) {
                     validPositions.push({ x: c, y: r });
                }
            }
        }
        return validPositions.length > 0 ? validPositions[Math.floor(Math.random() * validPositions.length)] : null;
    };

    startPos = getRandomCenterInBlock(0, 0);
    endPos = getRandomCenterInBlock(VIRTUAL_GRID_COLS - 1, VIRTUAL_GRID_ROWS - 1);

    if (!startPos || !endPos) {
        const pathCells = [];
        for (let r = 0; r < MAZE_HEIGHT; r++) for (let c = 0; c < MAZE_WIDTH; c++) if (maze[r][c] === 0) pathCells.push({ x: c, y: r });
        startPos = pathCells.length > 0 ? pathCells[0] : {x:CENTER_OFFSET, y:CENTER_OFFSET};
        endPos = pathCells.length > 1 ? pathCells[pathCells.length - 1] : {x:MAZE_WIDTH-1-CENTER_OFFSET, y:MAZE_HEIGHT-1-CENTER_OFFSET};
    }

    return { maze, startPos, endPos };
}

// ===================================================================
// 서버 로직
// ===================================================================
let players = {};
let rooms = {};

function generateRoomId() {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

io.on('connection', (socket) => {
    console.log(`플레이어 접속: ${socket.id}`);
    players[socket.id] = { id: socket.id, x: 0, y: 0, roomId: null };

    // --- 로비 관련 이벤트 ---
    socket.on('createRoom', (settings) => {
        let roomId = generateRoomId();
        while(rooms[roomId]) { roomId = generateRoomId(); } // ID 중복 방지

        players[socket.id].roomId = roomId;
        rooms[roomId] = {
            id: roomId,
            masterId: socket.id,
            settings: settings,
            players: { [socket.id]: { id: socket.id, isReady: false } },
            gameStarted: false
        };
        socket.join(roomId);
        socket.emit('roomCreated', rooms[roomId]);
        console.log(`[${roomId}] 방 생성됨 by ${socket.id}`);
    });

    socket.on('joinRoom', (roomId) => {
        roomId = roomId.toUpperCase();
        const room = rooms[roomId];
        if (room && !room.gameStarted) {
            players[socket.id].roomId = roomId;
            room.players[socket.id] = { id: socket.id, isReady: false };
            socket.join(roomId);
            io.to(roomId).emit('roomUpdate', room); // 방의 모든 인원에게 업데이트 전송
            console.log(`[${roomId}] ${socket.id} 참가`);
        } else {
            socket.emit('joinError', '방을 찾을 수 없거나 이미 시작된 게임입니다.');
        }
    });

    socket.on('settingsChanged', ({ roomId, settings }) => {
        const room = rooms[roomId];
        if (room && room.masterId === socket.id) {
            room.settings = settings;
            // 모든 플레이어 준비 상태 초기화
            Object.values(room.players).forEach(p => p.isReady = false);
            io.to(roomId).emit('roomUpdate', room);
        }
    });

    socket.on('playerReady', ({ roomId, isReady }) => {
        const room = rooms[roomId];
        if (room && room.players[socket.id]) {
            room.players[socket.id].isReady = isReady;
            io.to(roomId).emit('roomUpdate', room);
        }
    });

    socket.on('startGame', (roomId) => {
        const room = rooms[roomId];
        if (room && room.masterId === socket.id) {
            // 모든 플레이어가 준비되었는지 확인
            const allReady = Object.values(room.players).every(p => p.isReady);
            if (allReady) {
                room.gameStarted = true;
                const mazeData = generateMazeData(room.settings.width, room.settings.height);
                io.to(roomId).emit('gameStarted', { settings: room.settings, mazeData });
                console.log(`[${roomId}] 게임 시작`);
            }
        }
    });

    // --- 인게임 관련 이벤트 ---
    socket.on('playerMovement', (movementData) => {
        const player = players[socket.id];
        if (player) {
            player.x = movementData.x;
            player.y = movementData.y;
            if (player.roomId) {
                socket.to(player.roomId).broadcast.emit('playerMoved', player);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`플레이어 접속 해제: ${socket.id}`);
        const player = players[socket.id];
        if (player && player.roomId) {
            const room = rooms[player.roomId];
            if (room) {
                delete room.players[socket.id];
                // 방장이 나갔을 경우 방 폭파
                if (room.masterId === socket.id) {
                    io.to(player.roomId).emit('roomClosed', '방장이 나가서 게임이 종료되었습니다.');
                    delete rooms[player.roomId];
                    console.log(`[${player.roomId}] 방장이 나가서 방이 닫혔습니다.`);
                } else {
                    io.to(player.roomId).emit('roomUpdate', room); // 남은 사람들에게 업데이트
                }
            }
        }
        delete players[socket.id];
    });
});

server.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});