export let scaleX = 1, scaleY = 1;

export const BASE_VIEW_W = 900, BASE_VIEW_H = 550;
export const BASE_WORLD_W = 2400, BASE_WORLD_H = 550;
export const BASE_GROUND_Y = 510;

export const GRAVITY = 0.35;
export const MAX_PULL_DISTANCE = 140;
export const MAX_LAUNCH_SPEED = 34;
export const MIN_LAUNCH_SPEED = 8;
export const EXPLOSIVE_COOLDOWN_WAVES = 2;

export const camera = { x: 0, y: 0, targetX: 0, speed: 0.12 };

export const game = {
    wave: 1,
    state: 'aiming',
    ammo: { green: 0, brown: 0 },
    enemies: [],
    blocks: [],
    projectiles: [],
    particles: [],
    slingshot: { x: 180, y: 460, radius: 14 },
    dragStart: null,
    dragCurrent: null,
    isDragging: false,
    usingExplosive: false,
    supportCooldown: 3,
    supportReady: false,
    wavesCompleted: 0,
    lastTouchPos: null,
    nextWaveTimer: null,
    waveEnemiesTotal: 0,
    waveEnemiesSpawned: 0,
    waveEnemiesAlive: 0,
    spawnTimer: null,
    waveInProgress: false,
    cameraMode: 'home',
    gameStarted: false,
    gameOver: false,
    paused: false,
    explosiveCoconut: { available: false, cooldown: EXPLOSIVE_COOLDOWN_WAVES },
};

let _canvas = null;
let _ctx = null;
let _dom = null;

export function initCore() {
    if (_canvas) return { canvas: _canvas, ctx: _ctx, dom: _dom };
    
    _canvas = document.getElementById('gameCanvas');
    _ctx = _canvas ? _canvas.getContext('2d') : null;
    
    _dom = {
        waveDisplay: document.getElementById('waveDisplay'),
        greenCountEl: document.getElementById('greenCount'),
        brownCountEl: document.getElementById('brownCount'),
        statusDisplay: document.getElementById('statusDisplay'),
        supportBtn: document.getElementById('supportBtn'),
        supportCounter: document.getElementById('supportCounter'),
        pauseBtn: document.getElementById('pauseBtn'),
        resetBtn: document.getElementById('resetBtn'),
        fullscreenBtn: document.getElementById('fullscreenBtn'),
        explosiveBtn: document.getElementById('explosiveBtn'),
        explosiveCounter: document.getElementById('explosiveCounter'),
    };
    
    return { canvas: _canvas, ctx: _ctx, dom: _dom };
}

export function getCanvas() { return _canvas; }
export function getCtx() { return _ctx; }

export function updateScale() {
    if (!_canvas) return;
    // NO tocar canvas.width/height — el CSS maneja el escalado visual.
    // Solo calculamos scaleX/scaleY para mapear coordenadas de input.
    const rect = _canvas.getBoundingClientRect();
    scaleX = BASE_VIEW_W / (rect.width  || BASE_VIEW_W);
    scaleY = BASE_VIEW_H / (rect.height || BASE_VIEW_H);
}

export const VIEW_W = BASE_VIEW_W;
export const VIEW_H = BASE_VIEW_H;
export const WORLD_W = BASE_WORLD_W;
export const WORLD_H = BASE_WORLD_H;
export const GROUND_Y = BASE_GROUND_Y;
