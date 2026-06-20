import { game, GROUND_Y, MIN_LAUNCH_SPEED, MAX_LAUNCH_SPEED, EXPLOSIVE_COOLDOWN_WAVES } from './core.js';
import { spawnParticle } from './utils.js';
import { Enemy, Block } from './classes.js';
import { playSound, enableAudio } from './audio.js';

let _domCache = null;
function getDom() {
    if (!_domCache) {
        _domCache = {
            statusDisplay:    document.getElementById('statusDisplay'),
            waveDisplay:      document.getElementById('waveDisplay'),
            greenCountEl:     document.getElementById('greenCount'),
            brownCountEl:     document.getElementById('brownCount'),
            supportBtn:       document.getElementById('supportBtn'),
            supportCounter:   document.getElementById('supportCounter'),
            explosiveCounter: document.getElementById('explosiveCounter'),
            explosiveBtn:     document.getElementById('explosiveBtn'),
        };
    }
    return _domCache;
}

export function updateHUD() {
    const dom = getDom();
    dom.greenCountEl.textContent = game.ammo.green;
    dom.brownCountEl.textContent = game.ammo.brown;

    if (game.supportReady) {
        dom.supportBtn.classList.add('activo');
        dom.supportCounter.textContent = 'OK';
    } else {
        dom.supportBtn.classList.remove('activo');
        dom.supportCounter.textContent = game.supportCooldown;
    }

    if (dom.explosiveBtn && dom.explosiveCounter) {
        if (game.explosiveCoconut.available) {
            dom.explosiveBtn.classList.add('activo');
            dom.explosiveCounter.textContent = 'OK';
        } else {
            dom.explosiveBtn.classList.remove('activo');
            dom.explosiveCounter.textContent = game.explosiveCoconut.cooldown;
        }
    }
}

export function generateWaveStructures(wave) {
    game.blocks = [];
    game.projectiles = [];
    game.particles = [];
    var blockCount = Math.min(3 + Math.floor(wave / 2), 8);

    for (var i = 0; i < blockCount; i++) {
        var baseX = 700 + (i * (1500 / blockCount)) + Math.random() * 80;
        var baseY = GROUND_Y - 20;
        var bx, by, bw, bh;

        if (i % 3 === 0) {
            bx = baseX; by = baseY;
            bw = 80 + Math.random() * 40; bh = 18;
        } else if (i % 3 === 1) {
            bx = baseX; by = baseY - 50 - Math.random() * 30;
            bw = 16; bh = 50 + Math.random() * 30;
        } else {
            bx = baseX - 40; by = baseY - 80 - Math.random() * 40;
            bw = 30 + Math.random() * 40; bh = 16;
        }

        var block = new Block(bx, by, bw, bh, 2 + Math.floor(wave / 3));
        if (bx > 600 && bx < 2300) game.blocks.push(block);
    }
}

function getEnemySpawnPosition() {
    if (game.blocks.length > 0 && Math.random() < 0.6) {
        var b = game.blocks[Math.floor(Math.random() * game.blocks.length)];
        if (b && b.alive) {
            return {
                x: b.x + b.w / 2 + (Math.random() - 0.5) * b.w * 0.5,
                y: GROUND_Y - 40,
            };
        }
    }
    return {
        x: 750 + Math.random() * 1400,
        y: GROUND_Y - 40,
    };
}

export function spawnEnemy(wave) {
    var pos = getEnemySpawnPosition();
    var health = 2 + Math.floor(wave / 2);
    var radius = 22 + Math.random() * 6;
    var enemy = new Enemy(pos.x, pos.y, radius, health);
    game.enemies.push(enemy);
    game.waveEnemiesSpawned++;
    game.waveEnemiesAlive++;
    for (var i = 0; i < 6; i++) spawnParticle(pos.x, pos.y, '#ffdd44', 12);
    getDom().statusDisplay.textContent = 'Enemigo ' + game.waveEnemiesSpawned + '/' + game.waveEnemiesTotal;
}

export function startWave(wave) {
    game.wave = wave;
    game.enemies = [];
    game.projectiles = [];
    game.particles = [];
    game.waveEnemiesSpawned = 0;
    game.waveEnemiesAlive = 0;
    game.waveInProgress = true;
    game.gameOver = false;

    var baseEnemies = 5;
    var extraEnemies = Math.floor((wave - 1) * 1.5);
    game.waveEnemiesTotal = Math.min(baseEnemies + extraEnemies, 18);

    generateWaveStructures(wave);

    game.ammo.green = Math.min(4 + Math.floor(wave / 2), 10);
    game.ammo.brown = Math.min(3 + Math.floor(wave / 3), 8);

    var dom = getDom();
    updateHUD();
    game.state = 'aiming';
    game.cameraMode = 'home';
    dom.statusDisplay.textContent = 'Oleada ' + wave + ' - Preparate!';
    dom.waveDisplay.textContent = 'Oleada ' + wave;

    var initialSpawns = Math.min(3, game.waveEnemiesTotal);
    for (var j = 0; j < initialSpawns; j++) {
        (function(w, delay) {
            setTimeout(function() { spawnEnemy(w); }, delay);
        })(wave, j * 500);
    }

    var spawnDelay = 1400;
    var spawnNext = function() {
        if (!game.waveInProgress) return;
        if (game.waveEnemiesSpawned < game.waveEnemiesTotal) {
            spawnEnemy(wave);
            spawnDelay = Math.max(700, 1800 - wave * 120);
            game.spawnTimer = setTimeout(spawnNext, spawnDelay);
        }
    };
    game.spawnTimer = setTimeout(spawnNext, spawnDelay);
}

export function launchCoconut(power, angle) {
    var dom = getDom();
    if (game.ammo.green === 0 && game.ammo.brown === 0) {
        dom.statusDisplay.textContent = 'Sin cocos! Usa apoyo o reinicia';
        return false;
    }

    var type = 'green';
    if (game.ammo.brown > 0 && (Math.random() < 0.4 || game.ammo.green === 0)) type = 'brown';
    if (type === 'green' && game.ammo.green === 0) type = 'brown';
    if (type === 'brown' && game.ammo.brown === 0) type = 'green';
    if (game.ammo[type] <= 0) return false;

    game.ammo[type]--;

    var speed = MIN_LAUNCH_SPEED + power * (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED);
    var launchY = GROUND_Y - 60; // mismo anchorY que renderer e input

    game.projectiles.push({
        x: game.slingshot.x + Math.cos(angle) * 22,
        y: launchY + Math.sin(angle) * 22,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: type === 'green' ? 16 : 18,
        type: type,
        damage: type === 'green' ? 1 : 3,
        alive: true,
        trail: [],
        bounces: 0,
        maxBounces: 3,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
    });

    enableAudio();
    playSound('launch');
    game.state = 'flying';
    game.cameraMode = 'follow';
    dom.statusDisplay.textContent = 'Volando...';
    updateHUD();
    try { if (navigator.vibrate) navigator.vibrate(15); } catch(e) {}
    return true;
}

export function activateExplosive() {
    var dom = getDom();
    if (game.state !== 'aiming') return;

    if (!game.explosiveCoconut.available) {
        dom.statusDisplay.textContent = 'Boom en ' + game.explosiveCoconut.cooldown + ' oleada(s)';
        return;
    }

    game.usingExplosive = !game.usingExplosive;
    dom.statusDisplay.textContent = game.usingExplosive
        ? 'Boom activo - apunta!'
        : 'Apunta de nuevo';
}

export function launchExplosiveCoconut(power, angle) {
    if (!game.explosiveCoconut.available) return false;

    var dom = getDom();
    game.explosiveCoconut.available = false;
    game.explosiveCoconut.cooldown = EXPLOSIVE_COOLDOWN_WAVES;
    game.usingExplosive = false;

    var speed = (MIN_LAUNCH_SPEED + power * (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED)) * 1.4;
    var launchY = GROUND_Y - 60;

    game.projectiles.push({
        x: game.slingshot.x + Math.cos(angle) * 22,
        y: launchY + Math.sin(angle) * 22,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 20,
        type: 'explosive',
        damage: 1,
        isExplosive: true,
        explosionRadius: 85,
        alive: true,
        trail: [],
        bounces: 0,
        maxBounces: 1,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.4,
    });

    enableAudio();
    playSound('launch');
    game.state = 'flying';
    game.cameraMode = 'follow';
    dom.statusDisplay.textContent = 'Explosivo!';
    updateHUD();
    try { if (navigator.vibrate) navigator.vibrate(50); } catch(e) {}
    return true;
}

export function activateSupport() {
    if (!game.supportReady) return;
    var dom = getDom();
    var added = 0;
    while (added < 4) {
        var t = Math.random() < 0.6 ? 'green' : 'brown';
        game.ammo[t]++;
        added++;
    }
    game.supportReady = false;
    game.supportCooldown = 3;
    updateHUD();
    dom.statusDisplay.textContent = '+4 Cocos extra!';
    spawnParticle(game.slingshot.x + 40, game.slingshot.y - 20, '#f5c542', 15);
    spawnParticle(game.slingshot.x - 20, game.slingshot.y - 40, '#f5c542', 15);
    try { if (navigator.vibrate) navigator.vibrate([20, 30, 20]); } catch(e) {}
}

window.onTurnEnd = function() {
    if (game.gameOver) return;
    var dom = getDom();

    if (game.waveEnemiesAlive === 0 && game.waveEnemiesSpawned >= game.waveEnemiesTotal) {
        game.state = 'waveComplete';
        game.waveInProgress = false;
        if (game.spawnTimer) clearTimeout(game.spawnTimer);
        dom.statusDisplay.textContent = 'Oleada completada!';
        game.wavesCompleted++;

        if (game.explosiveCoconut.cooldown > 0) {
            game.explosiveCoconut.cooldown--;
            if (game.explosiveCoconut.cooldown === 0) {
                game.explosiveCoconut.available = true;
            }
        }
        if (game.supportCooldown > 0) {
            game.supportCooldown--;
            if (game.supportCooldown === 0) {
                game.supportReady = true;
                dom.statusDisplay.textContent = 'Apoyo disponible!';
            }
        }

        updateHUD();
        game.nextWaveTimer = setTimeout(function() {
            if ((game.state === 'waveComplete' || game.state === 'aiming') && !game.paused && !game.gameOver) {
                startWave(game.wave + 1);
            }
        }, 2500);
    } else {
        game.state = 'aiming';
        dom.statusDisplay.textContent = (game.ammo.green === 0 && game.ammo.brown === 0)
            ? 'Sin cocos! Usa el Apoyo o Reinicia'
            : 'Apunta de nuevo';
    }
};

window.onPlayerLose = function(crab) {
  if (game.gameOver) return;
  game.gameOver = true;
  game.state = 'gameover';
  game.waveInProgress = false;

  if (game.spawnTimer) clearTimeout(game.spawnTimer);
  if (game.nextWaveTimer) clearTimeout(game.nextWaveTimer);

  const dom = getDom();
  dom.statusDisplay.textContent = 'Perdiste!';

  for (var i = 0; i < 20; i++) spawnParticle(game.slingshot.x, game.slingshot.y, '#ff2222', 25);
  
  // Reproducir sonido de fin de juego
  playSound('gameover');

  try { if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]); } catch(e) {}

  setTimeout(function() {
    if (typeof window.showGameOver === 'function') window.showGameOver();
  }, 1200);
};
