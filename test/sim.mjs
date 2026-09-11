// Juega partidos enteros sin pantalla (los cuatro manejados por la computadora)
// para revisar reglas, física y que el partido siempre termine: node test/sim.mjs
import { Game } from '../src/game.js';

// Azar con semilla, para que cada corrida sea repetible
function seeded(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const count = (obj, key) => { obj[key] = (obj[key] || 0) + 1; };
let failed = false;

for (const seed of [1, 2, 3]) {
  const game = new Game({ demo: true, rand: seeded(seed) });
  const reasons = {}, shots = {}, rallies = [];
  let time = 0, rally = 0, faults = 0, mishits = 0, glass = 0, mesh = 0;
  const started = Date.now();

  while (game.state !== 'match' && time < 4 * 3600) {
    game.update(1 / 60, {});
    time += 1 / 60;
    for (const e of game.events) {
      if (e.type === 'hit') { rally++; count(shots, e.shot); }
      if (e.type === 'wall') e.glass ? glass++ : mesh++;
      if (e.type === 'mishit') mishits++;
      if (e.type === 'fault') { faults++; count(reasons, `Falta: ${e.reason}`); }
      if (e.type === 'point') { count(reasons, e.reason); rallies.push(rally); rally = 0; }
    }
  }

  const done = game.state === 'match';
  if (!done) failed = true;
  const avg = rallies.reduce((a, b) => a + b, 0) / Math.max(1, rallies.length);
  console.log(`\nSemilla ${seed}: ${done ? `ganó el equipo ${game.score.winner}` : 'NO TERMINÓ'} ${game.score.games.join('-')}`);
  console.log(`  ${rallies.length} puntos en ${(time / 60).toFixed(1)} min de juego (${Date.now() - started} ms de cálculo)`);
  console.log(`  golpes por punto: promedio ${avg.toFixed(1)}, máximo ${Math.max(...rallies)}`);
  console.log(`  golpes: ${JSON.stringify(shots)}  pifias: ${mishits}  faltas: ${faults}`);
  console.log(`  rebotes: vidrio ${glass}, malla ${mesh}`);
  console.log('  cómo terminaron los puntos:');
  for (const [r, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(3)}  ${r}`);
}

// Un partido con el jugador 0 manejado por un "humano" automático, para probar controles, saque y ayuda
{
  const game = new Game({ rand: seeded(7) });
  const me = game.human;
  let time = 0, mine = 0, points = 0;
  while (game.state !== 'match' && time < 4 * 3600) {
    const b = game.ball;
    const dx = b.x - me.x, dz = Math.min(b.z, -0.5) - 0.3 - me.z, d = Math.hypot(dx, dz) || 1;
    const input = { x: -dx / d, y: dz / d, shot: null };
    if (game.state === 'serve' && game.server === me && game.timer > 0.6) input.shot = 'golpe';
    if (game.state === 'rally' && b.z < 0 && Math.hypot(b.x - me.x, b.z - me.z) < 1.6) input.shot = b.y > 2 ? 'remate' : 'golpe';
    game.update(1 / 60, input);
    time += 1 / 60;
    for (const e of game.events) {
      if (e.type === 'hit' && e.player === me.id) mine++;
      if (e.type === 'point') points++;
    }
  }
  const done = game.state === 'match';
  if (!done || mine === 0) failed = true;
  console.log(`\nCon humano automático: ${done ? `terminó ${game.score.games.join('-')}` : 'NO TERMINÓ'}, ${points} puntos, ${mine} golpes del jugador 0`);
}

process.exit(failed ? 1 : 0);
