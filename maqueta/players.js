// Jugadores low-poly articulados, pala perforada, pelota con estela y marcadores.
function makeRacket(THREE, color) {
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
  r.userData.head = head;
  return r;
}

function makePlayer(THREE, o) {
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
  const skin = mat(o.skin), shirt = mat(o.shirt), shorts = mat(o.shorts), shoe = mat(0xf2f2f2), sock = mat(0xffffff);
  const root = new THREE.Group();
  const grp = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const add = (parent, geo, m, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; parent.add(me); return me; };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 12);
  const cyl = (a, b, h) => new THREE.CylinderGeometry(a, b, h, 14);

  const hips = grp(root, 0, 0.97, 0);
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
  // El jugador mira a +z, así que su derecha es -x
  const p = { root, hips, spine, head, rLeg: leg(-1), lLeg: leg(1), rArm: arm(-1), lArm: arm(1) };
  p.racket = makeRacket(THREE, o.racket);
  p.rArm.hand.add(p.racket);
  return p;
}

const POSES = {
  drive: { y: 0.9, spine: [0.22, -0.6, 0.05], rSh: [0.3, 0, -1.2], rEl: [-0.4, 0, 0], rHand: [0.3, 0, -0.3], lSh: [-1.15, 0, 0.35], lEl: [-0.6, 0, 0],
    rHip: [0.45, 0, -0.22], rKnee: [0.75, 0, 0], lHip: [-0.55, 0, 0.14], lKnee: [0.55, 0, 0] },
  ready: { y: 0.92, spine: [0.3, 0, 0], rSh: [-0.75, 0, -0.2], rEl: [-1.0, 0, 0], rHand: [-0.7, 0, 0], lSh: [-0.65, 0, 0.3], lEl: [-1.2, 0, 0],
    rHip: [-0.4, 0, -0.2], rKnee: [0.75, 0, 0], lHip: [-0.4, 0, 0.2], lKnee: [0.75, 0, 0] },
  volley: { y: 0.93, spine: [0.25, 0.45, 0], rSh: [-1.45, 0, -0.45], rEl: [-0.35, 0, 0], rHand: [-0.5, 0, 0], lSh: [-0.3, 0, 0.7], lEl: [-0.5, 0, 0],
    rHip: [-0.6, 0, -0.1], rKnee: [0.85, 0, 0], lHip: [0.35, 0, 0.15], lKnee: [0.45, 0, 0] },
};

function pose(THREE, p, a) {
  const r = (obj, v) => obj.rotation.set(v[0], v[1], v[2]);
  p.hips.position.y = a.y;
  r(p.spine, a.spine); r(p.rArm.sh, a.rSh); r(p.rArm.el, a.rEl); r(p.rArm.hand, a.rHand); r(p.lArm.sh, a.lSh); r(p.lArm.el, a.lEl);
  r(p.rLeg.hip, a.rHip); r(p.rLeg.knee, a.rKnee); r(p.lLeg.hip, a.lHip); r(p.lLeg.knee, a.lKnee);
  p.rLeg.foot.rotation.x = -(a.rHip[0] + a.rKnee[0]);
  p.lLeg.foot.rotation.x = -(a.lHip[0] + a.lKnee[0]);
  p.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(p.rLeg.foot).union(new THREE.Box3().setFromObject(p.lLeg.foot));
  p.root.position.y -= box.min.y;
  p.root.updateMatrixWorld(true);
}

function buildPlayers(THREE, scene) {
  const A = { shirt: 0xff5b35, shorts: 0x161c2b }, B = { shirt: 0xf4f6fa, shorts: 0x0f1c3f };
  // Sombra de contacto (difusa) bajo jugadores y pelota
  const sc = document.createElement('canvas'); sc.width = sc.height = 64;
  const sg = sc.getContext('2d'), rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(0,0,0,0.55)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64);
  const blobTex = new THREE.CanvasTexture(sc);
  const blob = (x, z, size, op) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: op, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, z); scene.add(m);
  };
  const mk = (o, x, z, ry, a) => {
    const p = makePlayer(THREE, o); p.root.position.set(x, 0, z); p.root.rotation.y = ry; scene.add(p.root); pose(THREE, p, a);
    blob(x, z, 1.0, 0.6);
    return p;
  };
  const me = mk({ ...A, skin: 0xe2ae88, hair: 0x2a190f, racket: 0xd4ff3f, band: 0xffffff }, 0.7, -7.0, -0.45, POSES.drive);
  mk({ ...A, skin: 0xc58b60, hair: 0x120e0b, racket: 0x2f8cff }, -2.7, -5.2, 0.2, POSES.ready);
  const rival = mk({ ...B, skin: 0xd8a07a, hair: 0x5b3b22, racket: 0xff3d7f }, -1.3, 2.7, Math.PI + 0.35, POSES.volley);
  mk({ ...B, skin: 0x9f6d47, hair: 0x101010, racket: 0xffb21f, band: 0x1d5cc2 }, 2.6, 4.5, Math.PI - 0.2, POSES.ready);

  // Trayectoria: sale de la pala rival y pica a la derecha del jugador controlado
  const R = 0.085, H = 1.15;
  const Lp = rival.racket.userData.head.getWorldPosition(new THREE.Vector3());
  const Bp = new THREE.Vector3(-0.15, 0, -5.7);
  const at = t => new THREE.Vector3().lerpVectors(Lp, Bp, t).setY(Lp.y * (1 - t) + R * t + H * 4 * t * (1 - t));
  const tBall = 0.8;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 18), new THREE.MeshStandardMaterial({ color: 0xdcf53a, emissive: 0x6d7a10, emissiveIntensity: 0.6, roughness: 0.55 }));
  ball.position.copy(at(tBall)); ball.castShadow = true; scene.add(ball);
  for (let i = 1; i <= 9; i++) {
    const k = 1 - i / 10;
    const ghost = new THREE.Mesh(new THREE.SphereGeometry(R * (0.35 + 0.6 * k), 12, 10), new THREE.MeshBasicMaterial({ color: 0xe8ff6a, transparent: true, opacity: 0.6 * k, depthWrite: false }));
    ghost.position.copy(at(tBall - i * 0.02)); scene.add(ghost);
  }
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
  for (let t = tBall + 0.07; t < 0.99; t += 0.045) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), dotMat); d.position.copy(at(t)); scene.add(d); }

  const flat = (geo, color, op, x, z, y = 0.008) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); return m;
  };
  flat(new THREE.RingGeometry(0.16, 0.21, 40), 0xd4ff3f, 0.95, Bp.x, Bp.z);
  flat(new THREE.CircleGeometry(0.16, 40), 0xd4ff3f, 0.22, Bp.x, Bp.z);
  flat(new THREE.RingGeometry(0.46, 0.56, 48), 0xd4ff3f, 0.9, me.root.position.x, me.root.position.z, 0.01);
  flat(new THREE.CircleGeometry(0.46, 48), 0xd4ff3f, 0.12, me.root.position.x, me.root.position.z, 0.01);

  blob(ball.position.x, ball.position.z, 0.4, 1);
  return { me };
}
