// Física de la pelota: gravedad, rozamiento con el aire, efecto, piques en el
// césped, rebotes en vidrio y malla, red y salida por encima del cerramiento.
// No usa Three.js ni el DOM, así se puede probar con Node (test/sim.mjs).
//
// Ejes: x a lo ancho (-5..5), y hacia arriba, z a lo largo (-10..10).
// La red está en z = 0; el equipo 0 (el tuyo) juega en z < 0.

export const R = 0.0335;            // radio de la pelota (m)
export const GRAVITY = 9.81;
export const HALF_W = 5;
export const HALF_L = 10;
export const SERVICE_Z = 6.95;      // línea de saque, medida desde la red

const DRAG = 0.016;                 // arrastre cuadrático (1/m)
const SPIN_ACCEL = 4;               // caída extra con liftado, o sustentación con cortado, a 20 m/s
const FLOOR_E = 0.74;               // FIP: soltada desde 2,54 m rebota entre 1,35 y 1,45 m
const GLASS = { e: 0.78, keep: 0.9 };
const MESH = { e: 0.3, keep: 0.55, jitter: 1.4 };
const STEP = 1 / 240;

export const netHeight = x => 0.88 + 0.04 * Math.min(1, (x / HALF_W) ** 2);
export const sideOf = z => (z < 0 ? 0 : 1);

// Cerramiento reglamentario: fondos con 3 m de vidrio y malla hasta 4 m;
// laterales con vidrio escalonado (3 m y 2 m) y malla de 3 m en el centro.
export function wallAt(kind, along) {
  if (kind === 'back') return { glass: 3, top: 4 };
  const a = Math.abs(along);
  if (a >= 8) return { glass: 3, top: 4 };
  if (a >= 6) return { glass: 2, top: 3 };
  return { glass: 0, top: 3 };
}

export const createBall = () => ({ x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, active: false, out: false, rolling: false });

// Vuelo libre durante h segundos, sin choques
export function fly(b, h) {
  const speed = Math.hypot(b.vx, b.vy, b.vz);
  const hs = Math.hypot(b.vx, b.vz);
  b.vx -= DRAG * speed * b.vx * h;
  b.vz -= DRAG * speed * b.vz * h;
  b.vy -= (GRAVITY + DRAG * speed * b.vy + SPIN_ACCEL * b.spin * hs / 20) * h;
  b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
}

// Avanza dt segundos y agrega a `events` lo que pasó:
// floor (pique), wall (pared), net (red), cross (pasó la red), out (salió), stop (se frenó)
export function stepBall(b, dt, events = [], rand = Math.random) {
  const n = Math.max(1, Math.ceil(dt / STEP - 1e-9));
  const h = dt / n;
  for (let i = 0; i < n && b.active; i++) {
    const pz = b.z;
    if (b.rolling) roll(b, h, events);
    else fly(b, h);
    if (!b.out) {
      net(b, pz, events);
      if (Math.abs(b.x) + R > HALF_W && b.vx * b.x > 0) wall(b, 'side', events, rand);
      if (Math.abs(b.z) + R > HALF_L && b.vz * b.z > 0) wall(b, 'back', events, rand);
    }
    if (b.y < R && b.vy < 0) floor(b, events);
    if (b.out && (Math.abs(b.x) > 14 || Math.abs(b.z) > 20)) b.active = false;
  }
  return events;
}

function net(b, pz, events) {
  if ((pz < 0) === (b.z < 0) || Math.abs(b.x) > HALF_W) return;
  if (b.y - R < netHeight(b.x)) {
    b.z = pz < 0 ? -R : R;
    b.vz *= -0.1; b.vx *= 0.3; b.vy = Math.min(b.vy, 0) * 0.3;
    b.spin = 0;
    events.push({ type: 'net', x: b.x, y: b.y });
  } else {
    events.push({ type: 'cross', to: sideOf(b.z) });
  }
}

function wall(b, kind, events, rand) {
  const w = wallAt(kind, kind === 'side' ? b.z : b.x);
  const side = sideOf(b.z);
  if (b.y > w.top) { b.out = true; events.push({ type: 'out', side }); return; }
  const glass = b.y < w.glass;
  const m = glass ? GLASS : MESH;
  // La malla devuelve poco y hacia cualquier lado: sólo se altera lo tangencial
  const j = glass ? 0 : m.jitter;
  if (kind === 'side') {
    b.x = Math.sign(b.x) * (HALF_W - R);
    b.vx *= -m.e; b.vz = b.vz * m.keep + (rand() - 0.5) * j;
  } else {
    b.z = Math.sign(b.z) * (HALF_L - R);
    b.vz *= -m.e; b.vx = b.vx * m.keep + (rand() - 0.5) * j;
  }
  b.vy = b.vy * m.keep + (rand() - 0.5) * j * 0.6;
  b.spin *= 0.5;
  events.push({ type: 'wall', side, glass, kind });
}

function floor(b, events) {
  const inside = !b.out && Math.abs(b.x) <= HALF_W && Math.abs(b.z) <= HALF_L;
  const impact = -b.vy;
  b.y = R;
  if (impact < 0.6) {
    // Ya casi no pica: empieza a rodar
    b.vy = 0;
    if (!b.rolling) {
      b.rolling = true;
      if (inside) events.push({ type: 'floor', x: b.x, z: b.z, side: sideOf(b.z), soft: true });
    }
    return;
  }
  // El liftado sale hacia adelante; el cortado se frena
  const keep = b.spin > 0.2 ? 0.84 : b.spin < -0.2 ? 0.5 : 0.74;
  b.vy = impact * FLOOR_E;
  b.vx *= keep; b.vz *= keep;
  b.spin *= 0.4;
  if (inside) events.push({ type: 'floor', x: b.x, z: b.z, side: sideOf(b.z) });
}

function roll(b, h, events) {
  const k = Math.max(0, 1 - 2.5 * h);
  b.vx *= k; b.vz *= k; b.vy = 0; b.y = R;
  b.x += b.vx * h; b.z += b.vz * h;
  if (Math.hypot(b.vx, b.vz) < 0.25) {
    b.active = false;
    if (!b.out) events.push({ type: 'stop', x: b.x, z: b.z, side: sideOf(b.z) });
  }
}

// Trayectoria prevista sin el azar de la malla (para la IA y la marca de pique)
export function predict(ball, seconds = 2.6, dt = 1 / 60) {
  const b = { ...ball }, path = [], ev = [];
  for (let t = dt; t <= seconds && b.active; t += dt) {
    ev.length = 0;
    stepBall(b, dt, ev, () => 0.5);
    path.push({
      t, x: b.x, y: b.y, z: b.z, vy: b.vy, out: b.out,
      floor: ev.some(e => e.type === 'floor'),
      wall: ev.some(e => e.type === 'wall'),
      net: ev.some(e => e.type === 'net'),
    });
  }
  return path;
}
