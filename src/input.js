import { game, camera, GROUND_Y } from './core.js';
import { distancia } from './utils.js';
import { launchCoconut, launchExplosiveCoconut } from './gameLogic.js';
import { enableAudio } from './audio.js';

let _domCache = null;
function getDom() {
    if (!_domCache) {
        _domCache = {
            statusDisplay: document.getElementById('statusDisplay'),
        };
    }
    return _domCache;
}

function getCanvasCoords(e) {
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY;
    } else {
        clientX = e.clientX; clientY = e.clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX + camera.x,
        y: (clientY - rect.top) * scaleY + camera.y,
    };
}

function handlePointerDown(e) {
    e.preventDefault();
    enableAudio(); // Activamos audio cuando el usuario interactúa con el juego
    const pos = getCanvasCoords(e);
    if (game.state !== 'aiming') return;
    if (game.ammo.green === 0 && game.ammo.brown === 0 && !game.explosiveCoconut.available) {
        getDom().statusDisplay.textContent = '💀 Sin cocos! Usa apoyo o reinicia';
        return;
    }

    const sling = game.slingshot;
    // anchorY coincide con el cálculo del renderer: GROUND_Y - 70 + 10
    const anchorY = GROUND_Y - 60;
    const touchRadius = window.isMobile ? 100 : 70;
    if (distancia(pos, { x: sling.x, y: anchorY }) < touchRadius) {
        game.isDragging = true;
        game.dragStart = { x: pos.x, y: pos.y };
        game.dragCurrent = { x: pos.x, y: pos.y };
        game.lastTouchPos = { x: pos.x, y: pos.y };
        if (game.explosiveCoconut.available) {
            game.usingExplosive = true;
        }
    }
}

function handlePointerMove(e) {
    e.preventDefault();
    if (!game.isDragging) return;
    const pos = getCanvasCoords(e);
    game.dragCurrent = { x: pos.x, y: pos.y };
    game.lastTouchPos = { x: pos.x, y: pos.y };
}

function handlePointerUp(e) {
    e.preventDefault();
    if (!game.isDragging) { game.isDragging = false; return; }

    let pos;
    if (e.changedTouches && e.changedTouches.length > 0) pos = getCanvasCoords(e);
    else if (game.lastTouchPos) pos = game.lastTouchPos;
    else pos = getCanvasCoords(e);

    game.isDragging = false;
    const sling = game.slingshot;
    const anchorY = GROUND_Y - 60;
    const dx = pos.x - sling.x;
    const dy = pos.y - anchorY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 15) {
        const angle = Math.atan2(dy, dx) + Math.PI; // Invertido para que salga al lado opuesto
        const power = Math.min(dist, 140) / 140;
        
        // Lanzar coco explosivo si estaba activo
        if (game.usingExplosive) {
            const success = launchExplosiveCoconut(power, angle);
            if (success) {
                game.usingExplosive = false;
            }
        } else {
            const success = launchCoconut(power, angle);
            if (!success) getDom().statusDisplay.textContent = '❌ No hay cocos de ese tipo';
        }
    } else {
        getDom().statusDisplay.textContent = '🔽 Tira más atrás';
    }

    game.dragStart = null;
    game.dragCurrent = null;
    game.lastTouchPos = null;
}

function handlePointerCancel() {
    game.isDragging = false;
    game.usingExplosive = false;
    game.dragStart = null;
    game.dragCurrent = null;
    game.lastTouchPos = null;
    getDom().statusDisplay.textContent = '⏹️ Arrastre cancelado';
}

export { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel };
