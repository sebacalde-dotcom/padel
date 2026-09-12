// Jugadores low-poly articulados y sus animaciones: esperar, correr y cada golpe.
// El cuerpo se arma con formas que siguen el contorno (torso de una pieza, hombros
// y mangas que continúan el brazo). Los rasgos de la cara están en looks.js.
import * as THREE from 'three';
import { R as HEAD_R, addFace, addHair, addBeard, addGlasses, addCap, shirtTexture } from './looks.js';

// Perfil de la remera, de la cintura al cuello: [radio, altura]
const TORSO = [
  [0, -0.11], [0.125, -0.11], [0.142, -0.02], [0.152, 0.12], [0.163, 0.28],
  [0.175, 0.4], [0.18, 0.46], [0.168, 0.52], [0.132, 0.57], [0.082, 0.6], [0.058, 0.62], [0, 0.625],
].map(([r, y]) => new THREE.Vector2(r, y));

function makeRacket(color) {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 0.13, 0.155, 0, Math.PI * 2, false);
  for (let j = -4; j <= 4; j++) for (let i = -3; i <= 3; i++) {
    const x = i * 0.03 + (j % 2 ? 0.015 : 0), y = j * 0.028;
    if ((x / 0.1) ** 2 + (y / 0.125) ** 2 > 1) continue;
    const h = new THREE.Path(); h.absarc(x, y, 0.0065, 0, Math.PI * 2, true); shape.holes.push(h);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.007, bevelSegments: 2, curveSegments: 24 });
  geo.translate(0, 0, -0.011);
  const face = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x121418, roughness: 0.45 });
  const r = new THREE.Group();
  const head = new THREE.Mesh(geo, [face, dark]); head.position.y = -0.33; head.castShadow = true; r.add(head);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.15, 10), dark); grip.position.y = -0.04; r.add(grip);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.055, 0.07, 10), face); neck.position.y = -0.15; r.add(neck);
  return r;
}

// look: rasgos del jugador (src/roster.js).
// gear: lo del equipo en la cancha { shirt, shorts, ring }. Sin remera de equipo usa la propia (tarjeta).
export function makePlayer(look, gear = {}) {
  const mat = (c, extra) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...extra });
  const shirtColor = gear.shirt ?? look.shirt;
  const skin = mat(look.skin);
  const shirt = !gear.shirt && look.pattern
    ? new THREE.MeshStandardMaterial({ map: shirtTexture(look.pattern, look.shirt), roughness: 0.8 })
    : mat(shirtColor);
  const trim = mat(new THREE.Color(shirtColor).multiplyScalar(0.75));
  const shorts = mat(gear.shorts ?? 0x1b2130);
  const sole = mat(0xf4f4f4), shoe = mat(0xe9edf3), sock = mat(0xffffff);

  const root = new THREE.Group();
  const grp = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const add = (parent, geo, m, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; parent.add(me); return me; };
  const cyl = (a, b, h, seg = 14) => new THREE.CylinderGeometry(a, b, h, seg);
  const ball = (r, seg = 12) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.8));

  const hips = grp(root, 0, 0.95, 0);
  add(hips, cyl(0.15, 0.178, 0.34, 20), shorts, 0, -0.11, 0).scale.set(1.16, 1, 0.84);

  const leg = s => {
    const hip = grp(hips, 0.092 * s, -0.07, 0);
    add(hip, cyl(0.072, 0.058, 0.4), skin, 0, -0.22, 0);
    const knee = grp(hip, 0, -0.44, 0);
    add(knee, ball(0.058), skin);
    add(knee, cyl(0.055, 0.044, 0.38), skin, 0, -0.2, 0);
    add(knee, cyl(0.05, 0.048, 0.12, 12), sock, 0, -0.37, 0);
    const foot = grp(knee, 0, -0.44, 0);
    add(foot, new THREE.BoxGeometry(0.108, 0.04, 0.24), sole, 0, -0.025, 0.045);
    add(foot, ball(0.075, 14), shoe, 0, 0.005, 0.03).scale.set(0.75, 0.72, 1.55);
    return { hip, knee, foot };
  };

  const spine = grp(hips, 0, 0.04, 0);
  add(spine, new THREE.LatheGeometry(TORSO, 26), shirt).scale.set(1.2, 1, 0.78);
  add(spine, cyl(0.05, 0.058, 0.1), skin, 0, 0.6, 0);
  const collar = add(spine, new THREE.TorusGeometry(0.064, 0.014, 8, 24), trim, 0, 0.585, 0);
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(1.26, 0.95, 1);

  const head = grp(spine, 0, 0.695, 0.012);
  add(head, ball(HEAD_R, 26), skin).scale.set(1, 1.05, 0.98);
  addFace(head, look);
  addHair(head, look);
  addBeard(head, look);
  addGlasses(head, look);
  addCap(head, look);

  const arm = s => {
    // El brazo sale del torso afinándose: nada sobresale como una pelota
    const sh = grp(spine, 0.185 * s, 0.465, 0);
    add(sh, ball(0.055, 14), shirt).scale.set(1, 1, 0.95);
    add(sh, cyl(0.06, 0.05, 0.16), shirt, 0, -0.07, 0).scale.set(1, 1, 0.95);
    add(sh, cyl(0.045, 0.039, 0.3, 12), skin, 0, -0.19, 0);
    const el = grp(sh, 0, -0.33, 0);
    add(el, ball(0.04, 10), skin);
    add(el, cyl(0.038, 0.032, 0.26, 12), skin, 0, -0.14, 0);
    const hand = grp(el, 0, -0.29, 0);
    add(hand, ball(0.045), skin).scale.set(1, 1.15, 0.65);
    return { sh, el, hand };
  };

  // Mira hacia +z, así que su derecha es -x
  const rLeg = leg(-1), lLeg = leg(1), rArm = arm(-1), lArm = arm(1);
  rArm.hand.add(makeRacket(look.racket ?? 0xd4ff3f));

  if (gear.ring) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.56, 48), new THREE.MeshBasicMaterial({ color: 0xd4ff3f, transparent: true, opacity: 0.9, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    root.add(ring);
  }

  const joints = { spine, rSh: rArm.sh, rEl: rArm.el, rHand: rArm.hand, lSh: lArm.sh, lEl: lArm.el, rHip: rLeg.hip, rKnee: rLeg.knee, lHip: lLeg.hip, lKnee: lLeg.knee };
  return { root, hips, head, joints, rFoot: rLeg.foot, lFoot: lLeg.foot, phase: Math.random() * 6 };
}

export function disposePlayer(v) {
  v.root.removeFromParent();
  v.root.traverse(o => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material ?? [])) { m.map?.dispose(); m.dispose(); }
  });
}

// Parado derecho con los brazos al costado, para el retrato de la tarjeta
export function posePortrait(v) {
  const j = v.joints;
  j.spine.rotation.set(0.04, 0, 0);
  j.rSh.rotation.set(0.05, 0, -0.14); j.rEl.rotation.set(-0.25, 0, 0); j.rHand.rotation.set(0, 0, 0);
  j.lSh.rotation.set(0.05, 0, 0.14); j.lEl.rotation.set(-0.25, 0, 0);
  for (const k of ['rHip', 'lHip', 'rKnee', 'lKnee']) j[k].rotation.set(0, 0, 0);
  v.hips.position.y = 0.97;
}

// Posición de espera: rodillas flexionadas y la pala adelante
const BASE = {
  spine: [0.25, 0, 0], rSh: [-0.7, 0, -0.25], rEl: [-1.0, 0, 0], rHand: [-0.6, 0, 0], lSh: [-0.6, 0, 0.3], lEl: [-1.1, 0, 0],
  rHip: [-0.3, 0, -0.16], rKnee: [0.6, 0, 0], lHip: [-0.3, 0, 0.16], lKnee: [0.6, 0, 0],
};

// Cada golpe en tres momentos: preparación, impacto y terminación
const SWINGS = {
  derecha: [
    { spine: [0.2, -0.9, 0], rSh: [0.4, 0, -1.2], rEl: [-0.3, 0, 0], rHand: [0.2, 0, -0.4], lSh: [-1.1, 0, 0.3] },
    { spine: [0.2, 0, 0], rSh: [-0.6, 0, -1.25], rEl: [-0.2, 0, 0], rHand: [-0.2, 0, 0] },
    { spine: [0.25, 0.7, 0], rSh: [-1.5, 0, -0.4], rEl: [-1.2, 0, 0], rHand: [-0.5, 0, 0] },
  ],
  reves: [
    { spine: [0.2, 0.9, 0], rSh: [-0.4, 0, 1.0], rEl: [-1.2, 0, 0], rHand: [0, 0, 0.3], lSh: [-0.9, 0, -0.2] },
    { spine: [0.2, 0, 0], rSh: [-1.0, 0, 0.5], rEl: [-0.2, 0, 0], rHand: [0, 0, 0] },
    { spine: [0.25, -0.6, 0], rSh: [-1.3, 0, -0.5], rEl: [-0.3, 0, 0], rHand: [-0.3, 0, 0] },
  ],
  remate: [
    { spine: [-0.15, -0.4, 0], rSh: [-2.7, 0, -0.3], rEl: [-1.7, 0, 0], rHand: [0, 0, 0], lSh: [-2.6, 0, 0.2], lEl: [-0.2, 0, 0] },
    { spine: [0.1, 0, 0], rSh: [-3.0, 0, -0.2], rEl: [-0.1, 0, 0], rHand: [-0.3, 0, 0], lSh: [-1.2, 0, 0.3] },
    { spine: [0.5, 0.3, 0], rSh: [-0.8, 0, 0.3], rEl: [-0.3, 0, 0], rHand: [-0.4, 0, 0] },
  ],
  globo: [
    { spine: [0.2, -0.6, 0], rSh: [0.6, 0, -0.7], rEl: [-0.2, 0, 0], rHand: [0.3, 0, 0] },
    { spine: [0.1, 0, 0], rSh: [-0.4, 0, -0.6], rEl: [-0.2, 0, 0], rHand: [-0.4, 0, 0] },
    { spine: [-0.1, 0.3, 0], rSh: [-2.3, 0, -0.4], rEl: [-0.6, 0, 0], rHand: [-0.4, 0, 0] },
  ],
  dejada: [
    { spine: [0.3, -0.4, 0], rSh: [-0.3, 0, -1.0], rEl: [-1.4, 0, 0], rHand: [0.3, 0, 0] },
    { spine: [0.3, 0, 0], rSh: [-0.9, 0, -0.9], rEl: [-0.8, 0, 0], rHand: [0, 0, 0] },
    { spine: [0.3, 0.2, 0], rSh: [-1.1, 0, -0.6], rEl: [-0.9, 0, 0], rHand: [-0.2, 0, 0] },
  ],
  saque: [
    { spine: [0.3, -0.3, 0], rSh: [0.8, 0, -0.5], rEl: [-0.2, 0, 0], rHand: [0.2, 0, 0] },
    { spine: [0.25, 0, 0], rSh: [-0.3, 0, -0.5], rEl: [-0.2, 0, 0], rHand: [-0.2, 0, 0] },
    { spine: [0.2, 0.3, 0], rSh: [-1.6, 0, -0.3], rEl: [-0.5, 0, 0], rHand: [-0.3, 0, 0] },
  ],
};

const JOINTS = Object.keys(BASE);
const mix = (a, b, k) => {
  const out = {};
  for (const j of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[j] ?? BASE[j], vb = b[j] ?? BASE[j];
    out[j] = va.map((v, i) => v + (vb[i] - v) * k);
  }
  return out;
};
const angleLerp = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

// v: lo que devuelve makePlayer; p: el jugador en game.js
export function animatePlayer(v, p, dt) {
  v.root.position.set(p.x, 0, p.z);
  v.root.rotation.y = angleLerp(v.root.rotation.y, p.yaw, Math.min(1, dt * 12));

  const speed = Math.hypot(p.vx, p.vz), run = Math.min(1, speed / 4);
  v.phase += dt * (4 + speed * 2.2);
  const s = Math.sin(v.phase);
  const pose = Object.fromEntries(JOINTS.map(j => [j, BASE[j].slice()]));
  pose.rHip[0] += s * 0.7 * run; pose.lHip[0] -= s * 0.7 * run;
  pose.rKnee[0] += Math.max(0, -s) * 0.9 * run; pose.lKnee[0] += Math.max(0, s) * 0.9 * run;
  pose.lSh[0] += s * 0.6 * run;

  if (p.swing) {
    const keys = SWINGS[p.swing.kind === 'golpe' ? p.swing.side : p.swing.kind] ?? SWINGS.derecha;
    const t = p.swing.t;
    const target = t < 0.15 ? mix(keys[0], keys[1], t / 0.15) : mix(keys[1], keys[2], Math.min(1, (t - 0.15) / 0.25));
    const w = t < 0.05 ? t / 0.05 : t > 0.42 ? Math.max(0, (0.5 - t) / 0.08) : 1;
    for (const j in target) pose[j] = pose[j].map((a, i) => a + (target[j][i] - a) * w);
  }

  for (const j of JOINTS) v.joints[j].rotation.set(pose[j][0], pose[j][1], pose[j][2]);
  v.hips.position.y = 0.95 - 0.03 * run + Math.abs(s) * 0.04 * run;
  v.rFoot.rotation.x = -(pose.rHip[0] + pose.rKnee[0]);
  v.lFoot.rotation.x = -(pose.lHip[0] + pose.lKnee[0]);
}
