// ===================================================================
// 1. 코드 구조 개선: 기능별 그룹화
// ===================================================================

// ===================================================================
// 2. DOM 요소 및 전역 상태 (DOM & State Module)
// ===================================================================

// --- 미로 생성 핵심 파라미터 ---
const PATH_SIZE = 5; 
const WALL_SIZE = 1; 
const STEP = PATH_SIZE + WALL_SIZE; 
const CENTER_OFFSET = WALL_SIZE + Math.floor(PATH_SIZE / 2); 

// --- DOM 요소 ---
const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const timerDisplay = document.getElementById('timer');
const mainLayout = document.querySelector('.main-layout');
const gallopingSound = document.getElementById('gallopingSound');
const spotSaveSound = document.getElementById('spotSaveSound');
const spotLoadSound = document.getElementById('spotLoadSound');
const pastStepSound = document.getElementById('pastStepSound');
const clearSound = document.getElementById('clearSound');


// Buttons
const restartButton = document.getElementById('restartButton');
const resetSizeButton = document.getElementById('resetSizeButton');
const helpButton = document.getElementById('helpButton');
const shareButton = document.getElementById('shareButton');
const autoFitButton = document.getElementById('autoFitButton');
const qButton = document.getElementById('qButton');
const wButton = document.getElementById('wButton');
const qButton_joystick = document.getElementById('qButton_joystick');
const wButton_joystick = document.getElementById('wButton_joystick');
const backToPresetButton = document.getElementById('backToPresetButton');
const soundToggleButton = document.getElementById('soundToggleButton');

// Rollback Buttons
const rollbackButtons = {
    '1': [document.getElementById('rollback1_left'), document.getElementById('rollback1_joystick')],
    '2': [document.getElementById('rollback2_left'), document.getElementById('rollback2_joystick')],
};

// Joystick
const joystickBase = document.getElementById('joystickBase');
const joystickKnob = document.getElementById('joystickKnob');

// Start Screen
const startScreenModal = document.getElementById('startScreenModal');
const controlModeContainer = document.getElementById('controlModeContainer');
const ageButtonsContainer = document.getElementById('ageButtonsContainer');
const customSizeBtn = document.getElementById('customSizeBtn');
const customSizeContainer = document.getElementById('customSizeContainer');
const mazeWidthSelect = document.getElementById('mazeWidthSelect');
const mazeHeightSelect = document.getElementById('mazeHeightSelect');
const startButton = document.getElementById('startButton');

// --- 추가된 DOM 요소 (멀티플레이) ---
const gameModeContainer = document.getElementById('gameModeContainer');
const singlePlayerBtn = document.getElementById('singlePlayerBtn');
const multiplayerBtn = document.getElementById('multiplayerBtn');
const singlePlayerContainer = document.getElementById('singlePlayerContainer');
const multiplayerChoiceContainer = document.getElementById('multiplayerChoiceContainer');
const createNewGameBtn = document.getElementById('createNewGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const lobbyContainer = document.getElementById('lobbyContainer');
const roomInfoContainer = document.getElementById('roomInfoContainer');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const copyRoomIdBtn = document.getElementById('copyRoomIdBtn');
const mazeWidthSelectLobby = document.getElementById('mazeWidthSelectLobby');
const mazeHeightSelectLobby = document.getElementById('mazeHeightSelectLobby');
const autoFitButtonLobby = document.getElementById('autoFitButtonLobby');
const backToMultiplayerChoiceButton = document.getElementById('backToMultiplayerChoiceButton');
const startLobbyButton = document.getElementById('startLobbyButton');
const readyButton = document.getElementById('readyButton');
const backToGameMode = document.getElementById('backToGameMode');
const roomListModal = document.getElementById('roomListModal');
const roomListContainer = document.getElementById('roomListContainer');
const closeRoomListModalButton = document.getElementById('closeRoomListModalButton');


// Modals
const winModal = document.getElementById('winModal');
const winModalContent = document.getElementById('winModalContent');
const winTimeMessage = document.getElementById('winTimeMessage');
const winMazeSizeMessage = document.getElementById('winMazeSizeMessage');
const winRestartButton = document.getElementById('winRestartButton');
const winHomeButton = document.getElementById('winHomeButton');
const helpModal = document.getElementById('helpModal');
const closeHelpModalButton = document.getElementById('closeHelpModalButton');
const screenshotModal = document.getElementById('screenshotModal');
const screenshotImage = document.getElementById('screenshotImage');
const closeScreenshotModalButton = document.getElementById('closeScreenshotModalButton');
const flashOverlay = document.getElementById('flashOverlay');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownText = document.getElementById('countdownText');
const finishOverlay = document.getElementById('finishOverlay');
const finishRankText = document.getElementById('finishRankText');


// --- 전역 게임 상태 ---
let TILE_SIZE = 40;
let MAZE_WIDTH = 11;
let MAZE_HEIGHT = 11;
let controlMode = 'keyboard';
let maze = [];
let player = { x: 0, y: 0 };
let startPos = { x: 0, y: 0 };
let endPos = { x: 0, y: 0 };
let startTime;
let timerInterval;
let gameWon = false; // 플레이어 개인이 클리어했는지 여부
let wButtonUsed = false;
let qButtonUsed = false;
let playerPath = [];
const MAX_PLAYER_PATH = 200;
let wButtonClearInterval = null;
let wButtonPathColor = '';
let animationFrameId;
let flagAnimationTime = 0;
let savedPositions = { '1': null, '2': null };
var moveIntervals = {};
let moveSoundTimeout = null;

// 멀티플레이어 상태
let socket;
let otherPlayers = {};
let playerRole = 'guest';
let isReady = false;
let currentRoomId = null;


// Joystick state
let isJoystickActive = false;
let joystickInitialTimeout = null;
let joystickRepeatInterval = null;
let joystickDx = 0, joystickDy = 0;
const JOYSTICK_INITIAL_DELAY = 300;
const JOYSTICK_REPEAT_DELAY = 200;

// Audio state
let audioContextResumed = false;
let impactSynth, shutterSynth;
let isSoundOn = true;

// ===================================================================
// 3. 오디오 모듈 (Audio Module)
// ===================================================================

function initAudio() {
    impactSynth = new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 1, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.6 }, oscillator: { type: "sine" } }).toDestination();
    shutterSynth = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.1, sustain: 0.0, release: 0.1 } }).toDestination();

    const resumeAudio = () => {
        if (!audioContextResumed) {
            Tone.start();
            audioContextResumed = true;
        }
        document.documentElement.removeEventListener('mousedown', resumeAudio);
        document.documentElement.removeEventListener('touchstart', resumeAudio);
    };
    document.documentElement.addEventListener('mousedown', resumeAudio, { once: true });
    document.documentElement.addEventListener('touchstart', resumeAudio, { once: true });
}

function playImpactSound() { if (isSoundOn && audioContextResumed) { impactSynth.triggerAttackRelease("C1", "8n"); setTimeout(() => impactSynth.triggerAttackRelease("G1", "8n"), 200); } }
function playShutterSound() { if (isSoundOn && audioContextResumed) shutterSynth.triggerAttackRelease("8n"); }


// ===================================================================
// 4. UI 및 그리기 모듈 (UI & Drawing Module)
// ===================================================================

function getRandomTransparentColor() { return `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.5)`; }
function getRandomSolidColor() { return `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`; }

function initializeCanvasSize() {
    const minTileSize = 3; 
    const maxTileSize = 15;
    
    const headerElement = document.querySelector('.game-header');
    if (!headerElement) return;
    const headerStyle = window.getComputedStyle(headerElement);
    const availableWidth = headerElement.clientWidth - parseFloat(headerStyle.paddingLeft) - parseFloat(headerStyle.paddingRight);
    const availableHeight = headerElement.clientHeight - parseFloat(headerStyle.paddingTop) - parseFloat(headerStyle.paddingBottom);
    
    TILE_SIZE = Math.min(Math.floor(availableHeight / MAZE_HEIGHT), Math.floor(availableWidth / MAZE_WIDTH));
    TILE_SIZE = Math.max(minTileSize, Math.min(TILE_SIZE, maxTileSize));
    
    canvas.width = MAZE_WIDTH * TILE_SIZE;
    canvas.height = MAZE_HEIGHT * TILE_SIZE;
}

function drawMaze(flagYOffset = 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const wallColor = '#555555';
    const pathColor = '#FFFFFF';
    
    for (let r = 0; r < maze.length; r++) {
        for (let c = 0; c < maze[r].length; c++) {
            ctx.fillStyle = (maze[r][c] === 1) ? wallColor : pathColor;
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    
    if (wButtonUsed && playerPath.length > 0) {
        ctx.fillStyle = wButtonPathColor;
        playerPath.forEach(p => ctx.fillRect(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE));
    }
    
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';

    ctx.font = `${TILE_SIZE * 4.5}px Arial`;
    ctx.fillText('⛩️', startPos.x * TILE_SIZE + TILE_SIZE / 2, startPos.y * TILE_SIZE + TILE_SIZE / 2);
    ctx.fillText('🚩', endPos.x * TILE_SIZE + TILE_SIZE / 2, endPos.y * TILE_SIZE + TILE_SIZE / 2 + flagYOffset);
    
    for (const key in savedPositions) {
        const pos = savedPositions[key];
        if (pos) {
            const markerSize = TILE_SIZE * 4.5;
            const halfMarkerSize = markerSize / 2;
            const centerX = pos.x * TILE_SIZE + TILE_SIZE / 2;
            const centerY = pos.y * TILE_SIZE + TILE_SIZE / 2;

            ctx.fillStyle = (key === '1') ? '#FFB6C1' : '#A7C7E7';
            ctx.beginPath();
            ctx.roundRect(centerX - halfMarkerSize, centerY - halfMarkerSize, markerSize, markerSize, TILE_SIZE);
            ctx.fill();

            ctx.fillStyle = 'white';
            ctx.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.7)';
            ctx.font = `bold ${TILE_SIZE * 2.0}px Arial`;
            ctx.fillText(key, centerX, centerY);
            ctx.textShadow = 'none';
        }
    }

    ctx.font = `${TILE_SIZE * 4.0}px Arial`;
    for (const id in otherPlayers) {
        const otherPlayer = otherPlayers[id];
        ctx.fillText('👽', otherPlayer.x * TILE_SIZE + TILE_SIZE / 2, otherPlayer.y * TILE_SIZE + TILE_SIZE / 2);
    }

    ctx.font = `${TILE_SIZE * 4.0}px Arial`;
    ctx.fillText('🐎', player.x * TILE_SIZE + TILE_SIZE / 2, player.y * TILE_SIZE + TILE_SIZE / 2);
}

function animate() {
    // 애니메이션은 게임이 끝나도 다른 플레이어를 보기 위해 계속 실행
    flagAnimationTime += 0.05;
    const flagYOffset = Math.sin(flagAnimationTime) * (TILE_SIZE * 0.4);
    
    drawMaze(flagYOffset);
    
    animationFrameId = requestAnimationFrame(animate);
}

function updateTimerDisplay() {
    const ms = Date.now() - startTime;
    const mins = String(Math.floor(ms / 60000)).padStart(2, '0');
    const secs = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    const centisecs = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
    timerDisplay.textContent = `${mins}분${secs}초${centisecs}`;
}

function calculateMaxMazeSize() {
    const availableScreenWidth = Math.min(600, window.innerWidth);
    const availableScreenHeight = window.innerHeight;
    const layoutWidth = availableScreenWidth;
    const layoutHeight = availableScreenHeight - 40;
    const headerHeight = layoutHeight * 0.75 - 10;
    const headerWidth = layoutWidth - 10;
    const MINIMUM_VIABLE_TILE_SIZE = 3;
    
    let maxWidth = Math.floor(headerWidth / MINIMUM_VIABLE_TILE_SIZE);
    let maxHeight = Math.floor(headerHeight / MINIMUM_VIABLE_TILE_SIZE);
    
    maxWidth = maxWidth - (maxWidth % STEP) + 1;
    maxHeight = maxHeight - (maxHeight % STEP) + 1;

    return { maxWidth, maxHeight };
}

function calculateAndDisplayMaxMazeSize() {
    const { maxWidth, maxHeight } = calculateMaxMazeSize();
    autoFitButton.textContent = `최대 크기 (${maxWidth}x${maxHeight})`;
}

function showStartScreen() {
    clearTimeout(moveSoundTimeout);
    if (gallopingSound && !gallopingSound.paused) {
        gallopingSound.pause();
    }
    startScreenModal.style.display = 'flex';
    mainLayout.style.display = 'none';
    [winModal, helpModal, screenshotModal, roomListModal].forEach(modal => modal.style.display = 'none');
    
    gameModeContainer.classList.remove('hidden');
    singlePlayerContainer.classList.add('hidden');
    multiplayerChoiceContainer.classList.add('hidden');
    lobbyContainer.classList.add('hidden');
    customSizeContainer.classList.add('hidden');
    backToGameMode.classList.add('hidden');
    roomInfoContainer.classList.add('hidden');

    document.querySelectorAll('.control-mode-button').forEach(btn => btn.style.backgroundColor = '');
    const selectedBtn = document.querySelector(`.control-mode-button[data-mode="${controlMode}"]`);
    if(selectedBtn) selectedBtn.style.backgroundColor = '#4F46E5';

    calculateAndDisplayMaxMazeSize();
}

function updateLobbyUI(isMaster) {
    mazeWidthSelectLobby.disabled = !isMaster;
    mazeHeightSelectLobby.disabled = !isMaster;
    autoFitButtonLobby.disabled = !isMaster;
    backToMultiplayerChoiceButton.disabled = !isMaster;
    
    if (isMaster) {
        readyButton.style.display = 'flex';
        startLobbyButton.style.visibility = 'hidden';
        roomInfoContainer.style.display = 'flex';
    } else { 
        readyButton.style.display = 'flex';
        startLobbyButton.style.display = 'none';
        roomInfoContainer.style.display = 'none';
    }
}


async function takeScreenshot() {
    playShutterSound();
    flashOverlay.classList.add('flash-effect');
    setTimeout(() => flashOverlay.classList.remove('flash-effect'), 300);
    try {
        const canvasElement = await html2canvas(mainLayout);
        const imageDataUrl = canvasElement.toDataURL('image/png');
        if (navigator.clipboard && navigator.clipboard.write) {
            const response = await fetch(imageDataUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        } else {
            const link = document.createElement('a');
            link.href = imageDataUrl;
            link.download = 'maze-screenshot.png';
            link.click();
        }
        screenshotImage.src = imageDataUrl;
        screenshotModal.style.display = 'flex';
    } catch (err) {
        console.error('Screenshot failed:', err);
        alert('스크린샷 생성 또는 클립보드 복사에 실패했습니다.');
    }
}


// ===================================================================
// 5. 미로 생성 및 게임 로직 (Maze & Game Logic Module)
// ===================================================================

function generateMaze() {
    maze = Array(MAZE_HEIGHT).fill(0).map(() => Array(MAZE_WIDTH).fill(1));
    const metaWidth = Math.floor((MAZE_WIDTH - WALL_SIZE) / STEP);
    const metaHeight = Math.floor((MAZE_HEIGHT - WALL_SIZE) / STEP);

    if (metaWidth <= 0 || metaHeight <= 0) {
        maze = Array(MAZE_HEIGHT).fill(0).map(() => Array(MAZE_WIDTH).fill(0));
        return;
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
}

function placeStartEnd() {
    let VIRTUAL_GRID_COLS, VIRTUAL_GRID_ROWS;
    let startBlock, endBlock;

    if (MAZE_WIDTH === MAZE_HEIGHT) {
        VIRTUAL_GRID_COLS = 4;
        VIRTUAL_GRID_ROWS = 4;
        const startEdge = ['top', 'bottom', 'left', 'right'][Math.floor(Math.random() * 4)];
        switch (startEdge) {
            case 'top':
                startBlock = { x: Math.floor(Math.random() * VIRTUAL_GRID_COLS), y: 0 };
                endBlock = { x: Math.floor(Math.random() * VIRTUAL_GRID_COLS), y: VIRTUAL_GRID_ROWS - 1 };
                break;
            case 'bottom':
                startBlock = { x: Math.floor(Math.random() * VIRTUAL_GRID_COLS), y: VIRTUAL_GRID_ROWS - 1 };
                endBlock = { x: Math.floor(Math.random() * VIRTUAL_GRID_COLS), y: 0 };
                break;
            case 'left':
                startBlock = { x: 0, y: Math.floor(Math.random() * VIRTUAL_GRID_ROWS) };
                endBlock = { x: VIRTUAL_GRID_COLS - 1, y: Math.floor(Math.random() * VIRTUAL_GRID_ROWS) };
                break;
            case 'right':
                startBlock = { x: VIRTUAL_GRID_COLS - 1, y: Math.floor(Math.random() * VIRTUAL_GRID_ROWS) };
                endBlock = { x: 0, y: Math.floor(Math.random() * VIRTUAL_GRID_ROWS) };
                break;
        }
    } else {
        if (MAZE_WIDTH < MAZE_HEIGHT) {
            VIRTUAL_GRID_COLS = 4;
            VIRTUAL_GRID_ROWS = 8;
            if (Math.random() < 0.5) {
                startBlock = { x: Math.floor(Math.random() * VIRTUAL_GRID_COLS), y: 0 };
                endBlock = { x: Math.floor(Math.random() * VIRTUAL_GRID_COLS), y: VIRTUAL_GRID_ROWS - 1 };
            } else {
                startBlock = { x: Math.floor(Math.random() * VIRTUAL_GRID_COLS), y: VIRTUAL_GRID_ROWS - 1 };
                endBlock = { x: Math.floor(Math.random() * VIRTUAL_GRID_COLS), y: 0 };
            }
        } else {
            VIRTUAL_GRID_COLS = 8;
            VIRTUAL_GRID_ROWS = 4;
            if (Math.random() < 0.5) {
                startBlock = { x: 0, y: Math.floor(Math.random() * VIRTUAL_GRID_ROWS) };
                endBlock = { x: VIRTUAL_GRID_COLS - 1, y: Math.floor(Math.random() * VIRTUAL_GRID_ROWS) };
            } else {
                startBlock = { x: VIRTUAL_GRID_COLS - 1, y: Math.floor(Math.random() * VIRTUAL_GRID_ROWS) };
                endBlock = { x: 0, y: Math.floor(Math.random() * VIRTUAL_GRID_ROWS) };
            }
        }
    }

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

    startPos = getRandomCenterInBlock(startBlock.x, startBlock.y);
    endPos = getRandomCenterInBlock(endBlock.x, endBlock.y);

    if (!startPos || !endPos) {
        console.error("Could not find valid start/end points. Using fallback.");
        const pathCells = [];
        for (let r = 0; r < MAZE_HEIGHT; r++) for (let c = 0; c < MAZE_WIDTH; c++) if (maze[r][c] === 0) pathCells.push({ x: c, y: r });
        startPos = pathCells.length > 0 ? pathCells[0] : {x:CENTER_OFFSET, y:CENTER_OFFSET};
        endPos = pathCells.length > 1 ? pathCells[pathCells.length - 1] : {x:MAZE_WIDTH-1-CENTER_OFFSET, y:MAZE_HEIGHT-1-CENTER_OFFSET};
    }
    
    player = { ...startPos };
    playerPath = [{ ...player }];
}

function findShortestPath() {
    if (!startPos || !endPos) return -1;
    const queue = [{ ...startPos, dist: 1 }];
    const visited = new Set([`${startPos.x},${startPos.y}`]);
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    while (queue.length > 0) {
        const current = queue.shift();
        if (current.x === endPos.x && current.y === endPos.y) return current.dist;

        for (const [dx, dy] of directions) {
            const wallCheckX = current.x + dx * CENTER_OFFSET;
            const wallCheckY = current.y + dy * CENTER_OFFSET;
            
            if (wallCheckX >= 0 && wallCheckX < MAZE_WIDTH && wallCheckY >= 0 && wallCheckY < MAZE_HEIGHT && maze[wallCheckY][wallCheckX] === 0) {
                 const nextX = current.x + dx * STEP;
                 const nextY = current.y + dy * STEP;
                 if (!visited.has(`${nextX},${nextY}`)) {
                    visited.add(`${nextX},${nextY}`);
                    queue.push({ x: nextX, y: nextY, dist: current.dist + 1 });
                }
            }
        }
    }
    return -1;
}

function checkWin() {
    if (gameWon) return; // 이미 클리어했다면 중복 실행 방지

    if (player.x === endPos.x && player.y === endPos.y) {
        socket.emit('playerFinished');
        gameWon = true; // 개인의 클리어 상태를 true로 설정
        
        // 사운드 중지
        clearTimeout(moveSoundTimeout);
        if (gallopingSound) gallopingSound.pause();
        if (isSoundOn && clearSound) {
            clearSound.currentTime = 0;
            clearSound.play();
        }
    }
}


// ===================================================================
// 6. 컨트롤러 및 이벤트 핸들러 (Controls & Handlers Module)
// ===================================================================

function playSound(soundElement) {
    if (isSoundOn && soundElement) {
        soundElement.currentTime = 0;
        soundElement.play();
    }
}

function movePlayer(dx, dy) {
    if (gameWon) return; // 클리어한 플레이어는 움직일 수 없음
    
    const wallCheckX = player.x + dx * CENTER_OFFSET;
    const wallCheckY = player.y + dy * CENTER_OFFSET;

    if (wallCheckX < 0 || wallCheckX >= MAZE_WIDTH || wallCheckY < 0 || wallCheckY >= MAZE_HEIGHT) return;
    if (maze[wallCheckY]?.[wallCheckX] === 0) {
        player.x += dx * STEP;
        player.y += dy * STEP;

        if (socket) {
            socket.emit('playerMovement', { x: player.x, y: player.y });
        }

        playerPath.push({ ...player });
        if (playerPath.length > MAX_PLAYER_PATH) playerPath.shift();
        
        checkWin();
        if (isSoundOn && audioContextResumed && gallopingSound) {
            clearTimeout(moveSoundTimeout);
            if (gallopingSound.paused) {
                gallopingSound.play().catch(e => console.error("Error playing sound:", e));
            }
            moveSoundTimeout = setTimeout(() => {
                gallopingSound.pause();
            }, 500);
        }
    }
}

function saveOrLoadPosition(key) {
    if (gameWon) return;
    const currentPos = { x: player.x, y: player.y };
    const savedPos = savedPositions[key];
    
    if (savedPos && currentPos.x === savedPos.x && currentPos.y === savedPos.y) {
        savedPositions[key] = null;
        playSound(spotSaveSound);
    } else if (savedPos) {
        player = { ...savedPos };
        savedPositions[key] = null;
        checkWin();
        playSound(spotSaveSound);
    } else {
        savedPositions[key] = { ...currentPos };
        playSound(spotLoadSound);
    }
}

function handleQButton() {
    if (gameWon || qButtonUsed) return;
    qButtonUsed = true;
    qButton.disabled = true;
    qButton_joystick.disabled = true;
    playSound(spotSaveSound);
    player = { ...startPos };
    playerPath = [{ ...player }];
}

function handleWButton() {
    if (gameWon || wButtonUsed) return;
    wButtonUsed = true;
    wButton.disabled = true;
    wButton_joystick.disabled = true;
    playSound(pastStepSound);
    
    if (wButtonClearInterval) clearInterval(wButtonClearInterval);
    wButtonClearInterval = setInterval(() => {
        if (playerPath.length > 1) {
            playerPath.shift();
        } else {
            clearInterval(wButtonClearInterval);
            wButtonClearInterval = null;
        }
    }, 500);
}

function startContinuousMove(direction) {
    if (gameWon || moveIntervals[direction]) return;
    const moveMap = { 'up': () => movePlayer(0, -1), 'down': () => movePlayer(0, 1), 'left': () => movePlayer(-1, 0), 'right': () => movePlayer(1, 0) };
    moveMap[direction]();
    moveIntervals[direction] = setInterval(moveMap[direction], 150);
}
function stopContinuousMove(direction) {
    if (moveIntervals[direction]) {
        clearInterval(moveIntervals[direction]);
        delete moveIntervals[direction];
    }
}
function stopAllContinuousMoves() {
    for (const dir in moveIntervals) stopContinuousMove(dir);
}

function handleJoystickMove(event) {
    if (!isJoystickActive) return;
    event.preventDefault();
    const rect = joystickBase.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDist = (joystickBase.offsetWidth / 2) * 0.5;

    if (distance > maxDist) {
        dx = (dx / distance) * maxDist;
        dy = (dy / distance) * maxDist;
    }
    joystickDx = dx;
    joystickDy = dy;
    joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
}
function startJoystick(event) {
    isJoystickActive = true;
    joystickKnob.style.backgroundColor = getRandomSolidColor();
    if (joystickInitialTimeout) clearTimeout(joystickInitialTimeout);
    if (joystickRepeatInterval) clearInterval(joystickRepeatInterval);

    const executeMove = () => {
        if (!isJoystickActive) return;
        const threshold = 10;
        if (Math.abs(joystickDx) < threshold && Math.abs(joystickDy) < threshold) return;
        if (Math.abs(joystickDx) > Math.abs(joystickDy)) {
            if (joystickDx > 0) movePlayer(1, 0); else movePlayer(-1, 0);
        } else {
            if (joystickDy > 0) movePlayer(0, 1); else movePlayer(0, -1);
        }
    };

    joystickInitialTimeout = setTimeout(() => {
        executeMove();
        joystickRepeatInterval = setInterval(executeMove, JOYSTICK_REPEAT_DELAY);
    }, JOYSTICK_INITIAL_DELAY);
    handleJoystickMove(event);
}
function stopJoystick() {
    isJoystickActive = false;
    clearTimeout(joystickInitialTimeout);
    clearInterval(joystickRepeatInterval);
    joystickDx = 0;
    joystickDy = 0;
    joystickKnob.style.transform = 'translate(0, 0)';
    joystickKnob.style.backgroundColor = 'var(--color-red-pastel)';
}


// ===================================================================
// 7. 게임 초기화 및 이벤트 리스너 설정 (Initialization & Listeners)
// ===================================================================

function setupSocketListeners() {
    socket.on("connect", () => console.log("서버 연결 성공:", socket.id));
    socket.on("connect_error", (err) => console.error("서버 연결 실패:", err.message));

    socket.on('roomCreated', ({ roomId }) => {
        currentRoomId = roomId;
        roomIdDisplay.textContent = roomId;
    });

    socket.on('joinSuccess', () => {
        console.log('방에 성공적으로 참여했습니다.');
        multiplayerChoiceContainer.classList.add('hidden');
        lobbyContainer.classList.remove('hidden');
        updateLobbyUI(false);
    });

    socket.on('joinError', ({ message }) => {
        alert(message);
    });

    socket.on('roomListUpdate', (rooms) => {
        roomListContainer.innerHTML = '';
        if (rooms.length === 0) {
            roomListContainer.innerHTML = '<p class="text-gray-500">참여 가능한 방이 없습니다.</p>';
            return;
        }
        rooms.forEach(room => {
            const roomButton = document.createElement('button');
            roomButton.className = 'action-button';
            roomButton.textContent = `방 ID: ${room.id} (${room.playerCount}명)`;
            roomButton.onclick = () => {
                socket.emit('joinGame', { roomId: room.id });
                roomListModal.style.display = 'none';
            };
            roomListContainer.appendChild(roomButton);
        });
    });

    socket.on('lobbyStateUpdate', (lobbyState) => {
        if (playerRole === 'guest') {
            mazeWidthSelectLobby.value = lobbyState.settings.width;
            mazeHeightSelectLobby.value = lobbyState.settings.height;
        }
        const allPlayersReady = Object.values(lobbyState.players).every(p => p.isReady);
        if (playerRole === 'master') {
            startLobbyButton.style.visibility = allPlayersReady ? 'visible' : 'hidden';
            readyButton.style.display = allPlayersReady ? 'none' : 'flex';
        }
    });
    
    socket.on('unReadyAllPlayers', () => {
        isReady = false;
        readyButton.textContent = '준비';
        readyButton.style.backgroundColor = 'var(--color-green-pastel)';
    });

    socket.on('gameCountdown', () => {
        startScreenModal.style.display = 'none';
        mainLayout.style.display = 'flex';
        countdownOverlay.classList.remove('hidden');
        let count = 5;
        countdownText.textContent = count;
        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownText.textContent = count;
            } else {
                clearInterval(interval);
                countdownOverlay.classList.add('hidden');
            }
        }, 1000);
    });

    socket.on('gameStarting', (settings) => {
        MAZE_WIDTH = settings.width;
        MAZE_HEIGHT = settings.height;
        initGame();
    });

    socket.on('youFinished', ({ rank }) => {
        finishRankText.textContent = `${rank}위`;
        finishOverlay.classList.remove('hidden');
    });

    socket.on('gameOver', ({ rankings }) => {
        showWinScreen(rankings);
    });

    socket.on('currentPlayers', (players) => {
        Object.keys(players).forEach((id) => {
            if (players[id].id !== socket.id) otherPlayers[id] = players[id];
        });
    });
    socket.on('newPlayer', (playerInfo) => otherPlayers[playerInfo.id] = playerInfo);
    socket.on('playerMoved', (playerInfo) => {
        if (otherPlayers[playerInfo.id]) {
            otherPlayers[playerInfo.id].x = playerInfo.x;
            otherPlayers[playerInfo.id].y = playerInfo.y;
        }
    });
    socket.on('playerDisconnected', (playerId) => delete otherPlayers[playerId]);
}

function showWinScreen(rankings) {
    let rankingHTML = '<h2 class="help-message-title">게임 종료!</h2><div class="w-full mt-4">';
    rankings.forEach(player => {
        const isMe = player.id === socket.id;
        rankingHTML += `<p class="text-lg ${isMe ? 'font-bold text-blue-600' : ''}">${player.rank}위: ${isMe ? '나' : '상대방'}</p>`;
    });
    rankingHTML += '</div>';
    
    rankingHTML += `
        <div class="win-modal-buttons mt-4">
            <button id="winHomeButtonNew" class="action-button">처음으로</button>
            <button id="winRestartButtonNew" class="action-button">다시 시작</button>
        </div>
    `;
    
    winModalContent.innerHTML = rankingHTML;
    
    // 새 버튼에 이벤트 리스너 추가
    document.getElementById('winHomeButtonNew').addEventListener('click', showStartScreen);
    document.getElementById('winRestartButtonNew').addEventListener('click', () => {
        winModal.style.display = 'none';
        // 멀티플레이 재시작은 로비로 돌아가는 것이 자연스러움
        showStartScreen(); 
    });

    winModal.style.display = 'flex';
}


function initGame() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    clearTimeout(moveSoundTimeout);
    if (gallopingSound) gallopingSound.pause();

    gameWon = false;
    wButtonUsed = false;
    qButtonUsed = false;
    if (wButtonClearInterval) clearInterval(wButtonClearInterval);
    wButtonClearInterval = null;
    wButtonPathColor = getRandomTransparentColor();
    for (let key in savedPositions) savedPositions[key] = null;

    [winModal, helpModal, screenshotModal].forEach(modal => modal.style.display = 'none');
    finishOverlay.classList.add('hidden');
    [wButton, wButton_joystick, qButton, qButton_joystick].forEach(btn => btn.disabled = false);
    clearInterval(timerInterval);
    timerDisplay.textContent = '00분00초00';
    
    initializeCanvasSize();

    let attempts = 0;
    const maxAttempts = 50;
    do {
        generateMaze();
        placeStartEnd();
        attempts++;
        if (attempts > maxAttempts) {
            console.error("Failed to generate a solvable maze.");
            break;
        }
    } while (findShortestPath() === -1); 

    if (socket) {
        socket.emit('playerMovement', { x: player.x, y: player.y });
    }

    playImpactSound();
    animate();
    startTime = Date.now();
    timerInterval = setInterval(updateTimerDisplay, 10);
}

function setupEventListeners() {
    // --- Start Screen ---
    singlePlayerBtn.addEventListener('click', () => {
        gameModeContainer.classList.add('hidden');
        singlePlayerContainer.classList.remove('hidden');
        backToGameMode.classList.remove('hidden');
    });

    multiplayerBtn.addEventListener('click', () => {
        gameModeContainer.classList.add('hidden');
        multiplayerChoiceContainer.classList.remove('hidden');
        backToGameMode.classList.remove('hidden');
    });

    backToGameMode.addEventListener('click', showStartScreen);

    createNewGameBtn.addEventListener('click', () => {
        playerRole = 'master';
        multiplayerChoiceContainer.classList.add('hidden');
        lobbyContainer.classList.remove('hidden');
        updateLobbyUI(true);
        socket.emit('createGame', {
            width: parseInt(mazeWidthSelectLobby.value),
            height: parseInt(mazeHeightSelectLobby.value)
        });
    });

    joinGameBtn.addEventListener('click', () => {
        playerRole = 'guest';
        socket.emit('requestRoomList');
        roomListModal.style.display = 'flex';
    });

    closeRoomListModalButton.addEventListener('click', () => {
        roomListModal.style.display = 'none';
    });

    copyRoomIdBtn.addEventListener('click', () => {
        const roomId = roomIdDisplay.textContent;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(roomId).then(() => {
                copyRoomIdBtn.textContent = '복사됨!';
                setTimeout(() => { copyRoomIdBtn.textContent = '복사'; }, 2000);
            }).catch(err => console.error('복사 실패:', err));
        }
    });

    backToMultiplayerChoiceButton.addEventListener('click', () => {
        lobbyContainer.classList.add('hidden');
        multiplayerChoiceContainer.classList.remove('hidden');
        // To-Do: 방에서 나가는 로직
    });

    autoFitButtonLobby.addEventListener('click', () => {
        const { maxWidth, maxHeight } = calculateMaxMazeSize();
        mazeWidthSelectLobby.value = maxWidth;
        mazeHeightSelectLobby.value = maxHeight;
        if (playerRole === 'master') {
            socket.emit('settingsChanged', { width: maxWidth, height: maxHeight });
        }
    });
    
    [mazeWidthSelectLobby, mazeHeightSelectLobby].forEach(select => {
        select.addEventListener('change', () => {
            if (playerRole === 'master') {
                socket.emit('settingsChanged', {
                    width: parseInt(mazeWidthSelectLobby.value),
                    height: parseInt(mazeHeightSelectLobby.value)
                });
            }
        });
    });

    readyButton.addEventListener('click', () => {
        isReady = !isReady;
        readyButton.textContent = isReady ? '준비 완료!' : '준비';
        readyButton.style.backgroundColor = isReady ? 'var(--color-blue-pastel)' : 'var(--color-green-pastel)';
        socket.emit('playerReady', { isReady });
    });

    startLobbyButton.addEventListener('click', () => {
        if (playerRole === 'master') {
            socket.emit('startGame');
        }
    });

    // --- In-Game Controls ---
    document.addEventListener('keydown', (e) => {
        if (startScreenModal.style.display !== 'none') return;
        const key = e.key.toLowerCase();

        // 기능 키 처리 (return을 추가하여 중복 실행 방지)
        if (['1', '2'].includes(key)) { saveOrLoadPosition(key); return; }
        if (key === 'q') { handleQButton(); return; }
        if (key === 'w') { handleWButton(); return; }

        // 방향키 처리
        switch (e.key) {
            case 'ArrowUp': movePlayer(0, -1); break;
            case 'ArrowDown': movePlayer(0, 1); break;
            case 'ArrowLeft': movePlayer(-1, 0); break;
            case 'ArrowRight': movePlayer(1, 0); break;
        }
    });

    // ... (나머지 이벤트 리스너는 이전과 거의 동일)
}

function populateSizeDropdowns() {
    const selects = [mazeWidthSelect, mazeHeightSelect, mazeWidthSelectLobby, mazeHeightSelectLobby];
    selects.forEach(s => s.innerHTML = '');

    const sizes = [43, 49, 55, 61, 67, 73, 79, 85, 91, 97, 103, 109, 115, 121, 127];

    sizes.forEach(size => {
        [mazeWidthSelect, mazeWidthSelectLobby].forEach(s => s.add(new Option(size, size)));
        [mazeHeightSelect, mazeHeightSelectLobby].forEach(s => s.add(new Option(size, size)));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect=function(t,e,o,i,n){return o<2*n&&(n=o/2),i<2*n&&(n=i/2),this.beginPath(),this.moveTo(t+n,e),this.arcTo(t+o,e,t+o,e+i,n),this.arcTo(t+o,e+i,t,e+i,n),this.arcTo(t,e+i,t,e,n),this.arcTo(t,e,t+o,e,n),this.closePath(),this}
    }
    populateSizeDropdowns();
    setupEventListeners();
    initAudio();
    showStartScreen();

    try {
        console.log("서버에 접속 시도 중... 주소:", "https://miromulti.onrender.com");
        socket = io("https://miromulti.onrender.com"); 
        setupSocketListeners();
    } catch (e) {
        console.error("서버 연결 시도 중 즉시 에러 발생:", e);
    }
});