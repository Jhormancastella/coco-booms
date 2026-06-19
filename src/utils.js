import { game } from './core.js';

export function spawnParticle(x, y, color, life = 20) {
    game.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        radius: Math.random() * 5 + 2,
        color, life, maxLife: life,
    });
}

export function distancia(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

export function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
    const nearX = Math.max(rx, Math.min(cx, rx + rw));
    const nearY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nearX;
    const dy = cy - nearY;
    return (dx * dx + dy * dy) < (cr * cr);
}
