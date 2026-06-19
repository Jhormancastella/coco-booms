// Audio.js SUPER SIMPLE - Funciona de manera segura

const sounds = {
  launch: new Audio('src/sounds/golpe-arena.mp3'),
  hit: new Audio('src/sounds/golpe.mp3'),
  explosion: new Audio('src/sounds/golpe.mp3'), // Usamos golpe como fallback para explosion
  background: new Audio('src/sounds/liga.mp3'),
  gameover: new Audio('src/sounds/fin de juego.mp3')
};

// Configuramos música de fondo
sounds.background.loop = true;
sounds.background.volume = 0.4;
sounds.launch.volume = 0.7;
sounds.hit.volume = 0.7;
sounds.explosion.volume = 0.7;
sounds.gameover.volume = 0.7;

// Variable para saber si el usuario ha interactuado
let audioEnabled = false;

// Función de inicialización simple
export function initAudio() {
  console.log('🔊 Audio inicializado!');
}

// Función para activar audio (ahora solo marca como activado)
export function enableAudio() {
  audioEnabled = true;
  console.log('✅ Audio activado!');
}

// Función para reproducir sonidos
export function playSound(name) {
  // Verificamos si el usuario ha interactuado
  if (!audioEnabled && window.userHasInteracted) {
    enableAudio();
  }
  
  if (!audioEnabled) {
    console.warn('⚠️ Audio no está activado - haz clic primero!');
    return;
  }
  
  if (sounds[name]) {
    try {
      sounds[name].currentTime = 0;
      sounds[name].play().then(() => {
        console.log(`🔊 Sonido reproducido: ${name}`);
      }).catch(err => {
        console.warn(`⚠️ No se pudo reproducir ${name}:`, err);
      });
    } catch (e) {
      console.error(e);
    }
  }
}

// Control para música de fondo
let isBgPlaying = false;
export function toggleBackgroundMusic() {
  if (!audioEnabled && window.userHasInteracted) enableAudio();
  
  if (sounds.background) {
    if (isBgPlaying) {
      sounds.background.pause();
      isBgPlaying = false;
      console.log('🔇 Música pausada');
    } else {
      sounds.background.play().then(() => {
        isBgPlaying = true;
        console.log('🎵 Música reproduciéndose');
      }).catch(err => {
        console.warn('⚠️ No se pudo reproducir música de fondo:', err);
      });
    }
  }
}

export function bgMusicPlaying() {
  return isBgPlaying;
}

// Función de prueba simple
export function testSound() {
  if (!audioEnabled) enableAudio();
  setTimeout(() => playSound('launch'), 50);
}
