// El partido: jugadores, pelota, saque, turnos y tanteo.
// No dibuja nada: main.js lo muestra en 3D y test/sim.mjs lo corre sin pantalla.
import { R, HALF_W, SERVICE_Z, createBall, stepBall, predict } from './physics.js';
import { SHOTS, solveShot } from './shots.js';
import { Referee, Score } from './rules.js';
import { SPEED, REACH, maxHeight, findContact, chooseShot, chooseAim, basePosition } from './ai.js';

const HUMAN_REACH = 1.3;   // un poco más de alcance para jugar con el dedo
const ASSIST = 2.5;        // ayuda (m/s) para acomodarse cuando apretás un golpe
const INTENT_TIME = 0.4;   // cuánto antes del impacto se puede apretar el botón
const SWING_TIME = 0.5;
const REACTION = 0.15;     // la computadora tarda en reaccionar al golpe rival

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = rand => (rand() + rand() + rand() - 1.5) / 1.5;   // aproximadamente normal, en [-1, 1]

export class Game {
  constructor({ demo = false, rand = Math.random, games = 6 } = {}) {
    this.rand = rand;
    // half: de qué mitad de la cancha es cada uno (x > 0 o x < 0). Vos sos el 0.
    this.players = [
      { id: 0, team: 0, half: 1, human: !demo },
      { id: 1, team: 0, half: -1, human: false },
      { id: 2, team: 1, half: 1, human: false },
      { id: 3, team: 1, half: -1, human: false },
    ].map(p => ({ ...p, x: p.half * 2.3, z: p.team ? 7 : -7, vx: 0, vz: 0, yaw: p.team ? Math.PI : 0, swing: null, intent: null, misjudge: { x: 0, z: 0 } }));
    this.ball = createBall();
    this.ref = new Referee();
    this.score = new Score(games);
    this.events = [];
    this.chaser = [null, null];
    this.hitClock = 0;
    this.reaction = REACTION;
    this.restart();
  }

  get human() { return this.players.find(p => p.human); }

  restart() {
    this.score.reset();
    this.serveTeam = 0;
    this.servers = [0, 2];   // quién saca en cada equipo; se alternan
    this.pointNo = 0;
    this.faults = 0;
    this.last = null;
    this.setupServe();
  }

  // Ubica a los cuatro para sacar. El primer punto de cada game se saca desde la derecha.
  setupServe() {
    const t = this.serveTeam, sgn = t === 0 ? -1 : 1;   // sgn: lado de la cancha del que saca
    const sx = this.pointNo % 2 === 0 ? sgn : -sgn;       // derecha de quien mira a la red = sgn
    const server = this.players[this.servers[t]];
    const mate = this.players.find(p => p.team === t && p !== server);
    const receiver = this.players.find(p => p.team !== t && p.half === -sx);
    const rmate = this.players.find(p => p.team !== t && p !== receiver);
    const put = (p, x, z) => Object.assign(p, { x, z, vx: 0, vz: 0, swing: null, intent: null, yaw: p.team ? Math.PI : 0 });
    put(server, sx * 2.2, sgn * 8.3);
    put(mate, -sx * 2.4, sgn * 3.6);
    put(receiver, -sx * 2.6, -sgn * 8.6);
    put(rmate, sx * 2.4, -sgn * 6.3);
    this.server = server;
    this.box = {
      x0: Math.min(0, -sx * HALF_W), x1: Math.max(0, -sx * HALF_W),
      z0: Math.min(0, -sgn * SERVICE_Z), z1: Math.max(0, -sgn * SERVICE_Z),
    };
    this.ref.live = false;
    Object.assign(this.ball, { active: false, out: false, rolling: false, vx: 0, vy: 0, vz: 0, spin: 0 });
    this.holdBall();
    this.state = 'serve';
    this.timer = 0;
    this.events.push({ type: 'serve-ready', server: server.id, team: t, second: this.faults > 0 });
  }

  holdBall() {
    const s = this.server, sgn = s.team === 0 ? -1 : 1;
    Object.assign(this.ball, { x: s.x + sgn * 0.3, y: 0.95, z: s.z - sgn * 0.35 });
  }

  // input: { x, y } del joystick (-1..1, derecha y arriba en pantalla) y shot: golpe apretado en este cuadro
  update(dt, input = {}) {
    this.events.length = 0;
    if (this.state === 'match') return;
    this.timer += dt;
    this.hitClock += dt;
    const path = this.state === 'rally' && this.ball.active ? predict(this.ball) : null;
    this.movePlayers(dt, input, path);
    this.tickSwings(dt, input);
    if (this.state === 'serve') this.serveLogic(input);
    else if (this.state === 'rally') this.tryHits();

    for (const e of stepBall(this.ball, dt, [], this.rand)) {
      this.events.push(e);
      const res = this.state === 'rally' ? this.ref.judge(e) : null;
      if (res) res.fault ? this.onFault(res) : this.onPoint(res);
    }
    if (this.state === 'rally' && this.timer > 45) this.onPoint({ winner: -1, reason: 'Se repite el punto' });
    if (this.state === 'point' && this.timer > 1.9) this.nextPoint();
    if (this.state === 'fault' && this.timer > 1.3) this.setupServe();
  }

  movePlayers(dt, input, path) {
    const b = this.ball;
    for (const team of [0, 1]) {
      const mates = this.players.filter(p => p.team === team);
      const right = team === 0 ? -1 : 1;
      let contact = null, humanContact = null;
      this.chaser[team] = null;
      if (path && this.ref.live && this.ref.hitter !== team && this.hitClock > this.reaction) {
        const options = mates.map(p => ({ p, c: findContact(path, team, this.ref, p.x, p.z) })).filter(o => o.c);
        const mine = options.find(o => o.p.human);
        humanContact = mine?.c ?? null;
        if (mine && mine.c.x * mine.p.half > -0.5) {
          this.chaser[team] = mine.p;   // la pelota va hacia tu mitad: es tuya
        } else {
          const best = options.filter(o => !o.p.human).sort((a, c) => a.c.score - c.c.score)[0];
          if (best) { this.chaser[team] = best.p; contact = best.c; }
        }
      }
      for (const p of mates) {
        if (this.state === 'serve') { p.vx = p.vz = 0; continue; }
        let wantX = 0, wantZ = 0;
        const toward = (tx, tz, max) => {
          const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
          if (d < 0.03) return;
          const v = Math.min(max, d * 3.5);
          wantX += dx / d * v; wantZ += dz / d * v;
        };
        if (p.human) {
          wantX = -(input.x || 0) * SPEED;
          wantZ = (input.y || 0) * SPEED;
          if (p.intent && humanContact && Math.hypot(humanContact.x - p.x, humanContact.z - p.z) < 2.4) {
            toward(humanContact.x - right * 0.45, humanContact.z + right * 0.25, ASSIST);
          }
          const n = Math.hypot(wantX, wantZ);
          if (n > SPEED * 1.1) { wantX *= SPEED * 1.1 / n; wantZ *= SPEED * 1.1 / n; }
        } else if (p === this.chaser[team] && contact) {
          // Se para con la pelota a su derecha. Al principio calcula mal y corrige a medida que llega.
          const doubt = Math.min(1, contact.t / 0.7);
          toward(contact.x - right * 0.45 + p.misjudge.x * doubt, contact.z + right * 0.25 + p.misjudge.z * doubt, SPEED);
        } else {
          const base = basePosition(p, this.ref);
          toward(base.x, base.z, SPEED * 0.8);
        }
        // Correr hacia el propio fondo es más lento que ir hacia la red
        if (wantZ * (team === 0 ? -1 : 1) > 0) wantZ *= p.human ? 0.8 : 0.65;
        const a = 28 * dt;
        p.vx += clamp(wantX - p.vx, -a, a);
        p.vz += clamp(wantZ - p.vz, -a, a);
        p.x = clamp(p.x + p.vx * dt, -4.75, 4.75);
        p.z = team === 0 ? clamp(p.z + p.vz * dt, -9.7, -0.35) : clamp(p.z + p.vz * dt, 0.35, 9.7);
        p.yaw = this.state === 'rally' ? Math.atan2(b.x - p.x, b.z - p.z) : (team ? Math.PI : 0);
      }
    }
  }

  tickSwings(dt, input) {
    for (const p of this.players) {
      if (p.swing && (p.swing.t += dt) > SWING_TIME) p.swing = null;
      if (p.intent && (p.intent.t -= dt) <= 0) p.intent = null;
    }
    const me = this.human;
    if (me && input.shot && this.state === 'rally') {
      me.intent = { shot: input.shot, t: INTENT_TIME, aim: -(input.x || 0) };
      if (!me.swing) me.swing = { kind: input.shot, t: 0, side: this.swingSide(me) };
    }
  }

  // Derecha o revés según de qué lado del jugador viene la pelota
  swingSide(p) {
    const right = p.team === 0 ? -1 : 1;
    return (this.ball.x - p.x) * right >= 0 ? 'derecha' : 'reves';
  }

  tryHits() {
    const b = this.ball;
    if (!this.ref.live || !b.active) return;
    for (const p of this.players) {
      if (!this.ref.canHit(p.team, b.z)) continue;
      const reach = p.human ? HUMAN_REACH : REACH;
      const dist = Math.hypot(b.x - p.x, b.z - p.z);
      if (dist > reach || b.y < 0.2 || b.y > maxHeight(p.z) + 0.05) continue;
      if (p.human) {
        if (!p.intent) continue;
        const shot = p.intent.shot === 'remate' && b.y < 1.6 ? 'golpe' : p.intent.shot;   // sin altura no hay remate
        this.hit(p, shot, p.intent.aim, dist / reach);
        p.intent = null;
      } else {
        if (p !== this.chaser[p.team]) continue;
        if (b.y < 0.5 && b.vy > 0 && dist < reach * 0.8) continue;   // espera que suba un poco
        const rivals = this.players.filter(r => r.team !== p.team);
        this.hit(p, chooseShot(p, b, rivals, this.rand), chooseAim(rivals, this.rand), dist / reach);
      }
      return;
    }
  }

  // aim: -1..1 a lo ancho del mundo. stretch: 0 (cómodo) a 1 (al límite del alcance)
  hit(p, shot, aim, stretch = 0) {
    const b = this.ball, rand = this.rand, cfg = SHOTS[shot];
    const dir = p.team === 0 ? 1 : -1;   // hacia el campo rival
    const tx = clamp(aim * 3.5 + gauss(rand) * 0.5, -4.6, 4.6);
    const tz = dir * clamp(cfg.depth[0] + (cfg.depth[1] - cfg.depth[0]) * rand() + gauss(rand) * 0.4, 0.8, 9.6);
    // Pifias: más probables estirándose, con pelotas rápidas y en golpes difíciles
    const incoming = Math.hypot(b.vx, b.vy, b.vz);
    const risk = (p.human ? 0.03 : 0.04) + (p.human ? 0.15 : 0.2) * stretch ** 2
      + (incoming > 18 ? 0.06 : 0) + (shot === 'remate' || shot === 'dejada' ? 0.06 : 0);
    let v;
    if (rand() < risk) {
      if (rand() < 0.55) {
        const dx = tx - b.x, dy = 0.35 - b.y, dz = -b.z, d = Math.hypot(dx, dy, dz);   // a la red
        v = { vx: dx / d * 14, vy: dy / d * 14, vz: dz / d * 14, spin: 0 };
      } else {
        v = solveShot(shot === 'globo' ? 'globo' : 'golpe', b, { x: tx, y: R, z: dir * 11.5 }, rand());   // larga
      }
      this.events.push({ type: 'mishit', player: p.id });
    } else {
      v = solveShot(shot, b, { x: tx, y: R, z: tz }, rand());
    }
    Object.assign(b, { vx: v.vx, vy: v.vy, vz: v.vz, spin: v.spin, rolling: false });
    this.ref.hit(p.team);
    this.hitClock = 0;
    this.reaction = REACTION + rand() * 0.2;
    for (const q of this.players) q.misjudge = { x: gauss(rand) * 0.6, z: gauss(rand) * 1.2 };
    p.swing = { kind: shot, t: 0.15, side: this.swingSide(p) };
    this.events.push({ type: 'hit', player: p.id, team: p.team, shot, x: b.x, y: b.y, z: b.z });
  }

  serveLogic(input) {
    const s = this.server;
    this.holdBall();
    const go = s.human ? Boolean(input.shot) : this.timer > 1.2;
    if (!go || this.timer < 0.4) return;
    const box = this.box, rand = this.rand, b = this.ball;
    const aim = s.human ? -(input.x || 0) : (rand() - 0.5) * 1.6;
    const tx = clamp((box.x0 + box.x1) / 2 + aim * 1.4 + gauss(rand) * 0.35, box.x0 + 0.35, box.x1 - 0.35);
    const tz = Math.sign(box.z0 + box.z1) * clamp(4.4 + rand() * 1.9 + gauss(rand) * (s.human ? 0.3 : 0.9), 1.5, 7.4);
    Object.assign(b, { y: 0.85, active: true, out: false, rolling: false });
    const v = solveShot('saque', b, { x: tx, y: R, z: tz }, rand());
    Object.assign(b, { vx: v.vx, vy: v.vy, vz: v.vz, spin: v.spin });
    this.ref.startServe(s.team, box);
    s.swing = { kind: 'saque', t: 0.15, side: 'derecha' };
    this.hitClock = 0;
    this.state = 'rally';
    this.timer = 0;
    this.events.push({ type: 'hit', player: s.id, team: s.team, shot: 'saque', x: b.x, y: b.y, z: b.z });
  }

  onPoint(res) {
    const info = res.winner >= 0 ? this.score.pointTo(res.winner) : null;
    this.state = 'point';
    this.timer = 0;
    this.faults = 0;
    this.last = { ...res, info };
    if (info) this.pointNo = info.game ? 0 : this.pointNo + 1;
    this.events.push({ type: 'point', winner: res.winner, reason: res.reason, info });
  }

  onFault(res) {
    if (++this.faults >= 2) return this.onPoint({ winner: 1 - this.serveTeam, reason: 'Doble falta' });
    this.state = 'fault';
    this.timer = 0;
    this.events.push({ type: 'fault', reason: res.reason });
  }

  nextPoint() {
    if (this.score.winner !== null) {
      this.state = 'match';
      this.events.push({ type: 'match', winner: this.score.winner });
      return;
    }
    if (this.last?.info?.game) {
      const t = this.serveTeam;
      this.servers[t] = this.players.find(p => p.team === t && p.id !== this.servers[t]).id;
      this.serveTeam = 1 - t;
    }
    this.setupServe();
  }
}
