// Rasgos de cada jugador sobre la cabeza: cara, pelo, barba, anteojos y gorra.
// Todo se mide en proporción al radio de la cabeza (R). La cara mira hacia +z.
import * as THREE from 'three';

export const R = 0.112;

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
const surfaceZ = (r, x, y) => Math.sqrt(Math.max(0, r * r - x * x - y * y));

function put(parent, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// SphereGeometry: phi da la vuelta al eje y (de π a 2π es la nuca) y theta baja desde la coronilla
const shell = (r, phiStart, phiLen, thetaStart, thetaLen, seg = 24) =>
  new THREE.SphereGeometry(r, seg, 14, phiStart, phiLen, thetaStart, thetaLen);

export function addFace(head, look) {
  const skin = mat(look.skin);
  for (const s of [-1, 1]) {
    put(head, new THREE.SphereGeometry(0.2 * R, 12, 10), skin, s * 0.95 * R, -0.05 * R, -0.05 * R).scale.set(0.45, 1, 0.85);
  }
  put(head, new THREE.SphereGeometry(0.15 * R, 14, 10), mat(tone(look.skin, 0.94)), 0, -0.06 * R, 0.93 * R).scale.set(0.85, 1, 1.3);

  if (look.glasses !== 'sol') {
    const white = mat(0xf8f5f1, { roughness: 0.3 });
    const iris = mat(look.eyes ?? 0x4a3728, { roughness: 0.25 });
    const pupil = mat(0x120e0c, { roughness: 0.2 });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const s of [-1, 1]) {
      const x = s * 0.34 * R, y = 0.15 * R;
      const back = surfaceZ(R, x, y) - 0.03 * R;
      put(head, new THREE.SphereGeometry(0.17 * R, 16, 12), white, x, y, back).scale.set(1, 0.92, 0.45);
      const front = back + 0.077 * R;
      put(head, new THREE.CircleGeometry(0.085 * R, 16), iris, x, y, front + 0.004 * R);
      put(head, new THREE.CircleGeometry(0.042 * R, 12), pupil, x, y, front + 0.008 * R);
      put(head, new THREE.CircleGeometry(0.026 * R, 8), shine, x - s * 0.035 * R, y + 0.045 * R, front + 0.012 * R);
    }
  }

  const browMat = mat(look.hair?.color ?? look.beard?.color ?? 0x2a211c, { roughness: 1 });
  for (const s of [-1, 1]) {
    const x = s * 0.34 * R, y = 0.38 * R;
    const brow = put(head, new THREE.CapsuleGeometry(0.045 * R, 0.22 * R, 4, 8), browMat, x, y, surfaceZ(R, x, y) - 0.03 * R);
    brow.rotation.set(0.25, 0, Math.PI / 2 + s * 0.14);
    brow.scale.set(1, 1, 0.7);
  }

  // Sonrisa con dientes; con barba va más adelante para que no quede tapada
  const faceR = look.beard ? (look.beard.style === 'tupida' ? 1.11 * R : 1.06 * R) : R;
  const my = -0.36 * R;
  const mouth = new THREE.Group();
  mouth.position.set(0, my, surfaceZ(faceR, 0, my) + 0.015 * R);
  mouth.rotation.x = 0.37;
  mouth.scale.set(1, 0.62, 1);
  head.add(mouth);
  mouth.add(new THREE.Mesh(new THREE.CircleGeometry(0.18 * R, 20, Math.PI, Math.PI), mat(0xfbf8f2, { roughness: 0.3 })));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.18 * R, 0.03 * R, 6, 20, Math.PI), mat(0x6b2a26));
  lip.rotation.z = Math.PI;
  lip.position.z = 0.01 * R;
  mouth.add(lip);
}

// El pelo va pegado al cráneo (no apoyado como un gorro): una capa fina que sigue la cabeza,
// que baja en las sienes y en la nuca, y mechones que rompen el borde del nacimiento.
export function addHair(head, look) {
  const h = look.hair;
  if (!h || h.style === 'pelado') return;
  const m = mat(h.color, { roughness: 0.95 });
  if (h.style === 'rapado') {
    put(head, shell(1.015 * R, Math.PI, Math.PI, 0, Math.PI * 0.62), m, 0, 0, 0);   // nuca y costados, debajo de la gorra
    put(head, shell(1.015 * R, 0, Math.PI, 0, Math.PI * 0.3), m, 0, 0, 0);
    return;
  }
  const entradas = h.style === 'entradas';
  const frontTheta = Math.PI * (entradas ? 0.3 : 0.36);
  put(head, shell(1.02 * R, Math.PI, Math.PI, 0, Math.PI * 0.62), m, 0, 0, 0);   // nuca y patillas
  put(head, shell(1.02 * R, 0, Math.PI, 0, frontTheta), m, 0, 0, 0);             // hasta el nacimiento

  // Un punto de la superficie de la cabeza, según el ángulo alrededor (phi) y cuánto baja (theta)
  const onSkull = (phi, theta, r) => [-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta)];
  // Mechones chatos, apoyados sobre el cráneo: dan un borde irregular sin amontonarse
  const radial = new THREE.Vector3(), zAxis = new THREE.Vector3(0, 0, 1);
  const clump = (pos, s, flat = 0.45) => {
    const c = put(head, new THREE.SphereGeometry(0.17 * R, 10, 8), m, ...pos);
    // Se acuesta sobre el cráneo: el eje achatado apunta hacia el centro de la cabeza
    c.quaternion.setFromUnitVectors(zAxis, radial.set(...pos).normalize());
    c.scale.set(s, s, s * flat);
  };
  const n = entradas ? 7 : 10;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    if (entradas && t > 0.3 && t < 0.7) continue;   // con entradas, la frente queda despejada
    clump(onSkull(Math.PI * (-0.08 + 1.16 * t), frontTheta + 0.03, 0.99 * R), 0.8 + 0.35 * Math.abs(Math.sin(i * 2.1)));
  }
  for (let i = 0; i < 9; i++) {
    clump(onSkull(i * 2.39996, Math.PI * (0.1 + (i % 3) * 0.09), 0.985 * R), 0.95 + 0.25 * Math.abs(Math.sin(i * 1.7)));
  }

  if (h.style === 'rulos') {
    const n = 60, curls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.26 * R, 8, 6), m, n), o = new THREE.Object3D();
    let count = 0;
    for (let i = 0; i < n; i++) {
      const y = 1 - (i + 0.5) / n * 1.35, r = Math.sqrt(Math.max(0, 1 - y * y)), phi = i * 2.39996;
      const x = Math.cos(phi) * r, z = Math.sin(phi) * r;
      if (z > 0.3 && y < 0.62) continue;
      o.position.set(x * 1.03 * R, y * 1.03 * R + 0.05 * R, z * 1.03 * R);
      o.scale.setScalar(0.85 + ((i * 37) % 10) / 30);
      o.updateMatrix();
      curls.setMatrixAt(count++, o.matrix);
    }
    curls.count = count;
    curls.castShadow = true;
    head.add(curls);
  }
}

export function addBeard(head, look) {
  const b = look.beard;
  if (!b) return;
  const m = mat(b.color, { roughness: 1 });
  const full = b.style === 'tupida';
  const r = (full ? 1.08 : 1.025) * R;
  put(head, shell(r, Math.PI * 0.02, Math.PI * 0.96, Math.PI * 0.56, Math.PI * 0.4), m, 0, 0, 0);          // mandíbula
  for (const start of [-0.05, 0.93]) put(head, shell(r, Math.PI * start, Math.PI * 0.12, Math.PI * 0.36, Math.PI * 0.22, 8), m, 0, 0, 0);   // patillas
  const stache = put(head, new THREE.CapsuleGeometry((full ? 0.07 : 0.055) * R, 0.33 * R, 4, 8), m, 0, -0.22 * R, surfaceZ(r, 0, -0.22 * R) + 0.03 * R);
  stache.rotation.z = Math.PI / 2;
  stache.scale.set(1, 1, 0.8);
  if (full) put(head, new THREE.SphereGeometry(0.42 * R, 16, 12), m, 0, -0.8 * R, 0.42 * R).scale.set(1.25, 0.9, 0.95);
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// 'marco': anteojos de receta con marco fino. 'sol': negros, anchos y con barra arriba, tipo rapero.
export function addGlasses(head, look) {
  if (!look.glasses) return;
  const sun = look.glasses === 'sol';
  const w = (sun ? 0.5 : 0.42) * R, h = (sun ? 0.32 : 0.27) * R, t = (sun ? 0.07 : 0.04) * R;
  const frame = mat(sun ? 0x0a0a0c : 0x2a2420, { roughness: sun ? 0.15 : 0.4, metalness: sun ? 0.35 : 0.2 });
  const g = new THREE.Group();
  g.position.set(0, 0.15 * R, 1.02 * R);
  head.add(g);
  for (const s of [-1, 1]) {
    const shape = roundedRect(w, h, (sun ? 0.1 : 0.05) * R);
    if (!sun) shape.holes.push(roundedRect(w - 2 * t, h - 2 * t, 0.03 * R));
    put(g, new THREE.ExtrudeGeometry(shape, { depth: (sun ? 0.07 : 0.035) * R, bevelEnabled: false, curveSegments: 6 }), frame, s * (w / 2 + 0.06 * R), 0, 0);
    if (!sun) {
      put(g, new THREE.PlaneGeometry(w - 2 * t, h - 2 * t), new THREE.MeshStandardMaterial({ color: 0xdfe9ef, transparent: true, opacity: 0.18, roughness: 0.05 }), s * (w / 2 + 0.06 * R), 0, 0.02 * R);
    }
    put(g, new THREE.BoxGeometry(t, t, 0.95 * R), frame, s * (w + 0.12 * R), h * 0.25, -0.48 * R);   // patillas
  }
  put(g, new THREE.BoxGeometry(0.14 * R, t, t), frame, 0, h * 0.25, 0.02 * R);   // puente
  if (sun) put(g, new THREE.BoxGeometry(2 * w + 0.17 * R, 0.07 * R, 0.09 * R), frame, 0, h / 2, 0.03 * R);
}

export function addCap(head, look) {
  const c = look.cap;
  if (!c) return;
  const g = new THREE.Group();
  if (c.backwards) g.rotation.y = Math.PI;
  head.add(g);
  const crownMat = mat(c.crown, { roughness: 0.85 });
  put(g, shell(1.06 * R, 0, Math.PI * 2, 0, Math.PI * 0.44, 26), crownMat, 0, 0.26 * R, 0).scale.set(1, 0.88, 1.04);
  put(g, new THREE.SphereGeometry(0.075 * R, 8, 6), crownMat, 0, 1.19 * R, 0);
  // Visera: medio disco con la parte de arriba y la de abajo de distinto color
  const brim = put(g, new THREE.CylinderGeometry(0.9 * R, 0.9 * R, 0.06 * R, 26, 1, false, -Math.PI / 2, Math.PI),
    [crownMat, mat(c.brim, { roughness: 0.8 }), mat(c.under ?? c.brim, { roughness: 0.8 })], 0, 0.44 * R, 0.62 * R);
  brim.scale.z = 0.9;
  brim.rotation.x = 0.12;
  if (c.patch) {
    const patch = put(g, new THREE.BoxGeometry(0.42 * R, 0.32 * R, 0.04 * R), mat(c.patch, { roughness: 0.6 }), 0, 0.76 * R, 0.9 * R);
    patch.rotation.x = -0.6;
    if (c.logo) put(patch, new THREE.BoxGeometry(0.25 * R, 0.18 * R, 0.03 * R), mat(c.logo, { roughness: 0.6 }), 0, 0, 0.02 * R);
  }
}

// Remera con estampado (por ahora, camuflado) para la tarjeta del jugador
export function shirtTexture(pattern, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = `#${new THREE.Color(color).getHexString()}`;
  g.fillRect(0, 0, 128, 128);
  if (pattern === 'camuflado') {
    const shades = [0.62, 0.8, 1.25, 0.5];
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `#${tone(color, shades[i % shades.length]).getHexString()}`;
      g.beginPath();
      g.ellipse((i * 53) % 128, (i * 29 + 11) % 128, 10 + (i % 4) * 5, 6 + (i % 3) * 4, (i % 5) * 0.6, 0, Math.PI * 2);
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}
