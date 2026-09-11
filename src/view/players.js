// Jugadores low-poly articulados y sus animaciones: esperar, correr y cada golpe.
import * as THREE from 'three';

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

// o: { shirt, shorts, skin, hair, racket, band?, ring? }
export function makePlayer(o) {
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
  const skin = mat(o.skin), shirt = mat(o.shirt), shorts = mat(o.shorts), shoe = mat(0xf2f2f2), sock = mat(0xffffff);
  const root = new THREE.Group();
  const grp = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const add = (parent, geo, m, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; parent.add(me); return me; };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 12);
  const cyl = (a, b, h) => new THREE.CylinderGeometry(a, b, h, 14);

  const hips = grp(root, 0, 0.95, 0);
  add(hips, cyl(0.165, 0.19, 0.3), shorts, 0, -0.1, 0);
  const leg = s => {
    const hip = grp(hips, 0.095 * s, -0.06, 0);
    add(hip, cap(0.07, 0.3), skin, 0, -0.22, 0);
    const knee = grp(hip, 0, -0.44, 0);
    add(knee, cap(0.056, 0.32), skin, 0, -0.22, 0);
    add(knee, cyl(0.06, 0.058, 0.1), sock, 0, -0.37, 0);
    const foot = add(knee, new THREE.BoxGeometry(0.11, 0.08, 0.27), shoe, 0, -0.45, 0.05);
    return { hip, knee, foot };
  };
  const spine = grp(hips, 0, 0.04, 0);
  add(spine, cap(0.17, 0.3), shirt, 0, 0.3, 0).scale.set(1.28, 1, 0.78);
  add(spine, cyl(0.05, 0.056, 0.12), skin, 0, 0.6, 0);
  const head = add(spine, new THREE.SphereGeometry(0.11, 20, 16), skin, 0, 0.75, 0.01);
  add(head, new THREE.SphereGeometry(0.117, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(o.hair), 0, 0.012, -0.012);
  if (o.band) add(head, new THREE.TorusGeometry(0.11, 0.017, 8, 28), mat(o.band), 0, 0.035, 0).rotation.x = Math.PI / 2;
  const arm = s => {
    const sh = grp(spine, 0.235 * s, 0.5, 0);
    add(sh, new THREE.SphereGeometry(0.078, 14, 10), shirt);
    add(sh, cyl(0.072, 0.064, 0.15), shirt, 0, -0.07, 0);
    add(sh, cap(0.048, 0.22), skin, 0, -0.16, 0);
    const el = grp(sh, 0, -0.31, 0);
    add(el, cap(0.041, 0.2), skin, 0, -0.14, 0);
    const hand = grp(el, 0, -0.29, 0);
    add(hand, new THREE.SphereGeometry(0.05, 12, 10), skin);
    return { sh, el, hand };
  };
  // Mira hacia +z, así que su derecha es -x
  const rLeg = leg(-1), lLeg = leg(1), rArm = arm(-1), lArm = arm(1);
  rArm.hand.add(makeRacket(o.racket));

  if (o.ring) {
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd4ff3f, transparent: true, opacity: 0.9, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.56, 48), ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012;
    root.add(ring);
  }

  const joints = { spine, rSh: rArm.sh, rEl: rArm.el, rHand: rArm.hand, lSh: lArm.sh, lEl: lArm.el, rHip: rLeg.hip, rKnee: rLeg.knee, lHip: lLeg.hip, lKnee: lLeg.knee };
  return { root, hips, head, joints, rFoot: rLeg.foot, lFoot: lLeg.foot, phase: Math.random() * 6 };
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
