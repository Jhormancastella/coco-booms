import { toggleBackgroundMusic, bgMusicPlaying, enableAudio, testSound } from './audio.js';

const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

const menuState = {
    current: 'main',
    visible: true,
    settings: { volume: 80, graphics: 'high', fullscreen: false },
    gameStarted: false,
    currentLevel: 1,
};

let menuContainer = null;

export function initMenu() {
    menuContainer = document.getElementById('menu-container');
    if (!menuContainer) return;
    window.showMenu = showMenu;
    window.showPauseMenu = showPauseMenu;
    window.hideMenu = hideMenu;
    render();
    menuContainer.style.display = 'flex';
}

export function showMenu() {
    menuState.visible = true;
    menuState.current = 'main';
    if (menuContainer) menuContainer.style.display = 'flex';
    render();
}

export function showPauseMenu() {
    menuState.visible = true;
    menuState.current = 'pause';
    if (menuContainer) menuContainer.style.display = 'flex';
    render();
}

export function hideMenu() {
    menuState.visible = false;
    if (menuContainer) menuContainer.style.display = 'none';
    // Si el juego estaba en pausa por el menú mobile, reanudarlo
    if (typeof window.resumeGame === 'function') window.resumeGame();
}

export function isMenuVisible() { return menuState.visible; }

function render() {
    if (!menuContainer) return;
    menuContainer.innerHTML = '';
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    const panel = document.createElement('div');
    panel.className = 'menu-panel';
    switch (menuState.current) {
        case 'main':     renderMain(panel);     break;
        case 'start':    renderStart(panel);    break;
        case 'tutorial': renderTutorial(panel); break;
        case 'controls': renderControls(panel); break;
        case 'options':  renderOptions(panel);  break;
        case 'credits':  renderCredits(panel);  break;
        case 'exit':     renderExit(panel);     break;
        case 'pause':    renderPause(panel);    break;
        case 'levels':   renderLevels(panel);   break;
    }
    overlay.appendChild(panel);
    menuContainer.appendChild(overlay);
}

function nav(screen) { menuState.current = screen; render(); }

function makeBtn(text, onClick, type) {
    const b = document.createElement('button');
    b.className = 'menu-btn' + (type ? ' ' + type : '');
    b.textContent = text;
    b.addEventListener('click', (e) => {
        enableAudio(); // Activamos audio al hacer clic en cualquier botón del menú
        onClick();
    });
    return b;
}

function renderMain(p) {
    const t = document.createElement('h1');
    t.className = 'menu-title';
    t.innerHTML = '<img src="https://mcgarlet.it/wp-content/uploads/2024/09/mcgarlet-frutta-i-magnifici-10-cocco-1.webp" alt="Coco-booms" style="height: 4rem; vertical-align: middle; margin-right: 0.5rem;">Coco-booms';
    p.appendChild(t);
    p.appendChild(makeBtn('Jugar', () => nav('start'), 'success'));
    p.appendChild(makeBtn('Controles', () => nav('controls')));
    p.appendChild(makeBtn('Opciones', () => nav('options')));
    p.appendChild(makeBtn('Creditos', () => nav('credits')));
    p.appendChild(makeBtn('Salir', () => nav('exit'), 'danger'));
}

function renderStart(p) {
    const s = document.createElement('h2');
    s.className = 'menu-subtitle';
    s.textContent = 'Menu de Juego';
    p.appendChild(s);
    p.appendChild(makeBtn('Nueva Partida', () => nav('tutorial'), 'success'));
    p.appendChild(makeBtn('Continuar', continueGame));
    p.appendChild(makeBtn('Cargar Nivel', () => nav('levels')));
    p.appendChild(makeBtn('Volver', () => nav('main'), 'back'));
}

function renderPause(p) {
    const s = document.createElement('h2');
    s.className = 'menu-subtitle';
    s.textContent = 'Pausa';
    p.appendChild(s);
    p.appendChild(makeBtn('Continuar', continueGame, 'success'));
    p.appendChild(makeBtn('Reiniciar', () => {
        hideMenu();
        if (window.resetGame) window.resetGame();
    }));
    p.appendChild(makeBtn('Menu principal', () => {
        menuState.current = 'main';
        render();
    }, 'back'));
}

function renderLevels(p) {
    const s = document.createElement('h2');
    s.className = 'menu-subtitle';
    s.textContent = 'Cargar Nivel';
    p.appendChild(s);

    const grid = document.createElement('div');
    grid.className = 'level-grid';
    for (let level = 1; level <= 20; level++) {
        const b = document.createElement('button');
        b.className = 'level-btn';
        b.textContent = String(level);
        b.addEventListener('click', () => loadSelectedLevel(level));
        grid.appendChild(b);
    }
    p.appendChild(grid);
    p.appendChild(makeBtn('Volver', () => nav('start'), 'back'));
}

function renderTutorial(p) {
    // Detectar modo en tiempo real dentro del panel
    const mobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    const s = document.createElement('h2');
    s.className = 'menu-subtitle';
    s.textContent = mobile ? 'Controles Tactiles' : 'Controles Mouse / Teclado';
    p.appendChild(s);

    // Guia de controles segun dispositivo
    const g = document.createElement('div');
    g.className = 'controls-guide';
    if (mobile) {
        g.innerHTML = [
            '<span class="ctrl-title">Como disparar</span>',
            '<div class="ctrl-row"><span class="ctrl-key">1</span><span class="ctrl-desc">Toca la resortera (la horquilla de madera)</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">2</span><span class="ctrl-desc">Arrastra el dedo hacia atras para tensar</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">3</span><span class="ctrl-desc">Suelta el dedo para lanzar el coco</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">Boom</span><span class="ctrl-desc">Toca el boton BOOM cuando este activo (explosivo)</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">Ayudante</span><span class="ctrl-desc">Toca Ayudante cuando este iluminado para +4 cocos</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">Pausa</span><span class="ctrl-desc">Boton Pausa en la barra superior</span></div>',
        ].join('');
    } else {
        g.innerHTML = [
            '<span class="ctrl-title">Como disparar</span>',
            '<div class="ctrl-row"><span class="ctrl-key">1</span><span class="ctrl-desc">Haz click sobre la resortera (la horquilla de madera)</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">2</span><span class="ctrl-desc">Mantiene el click y arrastra el mouse hacia atras para apuntar</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">3</span><span class="ctrl-desc">Suelta el boton del mouse para disparar</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">ESC</span><span class="ctrl-desc">Pausa y reanuda el juego</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">Boom</span><span class="ctrl-desc">Clic en Boom cuando este activo para coco explosivo</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">Ayudante</span><span class="ctrl-desc">Clic en Ayudante cuando este iluminado para +4 cocos</span></div>',
        ].join('');
    }
    p.appendChild(g);

    // Guia de juego
    const tips = document.createElement('div');
    tips.className = 'controls-guide';
    tips.innerHTML = [
        '<span class="ctrl-title">Como ganar</span>',
        '<div class="ctrl-row"><span class="ctrl-key">Meta</span><span class="ctrl-desc">Destruye todos los cangrejos antes de que lleguen a tu resortera</span></div>',
        '<div class="ctrl-row"><span class="ctrl-key">Verde</span><span class="ctrl-desc">Coco ligero, rebota y viaja mas lejos</span></div>',
        '<div class="ctrl-row"><span class="ctrl-key">Marron</span><span class="ctrl-desc">Coco pesado, hace mas dano al impactar</span></div>',
        '<div class="ctrl-row"><span class="ctrl-key">Dia/Noche</span><span class="ctrl-desc">Cada 5 oleadas cambia el ambiente</span></div>',
    ].join('');
    p.appendChild(tips);

    // Dos botones: Jugar ahora y Volver
    const row = document.createElement('div');
    row.className = 'button-row';
    row.style.marginTop = '12px';
    row.appendChild(makeBtn('Entendido - Jugar', newGame, 'success'));
    row.appendChild(makeBtn('Volver', () => nav('start'), 'back'));
    p.appendChild(row);
}

function renderControls(p) {
    const s = document.createElement('h2');
    s.className = 'menu-subtitle';
    s.textContent = isMobile ? 'Controles Tactiles' : 'Controles Mouse / Teclado';
    p.appendChild(s);

    const g = document.createElement('div');
    g.className = 'controls-guide';

    if (isMobile) {
        g.innerHTML = [
            '<span class="ctrl-title">Como controlar</span>',
            '<div class="ctrl-row"><span class="ctrl-key">Toca y arrastra</span><span class="ctrl-desc">Toca la resortera y arrastra hacia atras para apuntar</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">Suelta</span><span class="ctrl-desc">Suelta el dedo para lanzar el coco</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">Boom</span><span class="ctrl-desc">Boton Boom activo para lanzar coco explosivo</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">Ayudante</span><span class="ctrl-desc">Recarga +4 cocos cuando el boton este iluminado</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">Pausa</span><span class="ctrl-desc">Boton Pausa en la barra superior</span></div>',
        ].join('');
    } else {
        g.innerHTML = [
            '<span class="ctrl-title">Como controlar</span>',
            '<div class="ctrl-row"><span class="ctrl-key">Click + Arrastra</span><span class="ctrl-desc">Haz click en la resortera y arrastra el mouse hacia atras</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">Suelta el click</span><span class="ctrl-desc">Suelta el boton del mouse para lanzar el coco</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">ESC</span><span class="ctrl-desc">Pausa y reanuda el juego en cualquier momento</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">Boom</span><span class="ctrl-desc">Clic en el boton Boom cuando este disponible</span></div>',
            '<div class="ctrl-row"><span class="ctrl-key">Ayudante</span><span class="ctrl-desc">Clic en Ayudante para recargar +4 cocos</span></div>',
        ].join('');
    }
    p.appendChild(g);

    const tips = document.createElement('div');
    tips.className = 'controls-guide';
    tips.innerHTML = [
        '<span class="ctrl-title">Como jugar</span>',
        '<div class="ctrl-row"><span class="ctrl-key">Objetivo</span><span class="ctrl-desc">Destruye todos los cangrejos antes de que lleguen a tu resortera</span></div>',
        '<div class="ctrl-row"><span class="ctrl-key">Dia / Noche</span><span class="ctrl-desc">Cada 5 oleadas cambia entre dia y noche</span></div>',
        '<div class="ctrl-row"><span class="ctrl-key">Verde</span><span class="ctrl-desc">Coco ligero, rebota mas lejos</span></div>',
        '<div class="ctrl-row"><span class="ctrl-key">Marron</span><span class="ctrl-desc">Coco pesado, mas dano al impactar</span></div>',
        '<div class="ctrl-row"><span class="ctrl-key">Oleadas</span><span class="ctrl-desc">Cada oleada los cangrejos son mas rapidos y numerosos</span></div>',
    ].join('');
    p.appendChild(tips);

    p.appendChild(makeBtn('Volver', () => nav('main'), 'back'));
}

function renderOptions(p) {
    const s = document.createElement('h2');
    s.className = 'menu-subtitle';
    s.textContent = 'Opciones';
    p.appendChild(s);
    const st = menuState.settings;
    p.appendChild(makeBtn('Volumen: ' + st.volume + '%', () => {
        st.volume = st.volume >= 100 ? 0 : st.volume + 10;
        render();
    }));
    p.appendChild(makeBtn('Música de fondo: ' + (bgMusicPlaying() ? 'ON' : 'OFF'), () => {
        toggleBackgroundMusic();
        render();
    }));
    p.appendChild(makeBtn('Graficos: ' + (st.graphics === 'high' ? 'Altos' : 'Bajos'), () => {
        st.graphics = st.graphics === 'high' ? 'low' : 'high';
        render();
    }));
    p.appendChild(makeBtn('Pantalla Completa', toggleFullscreen));
    p.appendChild(makeBtn('Volver', () => nav('main'), 'back'));
}

function renderCredits(p) {
    const s = document.createElement('h2');
    s.className = 'menu-subtitle';
    s.textContent = 'Creditos';
    p.appendChild(s);

    const list = [
        { icon: 'studio', name: 'Casmo Game Studio',  role: 'Estudio de Desarrollo' },
        { icon: 'dev',    name: 'Jhorman Castellanos', role: 'Desarrollador Principal' },
        { icon: 'github', name: 'github.com/Jhormancastella', role: 'Perfil de GitHub' },
        { icon: 'beta',   name: 'Rosy Castellanos',    role: 'Beta Tester - Testeo de Jugabilidad' },
        { icon: 'insp',   name: 'Angry Birds', role: 'Inspiración' },
    ];
    list.forEach(function(c) {
        const item = document.createElement('div');
        item.className = 'credit-item';
        const iconMap = { studio: '🏢', dev: '💻', github: '🐙', beta: '🎮', qa: '🧪', insp: '🐦' };
        item.innerHTML = '<span class="credit-icon">' + (iconMap[c.icon] || '') + '</span>'
            + '<div><strong style="color:#ffd966">' + c.name + '</strong><br>'
            + '<small style="color:#b8ddb8">' + c.role + '</small></div>';
        p.appendChild(item);
    });

    const t = document.createElement('p');
    t.className = 'thanks-text';
    t.textContent = 'Gracias por jugar Coco-booms!';
    p.appendChild(t);
    p.appendChild(makeBtn('Volver', () => nav('main'), 'back'));
}

function renderExit(p) {
    const s = document.createElement('h2');
    s.className = 'menu-subtitle';
    s.textContent = 'Salir del juego?';
    p.appendChild(s);
    const m = document.createElement('p');
    m.className = 'exit-message';
    m.textContent = 'Se cerrara la aplicacion.';
    p.appendChild(m);
    const row = document.createElement('div');
    row.className = 'button-row';
    row.appendChild(makeBtn('Si, Salir', exitGame, 'danger'));
    row.appendChild(makeBtn('Cancelar', () => nav('main'), 'back'));
    p.appendChild(row);
}

function newGame() {
    menuState.gameStarted = true;
    menuState.currentLevel = 1;
    hideMenu();
    if (window.resetGame) window.resetGame();
    if (window.startGame) window.startGame();
}

function continueGame() {
    hideMenu();
}

function loadSelectedLevel(level) {
    menuState.currentLevel = Math.max(1, Math.min(50, level));
    hideMenu();
    if (window.loadLevel) window.loadLevel(menuState.currentLevel);
}

function selectLevel() {
    const level = prompt('Numero de nivel (1-50):', '1');
    if (level && !isNaN(level)) {
        loadSelectedLevel(parseInt(level));
    }
}

function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const rfs = el.requestFullscreen || el.webkitRequestFullscreen;
        if (rfs) rfs.call(el).catch(function() {});
    } else {
        const ex = document.exitFullscreen || document.webkitExitFullscreen;
        if (ex) ex.call(document).catch(function() {});
    }
}

function exitGame() {
    document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#1a4f30;color:#ffd966;font-family:system-ui;flex-direction:column;gap:16px"><h1>Coco-booms</h1><p>Gracias por jugar</p><small>Desarrollado por Ariaba</small></div>';
}

export function getMenuState() { return Object.assign({}, menuState); }
