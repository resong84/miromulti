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
const randomSizeButton = document.getElementById('randomSizeButton');
const qButton = document.getElementById('qButton');
const wButton = document.getElementById('wButton');
const soundToggleButton = document.getElementById('soundToggleButton');
const homeButton = document.getElementById('homeButton');

// Rollback Buttons
const rollbackButtons = {
    '1': document.getElementById('rollback1'),
    '2': document.getElementById('rollback2'),
};

// Joystick
const joystickBase = document.getElementById('joystickBase');
const joystickKnob = document.getElementById('joystickKnob');

// Start Screen
const startScreenModal = document.getElementById('startScreenModal');
const controlModeContainer = document.getElementById('controlModeContainer');
const levelSelect = document.getElementById('levelSelect');
const startSinglePlayerButton = document.getElementById('startSinglePlayerButton');
const customModeBtn = document.getElementById('customModeBtn');
const mazeWidthSelect = document.getElementById('mazeWidthSelect');
const mazeHeightSelect = document.getElementById('mazeHeightSelect');
const presetModeBtn = document.getElementById('presetModeBtn');
const presetContent = document.getElementById('presetContent');
const customContent = document.getElementById('customContent');


// --- 추가된 DOM 요소 (멀티플레이) ---
const gameModeContainer = document.getElementById('gameModeContainer');
const singlePlayerBtn = document.getElementById('singlePlayerBtn');
const multiplayerBtn = document.getElementById('multiplayerBtn');
const singlePlayerContainer = document.getElementById('singlePlayerContainer');
const multiplayerChoiceContainer = document.getElementById('multiplayerChoiceContainer');
const nicknameContainer = document.getElementById('nicknameContainer');
const nicknameInput = document.getElementById('nicknameInput');
const confirmNicknameBtn = document.getElementById('confirmNicknameBtn');
const multiplayerButtons = document.getElementById('multiplayerButtons');
const createNewGameBtn = document.getElementById('createNewGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const lobbyContainer = document.getElementById('lobbyContainer');
const roomInfoContainer = document.getElementById('roomInfoContainer');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const copyRoomIdBtn = document.getElementById('copyRoomIdBtn');
const backToMultiplayerChoiceButton = document.getElementById('backToMultiplayerChoiceButton');
const startLobbyButton = document.getElementById('startLobbyButton');
const readyButton = document.getElementById('readyButton');
const roomListModal = document.getElementById('roomListModal');
const roomListContainer = document.getElementById('roomListContainer');
const closeRoomListModalButton = document.getElementById('closeRoomListModalButton');
const characterSelectContainer = document.getElementById('characterSelectContainer'); // 말 선택 컨테이너

// Lobby UI elements
const controlModeContainerLobby = document.getElementById('controlModeContainerLobby');
const presetModeBtnLobby = document.getElementById('presetModeBtnLobby');
const customModeBtnLobby = document.getElementById('customModeBtnLobby');
const presetContentLobby = document.getElementById('presetContentLobby');
const customContentLobby = document.getElementById('customContentLobby');
const levelSelectLobby = document.getElementById('levelSelectLobby');
const mazeWidthSelectLobby = document.getElementById('mazeWidthSelectLobby');
const mazeHeightSelectLobby = document.getElementById('mazeHeightSelectLobby');


// Modals
const winModal = document.getElementById('winModal');
const winModalContent = document.getElementById('winModalContent');
const helpModal = document.getElementById('helpModal');
const closeHelpModalButton = document.getElementById('closeHelpModalButton');
const screenshotModal = document.getElementById('screenshotModal');
const screenshotImage = document.getElementById('screenshotImage');
const closeScreenshotModalButton = document.getElementById('closeScreenshotModalButton');
const copyScreenshotButton = document.getElementById('copyScreenshotButton');
const flashOverlay = document.getElementById('flashOverlay');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownText = document.getElementById('countdownText');


// --- 전역 게임 상태 ---
let TILE_SIZE = 40;
let MAZE_WIDTH = 11;
let MAZE_HEIGHT = 11;
let controlMode = 'keyboard';
let maze = [];
let player = { x: 0, y: 0, character: '🐎' };
let startPos = { x: 0, y: 0 };
let endPos = { x: 0, y: 0 };
let startTime;
let timerInterval;
let gameWon = false;
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
let singlePlayerSizeMode = 'preset';
let lobbySizeMode = 'preset';
let lastScreenshotBlob = null;


// 멀티플레이어 상태 (Session-level)
let socket;
let playerNickname = ''; // 앱 사용 기간 동안 유지

// 멀티플레이어 상태 (Room/Lobby-level)
let otherPlayers = {};
let playerRole = 'guest';
let isReady = false;
let currentRoomId = null;
let selectedCharacter = null;
const CHARACTER_LIST = ['🐎', '🐇', '🐢', '🐕', '🐈', '🐅'];


// Joystick state
let isJoystickActive = false;
let joystickInitialTimeout = null;
let joystickRepeatInterval = null;
let joystickDx = 0, joystickDy = 0;
const JOYSTICK_INITIAL_DELAY = 150;
const JOYSTICK_REPEAT_DELAY = 100;

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
    
    const bodyElement = document.querySelector('.game-body');
    if (!bodyElement) return;
    const bodyStyle = window.getComputedStyle(bodyElement);
    const availableWidth = bodyElement.clientWidth - parseFloat(bodyStyle.paddingLeft) - parseFloat(bodyStyle.paddingRight);
    const availableHeight = bodyElement.clientHeight - parseFloat(bodyStyle.paddingTop) - parseFloat(bodyStyle.paddingBottom);
    
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

    ctx.globalAlpha = 0.5;
    ctx.font = `${TILE_SIZE * 4.0}px Arial`;
    for (const id in otherPlayers) {
        const otherPlayer = otherPlayers[id];
        ctx.fillText(otherPlayer.character || '👽', otherPlayer.x * TILE_SIZE + TILE_SIZE / 2, otherPlayer.y * TILE_SIZE + TILE_SIZE / 2);
    }
    ctx.globalAlpha = 1.0;

    ctx.font = `${TILE_SIZE * 4.0}px Arial`;
    ctx.fillText(player.character, player.x * TILE_SIZE + TILE_SIZE / 2, player.y * TILE_SIZE + TILE_SIZE / 2);
}

function animate() {
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
    return `${mins}분${secs}초${centisecs}`;
}

function calculateMaxMazeSize() {
    const availableScreenWidth = Math.min(600, window.innerWidth);
    const availableScreenHeight = window.innerHeight;
    const layoutWidth = availableScreenWidth;
    const layoutHeight = availableScreenHeight - 40;
    const headerHeight = 60;
    const footerHeight = layoutHeight * 0.25;
    const bodyPadding = 10;
    
    const availableBodyHeight = layoutHeight - headerHeight - footerHeight - bodyPadding;
    const availableBodyWidth = layoutWidth - bodyPadding;

    const MINIMUM_VIABLE_TILE_SIZE = 3;
    
    let maxWidth = Math.floor(availableBodyWidth / MINIMUM_VIABLE_TILE_SIZE);
    let maxHeight = Math.floor(availableBodyHeight / MINIMUM_VIABLE_TILE_SIZE);
    
    maxWidth = Math.max(1, maxWidth - (maxWidth % STEP) + 1);
    maxHeight = Math.max(1, maxHeight - (maxHeight % STEP) + 1);

    return { maxWidth, maxHeight };
}

function updateMaxSizeLabel() {
    const { maxWidth, maxHeight } = calculateMaxMazeSize();
    const maxOption = levelSelect.querySelector('option[value="max"]');
    if (maxOption) {
        maxOption.textContent = `전문(Max): ${maxWidth} x ${maxHeight}`;
    }
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
    homeButton.style.display = 'none';

    if (playerNickname) {
        nicknameInput.value = playerNickname;
        nicknameInput.disabled = true;
        confirmNicknameBtn.disabled = true;
        createNewGameBtn.disabled = false;
        joinGameBtn.disabled = false;
    } else {
        nicknameInput.value = '';
        nicknameInput.disabled = false;
        confirmNicknameBtn.disabled = false;
        confirmNicknameBtn.classList.remove('active-blue');
        createNewGameBtn.disabled = true;
        joinGameBtn.disabled = true;
    }

    controlMode = 'keyboard';
    document.querySelectorAll('.control-mode-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll(`.control-mode-button[data-mode="keyboard"]`).forEach(btn => btn.classList.add('active'));
    levelSelect.value = '91';
    setSinglePlayerSizeMode('preset');
    
    populateSizeDropdowns();
    const { maxWidth, maxHeight } = calculateMaxMazeSize();
    mazeWidthSelect.value = Math.min(91, maxWidth);
    mazeHeightSelect.value = Math.min(91, maxHeight);
}

function updateLobbyUI(isMaster) {
    const isCustom = lobbySizeMode === 'custom';

    levelSelectLobby.disabled = !isMaster || isCustom;
    mazeWidthSelectLobby.disabled = !isMaster || !isCustom;
    mazeHeightSelectLobby.disabled = !isMaster || !isCustom;
    presetModeBtnLobby.disabled = !isMaster;
    customModeBtnLobby.disabled = !isMaster;
    
    if (isMaster) {
        readyButton.style.display = 'none';
        startLobbyButton.style.display = 'flex';
        startLobbyButton.disabled = true;
        roomInfoContainer.style.display = 'flex';
    } else {
        readyButton.style.display = 'flex';
        startLobbyButton.style.display = 'none';
        roomInfoContainer.style.display = 'flex';
    }
}


async function takeScreenshot(elementToCapture) {
    playShutterSound();
    flashOverlay.classList.add('flash-effect');
    setTimeout(() => flashOverlay.classList.remove('flash-effect'), 300);
    try {
        const canvasElement = await html2canvas(elementToCapture);
        const imageDataUrl = canvasElement.toDataURL('image/png');
        
        const response = await fetch(imageDataUrl);
        lastScreenshotBlob = await response.blob();

        screenshotImage.src = imageDataUrl;
        screenshotModal.style.display = 'flex';
    } catch (err) {
        console.error('Screenshot failed:', err);
        alert('스크린샷 생성에 실패했습니다.');
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
    
    player = { ...startPos, character: player.character };
    playerPath = [{ ...player }];
}

function checkWin() {
    if (gameWon) return;

    if (player.x === endPos.x && player.y === endPos.y) {
        gameWon = true;
        clearInterval(timerInterval);
        
        const finishTime = updateTimerDisplay();

        if (socket) {
            socket.emit('playerFinished', { finishTime });
            showWaitingModal(finishTime);
        } else {
            showGameOverModal({
                clearTime: finishTime,
                mazeSize: `${MAZE_WIDTH} x ${MAZE_HEIGHT}`,
                rankings: [{ rank: 1, nickname: '나', finishTime: finishTime }]
            });
        }
        
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
    if (gameWon) return;
    
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
        player = { ...savedPos, character: player.character };
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
    playSound(spotSaveSound);
    player = { ...startPos, character: player.character };
    playerPath = [{ ...player }];
}

function handleWButton() {
    if (gameWon || wButtonUsed) return;
    wButtonUsed = true;
    wButton.disabled = true;
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
    moveIntervals[direction] = setInterval(moveMap[direction], 75);
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

function resetLobbyState() {
    isReady = false;
    selectedCharacter = null;
    readyButton.textContent = '준비';
    readyButton.style.backgroundColor = 'var(--color-green-pastel)';
    readyButton.disabled = true;
}

function updateCharacterSelectionUI(lobbyState) {
    characterSelectContainer.innerHTML = '';
    const takenCharacters = Object.values(lobbyState.players)
        .map(p => p.character)
        .filter(Boolean);

    const myPlayer = lobbyState.players[socket.id];
    selectedCharacter = myPlayer ? myPlayer.character : null;

    CHARACTER_LIST.forEach(char => {
        const button = document.createElement('button');
        button.className = 'character-button';
        button.textContent = char;
        button.dataset.character = char;

        if (selectedCharacter === char) {
            button.classList.add('selected');
        }

        if (takenCharacters.includes(char) && selectedCharacter !== char) {
            button.disabled = true;
        }
        
        characterSelectContainer.appendChild(button);
    });

    if (playerRole === 'guest') {
        readyButton.disabled = !selectedCharacter || isReady;
    } else if (playerRole === 'master') {
        const guests = Object.values(lobbyState.players).filter(p => !p.isMaster);
        const allGuestsReady = guests.length > 0 ? guests.every(p => p.isReady) : true; // 게스트가 없으면 통과
        startLobbyButton.disabled = !selectedCharacter || !allGuestsReady;
    }
}

function setupSocketListeners() {
    socket.on("connect", () => console.log("서버 연결 성공:", socket.id));
    socket.on("connect_error", (err) => console.error("서버 연결 실패:", err.message));

    socket.on('roomCreated', ({ roomId }) => {
        currentRoomId = roomId;
        roomIdDisplay.textContent = roomId;
        playerRole = 'master';
        resetLobbyState();
        updateLobbyUI(true);
    });

    socket.on('joinSuccess', ({ room }) => {
        console.log('방에 성공적으로 참여했습니다.');
        multiplayerChoiceContainer.classList.add('hidden');
        lobbyContainer.classList.remove('hidden');
        playerRole = 'guest';
        
        resetLobbyState();

        setLobbySizeMode(room.settings.mode);
        levelSelectLobby.value = room.settings.preset;
        mazeWidthSelectLobby.value = room.settings.width;
        mazeHeightSelectLobby.value = room.settings.height;

        updateLobbyUI(false);
        updateCharacterSelectionUI(room);
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
            roomButton.textContent = `방 ID: ${room.id} (${room.playerCount}/${room.maxPlayers})`;
            roomButton.onclick = () => {
                socket.emit('joinGame', { roomId: room.id });
                roomListModal.style.display = 'none';
            };
            roomListContainer.appendChild(roomButton);
        });
    });

    socket.on('lobbyStateUpdate', (lobbyState) => {
        if (playerRole === 'guest') {
            setLobbySizeMode(lobbyState.settings.mode);
            levelSelectLobby.value = lobbyState.settings.preset;
            mazeWidthSelectLobby.value = lobbyState.settings.width;
            mazeHeightSelectLobby.value = lobbyState.settings.height;
        }
        
        updateCharacterSelectionUI(lobbyState);
    });
    
    socket.on('unReadyAllPlayers', () => {
        isReady = false;
        readyButton.textContent = '준비';
        readyButton.style.backgroundColor = 'var(--color-green-pastel)';
    });

    socket.on('gameCountdown', () => {
        mainLayout.className = `main-layout mode-${controlMode}`;
        startScreenModal.style.display = 'none';
        mainLayout.style.display = 'flex';
        countdownOverlay.classList.remove('hidden');
        let count = 5;
        countdownText.textContent = count;
        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownText.textContent = count;
            } else if (count === 0) {
                countdownText.textContent = "START!";
            } else {
                clearInterval(interval);
                countdownOverlay.classList.add('hidden');
            }
        }, 1000);
    });

    socket.on('gameStartingWithData', (data) => {
        maze = data.maze;
        startPos = data.startPos;
        endPos = data.endPos;
        MAZE_WIDTH = data.mazeSize.width;
        MAZE_HEIGHT = data.mazeSize.height;

        otherPlayers = {};
        for(const playerId in data.players) {
            if (playerId !== socket.id) {
                otherPlayers[playerId] = {
                    id: playerId,
                    x: data.startPos.x,
                    y: data.startPos.y,
                    character: data.players[playerId].character
                };
            } else {
                player.character = data.players[playerId].character;
            }
        }

        startGameplay();
    });

    socket.on('rankingUpdate', (finishers) => {
        if (gameWon) { // 내가 이미 도착했을 때만 랭킹 업데이트
            updateRankingModal(finishers);
        }
    });

    socket.on('gameOver', (data) => {
        showGameOverModal(data);
    });

    socket.on('returnToLobby', (roomState) => {
        winModal.style.display = 'none';
        mainLayout.style.display = 'none';
        startScreenModal.style.display = 'flex';
        lobbyContainer.classList.remove('hidden');
        
        resetLobbyState();

        updateLobbyUI(playerRole === 'master');
        updateCharacterSelectionUI(roomState);
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
            otherPlayers[playerInfo.id].character = playerInfo.character;
        } else if (playerInfo.id !== socket.id) {
            otherPlayers[playerInfo.id] = playerInfo;
        }
    });
    socket.on('playerDisconnected', (playerId) => delete otherPlayers[playerId]);
}

function updateRankingModal(finishers) {
    let rankingHTML = '';
    finishers.sort((a, b) => a.rank - b.rank).forEach(player => {
        const isMe = player.id === socket.id;
        rankingHTML += `<p class="text-md ${isMe ? 'font-bold text-blue-600' : ''}">${player.rank}위: ${player.nickname} (${player.finishTime})</p>`;
    });
    
    const rankingContainer = winModalContent.querySelector('#rankingContainer');
    if (rankingContainer) {
        rankingContainer.innerHTML = rankingHTML;
    }
}

function showWaitingModal(finishTime) {
    let waitingHTML = `
        <span id="winEmoji" style="animation: none;">🏁</span>
        <p class="win-message-line">기록: ${finishTime}</p>
        <p class="win-message-line" style="font-size: 1.2rem; margin-top: 1rem;">다른 플레이어를 기다리는 중...</p>
        <div id="rankingContainer" class="w-full mt-4 border-t pt-4">
             <p class="text-md font-bold text-blue-600">1위: ${playerNickname} (${finishTime})</p>
        </div>
    `;
    winModalContent.innerHTML = waitingHTML;
    winModal.style.display = 'flex';
}

function showGameOverModal(data) {
    let rankingHTML = `
        <span id="winEmoji">🎉</span>
        <p class="win-message-line">게임 종료!</p>
        <p class="win-message-line" style="font-size: 1.2rem;">미로 크기: ${data.mazeSize}</p>
        <div class="w-full mt-4 border-t pt-4">
            <h3 class="text-lg font-bold mb-2">최종 순위</h3>
    `;
    data.rankings.forEach(player => {
        const isMe = socket ? player.id === socket.id : player.rank === 1;
        const timeText = player.finishTime === 'retire' ? '<span class="text-red-500">Retire</span>' : player.finishTime;
        rankingHTML += `<p class="text-md ${isMe ? 'font-bold text-blue-600' : ''}">${player.rank}위: ${player.nickname} (${timeText})</p>`;
    });
    rankingHTML += '</div>';
    
    const isMultiplayer = !!socket;
    rankingHTML += `
        <div class="win-modal-buttons mt-4">
            <button id="gameOverLobbyBtn" class="action-button">로비</button>
            ${isMultiplayer ? '<button id="gameOverRematchBtn" class="action-button">한번 더</button>' : ''}
            <button id="gameOverScreenshotBtn" class="action-button">스크린샷</button>
        </div>
    `;
    
    winModalContent.innerHTML = rankingHTML;
    
    document.getElementById('gameOverLobbyBtn').addEventListener('click', showStartScreen);
    
    if (isMultiplayer) {
        document.getElementById('gameOverRematchBtn').addEventListener('click', () => {
            socket.emit('requestRematch');
        });
    }

    const screenshotBtn = document.getElementById('gameOverScreenshotBtn');
    screenshotBtn.addEventListener('click', () => {
        takeScreenshot(winModalContent);
        screenshotBtn.disabled = true; // 한번 찍으면 비활성화
    });

    winModal.style.display = 'flex';
}


function startGameplay() {
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

    [winModal, helpModal, screenshotModal].forEach(modal => {
        if(modal.id !== 'winModal' || !socket) {
            modal.style.display = 'none';
        }
    });
    [wButton, qButton].forEach(btn => btn.disabled = false);
    clearInterval(timerInterval);
    
    player = { ...startPos, character: player.character || '🐎' };
    playerPath = [{ ...player }];

    initializeCanvasSize();

    if (socket) {
        socket.emit('playerMovement', { x: player.x, y: player.y });
    }

    playImpactSound();
    animate();
    startTime = Date.now();
    timerInterval = setInterval(() => {
        timerDisplay.textContent = updateTimerDisplay();
    }, 10);
}

function initGame() {
    generateMaze();
    placeStartEnd();
    startGameplay();
}

function setSinglePlayerSizeMode(mode) {
    singlePlayerSizeMode = mode;
    if (mode === 'preset') {
        presetContent.classList.remove('disabled-content');
        customContent.classList.add('disabled-content');
        presetModeBtn.classList.add('active');
        customModeBtn.classList.remove('active');
    } else {
        presetContent.classList.add('disabled-content');
        customContent.classList.remove('disabled-content');
        presetModeBtn.classList.remove('active');
        customModeBtn.classList.add('active');
        populateSizeDropdowns();
    }
}

function setLobbySizeMode(mode) {
    lobbySizeMode = mode;
    if (mode === 'preset') {
        presetContentLobby.classList.remove('disabled-content');
        customContentLobby.classList.add('disabled-content');
        presetModeBtnLobby.classList.add('active');
        customModeBtnLobby.classList.remove('active');
    } else {
        presetContentLobby.classList.add('disabled-content');
        customContentLobby.classList.remove('disabled-content');
        presetModeBtnLobby.classList.remove('active');
        customModeBtnLobby.classList.add('active');
    }
    updateLobbyUI(playerRole === 'master');
}


function setupEventListeners() {
    [controlModeContainer, controlModeContainerLobby].forEach(container => {
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('control-mode-button')) {
                controlMode = e.target.dataset.mode;
                mainLayout.className = `main-layout mode-${controlMode}`;
                
                document.querySelectorAll('.control-mode-button').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll(`.control-mode-button[data-mode="${controlMode}"]`).forEach(btn => btn.classList.add('active'));
            }
        });
    });

    startSinglePlayerButton.addEventListener('click', () => {
        if (singlePlayerSizeMode === 'preset') {
            const level = levelSelect.value;
            if (level === 'max') {
                const { maxWidth, maxHeight } = calculateMaxMazeSize();
                MAZE_WIDTH = maxWidth;
                MAZE_HEIGHT = maxHeight;
            } else {
                const size = parseInt(level);
                MAZE_WIDTH = size;
                MAZE_HEIGHT = size;
            }
        } else {
            MAZE_WIDTH = parseInt(mazeWidthSelect.value);
            MAZE_HEIGHT = parseInt(mazeHeightSelect.value);
        }
        
        mainLayout.className = `main-layout mode-${controlMode}`;
        startScreenModal.style.display = 'none';
        mainLayout.style.display = 'flex';
        player.character = '🐎';
        initGame();
    });

    presetModeBtn.addEventListener('click', () => setSinglePlayerSizeMode('preset'));
    customModeBtn.addEventListener('click', () => setSinglePlayerSizeMode('custom'));

    randomSizeButton.addEventListener('click', () => {
        setSinglePlayerSizeMode('custom');
    
        const { maxWidth, maxHeight } = calculateMaxMazeSize();
        const widthOptions = Array.from(mazeWidthSelect.options).filter(opt => parseInt(opt.value) <= maxWidth);
        const heightOptions = Array.from(mazeHeightSelect.options).filter(opt => parseInt(opt.value) <= maxHeight);
    
        const randomWidthOption = widthOptions[Math.floor(Math.random() * widthOptions.length)];
        const randomHeightOption = heightOptions[Math.floor(Math.random() * heightOptions.length)];
    
        mazeWidthSelect.value = randomWidthOption.value;
        mazeHeightSelect.value = randomHeightOption.value;
    });

    singlePlayerBtn.addEventListener('click', () => {
        gameModeContainer.classList.add('hidden');
        singlePlayerContainer.classList.remove('hidden');
        homeButton.style.display = 'flex';
        updateMaxSizeLabel();
        setSinglePlayerSizeMode('preset'); 
    });

    multiplayerBtn.addEventListener('click', () => {
        gameModeContainer.classList.add('hidden');
        multiplayerChoiceContainer.classList.remove('hidden');
        homeButton.style.display = 'flex';
    });

    nicknameInput.addEventListener('input', () => {
        if (nicknameInput.value.trim()) {
            confirmNicknameBtn.classList.add('active-blue');
        } else {
            confirmNicknameBtn.classList.remove('active-blue');
        }
    });

    confirmNicknameBtn.addEventListener('click', () => {
        const nickname = nicknameInput.value.trim();
        if (nickname) {
            playerNickname = nickname;
            socket.emit('setNickname', { nickname });
            nicknameInput.disabled = true;
            confirmNicknameBtn.disabled = true;
            confirmNicknameBtn.classList.remove('active-blue');
            createNewGameBtn.disabled = false;
            joinGameBtn.disabled = false;
        } else {
            alert('닉네임을 입력해주세요.');
        }
    });

    homeButton.addEventListener('click', showStartScreen);

    createNewGameBtn.addEventListener('click', () => {
        multiplayerChoiceContainer.classList.add('hidden');
        lobbyContainer.classList.remove('hidden');
        setLobbySizeMode('preset');
        
        const settings = {
            mode: lobbySizeMode,
            preset: levelSelectLobby.value,
            width: parseInt(mazeWidthSelectLobby.value),
            height: parseInt(mazeHeightSelectLobby.value)
        };
        socket.emit('createGame', settings);
    });

    joinGameBtn.addEventListener('click', () => {
        socket.emit('requestRoomList');
        roomListModal.style.display = 'flex';
    });

    closeRoomListModalButton.addEventListener('click', () => roomListModal.style.display = 'none');

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
        if(socket) socket.emit('leaveRoom');
    });
    
    characterSelectContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.character-button');
        if (button && !button.disabled) {
            const character = button.dataset.character;
            socket.emit('selectCharacter', { character });
        }
    });

    const sendLobbySettings = () => {
        if (playerRole === 'master') {
            const settings = {
                mode: lobbySizeMode,
                preset: levelSelectLobby.value,
                width: parseInt(mazeWidthSelectLobby.value),
                height: parseInt(mazeHeightSelectLobby.value)
            };
            socket.emit('settingsChanged', settings);
        }
    };
    
    presetModeBtnLobby.addEventListener('click', () => {
        setLobbySizeMode('preset');
        sendLobbySettings();
    });
    customModeBtnLobby.addEventListener('click', () => {
        setLobbySizeMode('custom');
        sendLobbySettings();
    });
    [levelSelectLobby, mazeWidthSelectLobby, mazeHeightSelectLobby].forEach(select => {
        select.addEventListener('change', sendLobbySettings);
    });


    readyButton.addEventListener('click', () => {
        if (!selectedCharacter) return;
        isReady = !isReady;
        readyButton.textContent = isReady ? '준비 완료!' : '준비';
        readyButton.style.backgroundColor = isReady ? 'var(--color-blue-pastel)' : 'var(--color-green-pastel)';
        readyButton.disabled = true; // 한번 누르면 비활성화, 서버 응답으로 다시 활성화
        socket.emit('playerReady', { isReady });
    });

    startLobbyButton.addEventListener('click', () => {
        if (playerRole === 'master' && selectedCharacter) {
            if (lobbySizeMode === 'preset') {
                const size = parseInt(levelSelectLobby.value);
                MAZE_WIDTH = size;
                MAZE_HEIGHT = size;
            } else {
                MAZE_WIDTH = parseInt(mazeWidthSelectLobby.value);
                MAZE_HEIGHT = parseInt(mazeHeightSelectLobby.value);
            }
            generateMaze();
            placeStartEnd();
            socket.emit('gameDataReady', {
                maze,
                startPos,
                endPos,
                mazeSize: { width: MAZE_WIDTH, height: MAZE_HEIGHT }
            });
        }
    });

    document.addEventListener('keydown', (e) => {
        if (startScreenModal.style.display !== 'none') return;
        const key = e.key.toLowerCase();

        if (['1', '2'].includes(key)) { saveOrLoadPosition(key); return; }
        if (key === 'q') { handleQButton(); return; }
        if (key === 'w') { handleWButton(); return; }

        switch (e.key) {
            case 'ArrowUp': movePlayer(0, -1); break;
            case 'ArrowDown': movePlayer(0, 1); break;
            case 'ArrowLeft': movePlayer(-1, 0); break;
            case 'ArrowRight': movePlayer(1, 0); break;
        }
    });

    ['up', 'down', 'left', 'right'].forEach(dir => {
        const btn = document.getElementById(dir);
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); startContinuousMove(dir); });
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); startContinuousMove(dir); });
        btn.addEventListener('mouseleave', () => stopContinuousMove(dir));
        btn.addEventListener('touchend', () => stopContinuousMove(dir));
    });
    document.addEventListener('mouseup', stopAllContinuousMoves);

    joystickBase.addEventListener('mousedown', startJoystick);
    joystickBase.addEventListener('touchstart', startJoystick, { passive: false });
    document.addEventListener('mousemove', handleJoystickMove);
    document.addEventListener('touchmove', handleJoystickMove, { passive: false });
    document.addEventListener('mouseup', stopJoystick);
    document.addEventListener('touchend', stopJoystick);

    [qButton].forEach(btn => btn.addEventListener('click', handleQButton));
    [wButton].forEach(btn => btn.addEventListener('click', handleWButton));
    for (const key in rollbackButtons) {
        if (rollbackButtons[key]) rollbackButtons[key].addEventListener('click', () => saveOrLoadPosition(key));
    }
    
    restartButton.addEventListener('click', initGame);
    resetSizeButton.addEventListener('click', showStartScreen);
    helpButton.addEventListener('click', () => { helpModal.style.display = 'flex'; });
    closeHelpModalButton.addEventListener('click', () => { helpModal.style.display = 'none'; });
    
    closeScreenshotModalButton.addEventListener('click', () => { screenshotModal.style.display = 'none'; });
    copyScreenshotButton.addEventListener('click', async () => {
        if (navigator.clipboard && navigator.clipboard.write && lastScreenshotBlob) {
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': lastScreenshotBlob })]);
                copyScreenshotButton.textContent = '복사됨!';
                setTimeout(() => { copyScreenshotButton.textContent = '복사'; }, 2000);
            } catch (err) {
                console.error('클립보드 복사 실패:', err);
                alert('클립보드 복사에 실패했습니다.');
            }
        } else {
            alert('이 브라우저에서는 클립보드 복사를 지원하지 않거나, 복사할 이미지가 없습니다.');
        }
    });
    
    soundToggleButton.addEventListener('click', () => {
        isSoundOn = !isSoundOn;
        soundToggleButton.textContent = isSoundOn ? '🔊' : '🔇';
        const allHtmlAudio = [gallopingSound, spotSaveSound, spotLoadSound, pastStepSound, clearSound];
        allHtmlAudio.forEach(audio => audio.muted = !isSoundOn);
        if(audioContextResumed) Tone.Destination.mute = !isSoundOn;
        if (!isSoundOn && gallopingSound && !gallopingSound.paused) {
            gallopingSound.pause();
        }
    });

    window.addEventListener('resize', () => { 
        if (mainLayout.style.display === 'flex') { 
            initializeCanvasSize(); 
        }
        if (singlePlayerContainer.classList.contains('hidden') === false) {
            updateMaxSizeLabel();
        }
    });
}

function populateSizeDropdowns() {
    const selects = [mazeWidthSelect, mazeHeightSelect, mazeWidthSelectLobby, mazeHeightSelectLobby];
    selects.forEach(s => s.innerHTML = '');

    const { maxWidth, maxHeight } = calculateMaxMazeSize();
    
    for (let i = 43; i <= maxWidth; i += STEP) {
        mazeWidthSelect.add(new Option(i, i));
        mazeWidthSelectLobby.add(new Option(i, i));
    }
     for (let i = 43; i <= maxHeight; i += STEP) {
        mazeHeightSelect.add(new Option(i, i));
        mazeHeightSelectLobby.add(new Option(i,i));
    }
    
    const defaultSize = Math.min(91, Math.min(maxWidth, maxHeight));
    mazeWidthSelect.value = defaultSize;
    mazeHeightSelect.value = defaultSize;
    mazeWidthSelectLobby.value = defaultSize;
    mazeHeightSelectLobby.value = defaultSize;
}

document.addEventListener('DOMContentLoaded', () => {
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect=function(t,e,o,i,n){return o<2*n&&(n=o/2),i<2*n&&(n=i/2),this.beginPath(),this.moveTo(t+n,e),this.arcTo(t+o,e,t+o,e+i,n),this.arcTo(t+o,e+i,t,e+i,n),this.arcTo(t,e+i,t,e,n),this.arcTo(t,e,t+o,e,n),this.closePath(),this}
    }
    
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