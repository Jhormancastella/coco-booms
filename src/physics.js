import { game, camera, VIEW_W, WORLD_W, WORLD_H, GROUND_Y, GRAVITY } from './core.js';
import { distancia, circleRectCollision, spawnParticle } from './utils.js';
import { playSound } from './audio.js';

// X donde el jugador pierde si un cangrejo llega
const PLAYER_LOSE_X = 160;

export function updateCamera() {
    if (game.cameraMode === 'follow') {
        const live = game.projectiles.filter(p => p.alive);
        if (live.length > 0) {
            // Seguir al proyectil más adelantado con suavizado más rápido
            const leader = live.reduce((a, b) => a.x > b.x ? a : b);
            const targetX = Math.max(0, Math.min(leader.x - VIEW_W * 0.35, WORLD_W - VIEW_W));
            camera.targetX = targetX;
            // Velocidad de cámara más rápida durante el vuelo
            camera.x += (camera.targetX - camera.x) * 0.18;
        } else {
            // Volver a casa suavemente
            camera.targetX = 0;
            camera.x += (camera.targetX - camera.x) * 0.08;
        }
    } else {
        camera.targetX = 0;
        camera.x += (camera.targetX - camera.x) * 0.1;
    }
    camera.y = 0;
}

export function updatePhysics() {
    updateCamera();

    // Actualizar animación y movimiento de enemigos
    for (const e of game.enemies) {
        e.update();

        // Detectar si un cangrejo llegó al jugador → derrota
        if (e.alive && !e.spawnAnimating && e.x <= PLAYER_LOSE_X + e.radius) {
            if (typeof window.onPlayerLose === 'function') {
                window.onPlayerLose(e);
            }
        }
    }

    // Actualizar proyectiles
    for (const p of game.projectiles) {
        if (!p.alive) continue;

        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Guardar estela
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 18) p.trail.shift();

        // Colisión con el suelo
        if (p.y + p.radius > GROUND_Y) {
            p.y = GROUND_Y - p.radius;
            p.vy *= -0.45;
            p.vx *= 0.72;
            p.bounces++;
            for (let i = 0; i < 4; i++) spawnParticle(p.x, p.y + p.radius, '#c4a06a', 8);

            if (p.isExplosive) {
                triggerExplosion(p);
                p.alive = false;
            } else if (p.bounces >= p.maxBounces || (Math.abs(p.vx) < 1.2 && Math.abs(p.vy) < 1.2)) {
                p.alive = false;
            }
        }

        // Límites del mundo
        if (p.x - p.radius < 0) { p.x = p.radius; p.vx *= -0.5; }
        if (p.x + p.radius > WORLD_W) { p.x = WORLD_W - p.radius; p.vx *= -0.5; }

        // ── Colisión con enemigos ────────────────────────────────────────────
        if (!p.alive) continue;
        for (const e of game.enemies) {
            if (!e.alive || e.spawnAnimating) continue;
            if (distancia(p, e) < p.radius + e.radius) {
                if (p.isExplosive) {
                    triggerExplosion(p);
                    p.alive = false;
                    break;
                } else {
                    e.takeDamage(p.damage);
                    p.vx *= 0.4;
                    p.vy = -Math.abs(p.vy) * 0.6 - 2;
                    if (p.type === 'brown') p.vx *= 0.8;
                    else if (Math.abs(p.vx) < 2) p.alive = false;
                    spawnParticle(p.x, p.y, '#f0d080', 10);
                    // Los cocos verdes pueden atravesar enemigos si aún tienen velocidad
                    if (!p.alive || p.type === 'brown') break;
                }
            }
        }

        // ── Colisión con bloques ─────────────────────────────────────────────
        if (!p.alive) continue;
        for (const b of game.blocks) {
            if (!b.alive) continue;
            if (circleRectCollision(p.x, p.y, p.radius, b.x, b.y, b.w, b.h)) {
                if (p.isExplosive) {
                    triggerExplosion(p);
                    p.alive = false;
                } else {
                    b.takeDamage(p.damage);
                    const centerX = b.x + b.w / 2;
                    const centerY = b.y + b.h / 2;
                    if (Math.abs(p.x - centerX) > Math.abs(p.y - centerY)) p.vx *= -0.5;
                    else p.vy *= -0.5;
                    p.vx *= 0.6;
                    p.vy *= 0.6;
                    spawnParticle(p.x, p.y, '#b08a60', 10);
                }
                break;
            }
        }

        // Fuera del mundo
        if (p.x > WORLD_W + 50 || p.y > WORLD_H + 50 || p.x < -50) p.alive = false;
    }

    // Limpiar proyectiles (guardar mientras aún tienen estela)
    game.projectiles = game.projectiles.filter(p => p.alive || p.trail.length > 0);

    // Actualizar partículas
    for (const pt of game.particles) {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.15;
        pt.life--;
    }
    game.particles = game.particles.filter(pt => pt.life > 0);

    // Contar enemigos vivos
    game.waveEnemiesAlive = game.enemies.filter(e => e.alive).length;
    const projectilesAlive = game.projectiles.filter(p => p.alive);

    // Detectar fin de turno
    if (game.state === 'flying' && projectilesAlive.length === 0) {
        game.cameraMode = 'home';
        if (typeof window.onTurnEnd === 'function') {
            window.onTurnEnd();
        }
    }
}

// ── Explosión del coco explosivo ─────────────────────────────────────────────
function triggerExplosion(p) {
    playSound('explosion');
    const radius = p.explosionRadius || 85;

    // Dañar enemigos en el radio
    for (const e of game.enemies) {
        if (!e.alive || e.spawnAnimating) continue;
        const d = distancia(p, e);
        if (d < radius) {
            const dmg = Math.ceil(4 * (1 - d / radius));
            e.takeDamage(Math.max(1, dmg));
        }
    }

    // Dañar bloques en el radio
    for (const b of game.blocks) {
        if (!b.alive) continue;
        const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        const d = distancia(p, { x: cx, y: cy });
        if (d < radius) {
            const dmg = Math.ceil(3 * (1 - d / radius));
            b.takeDamage(Math.max(1, dmg));
        }
    }

    // Partículas de explosión
    for (let i = 0; i < 35; i++) spawnParticle(p.x, p.y, '#ff6600', 18);
    for (let i = 0; i < 15; i++) spawnParticle(p.x, p.y, '#ffcc00', 12);
}
