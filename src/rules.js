// Reglas del pádel: el tanteo (15-30-40 con punto de oro, games y set)
// y el árbitro que decide cada punto a partir de lo que hace la pelota.
import { sideOf } from './physics.js';

const LABELS = ['0', '15', '30', '40'];
const LINE = 0.05;   // la línea es parte del cuadro

export class Score {
  constructor(games = 6) { this.target = games; this.reset(); }

  reset() { this.points = [0, 0]; this.games = [0, 0]; this.winner = null; }

  golden() { return this.points[0] === 3 && this.points[1] === 3; }

  // Con punto de oro el game se gana siempre al cuarto punto.
  // El set es a 6 games con 2 de diferencia; si llegan 6-6 se define 7-6.
  pointTo(t) {
    const res = { team: t, golden: this.golden(), game: false, match: false };
    if (++this.points[t] < 4) return res;
    res.game = true;
    this.points = [0, 0];
    const g = ++this.games[t], other = this.games[1 - t];
    if ((g >= this.target && g - other >= 2) || g > this.target) { res.match = true; this.winner = t; }
    return res;
  }

  label(t) { return LABELS[this.points[t]]; }
}

export class Referee {
  constructor() { this.live = false; this.hitter = 0; this.bounces = 0; this.serve = false; this.box = null; }

  // Salió el saque: tiene que picar en el cuadro cruzado
  startServe(team, box) { Object.assign(this, { live: true, hitter: team, bounces: 0, serve: true, box }); }

  // Pega el equipo que no pegó último, en su campo y antes del segundo pique.
  // Al saque hay que dejarlo picar.
  canHit(team, z) {
    return this.live && team !== this.hitter && sideOf(z) === team && this.bounces < 2 && !(this.serve && this.bounces === 0);
  }

  hit(team) { this.hitter = team; this.bounces = 0; this.serve = false; }

  // Devuelve { winner, reason } si se definió el punto, { fault, reason } si fue falta de saque, o null
  judge(e) {
    if (!this.live) return null;
    const h = this.hitter, o = 1 - h;
    const end = r => { this.live = false; return r; };
    const win = (winner, reason) => end({ winner, reason });
    const fault = reason => end({ fault: true, reason });

    switch (e.type) {
      case 'floor':
      case 'stop':
        if (e.side === h) {
          if (this.serve) return fault('El saque no pasó la red');
          return this.bounces > 0 ? win(h, 'Volvió a su campo') : win(o, 'No pasó la red');
        }
        if (e.type === 'stop') return win(h, 'Doble pique');
        this.bounces++;
        if (this.serve && this.bounces === 1 && !inBox(this.box, e)) return fault('Saque fuera del cuadro');
        return this.bounces === 2 ? win(h, 'Doble pique') : null;

      case 'wall':
        if (e.side !== o) return null;   // contra la pared propia se puede
        if (this.bounces === 0) return this.serve ? fault('El saque pegó en la pared') : win(o, 'Pegó en la pared sin picar');
        if (this.serve && !e.glass) return fault('El saque tocó la malla');
        return null;

      case 'out':
        if (this.bounces > 0) return win(h, '¡Salió por arriba!');
        return this.serve ? fault('Saque afuera') : win(o, 'Afuera');

      default:
        return null;
    }
  }
}

const inBox = (b, e) => e.x >= b.x0 - LINE && e.x <= b.x1 + LINE && e.z >= b.z0 - LINE && e.z <= b.z1 + LINE;
