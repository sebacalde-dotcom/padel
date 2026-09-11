// Golpes: cada tipo tiene su forma de trayectoria (velocidad, altura y efecto).
// solveShot calcula la velocidad inicial para que la pelota pique en el objetivo,
// usando la misma física del juego (con aire y efecto), y la sube si no pasa la red.
import { R, GRAVITY, fly, netHeight } from './physics.js';

// depth: dónde pica, medido desde la red (m). spin: + liftado, - cortado.
export const SHOTS = {
  golpe:  { depth: [5.6, 8.6], speed: [16, 21], spin: 0.35 },                   // drive o volea
  globo:  { depth: [7.4, 9.4], apex: [4.6, 7.6], speed: [14, 18], spin: 0.1 },  // alto; si sale corto, se remata
  remate: { depth: [3.5, 6.5], speed: [23, 28], spin: 0 },                      // fuerte, hacia abajo
  dejada: { depth: [1.0, 2.6], speed: [6, 11], spin: -0.9 },                    // corta, se muere al picar
  saque:  { depth: [4.4, 6.3], speed: [12.5, 14.5], spin: 0.25 },               // de abajo, al cuadro cruzado
};

const MIN_CLEAR = 0.12;   // margen mínimo sobre la red (m)
const lerp = ([a, b], k) => a + (b - a) * k;

// Vuela hasta que la pelota baja al piso: dónde cae y con cuánto margen pasó la red
function flight(from, vx, vy, vz, spin) {
  const b = { x: from.x, y: from.y, z: from.z, vx, vy, vz, spin };
  let clear = Infinity, t = 0;
  while (t < 8) {
    const pz = b.z;
    fly(b, 1 / 240); t += 1 / 240;
    if ((pz < 0) !== (b.z < 0)) clear = b.y - R - netHeight(b.x);
    if (b.y <= R && b.vy < 0) break;
  }
  return { x: b.x, z: b.z, t, clear };
}

// Velocidad inicial para ir desde `from` (la pelota) hasta `to` (el pique).
// k (0..1) elige dentro del rango de velocidad o altura de ese golpe.
export function solveShot(type, from, to, k = 0.5) {
  const cfg = SHOTS[type];
  const dx = to.x - from.x, dz = to.z - from.z;
  const d = Math.max(0.5, Math.hypot(dx, dz)), ux = dx / d, uz = dz / d;
  const reach = (hs, vy) => {
    const f = flight(from, ux * hs, vy, uz * hs, cfg.spin);
    return { along: (f.x - from.x) * ux + (f.z - from.z) * uz, clear: f.clear };
  };
  const velocity = (hs, vy) => ({ vx: ux * hs, vy, vz: uz * hs, spin: cfg.spin });

  if (cfg.apex) {
    // Globo: se fija la altura máxima y se busca la velocidad horizontal
    for (let apex = lerp(cfg.apex, k), i = 0; i < 4; i++, apex += 1) {
      const vy = Math.sqrt(2 * GRAVITY * Math.max(0.5, apex - from.y));
      let lo = 0.5, hi = 30, r;
      for (let j = 0; j < 18; j++) {
        const mid = (lo + hi) / 2;
        r = reach(mid, vy);
        if (r.along < d) lo = mid; else hi = mid;
      }
      if (r.clear > MIN_CLEAR) return velocity((lo + hi) / 2, vy);
    }
  }

  // Resto: velocidad horizontal fija (se baja si no pasa la red) y se busca la vertical
  let hs = type === 'dejada' ? Math.min(cfg.speed[1], Math.max(cfg.speed[0], d * 0.85)) : lerp(cfg.speed, k);
  let best = null;
  for (let i = 0; i < 7; i++, hs *= 0.88) {
    let lo = -0.8 * hs, hi = 0.75 * hs, r;
    for (let j = 0; j < 18; j++) {
      const mid = (lo + hi) / 2;
      r = reach(hs, mid);
      if (r.along < d) lo = mid; else hi = mid;
    }
    best = velocity(hs, (lo + hi) / 2);
    if (r.clear > MIN_CLEAR) return best;
  }
  return best;
}
