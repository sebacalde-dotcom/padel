// Cancha reglamentaria en 3D: césped azul con líneas, red y cerramiento de vidrio y malla.
// Las medidas son las mismas que usa la física (src/physics.js).
import * as THREE from 'three';
import { HALF_W, HALF_L, SERVICE_Z, netHeight } from '../physics.js';

export function buildCourt(scene, renderer) {
  scene.add(floor(renderer), surroundings(), net(), walls());
}

function floor(renderer) {
  const PX = 102.4;   // píxeles por metro
  const W = HALF_W * 2, L = HALF_L * 2;
  const cv = document.createElement('canvas');
  cv.width = W * PX; cv.height = L * PX;
  const g = cv.getContext('2d');
  g.fillStyle = '#1d5cc2';
  g.fillRect(0, 0, cv.width, cv.height);
  for (let s = 0; s < 5; s += 2) { g.fillStyle = 'rgba(255,255,255,0.028)'; g.fillRect(s * 2 * PX, 0, 2 * PX, cv.height); }
  for (let i = 0; i < 90000; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,18,60,0.12)';
    g.fillRect(Math.random() * cv.width, Math.random() * cv.height, 1.6, 1.6);
  }
  // Líneas de 5 cm: las de saque y la central, que sobresale 20 cm
  g.fillStyle = '#f2f5fa';
  const lw = 0.05 * PX, y = z => (z + HALF_L) * PX;
  for (const z of [-SERVICE_Z, SERVICE_Z]) g.fillRect(0, y(z) - lw / 2, cv.width, lw);
  g.fillRect(cv.width / 2 - lw / 2, y(-SERVICE_Z - 0.2), lw, y(SERVICE_Z + 0.2) - y(-SERVICE_Z - 0.2));

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.93 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function surroundings() {
  const group = new THREE.Group();
  const plat = new THREE.Mesh(new THREE.BoxGeometry(15, 0.3, 27), new THREE.MeshStandardMaterial({ color: 0x151d33, roughness: 0.9 }));
  plat.position.y = -0.155;
  plat.receiveShadow = true;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: 0x05070e, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.3;
  group.add(plat, ground);
  return group;
}

function net() {
  const group = new THREE.Group();
  const W = HALF_W * 2;
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const g = cv.getContext('2d');
  g.strokeStyle = 'rgba(14,16,22,1)'; g.lineWidth = 4; g.strokeRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(W / 0.045, 0.9 / 0.045);
  tex.anisotropy = 8;

  // Plano de 10 m cuyo borde superior sigue la altura reglamentaria (0,88 m al centro, 0,92 m en los postes)
  const bent = (bottom, height) => {
    const geo = new THREE.PlaneGeometry(W, 1, 40, 1), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const top = netHeight(p.getX(i));
      p.setY(i, p.getY(i) > 0 ? top : bottom ?? top - height);
    }
    return geo;
  };
  group.add(new THREE.Mesh(bent(0.03), new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1 })));
  const band = new THREE.Mesh(bent(null, 0.075), new THREE.MeshStandardMaterial({ color: 0xf6f6f6, side: THREE.DoubleSide, roughness: 0.6 }));
  band.position.z = 0.004;
  band.castShadow = true;
  group.add(band);

  const steel = new THREE.MeshStandardMaterial({ color: 0x15181f, roughness: 0.45, metalness: 0.6 });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), steel);
    post.position.set(s * (HALF_W + 0.1), 0.5, 0);
    post.castShadow = true;
    group.add(post);
  }
  return group;
}

// Fondos: 3 m de vidrio + 1 m de malla. Laterales: vidrio de 3 m y de 2 m, y malla de 3 m en el centro.
// El fondo cercano a la cámara va atenuado para que no tape a tu jugador.
function walls() {
  const group = new THREE.Group();
  const T = 0.012;

  const streaks = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = 'rgb(66,66,66)'; g.fillRect(0, 0, 256, 256);
    g.translate(128, 128); g.rotate(-0.55); g.translate(-128, -128);
    const band = (x, w, a) => {
      const gr = g.createLinearGradient(x, 0, x + w, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x, -300, w, 900);
    };
    band(30, 70, 0.5); band(118, 16, 0.45); band(168, 44, 0.28);
    return new THREE.CanvasTexture(c);
  })();
  const glassMat = opacity => new THREE.MeshPhysicalMaterial({
    color: 0xe3faff, alphaMap: streaks, transparent: true, opacity, roughness: 0.04, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false,
  });
  const glassFar = glassMat(0.85), glassNear = glassMat(0.3);
  const edgeFar = new THREE.LineBasicMaterial({ color: 0xbff7ec, transparent: true, opacity: 1 });
  const edgeNear = new THREE.LineBasicMaterial({ color: 0xa6f0e2, transparent: true, opacity: 0.35 });

  const meshTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.strokeStyle = 'rgba(10,12,16,1)'; g.lineWidth = 9; g.strokeRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    return t;
  })();
  const meshFar = new THREE.MeshStandardMaterial({ map: meshTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.6, metalness: 0.4 });
  const meshNear = meshFar.clone(); meshNear.opacity = 0.22;
  const steel = new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.45, metalness: 0.7 });

  const place = (obj, x, y, z, ry) => { obj.position.set(x, y, z); obj.rotation.y = ry; group.add(obj); return obj; };
  const glass = (w, h, x, z, ry, near) => {
    const geo = new THREE.BoxGeometry(w - 0.016, h, T);
    place(new THREE.Mesh(geo, near ? glassNear : glassFar), x, h / 2, z, ry);
    place(new THREE.LineSegments(new THREE.EdgesGeometry(geo), near ? edgeNear : edgeFar), x, h / 2, z, ry);
  };
  const mesh = (w, h, x, y0, z, ry, near) => {
    const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 0.05, uv.getY(i) * h / 0.05);
    place(new THREE.Mesh(geo, near ? meshNear : meshFar), x, y0 + h / 2, z, ry);
    if (near) return;
    for (const yy of y0 > 0 ? [y0, y0 + h] : [y0 + h]) place(new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.05), steel), x, yy, z, ry);
  };
  const post = (x, z, y0, y1) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, y1 - y0, 0.07), steel);
    p.castShadow = true;
    place(p, x, (y0 + y1) / 2, z, 0);
  };

  const RY = Math.PI / 2;
  for (const s of [-1, 1]) {
    const near = s < 0;
    for (let i = 0; i < 5; i++) glass(2, 3, -4 + i * 2, s * HALF_L, 0, near);
    mesh(10, 1, 0, 3, s * HALF_L, 0, near);
    if (!near) for (const x of [-3, -1, 1, 3]) post(x, s * (HALF_L + 0.05), 3, 4);
    for (const sx of [-1, 1]) {
      glass(2, 3, sx * HALF_W, s * 9, RY, false);
      glass(2, 2, sx * HALF_W, s * 7, RY, false);
      mesh(2, 1, sx * HALF_W, 3, s * 9, RY, false);
      mesh(2, 1, sx * HALF_W, 2, s * 7, RY, false);
      post(sx * (HALF_W + 0.05), s * (HALF_L + 0.05), 0, 4);
      post(sx * (HALF_W + 0.05), s * 8, 0, 4);
      post(sx * (HALF_W + 0.05), s * 6, 0, 3);
    }
  }
  for (const sx of [-1, 1]) {
    mesh(12, 3, sx * HALF_W, 0, 0, RY, false);
    for (const z of [-4, -2, 0, 2, 4]) post(sx * (HALF_W + 0.05), z, 0, 3);
  }
  return group;
}
