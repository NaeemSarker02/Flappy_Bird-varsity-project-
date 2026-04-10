const bird = document.querySelector('.bird');
const birdSprite = document.querySelector('#bird-1');
const stage = document.querySelector('.stage');
const pipeLayer = document.querySelector('.pipe-layer');
const message = document.querySelector('.message');
const scoreVal = document.querySelector('.score_val');
const bestVal = document.querySelector('.best_val');
const scoreCard = document.querySelector('.score-card');
const gameShell = document.querySelector('.game-shell');

const pointSound = new Audio('sounds effect/point.mp3');
const dieSound = new Audio('sounds effect/die.mp3');
const bestScoreKey = 'flappy-best-score';

const config = {
    gravity: 1500,
    flapLift: -360,
    pipeBaseSpeed: 255,
    pipeSpeedStep: 8,
    spawnInterval: 1.45,
    minSpawnInterval: 1.05,
    pipeGapRatio: 0.3,
    minPipeGap: 165,
    maxPipeGap: 235,
    birdLeftRatio: 0.22,
    hitboxInsetX: 0.18,
    hitboxInsetY: 0.18
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
    stageWidth: window.innerWidth
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

function syncSceneMetrics() {
    const rect = stage.getBoundingClientRect();
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
}

function createPipeElement(position) {
    const pipe = document.createElement('div');
    pipe.className = `pipe_sprite ${position === 'top' ? 'pipe--top' : 'pipe--bottom'}`;
    return pipe;
}

function updatePipeStyles(pipePair) {
    pipePair.top.style.left = `${pipePair.x}px`;
    pipePair.top.style.height = `${pipePair.topHeight}px`;
    pipePair.bottom.style.left = `${pipePair.x}px`;
    pipePair.bottom.style.height = `${pipePair.bottomHeight}px`;
}

function spawnPipePair() {
    const gap = clamp(state.playableHeight * config.pipeGapRatio, config.minPipeGap, Math.min(config.maxPipeGap, state.playableHeight * 0.34));
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

    state.birdVelocity = config.flapLift;
    state.wingTimer = 0;
    setBirdFrame(true);
}

function birdHitbox() {
    const birdLeft = state.stageWidth * config.birdLeftRatio + state.birdWidth * config.hitboxInsetX;
    const birdRight = state.stageWidth * config.birdLeftRatio + state.birdWidth * (1 - config.hitboxInsetX);
    const birdTop = state.birdY + state.birdHeight * config.hitboxInsetY;
    const birdBottom = state.birdY + state.birdHeight * (1 - config.hitboxInsetY);

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

    bird.style.top = `${displayY}px`;
    bird.style.transform = `translate3d(0, 0, 0) rotate(${angle}deg) scale(${scale})`;
}

function updateGame(deltaSeconds) {
    state.birdVelocity += config.gravity * deltaSeconds;
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
    const spawnEvery = Math.max(config.minSpawnInterval, config.spawnInterval - state.score * 0.02);
    if (state.spawnTimer >= spawnEvery) {
        state.spawnTimer = 0;
        spawnPipePair();
    }

    const pipeSpeed = config.pipeBaseSpeed + Math.min(state.score, 20) * config.pipeSpeedStep;
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
    window.addEventListener('resize', syncSceneMetrics);
    requestAnimationFrame(tick);
}

window.addEventListener('load', init, { once: true });
