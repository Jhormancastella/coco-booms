import { spawnParticle } from './utils.js';
import { getImage } from './assets.js';
import { GROUND_Y } from './core.js';
import { playSound } from './audio.js';

// Velocidad base de movimiento de cangrejos hacia el jugador
const CRAB_SPEED_BASE = 0.4;
// X del jugador (resortera) - los cangrejos se acercan a este punto
const PLAYER_X = 200;

export class Enemy {
    constructor(x, y, radius, health) {
        this.x = x;
        this.y = y;
        this.radius = radius || 24;
        this.health = health || 3;
        this.maxHealth = this.health;
        this.alive = true;
        this.type = 'crab';
        this.vx = 0;
        this.vy = 0;
        this.hitTimer = 0;
        this.spawnScale = 0;
        this.spawnAnimating = true;
        this.spawnSpeed = 0.07;

        // Animación por frames (3 imágenes = animación más fluida)
        this.animFrame = 0;          // 0, 1 o 2
        this.animTimer = 0;
        this.animInterval = 10;      // frames entre cambio de sprite
        this.animFrameCount = 3;     // usamos cangrejo1, cangrejo2, cangrejo3

        // Velocidad de avance hacia el jugador (varía ligeramente por individuo)
        this.speed = CRAB_SPEED_BASE + Math.random() * 0.25;

        // Pequeño balanceo vertical para dar vida
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    takeDamage(dmg) {
        this.health -= dmg;
        this.hitTimer = 10;
        playSound('hit');
        if (this.health <= 0) {
            this.alive = false;
            for (let i = 0; i < 14; i++) spawnParticle(this.x, this.y, '#e65c3a', 3);
        }
    }

    update() {
        // Animación de aparición
        if (this.spawnAnimating) {
            this.spawnScale += this.spawnSpeed;
            if (this.spawnScale >= 1) {
                this.spawnScale = 1;
                this.spawnAnimating = false;
            }
            return; // No se mueve mientras aparece
        }

        // Avanzar hacia el jugador
        if (this.x > PLAYER_X + this.radius) {
            this.x -= this.speed;
        }

        // Mantener al cangrejo en el suelo (sin bobbing, los pies tocan GROUND_Y)
        this.y = GROUND_Y - this.radius;

        // Animación de sprite
        this.animTimer++;
        if (this.animTimer >= this.animInterval) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % this.animFrameCount;
        }

        if (this.hitTimer > 0) this.hitTimer--;
    }

    draw(ctx) {
        if (!this.alive) return;

        const r = this.radius * this.spawnScale;
        const scale = this.spawnScale;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);

        // Sombra debajo
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, this.radius * 0.9, this.radius * 0.9, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Efecto de golpe (flash rojo)
        if (this.hitTimer > 0) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Dibujar sprite del cangrejo
        const imgKeys = ['cangrejo1', 'cangrejo2', 'cangrejo3'];
        const imgKey = imgKeys[this.animFrame] || 'cangrejo1';
        const img = getImage(imgKey);

        if (img) {
            const size = r * 2.2;
            ctx.imageSmoothingEnabled = true;
            // Dibujar con el pie del sprite tocando el suelo:
            // el centro está en (0,0), la mitad inferior es size/2
            // desplazamos -size*0.05 para compensar espacio transparente inferior
            ctx.drawImage(img, -size / 2, -size * 0.55, size, size);
        } else {
            // Fallback: círculo simple si la imagen no carga
            const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
            grad.addColorStop(0, this.hitTimer > 0 ? '#ff9999' : '#e65c3a');
            grad.addColorStop(1, this.hitTimer > 0 ? '#cc4444' : '#8b2a1a');
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = '#5a1a0a';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();

        // Barra de vida (fuera del ctx.save rotado)
        if (this.health < this.maxHealth && this.spawnScale >= 1) {
            const barW = this.radius * 1.8;
            const barH = 5;
            const barX = this.x - barW / 2;
            const barY = this.y - this.radius - 14;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
            ctx.fillStyle = this.health / this.maxHealth > 0.4 ? '#5fdd5f' : '#dd5f5f';
            ctx.fillRect(barX, barY, barW * (this.health / this.maxHealth), barH);
        }
    }
}

export class Block {
    constructor(x, y, w, h, health) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.health = health || 2;
        this.maxHealth = this.health;
        this.alive = true;
        this.hitTimer = 0;
    }

    takeDamage(dmg) {
        this.health -= dmg;
        this.hitTimer = 8;
        if (this.health <= 0) {
            this.alive = false;
            for (let i = 0; i < 8; i++) spawnParticle(this.x + this.w / 2, this.y + this.h / 2, '#8b6b4d', 4);
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        const color = this.hitTimer > 0 ? '#d9b382' : '#a67c52';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#6b4f31';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const lx = this.x + 6 + i * (this.w / 4);
            ctx.beginPath();
            ctx.moveTo(lx, this.y + 2);
            ctx.lineTo(lx + 4, this.y + this.h - 2);
            ctx.stroke();
        }
        ctx.strokeStyle = '#4d3420';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        ctx.restore();
        if (this.hitTimer > 0) this.hitTimer--;
    }
}
