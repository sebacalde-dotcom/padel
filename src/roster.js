// Los jugadores: amigos convertidos en personajes low-poly.
// Sólo se guardan rasgos (colores, peinado, barba, anteojos, gorra); las fotos no se usan en el juego.
// No importa Three.js: los colores son números hexadecimales.

export const ROSTER = [
  {
    id: 'pajaro', name: 'Pájaro', accent: 0x2f7d57,
    look: {
      skin: 0xd6a082, shirt: 0x2e4a3a, racket: 0xd4ff3f,
      hair: { style: 'entradas', color: 0x3a302b },
      beard: { style: 'corta', color: 0x77706a },
      glasses: 'marco',
    },
  },
  {
    id: 'jochi', name: 'Jochi', accent: 0x2aa7d8,
    look: {
      skin: 0xb57d5c, shirt: 0x1d1e22, racket: 0x39d0ff,
      hair: { style: 'pelado' },
      cap: { crown: 0x17181c, brim: 0x17181c, under: 0x6fd0f0, patch: 0xc9ccd0, logo: 0x5f646b },
    },
  },
  {
    id: 'paloma', name: 'Paloma', accent: 0x7a8b45,
    look: {
      skin: 0xe2b294, shirt: 0x5c6b3f, pattern: 'camuflado', racket: 0xff8a2a,
      hair: { style: 'corto', color: 0x8b8178 },
    },
  },
  {
    id: 'fer', name: 'Fer', accent: 0x3f63c9,
    look: {
      skin: 0xbf8866, shirt: 0x151518, racket: 0xf5c542,
      hair: { style: 'rapado', color: 0x1f1a17 },
      beard: { style: 'tupida', color: 0x221b18 },
      glasses: 'sol',
      cap: { crown: 0x221d1b, brim: 0x221d1b, under: 0x221d1b, patch: 0x3f83c9 },
    },
  },
  {
    id: 'tincho', name: 'Tincho', accent: 0x8a5cc9,
    look: {
      skin: 0xd09d7e, shirt: 0x3c3d42, racket: 0xff3d7f, eyes: 0x6cc5e8,
      hair: { style: 'corto', color: 0x8f887e },
      beard: { style: 'corta', color: 0x6a5c50 },
    },
  },
  {
    id: 'gato', name: 'Gato', accent: 0x3f9a8f,
    look: {
      skin: 0xdfa384, shirt: 0x4d74a8, racket: 0x7cff6b,
      hair: { style: 'rapado', color: 0x9a5a36 },
      beard: { style: 'corta', color: 0x9a5a36 },
      cap: { crown: 0x56653b, brim: 0x4b5932, under: 0x3f4a2a, backwards: true },
    },
  },
];

// En la cancha cada equipo usa su color de remera; la remera propia se ve en la tarjeta
export const TEAM_KITS = [
  { shirt: 0xff5b35, shorts: 0x161c2b },
  { shirt: 0xf4f6fa, shorts: 0x0f1c3f },
];

export const byId = id => ROSTER.find(p => p.id === id);

// Tu jugador más tres sorteados entre los demás: [vos, compañero, rival, rival]
export function drawLineup(myId, rand = Math.random) {
  const others = ROSTER.filter(p => p.id !== myId);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  return [byId(myId), ...others.slice(0, 3)];
}
