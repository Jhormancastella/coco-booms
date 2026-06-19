import { game, camera } from './core.js';
import { startWave, activateSupport } from './gameLogic.js';
import { updatePhysics } from './physics.js';
import { draw } from './renderer.js';
import { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } from './input.js';
import { initMenu } from './menu.js';
import { initCore, updateScale } from './core.js';
import { allAssetsLoaded } from './assets.js';
import { initAudio, toggleBackgroundMusic, enableAudio, playSound } from './audio.js';

// ── Detección mobile ──────────────────────────────────────────────────────
const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
window.isMobile = isMobile;

// ── Intro video ───────────────────────────────────────────────────────────
function initIntro(onDone) {
    const screen = document.getElementById('intro-screen');
    const video  = document.getElementById('intro-video');
    const skip   = document.getElementById('intro-skip');
    if (!screen || !video) { onDone(); return; }

    function finish() {
        screen.classList.add('hidden');
        onDone();
    }

    // Reproducimos el video en silencio (browsers lo permiten sin interacción)
    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise.catch(() => {
            // Si falla el video, pasamos al menú directamente
            finish();
        });
    }

    video.addEventListener('ended', finish, { once: true });

    function skipHandler(e) {
        e.preventDefault();
        // Activamos el audio y reproducimos un pequeño sonido para confirmar
        enableAudio();
        setTimeout(() => {
            playSound('launch');
        }, 100);
        
        video.pause();
        finish();
    }
    skip.addEventListener('click', skipHandler, { once: true });
    skip.addEventListener('touchstart', skipHandler, { once: true, passive: false });

    // Add a timeout in case the video never loads or plays (failsafe)
    setTimeout(() => {
        enableAudio();
        finish();
    }, 15000); // 15 seconds max
}

// ── Pantalla de rotación (portrait móvil) ────────────────────────────────
function initRotateScreen() {
    const rotateScreen = document.getElementById('rotate-screen');
    const skipBtn      = document.getElementById('rotate-skip-btn');
    if (!rotateScreen) return;

    function checkOrientation() {
        if (!isMobile) { rotateScreen.classList.remove('show'); return; }
        const isPortrait = window.innerHeight > window.innerWidth;
        // Mostrar pantalla de rotación incluso antes de que el juego empiece
        if (isPortrait) {
            rotateScreen.classList.add('show');
        } else {
            rotateScreen.classList.remove('show');
        }
    }
    window._checkOrientation = checkOrientation;

    if (skipBtn) {
        function dismissRotate(e) {
            if (e) e.preventDefault();
            rotateScreen.classList.remove('show');
        }
        skipBtn.addEventListener('click', dismissRotate);
        skipBtn.addEventListener('touchstart', dismissRotate, { passive: false });
    }

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 200));
    checkOrientation();
}

// ── Reset / carga de nivel ────────────────────────────────────────────────
function resetGame() {
    if (game.nextWaveTimer) clearTimeout(game.nextWaveTimer);
    if (game.spawnTimer)    clearTimeout(game.spawnTimer);
    camera.x = 0; camera.targetX = 0;
    game.cameraMode      = 'home';
    game.wave            = 1;
    game.wavesCompleted  = 0;
    game.supportCooldown = 3;
    game.supportReady    = false;
    game.waveInProgress  = false;
    game.gameOver        = false;
    game.paused          = false;
    game.gameStarted     = true;
    game.state           = 'aiming';
    game.usingExplosive = false;
    game.explosiveCoconut = { available: false, cooldown: 0 };
    game.projectiles = [];
    game.particles = [];
    game.enemies = [];
    game.blocks = [];
    const pb = document.getElementById('pauseBtn');
    if (pb) pb.textContent = '\u23F8';
    hideGameOver();
    startWave(1);
    ensureGameLoop();
    if (window._checkOrientation) window._checkOrientation();
}

function loadLevel(level) {
    if (game.nextWaveTimer) clearTimeout(game.nextWaveTimer);
    if (game.spawnTimer)    clearTimeout(game.spawnTimer);
    camera.x = 0; camera.targetX = 0;
    game.cameraMode      = 'home';
    game.wave            = level || 1;
    game.wavesCompleted  = 0;
    game.supportCooldown = 3;
    game.supportReady    = false;
    game.waveInProgress  = false;
    game.gameOver        = false;
    game.paused          = false;
    game.gameStarted     = true;
    game.state           = 'aiming';
    game.usingExplosive = false;
    game.explosiveCoconut = { available: false, cooldown: 0 };
    game.projectiles = [];
    game.particles = [];
    game.enemies = [];
    game.blocks = [];
    hideGameOver();
    startWave(game.wave);
    ensureGameLoop();
    if (window._checkOrientation) window._checkOrientation();
}

window.resetGame = resetGame;
window.loadLevel = loadLevel;
window.startGame = function() {
    if (!game.gameStarted || !game.waveInProgress) startWave(1);
    game.gameStarted = true;
    game.paused      = false;
    ensureGameLoop();
    if (window._checkOrientation) window._checkOrientation();
};

// ── Game Over ─────────────────────────────────────────────────────────────
function showGameOver() {
    let overlay = document.getElementById('gameover-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gameover-overlay';
        overlay.style.cssText = [
            'position:fixed;inset:0;background:rgba(0,0,0,0.75);',
            'display:flex;flex-direction:column;align-items:center;',
            'justify-content:center;z-index:500;',
            'font-family:Segoe UI,system-ui,sans-serif;',
            'backdrop-filter:blur(4px);'
        ].join('');
        overlay.innerHTML = '<div style="background:linear-gradient(145deg,#3a1a1a,#1a0a0a);'
            + 'padding:32px 28px;border-radius:20px;text-align:center;'
            + 'border:2px solid #aa3333;box-shadow:0 10px 40px rgba(0,0,0,0.8);'
            + 'max-width:320px;width:90%;">'
            + '<div style="font-size:3rem;margin-bottom:8px;">&#128128;</div>'
            + '<h2 style="color:#ff6666;font-size:2rem;margin-bottom:8px;text-shadow:2px 2px 0 #550000;">Game Over</h2>'
            + '<p style="color:#f9f3d9;margin-bottom:6px;font-size:1rem;">Un cangrejo lleg\u00f3 hasta ti</p>'
            + '<p style="color:#ffd966;margin-bottom:24px;font-size:1.1rem;font-weight:bold;">'
            + 'Oleada alcanzada: <span id="go-wave">1</span></p>'
            + '<button id="go-retry" style="display:block;width:100%;padding:14px;'
            + 'background:linear-gradient(180deg,#dd4444,#aa2222);border:2px solid #ff7777;'
            + 'border-radius:12px;color:white;font-weight:bold;font-size:1.1rem;cursor:pointer;'
            + 'margin-bottom:10px;box-shadow:0 6px 0 #660000;touch-action:manipulation;">Intentar de nuevo</button>'
            + '<button id="go-menu" style="display:block;width:100%;padding:12px;'
            + 'background:linear-gradient(180deg,#445a7a,#2a3a5a);border:2px solid #6677aa;'
            + 'border-radius:12px;color:white;font-weight:bold;font-size:1rem;cursor:pointer;'
            + 'box-shadow:0 6px 0 #1a2040;touch-action:manipulation;">Men\u00fa principal</button>'
            + '</div>';
        document.body.appendChild(overlay);
        document.getElementById('go-retry').addEventListener('click', function() { resetGame(); });
        document.getElementById('go-menu').addEventListener('click', function() {
            hideGameOver();
            if (typeof window.showMenu === 'function') window.showMenu();
            else location.reload();
        });
    }
    const waveEl = overlay.querySelector('#go-wave');
    if (waveEl) waveEl.textContent = game.wave;
    overlay.style.display = 'flex';
}

function hideGameOver() {
    const overlay = document.getElementById('gameover-overlay');
    if (overlay) overlay.style.display = 'none';
}

window.showGameOver = showGameOver;
window.hideGameOver = hideGameOver;

window.resumeGame = function() {
    if (game.paused && game.gameStarted && !game.gameOver) {
        game.paused = false;
        const pb = document.getElementById('pauseBtn');
        if (pb) pb.textContent = '\u23F8';
        ensureGameLoop();
    }
};

// ── Core & DOM ────────────────────────────────────────────────────────────
const { canvas, ctx, dom } = initCore();

// ── Botones HUD ───────────────────────────────────────────────────────────
function setupButton(btn, callback) {
    let touched = false;
    btn.addEventListener('touchstart', function(e) {
        e.preventDefault(); e.stopPropagation();
        touched = true;
        callback();
    }, { passive: false });
    btn.addEventListener('click', function() {
        if (touched) { touched = false; return; }
        callback();
    });
}

if (dom.supportBtn)   setupButton(dom.supportBtn, activateSupport);
if (dom.resetBtn)     setupButton(dom.resetBtn, resetGame);

const pauseBtn = document.getElementById('pauseBtn');

function togglePause() {
    if (!game.gameStarted || game.gameOver) return;
    game.paused = !game.paused;
    if (pauseBtn) pauseBtn.textContent = game.paused ? '\u25B6' : '\u23F8';
    if (game.paused) {
        if (typeof window.showPauseMenu === 'function') window.showPauseMenu();
        else if (typeof window.showMenu === 'function') window.showMenu();
    } else {
        ensureGameLoop();
    }
}
if (pauseBtn) setupButton(pauseBtn, togglePause);

window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && game.gameStarted && !game.gameOver) {
        e.preventDefault();
        togglePause();
    }
});

// ── Botón fullscreen / rotar orientación ─────────────────────────────────
function updateFullscreenIcon() {
    if (!dom.fullscreenBtn) return;
    if (isMobile) {
        dom.fullscreenBtn.textContent = '🔄';
        dom.fullscreenBtn.setAttribute('aria-label', 'Rotar pantalla');
    } else {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        dom.fullscreenBtn.textContent = isFs ? '⛶' : '⛶';
        dom.fullscreenBtn.setAttribute('aria-label', isFs ? 'Salir pantalla completa' : 'Pantalla completa');
    }
}
document.addEventListener('fullscreenchange', updateFullscreenIcon);
document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);

async function handleFullscreenOrRotate() {
    const el = document.documentElement;
    if (isMobile) {
        // 1) Solicitar fullscreen
        try {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                const rfs = el.requestFullscreen || el.webkitRequestFullscreen;
                if (rfs) await rfs.call(el);
            }
        } catch (_) {}

        // 2) Intentar bloquear orientación landscape
        try {
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape');
            } else if (screen.lockOrientation) {
                screen.lockOrientation('landscape-primary');
            } else if (screen.mozLockOrientation) {
                screen.mozLockOrientation('landscape-primary');
            }
        } catch (_) {
            // Si falla el lock, mostrar sugerencia de rotación
            const rotateScreen = document.getElementById('rotate-screen');
            if (rotateScreen && window.innerHeight > window.innerWidth) {
                rotateScreen.classList.add('show');
                setTimeout(function() { rotateScreen.classList.remove('show'); }, 4000);
            }
        }
        setTimeout(handleResize, 300);
    } else {
        // Desktop: toggle fullscreen
        try {
            const isFs = document.fullscreenElement || document.webkitFullscreenElement;
            if (!isFs) {
                const rfs = el.requestFullscreen || el.webkitRequestFullscreen;
                if (rfs) await rfs.call(el);
            } else {
                const ex = document.exitFullscreen || document.webkitExitFullscreen;
                if (ex) await ex.call(document);
            }
        } catch (_) {}
        setTimeout(handleResize, 250);
    }
}

if (dom.fullscreenBtn) {
    dom.fullscreenBtn.addEventListener('click', handleFullscreenOrRotate);
    dom.fullscreenBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        handleFullscreenOrRotate();
    }, { passive: false });
}

// ── Eventos del canvas ────────────────────────────────────────────────────
if (canvas && window.PointerEvent) {
    canvas.addEventListener('pointerdown',   handlePointerDown);
    canvas.addEventListener('pointermove',   handlePointerMove);
    canvas.addEventListener('pointerup',     handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);
    canvas.addEventListener('pointerleave',  handlePointerCancel);
} else if (canvas) {
    canvas.addEventListener('mousedown',  handlePointerDown);
    canvas.addEventListener('mousemove',  handlePointerMove);
    canvas.addEventListener('mouseup',    handlePointerUp);
    canvas.addEventListener('mouseleave', handlePointerCancel);
    canvas.addEventListener('touchstart',  handlePointerDown,  { passive: false });
    canvas.addEventListener('touchmove',   handlePointerMove,  { passive: false });
    canvas.addEventListener('touchend',    handlePointerUp,    { passive: false });
    canvas.addEventListener('touchcancel', handlePointerCancel);
}

// ── Game loop ─────────────────────────────────────────────────────────────
let animationFrameId = null;

function ensureGameLoop() {
    if (animationFrameId === null) gameLoop();
}

function gameLoop() {
    animationFrameId = null;
    if (game.paused || !game.gameStarted) return;
    updatePhysics();
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// ── Responsive ────────────────────────────────────────────────────────────
function handleResize() {
    updateScale();
    if (window._checkOrientation) window._checkOrientation();
    updateFullscreenIcon();
}
window.addEventListener('resize', function() {
    handleResize();
});
window.addEventListener('orientationchange', function() { 
    setTimeout(handleResize, 100);
    setTimeout(handleResize, 300);
});

// ── Arranque ──────────────────────────────────────────────────────────────
handleResize();
updateFullscreenIcon();
initRotateScreen();

// Función para iniciar el juego de manera segura (aunque algo falle)
function startGameSafely() {
    console.log('Iniciando juego...');
    initAudio();
    
    // Reproducimos el intro y luego mostramos el menú
    initIntro(function() {
        initMenu();
    });
}

// Intentamos cargar assets, pero si pasa más de 3 segundos, iniciamos de todas formas
let assetsLoaded = false;
allAssetsLoaded().then(function() {
    assetsLoaded = true;
    startGameSafely();
});

// Timeout de seguridad: si los assets no cargan en 3 segundos, iniciamos igual
setTimeout(function() {
    if (!assetsLoaded) {
        console.warn('Los assets están tardando mucho, iniciando juego de todas formas...');
        startGameSafely();
    }
}, 3000);
