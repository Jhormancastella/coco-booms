import {
    game, camera, getCtx,
    VIEW_W, VIEW_H, WORLD_W, WORLD_H, GROUND_Y,
    MAX_PULL_DISTANCE, MIN_LAUNCH_SPEED, MAX_LAUNCH_SPEED, GRAVITY
} from './core.js';
import { getImage } from './assets.js';

const CLOUDS = [
    { x: 100, y: 60, size: 40 },
    { x: 500, y: 90, size: 50 },
    { x: 720, y: 120, size: 35 },
    { x: 1200, y: 80, size: 45 },
    { x: 1800, y: 100, size: 50 },
    { x: 2100, y: 70, size: 38 },
];

const PALM_POSITIONS = [110, 420, 850, 1350, 1900, 2250];

// Estrellas fijas generadas una vez
const STARS = Array.from({ length: 80 }, () => ({
    x: Math.random() * 2400,
    y: Math.random() * 260,
    r: Math.random() * 1.5 + 0.5,
    twinkle: Math.random() * Math.PI * 2,
}));

// Cache del pattern de suelo (se crea una vez por contexto)
let _groundPattern1 = null;
let _groundPattern2 = null;

// Retorna true si la oleada actual es de noche (bloques de 5: 5-9 noche, 10-14 dia, etc.)
function isNight() {
    const block = Math.floor((game.wave - 1) / 5);
    return block % 2 === 1;
}

// Polyfill roundRect para Safari < 15.4
(function setupRoundRect() {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx && !ctx.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
            const radius = Math.min(r, w / 2, h / 2);
            this.moveTo(x + radius, y);
            this.lineTo(x + w - radius, y);
            this.quadraticCurveTo(x + w, y, x + w, y + radius);
            this.lineTo(x + w, y + h - radius);
            this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
            this.lineTo(x + radius, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - radius);
            this.lineTo(x, y + radius);
            this.quadraticCurveTo(x, y, x + radius, y);
            this.closePath();
            return this;
        };
    }
})();



function drawAimLine(ctx, startX, startY, angle, power) {
    const speed = MIN_LAUNCH_SPEED + (power * (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED));
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    ctx.save();

    const points = [];
    let simX = startX, simY = startY, simVx = vx, simVy = vy;

    for (let step = 0; step < 140; step++) {
        simVy += GRAVITY;
        simX += simVx;
        simY += simVy;
        if (simY + 16 > GROUND_Y) {
            simY = GROUND_Y - 16;
            simVy *= -0.5;
            simVx *= 0.7;
        }
        if (step % 3 === 0 && simX > 0 && simX < WORLD_W && simY > 0 && simY < WORLD_H) {
            points.push({ x: simX, y: simY });
        }
        if (simX > WORLD_W + 50 || simY > WORLD_H + 50) break;
    }

    for (let i = 0; i < points.length; i++) {
        const alpha = 1 - (i / points.length) * 0.75;
        const size = 4 - (i / points.length) * 2;
        const color = power > 0.7
            ? `rgba(255, 80, 80, ${alpha})`
            : power > 0.4
                ? `rgba(255, 200, 80, ${alpha})`
                : `rgba(100, 255, 100, ${alpha})`;

        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, Math.max(size, 1.5), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Halo blanco suave
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, Math.max(size, 1.5) + 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.25})`;
        ctx.fill();
    }

    // Flecha en el extremo
    if (points.length > 1) {
        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        const arrowAngle = Math.atan2(last.y - prev.y, last.x - prev.x);
        ctx.save();
        ctx.translate(last.x, last.y);
        ctx.rotate(arrowAngle);
        ctx.fillStyle = power > 0.7 ? '#ff4444' : power > 0.4 ? '#ffcc44' : '#44ff44';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-12, -6);
        ctx.lineTo(-12, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}


function drawPowerIndicator(ctx, pullX, pullY, power) {
    const barWidth = 54, barHeight = 9;
    const barX = pullX - barWidth / 2, barY = pullY - 38;

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.roundRect(barX - 3, barY - 3, barWidth + 6, barHeight + 6, 4);
    ctx.fill();

    ctx.fillStyle = power > 0.7 ? '#ff4444' : power > 0.4 ? '#ffaa44' : '#44ff44';
    ctx.fillRect(barX, barY, barWidth * power, barHeight);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(
        power > 0.7 ? 'ðŸ”¥ MÃX' : power > 0.4 ? 'âš¡ MEDIA' : 'ðŸ’¨ BAJA',
        pullX, barY - 6
    );
}


function drawCoconut(ctx, x, y, type, radius) {
    ctx.save();
    if (type === 'explosive') {
        ctx.shadowColor = 'rgba(255,100,0,0.7)';
        ctx.shadowBlur = 22;
        const grad = ctx.createRadialGradient(x - 6, y - 8, 4, x, y, radius);
        grad.addColorStop(0, '#ff9966');
        grad.addColorStop(0.5, '#ff4400');
        grad.addColorStop(1, '#882200');
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(x - 2, y - 5, 4, 10);
        ctx.fillRect(x - 7, y - 1, 14, 3);
    } else if (type === 'green') {
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        const grad = ctx.createRadialGradient(x - 4, y - 6, 3, x, y, radius);
        grad.addColorStop(0, '#b0e878');
        grad.addColorStop(0.7, '#4ca33a');
        grad.addColorStop(1, '#1f5a1a');
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#2d7a2a';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const a = i * 1.2;
            ctx.beginPath();
            ctx.arc(x, y, radius * 0.7, a, a + 0.5);
            ctx.stroke();
        }
    } else {
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        const grad = ctx.createRadialGradient(x - 5, y - 7, 4, x, y, radius);
        grad.addColorStop(0, '#c48050');
        grad.addColorStop(0.5, '#8b5a30');
        grad.addColorStop(1, '#3d2210');
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#2a1508';
        ctx.beginPath(); ctx.arc(x - 6, y - 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 6, y - 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y + 6, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}


function drawCloud(ctx, x, y, size) {
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(x, y, size * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + size * 0.7, y - size * 0.2, size * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + size * 1.2, y, size * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + size * 0.4, y - size * 0.4, size * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
}


function drawPalmTree(ctx, x, groundY, index) {
    const key = (index % 2 === 0) ? 'palmera' : 'palmera-consuelo';
    const img = getImage(key) || getImage('palmera');
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
        const h = 260;
        const w = h * (img.naturalWidth / img.naturalHeight);
        // Enterrar la base 30px dentro del suelo para integraciÃ³n visual
        ctx.drawImage(img, x - w / 2, groundY - h + 38, w, h);
    } else {
        ctx.save();
        ctx.fillStyle = '#7a5c34';
        ctx.fillRect(x - 7, groundY - 120, 14, 140);
        ctx.fillStyle = '#2d7a2a';
        ctx.beginPath();
        ctx.ellipse(x, groundY - 118, 40, 12, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}


function drawGround(ctx, night, groundY, worldW, worldH) {
    const img = getImage('suelo-3');
    const visualGroundTop = groundY - 72;

    ctx.fillStyle = night ? '#6b5540' : '#c4976a';
    ctx.fillRect(0, visualGroundTop, worldW, worldH - visualGroundTop);

    if (!img || img.naturalWidth <= 0 || img.naturalHeight <= 0) return;

    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const drawH = 150;
    const drawW = srcW * (drawH / srcH);
    const drawY = groundY - 82;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, visualGroundTop, worldW, worldH - visualGroundTop);
    ctx.clip();

    const step = Math.max(1, Math.floor(drawW) - 1);
    for (let tx = 0; tx <= worldW; tx += step) {
        ctx.drawImage(img, 0, 0, srcW, srcH, tx, drawY, drawW, drawH);
    }

    ctx.restore();
}


function drawGroundFront(ctx, groundY, worldW, worldH) {
    const img = getImage('suelo-3');
    const coverTop = groundY - 18;

    if (!img || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        ctx.fillStyle = '#8a6848';
        ctx.fillRect(0, coverTop, worldW, worldH - coverTop);
        return;
    }

    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const drawH = 150;
    const drawW = srcW * (drawH / srcH);
    const drawY = groundY - 82;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, coverTop, worldW, worldH - coverTop);
    ctx.clip();

    const step = Math.max(1, Math.floor(drawW) - 1);
    for (let tx = 0; tx <= worldW; tx += step) {
        ctx.drawImage(img, 0, 0, srcW, srcH, tx, drawY, drawW, drawH);
    }

    const shade = ctx.createLinearGradient(0, coverTop, 0, coverTop + 40);
    shade.addColorStop(0, 'rgba(0,0,0,0.14)');
    shade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, coverTop, worldW, 40);
    ctx.restore();
}

function drawSlingshot(ctx, slingX, groundY, anchorY) {
    const img = getImage('lanzadora');
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
        // La imagen es 896x1184 portrait â€” la dibujamos con base en el suelo
        const h = 150;
        const w = h * (img.naturalWidth / img.naturalHeight);
        // Centrada en slingX, base en groundY
        ctx.drawImage(img, slingX - w / 2, groundY - h + 14, w, h);
    } else {
        // Fallback dibujado
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#4d2f1b';
        ctx.beginPath();
        ctx.arc(slingX, groundY - 10, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#3a2212';
        ctx.fillRect(slingX - 5, groundY - 70, 10, 60);
        ctx.fillRect(slingX - 22, groundY - 70 + 10, 10, 18);
        ctx.fillRect(slingX + 12, groundY - 70 + 10, 10, 18);
        ctx.shadowBlur = 0;
    }
}


export function draw() {
    const ctx = getCtx();
    if (!ctx) return;

    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    const night = isNight();

    // Cielo
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    if (night) {
        skyGrad.addColorStop(0, '#050a1a');
        skyGrad.addColorStop(1, '#0d1f3c');
    } else {
        skyGrad.addColorStop(0, '#3a8fcc');
        skyGrad.addColorStop(1, '#b3dff5');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(camera.x, 0, VIEW_W, GROUND_Y);

    if (night) {
        // Estrellas
        STARS.forEach(st => {
            st.twinkle += 0.04;
            const alpha = 0.5 + Math.sin(st.twinkle) * 0.5;
            ctx.beginPath();
            ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,240,' + alpha + ')';
            ctx.fill();
        });
        // Luna
        ctx.save();
        ctx.shadowColor = 'rgba(200,220,255,0.6)';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#e8eaf0';
        ctx.beginPath();
        ctx.arc(780, 70, 38, 0, Math.PI * 2);
        ctx.fill();
        // Sombra de la luna (crescent)
        ctx.fillStyle = '#0d1f3c';
        ctx.beginPath();
        ctx.arc(800, 62, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Nubes nocturnas tenues
        ctx.globalAlpha = 0.18;
        for (const c of CLOUDS) drawCloud(ctx, c.x, c.y, c.size);
        ctx.globalAlpha = 1;
    } else {
        // Sol
        ctx.beginPath();
        ctx.arc(780, 70, 46, 0, Math.PI * 2);
        ctx.fillStyle = '#ffea7a';
        ctx.shadowColor = '#ffd966';
        ctx.shadowBlur = 45;
        ctx.fill();
        ctx.shadowBlur = 0;
        // Nubes diurnas
        for (const c of CLOUDS) drawCloud(ctx, c.x, c.y, c.size);
    }

    // Suelo con imagen tileada
    drawGround(ctx, night, GROUND_Y, WORLD_W, WORLD_H);

    // Franja de transiciÃ³n cieloâ†’suelo (sombra suave en el borde)
    const horizGrad = ctx.createLinearGradient(0, GROUND_Y - 18, 0, GROUND_Y + 8);
    horizGrad.addColorStop(0, 'rgba(0,0,0,0)');
    horizGrad.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = horizGrad;
    ctx.fillRect(0, GROUND_Y - 18, WORLD_W, 26);

    // Palmeras (alternando tipo por Ã­ndice) â€” dibujadas sobre el suelo
    PALM_POSITIONS.forEach((px, i) => drawPalmTree(ctx, px, GROUND_Y, i));
    drawGroundFront(ctx, GROUND_Y, WORLD_W, WORLD_H);

    
    const sling = game.slingshot;
    const slingStemBottom = GROUND_Y;
    const slingForkY      = slingStemBottom - 60;
    const anchorX = sling.x;
    const anchorY = slingForkY;
    let pullX = anchorX, pullY = anchorY, powerRatio = 0;

    if (game.isDragging && game.dragCurrent) {
        const dx = game.dragCurrent.x - anchorX;
        const dy = game.dragCurrent.y - anchorY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const limitedDist = Math.min(dist, MAX_PULL_DISTANCE);
        const pullAngle = Math.atan2(dy, dx);

        pullX = anchorX + Math.cos(pullAngle) * limitedDist;
        pullY = anchorY + Math.sin(pullAngle) * limitedDist;
        powerRatio = limitedDist / MAX_PULL_DISTANCE;

        drawAimLine(ctx, anchorX, anchorY, pullAngle + Math.PI, powerRatio);
    }

    // Dibujar la lanzadora (imagen o fallback)
    drawSlingshot(ctx, sling.x, slingStemBottom, anchorY);

    // Bloques y enemigos
    for (const b of game.blocks) b.draw(ctx);
    for (const e of game.enemies) e.draw(ctx);

    // Bandas elÃ¡sticas (detrÃ¡s del coco)
    ctx.strokeStyle = '#2a1a0a';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sling.x - 17, slingForkY + 4);
    ctx.lineTo(pullX, pullY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sling.x + 17, slingForkY + 4);
    ctx.lineTo(pullX, pullY);
    ctx.stroke();

    // Coco en la resortera mientras se apunta
    if (game.isDragging && game.dragCurrent) {
        const hasAmmo = game.ammo.green > 0 || game.ammo.brown > 0 || game.usingExplosive;
        if (hasAmmo) {
            let visualType = 'green';
            if (game.usingExplosive) {
                visualType = 'explosive';
            } else if (game.ammo.green === 0) {
                visualType = 'brown';
            } else if (game.ammo.brown > 0) {
                visualType = game.wave % 2 === 0 ? 'brown' : 'green';
            }
            const visualRadius = visualType === 'green' ? 16 : 20;
            drawCoconut(ctx, pullX, pullY, visualType, visualRadius);
            drawPowerIndicator(ctx, pullX, pullY, powerRatio);
        }

        // Bandas frontales (sobre el coco)
        ctx.strokeStyle = '#4d2f1b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sling.x + 17, slingForkY + 4);
        ctx.lineTo(pullX, pullY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sling.x - 17, slingForkY + 4);
        ctx.lineTo(pullX, pullY);
        ctx.stroke();
    } else {
        // Banda horizontal en reposo
        ctx.strokeStyle = '#2a1a0a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(sling.x - 17, slingForkY + 4);
        ctx.lineTo(sling.x + 17, slingForkY + 4);
        ctx.stroke();
    }

    
    for (const p of game.projectiles) {
        // Estela
        for (let i = 0; i < p.trail.length; i++) {
            const alpha = (i / p.trail.length) * 0.55;
            const trailR = p.radius * (i / p.trail.length) * 0.55;
            ctx.beginPath();
            ctx.arc(p.trail[i].x, p.trail[i].y, Math.max(trailR, 1), 0, Math.PI * 2);
            if (p.type === 'explosive') {
                ctx.fillStyle = `rgba(255,120,30,${alpha})`;
            } else if (p.type === 'green') {
                ctx.fillStyle = `rgba(100,200,80,${alpha})`;
            } else {
                ctx.fillStyle = `rgba(150,100,60,${alpha})`;
            }
            ctx.fill();
        }

        if (p.alive) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.translate(-p.x, -p.y);
            drawCoconut(ctx, p.x, p.y, p.type, p.radius);
            ctx.restore();
        }
    }

    
    for (const pt of game.particles) {
        const alpha = pt.life / pt.maxLife;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius * alpha, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore(); // fin del translate de cÃ¡mara

    
    if (game.waveInProgress && game.waveEnemiesSpawned < game.waveEnemiesTotal) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(
            `${game.waveEnemiesTotal - game.waveEnemiesSpawned} por venir`,
            VIEW_W - 20, 30
        );
    }

    // Pantalla de sin municiÃ³n
    if (
        game.ammo.green === 0 && game.ammo.brown === 0 &&
        !game.explosiveCoconut.available &&
        (game.waveEnemiesAlive > 0 || game.waveEnemiesSpawned < game.waveEnemiesTotal) &&
        game.state === 'aiming'
    ) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.fillStyle = '#ffd966';
        ctx.font = 'bold 42px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Sin municion!', VIEW_W / 2, VIEW_H / 2 - 20);
        ctx.font = '22px system-ui';
        ctx.fillStyle = '#fff';
        ctx.fillText('Usa Ayudante si esta disponible o Reinicia', VIEW_W / 2, VIEW_H / 2 + 40);
    }

    // Indicador de llegada de cangrejo
    drawCrabWarnings(ctx);

    // Indicador dia/noche
    drawDayNightHint(ctx);
}

// Advertencia cuando un cangrejo llega al jugador
function drawCrabWarnings(ctx) {
    const dangerZone = 250;
    for (const e of game.enemies) {
        if (!e.alive || e.spawnAnimating) continue;
        if (e.x < dangerZone) {
            const alpha = Math.sin(performance.now() / 200) * 0.5 + 0.5;
            ctx.save();
            ctx.globalAlpha = alpha * 0.7;
            ctx.fillStyle = '#ff2222';
            ctx.font = 'bold 18px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText('Cangrejo cercano!', 20, VIEW_H - 30);
            ctx.restore();
            break;
        }
    }
}

// Indicador dia/noche en esquina
function drawDayNightHint(ctx) {
    const night = isNight();
    const nextChange = 5 - ((game.wave - 1) % 5);
    const label = night ? 'Noche' : 'Dia';
    const icon  = night ? 'N' : 'D';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(VIEW_W - 110, 8, 100, 28, 8);
    ctx.fill();
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = night ? '#aaccff' : '#ffd966';
    ctx.fillText(icon + ' ' + label + ' (' + nextChange + ')', VIEW_W - 60, 27);
    ctx.restore();
}
