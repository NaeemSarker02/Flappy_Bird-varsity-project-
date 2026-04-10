const bird = document.querySelector('.bird');
const birdSprite = document.querySelector('#bird-1');
const stage = document.querySelector('.stage');
const pipeLayer = document.querySelector('.pipe-layer');
const particleLayer = document.querySelector('.particle-layer');
const message = document.querySelector('.message');
const scoreVal = document.querySelector('.score_val');
const bestVal = document.querySelector('.best_val');
const scoreCard = document.querySelector('.score-card');
const gameShell = document.querySelector('.game-shell');
const flapButton = document.querySelector('.flap-button');

const pointSound = new Audio('sounds effect/point.mp3');
const dieSound = new Audio('sounds effect/die.mp3');
const bestScoreKey = 'flappy-best-score';

const config = {
    gravity: 1450,
    flapLift: -350,
    pipeBaseSpeed: 245,
    pipeSpeedStep: 7,
    spawnInterval: 1.5,
    minSpawnInterval: 1.08,
    pipeGapRatio: 0.31,
    minPipeGap: 170,
    maxPipeGap: 245,
    birdLeftRatio: 0.21,
    hitboxInsetX: 0.18,
    hitboxInsetY: 0.18,
    veryCompactWidth: 480,
    compactWidth: 768
};

const state = {
    status: 'start',
    lastFrame: 0,
    birdY: 0,
    birdVelocity: 0,
    birdWidth: 120,
    birdHeight: 90,
    playableHeight: 0,
    groundHeight: 96,
    pipeWidth: 90,
    spawnTimer: 0,
    birdWingUp: false,
    wingTimer: 0,
    pipes: [],
    score: 0,
    bestScore: loadBestScore(),
    stageWidth: window.innerWidth,
    compactMode: false,
    gravity: config.gravity,
    flapLift: config.flapLift,
    pipeBaseSpeed: config.pipeBaseSpeed,
    pipeSpeedStep: config.pipeSpeedStep,
    spawnInterval: config.spawnInterval,
    minSpawnInterval: config.minSpawnInterval,
    pipeGapRatio: config.pipeGapRatio,
    minPipeGap: config.minPipeGap,
    maxPipeGap: config.maxPipeGap,
    birdLeftRatio: config.birdLeftRatio,
    hitboxInsetX: config.hitboxInsetX,
    hitboxInsetY: config.hitboxInsetY
};

pointSound.preload = 'auto';
dieSound.preload = 'auto';
bestVal.textContent = String(state.bestScore);

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function loadBestScore() {
    try {
        return Number(localStorage.getItem(bestScoreKey)) || 0;
    } catch {
        return 0;
    }
}

function saveBestScore() {
    try {
        localStorage.setItem(bestScoreKey, String(state.bestScore));
    } catch {
        return;
    }
}

function playSound(sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {
        return;
    });
}

function vibrate(pattern) {
    if (typeof navigator.vibrate !== 'function') {
        return;
    }

    navigator.vibrate(pattern);
}

function pulseFlapButton() {
    if (!state.compactMode) {
        return;
    }

    flapButton.classList.remove('is-pulsing');
    void flapButton.offsetWidth;
    flapButton.classList.add('is-pulsing');
}

function emitParticles(originX, originY, options = {}) {
    const count = options.count ?? 6;
    const sizeMin = options.sizeMin ?? 8;
    const sizeMax = options.sizeMax ?? 14;
    const spreadX = options.spreadX ?? 34;
    const spreadY = options.spreadY ?? 34;
    const driftY = options.driftY ?? [-10, -72];
    const driftX = options.driftX ?? [-42, 42];
    const duration = options.duration ?? [360, 620];
    const colors = options.colors ?? ['rgba(255, 221, 106, 0.95)', 'rgba(255, 155, 51, 0.92)', 'rgba(255, 246, 204, 0.9)'];
    const feather = options.feather ?? false;

    for (let index = 0; index < count; index += 1) {
        const particle = document.createElement('span');
        const size = randomBetween(sizeMin, sizeMax);
        const startX = originX + randomBetween(-spreadX, spreadX);
        const startY = originY + randomBetween(-spreadY, spreadY);
        const particleDriftX = randomBetween(driftX[0], driftX[1]);
        const particleDriftY = randomBetween(driftY[0], driftY[1]);
        const particleDuration = randomBetween(duration[0], duration[1]);

        particle.className = `particle${feather ? ' particle--feather' : ''}`;
        particle.style.setProperty('--size', `${size}px`);
        particle.style.setProperty('--start-x', `${startX}px`);
        particle.style.setProperty('--start-y', `${startY}px`);
        particle.style.setProperty('--drift-x', `${particleDriftX}px`);
        particle.style.setProperty('--drift-y', `${particleDriftY}px`);
        particle.style.setProperty('--duration', `${particleDuration}ms`);
        particle.style.setProperty('--particle-color', colors[index % colors.length]);
        particle.addEventListener('animationend', () => particle.remove(), { once: true });
        particleLayer.appendChild(particle);
    }
}

function birdCenter() {
    return {
        x: state.stageWidth * state.birdLeftRatio + state.birdWidth * 0.5,
        y: state.birdY + state.birdHeight * 0.5
    };
}

function setMessage(title, lines, eyebrow) {
    message.innerHTML = `
        <h2>${eyebrow}</h2>
        <h3>${title}</h3>
        ${lines.map((line) => `<p>${line}</p>`).join('')}
    `;
    message.classList.remove('is-hidden');
}

function hideMessage() {
    message.classList.add('is-hidden');
}

function updateDifficultyProfile(rect) {
    const veryCompactMode = rect.width <= config.veryCompactWidth || rect.height <= 560;
    const compactMode = veryCompactMode || rect.width <= config.compactWidth || rect.height <= 700;
    state.compactMode = compactMode;
    state.gravity = veryCompactMode ? 1260 : compactMode ? 1320 : config.gravity;
    state.flapLift = veryCompactMode ? -305 : compactMode ? -320 : config.flapLift;
    state.pipeBaseSpeed = veryCompactMode ? 198 : compactMode ? 212 : config.pipeBaseSpeed;
    state.pipeSpeedStep = veryCompactMode ? 4 : compactMode ? 5 : config.pipeSpeedStep;
    state.spawnInterval = veryCompactMode ? 1.75 : compactMode ? 1.62 : config.spawnInterval;
    state.minSpawnInterval = veryCompactMode ? 1.28 : compactMode ? 1.18 : config.minSpawnInterval;
    state.pipeGapRatio = veryCompactMode ? 0.36 : compactMode ? 0.34 : config.pipeGapRatio;
    state.minPipeGap = veryCompactMode ? 198 : compactMode ? 185 : config.minPipeGap;
    state.maxPipeGap = veryCompactMode ? 280 : compactMode ? 265 : config.maxPipeGap;
    state.birdLeftRatio = veryCompactMode ? 0.16 : compactMode ? 0.18 : config.birdLeftRatio;
    state.hitboxInsetX = veryCompactMode ? 0.22 : compactMode ? 0.2 : config.hitboxInsetX;
    state.hitboxInsetY = veryCompactMode ? 0.22 : compactMode ? 0.2 : config.hitboxInsetY;

    flapButton.classList.toggle('is-visible', compactMode);
}

function syncSceneMetrics() {
    const rect = stage.getBoundingClientRect();
    updateDifficultyProfile(rect);
    state.stageWidth = rect.width;
    state.groundHeight = clamp(rect.height * 0.14, 84, 116);
    state.pipeWidth = clamp(rect.width * 0.1, 76, 104);
    state.playableHeight = rect.height - state.groundHeight;
    state.birdWidth = bird.offsetWidth || 120;
    state.birdHeight = bird.offsetHeight || 90;

    document.documentElement.style.setProperty('--ground-height', `${state.groundHeight}px`);
    document.documentElement.style.setProperty('--pipe-width', `${state.pipeWidth}px`);

    if (state.birdY + state.birdHeight > state.playableHeight) {
        state.birdY = Math.max(0, state.playableHeight - state.birdHeight);
    }

    state.pipes.forEach((pipePair) => updatePipeStyles(pipePair));
}

function resetPipes() {
    state.pipes.forEach((pipePair) => {
        pipePair.top.remove();
        pipePair.bottom.remove();
    });
    state.pipes = [];
}

function resetRound() {
    resetPipes();
    state.spawnTimer = 0;
    state.score = 0;
    state.birdVelocity = 0;
    state.birdY = state.playableHeight * 0.38;
    updateScore(0);
    gameShell.classList.remove('is-over');
    setBirdFrame(false);
}

function setBirdFrame(wingUp) {
    state.birdWingUp = wingUp;
    birdSprite.src = wingUp ? 'images/Bird-2.png' : 'images/Bird.png';
}

function updateScore(nextScore) {
    state.score = nextScore;
    scoreVal.textContent = String(state.score);
    scoreCard.classList.remove('score-pop');
    void scoreCard.offsetWidth;
    scoreCard.classList.add('score-pop');

    if (state.score > state.bestScore) {
        state.bestScore = state.score;
        bestVal.textContent = String(state.bestScore);
        saveBestScore();
    }

    const { x, y } = birdCenter();
    emitParticles(x + 16, y - 10, {
        count: 5,
        sizeMin: 8,
        sizeMax: 13,
        driftX: [10, 72],
        driftY: [-18, -86],
        duration: [320, 540],
        colors: ['rgba(255, 226, 122, 0.96)', 'rgba(255, 255, 255, 0.92)', 'rgba(255, 173, 43, 0.92)']
    });
    vibrate(18);
}

function createPipeElement(position) {
    const pipe = document.createElement('div');
    pipe.className = `pipe_sprite ${position === 'top' ? 'pipe--top' : 'pipe--bottom'}`;
    return pipe;
}

function updatePipeStyles(pipePair) {
    pipePair.top.style.transform = `translate3d(${pipePair.x}px, 0, 0)`;
    pipePair.top.style.height = `${pipePair.topHeight}px`;
    pipePair.bottom.style.transform = `translate3d(${pipePair.x}px, 0, 0)`;
    pipePair.bottom.style.height = `${pipePair.bottomHeight}px`;
}

function spawnPipePair() {
    const gap = clamp(state.playableHeight * state.pipeGapRatio, state.minPipeGap, Math.min(state.maxPipeGap, state.playableHeight * 0.36));
    const margin = Math.max(42, state.playableHeight * 0.12);
    const topHeight = randomBetween(margin, state.playableHeight - gap - margin);
    const bottomHeight = state.playableHeight - topHeight - gap;

    const pipePair = {
        x: state.stageWidth + state.pipeWidth + 40,
        topHeight,
        bottomHeight,
        scored: false,
        top: createPipeElement('top'),
        bottom: createPipeElement('bottom')
    };

    updatePipeStyles(pipePair);
    pipeLayer.append(pipePair.top, pipePair.bottom);
    state.pipes.push(pipePair);
}

function startGame() {
    resetRound();
    state.status = 'play';
    state.lastFrame = 0;
    hideMessage();
    gameShell.classList.remove('is-over');
    setBirdFrame(true);
}

function endGame() {
    if (state.status !== 'play') {
        return;
    }

    state.status = 'end';
    gameShell.classList.remove('is-playing');
    gameShell.classList.add('is-over');
    setBirdFrame(false);
    playSound(dieSound);
    const { x, y } = birdCenter();
    emitParticles(x, y, {
        count: 12,
        sizeMin: 8,
        sizeMax: 16,
        spreadX: 18,
        spreadY: 18,
        driftX: [-90, 90],
        driftY: [-20, 110],
        duration: [420, 760],
        colors: ['rgba(255, 191, 97, 0.95)', 'rgba(255, 255, 255, 0.94)', 'rgba(240, 116, 52, 0.88)'],
        feather: true
    });
    vibrate([40, 30, 70]);
    setMessage(
        'Crashed',
        [
            `You scored <span class="message__keys">${state.score}</span> this run.`,
            'Press <span class="message__keys">Enter</span> to restart or tap to jump back in.'
        ],
        'Game Over'
    );
    bestVal.textContent = String(state.bestScore);
}

function flap() {
    if (state.status !== 'play') {
        startGame();
    }

    state.birdVelocity = Math.min(state.birdVelocity, 120);
    state.birdVelocity = state.flapLift;
    state.wingTimer = 0;
    setBirdFrame(true);
    pulseFlapButton();
    const { x, y } = birdCenter();
    emitParticles(x - state.birdWidth * 0.22, y + state.birdHeight * 0.08, {
        count: state.compactMode ? 4 : 3,
        sizeMin: 7,
        sizeMax: 11,
        spreadX: 10,
        spreadY: 8,
        driftX: [-64, -16],
        driftY: [-12, 42],
        duration: [280, 420],
        colors: ['rgba(255, 249, 221, 0.95)', 'rgba(255, 214, 108, 0.92)', 'rgba(255, 168, 55, 0.9)'],
        feather: true
    });
    vibrate(10);
}

function birdHitbox() {
    const birdLeft = state.stageWidth * state.birdLeftRatio + state.birdWidth * state.hitboxInsetX;
    const birdRight = state.stageWidth * state.birdLeftRatio + state.birdWidth * (1 - state.hitboxInsetX);
    const birdTop = state.birdY + state.birdHeight * state.hitboxInsetY;
    const birdBottom = state.birdY + state.birdHeight * (1 - state.hitboxInsetY);

    return { birdLeft, birdRight, birdTop, birdBottom };
}

function updateBirdSprite(deltaSeconds) {
    state.wingTimer += deltaSeconds;
    const cadence = state.status === 'play' ? 0.09 : 0.22;

    if (state.wingTimer >= cadence) {
        state.wingTimer = 0;
        setBirdFrame(!state.birdWingUp);
    }

    if (state.status === 'end') {
        setBirdFrame(false);
    }
}

function renderBird(timestamp) {
    let displayY = state.birdY;
    let angle = -10;
    let scale = 1;

    if (state.status === 'start') {
        displayY += Math.sin(timestamp / 260) * 10;
        angle = -10 + Math.sin(timestamp / 280) * 4;
    } else if (state.status === 'play') {
        angle = clamp(state.birdVelocity * 0.09, -28, 82);
        scale = 1 + Math.min(Math.abs(state.birdVelocity) / 6500, 0.028);
    } else {
        angle = 72;
    }

    bird.style.transform = `translate3d(0, ${displayY}px, 0) rotate(${angle}deg) scale(${scale})`;
}

function updateGame(deltaSeconds) {
    state.birdVelocity += state.gravity * deltaSeconds;
    state.birdY += state.birdVelocity * deltaSeconds;

    if (state.birdY <= 0) {
        state.birdY = 0;
        endGame();
        return;
    }

    if (state.birdY + state.birdHeight >= state.playableHeight) {
        state.birdY = state.playableHeight - state.birdHeight;
        endGame();
        return;
    }

    state.spawnTimer += deltaSeconds;
    const spawnEvery = Math.max(state.minSpawnInterval, state.spawnInterval - state.score * 0.02);
    if (state.spawnTimer >= spawnEvery) {
        state.spawnTimer = 0;
        spawnPipePair();
    }

    const pipeSpeed = state.pipeBaseSpeed + Math.min(state.score, 20) * state.pipeSpeedStep;
    const hitbox = birdHitbox();

    state.pipes = state.pipes.filter((pipePair) => {
        pipePair.x -= pipeSpeed * deltaSeconds;
        updatePipeStyles(pipePair);

        if (!pipePair.scored && pipePair.x + state.pipeWidth < hitbox.birdLeft) {
            pipePair.scored = true;
            updateScore(state.score + 1);
            playSound(pointSound);
        }

        const overlapsX = hitbox.birdRight > pipePair.x && hitbox.birdLeft < pipePair.x + state.pipeWidth;
        const collided = overlapsX && (hitbox.birdTop < pipePair.topHeight || hitbox.birdBottom > state.playableHeight - pipePair.bottomHeight);
        if (collided) {
            endGame();
        }

        if (pipePair.x + state.pipeWidth < -50) {
            pipePair.top.remove();
            pipePair.bottom.remove();
            return false;
        }

        return true;
    });
}

function tick(timestamp) {
    if (!state.lastFrame) {
        state.lastFrame = timestamp;
    }

    const deltaSeconds = Math.min((timestamp - state.lastFrame) / 1000, 0.033);
    state.lastFrame = timestamp;

    updateBirdSprite(deltaSeconds);

    if (state.status === 'play') {
        updateGame(deltaSeconds);
    }

    renderBird(timestamp);
    requestAnimationFrame(tick);
}

function onKeyDown(event) {
    if (event.code === 'ArrowUp' || event.code === 'Space') {
        event.preventDefault();
        flap();
        return;
    }

    if (event.code === 'Enter' && state.status !== 'play') {
        startGame();
    }
}

function onPointerDown() {
    flap();
}

function onFlapButtonPointerDown(event) {
    event.preventDefault();
    event.stopPropagation();
    flap();
}

function init() {
    syncSceneMetrics();
    resetRound();
    setMessage(
        'Sky Dash',
        [
            'Press <span class="message__keys">Enter</span> to start.',
            'Use <span class="message__keys">Space</span>, <span class="message__keys">Arrow Up</span>, or tap to flap through the gates.'
        ],
        'Arcade Flight'
    );

    document.addEventListener('keydown', onKeyDown);
    stage.addEventListener('pointerdown', onPointerDown);
    flapButton.addEventListener('pointerdown', onFlapButtonPointerDown);
    window.addEventListener('resize', syncSceneMetrics);
    requestAnimationFrame(tick);
}

window.addEventListener('load', init, { once: true });
