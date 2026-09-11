// Jugadores que maneja la computadora: a dónde correr, qué golpe elegir y a dónde apuntar.
import { sideOf } from './physics.js';

export const SPEED = 4.6;   // velocidad corriendo (m/s)
export const REACH = 0.95;  // alcance con la pala (m)

// Hasta qué altura se llega con la pala: cerca de la red se salta para rematar
export const maxHeight = z => (Math.abs(z) < 6.5 ? 3.0 : 2.7);

// Mejor punto de la trayectoria para pegarle antes del segundo pique,
// según cuánto tarda en llegar un jugador parado en (px, pz)
export function findContact(path, team, ref, px, pz, speed = SPEED) {
  let bounces = ref.bounces, best = null;
  for (const p of path) {
    if (p.floor && sideOf(p.z) === team) bounces++;
    // Si va directo a nuestra pared o afuera sin picar antes, es punto nuestro: se deja pasar
    if (bounces === 0 && sideOf(p.z) === team && (p.wall || p.out)) return null;
    if (bounces >= 2 || p.out) break;
    if (sideOf(p.z) !== team || p.y < 0.3 || p.y > maxHeight(pz)) continue;
    if (ref.serve && bounces === 0) continue;
    const need = Math.max(0, Math.hypot(p.x - px, p.z - pz) - REACH * 0.6) / speed;
    const late = need - p.t;
    // Llegar a tiempo pesa más; después, una altura cómoda (o alta, cerca de la red, para rematar) y cuanto antes
    const comfort = p.y > 1.9 && Math.abs(pz) < 6.5 ? 0.1 : Math.abs(p.y - 1.0);
    const score = (late > 0 ? 5 + late * 10 : 0) + comfort + p.t * 0.2;
    if (!best || score < best.score) best = { x: p.x, y: p.y, z: p.z, t: p.t, late, score };
  }
  return best;
}

export function chooseShot(p, ball, rivals, rand) {
  const fromNet = Math.abs(p.z);
  if (ball.y > 1.9 && fromNet < 6.5) return rand() < 0.8 ? 'remate' : 'golpe';
  if (rivals.every(r => Math.abs(r.z) < 5.5) && rand() < 0.4) return 'globo';
  if (fromNet < 5.5 && ball.y < 1.3 && rivals.some(r => Math.abs(r.z) > 6.5) && rand() < 0.25) return 'dejada';
  if (fromNet > 7 && rand() < 0.15) return 'globo';
  return 'golpe';
}

// Dirección a lo ancho (-1..1): lejos del rival más cercano a esa zona, con algo de azar
export function chooseAim(rivals, rand) {
  let best = 0, bestScore = -Infinity;
  for (const a of [-0.85, -0.35, 0.35, 0.85]) {
    const gap = Math.min(...rivals.map(r => Math.abs(r.x - a * 3.5)));
    const s = gap + rand() * 1.8;
    if (s > bestScore) { bestScore = s; best = a; }
  }
  return best;
}

// Dónde esperar cuando no le toca ir a la pelota: adelante si su equipo pegó último
export function basePosition(p, ref) {
  const sign = p.team === 0 ? -1 : 1;
  const attacking = ref.live && ref.hitter === p.team;
  return { x: p.half * 2.3, z: sign * (attacking ? 4.5 : 7.3) };
}
