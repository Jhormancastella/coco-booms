const images = {};
const loadPromises = [];

function loadImage(key, src) {
    const img = new Image();
    const p = new Promise((resolve) => {
        img.onload  = () => { images[key] = img; resolve(); };
        img.onerror = () => { console.warn('No se pudo cargar: ' + src); resolve(); };
    });
    img.src = src;
    loadPromises.push(p);
}

// Cangrejos
loadImage('cangrejo1',        'src/img/cangrejo1.png');
loadImage('cangrejo2',        'src/img/cangrejo2.png');
loadImage('cangrejo3',        'src/img/cangrejo3.png');

// Palmeras
loadImage('palmera',          'src/img/palmera.png');
loadImage('palmera-consuelo', 'src/img/palmera-consuelo.png');

// Lanzadora
loadImage('lanzadora',        'src/img/lanzadora.png');

// Suelos (solo suelo-3 se usa actualmente)
loadImage('suelo-3',          'src/img/suelo-3.png');

export function getImage(key) {
    return images[key] || null;
}

export function allAssetsLoaded() {
    return Promise.all(loadPromises);
}
