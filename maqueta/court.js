// Cancha reglamentaria (FIP): 20 × 10 m, césped azul, líneas de 5 cm,
// líneas de saque a 6,95 m de la red y central que sobresale 20 cm.
function buildCourt(THREE, scene, renderer) {
  const L = 20, W = 10, PX = 102.4; // píxeles por metro en la textura

  const cv = document.createElement('canvas');
  cv.width = W * PX; cv.height = L * PX;
  const g = cv.getContext('2d');
  g.fillStyle = '#1d5cc2';
  g.fillRect(0, 0, cv.width, cv.height);
  // Paños de césped de 2 m, apenas distintos
  for (let s = 0; s < 5; s += 2) { g.fillStyle = 'rgba(255,255,255,0.028)'; g.fillRect(s * 2 * PX, 0, 2 * PX, cv.height); }
  // Fibras
  for (let i = 0; i < 90000; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,18,60,0.12)';
    g.fillRect(Math.random() * cv.width, Math.random() * cv.height, 1.6, 1.6);
  }
  g.fillStyle = '#f2f5fa';
  const lw = 0.05 * PX, y = z => (z + L / 2) * PX;
  for (const z of [-6.95, 6.95]) g.fillRect(0, y(z) - lw / 2, cv.width, lw);
  g.fillRect(cv.width / 2 - lw / 2, y(-7.15), lw, y(7.15) - y(-7.15));

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.93 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Plataforma alrededor y piso del estadio
  const plat = new THREE.Mesh(new THREE.BoxGeometry(15, 0.3, 27), new THREE.MeshStandardMaterial({ color: 0x151d33, roughness: 0.9 }));
  plat.position.y = -0.155; plat.receiveShadow = true; plat.userData.plano = 0x1c2d63; scene.add(plat);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: 0x05070e, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.3; ground.userData.plano = 0x0e1735; scene.add(ground);

  // Red: 0,88 m en el centro, 0,92 m en los postes
  const top = x => 0.88 + 0.04 * (x / 5) ** 2;
  const ncv = document.createElement('canvas'); ncv.width = ncv.height = 32;
  const ng = ncv.getContext('2d');
  ng.strokeStyle = 'rgba(14,16,22,1)'; ng.lineWidth = 4; ng.strokeRect(0, 0, 32, 32);
  const ntex = new THREE.CanvasTexture(ncv);
  ntex.wrapS = ntex.wrapT = THREE.RepeatWrapping;
  ntex.repeat.set(W / 0.045, 0.9 / 0.045);
  ntex.anisotropy = 8;

  const bent = (h0, h1) => {
    const geo = new THREE.PlaneGeometry(W, 1, 40, 1), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) > 0 ? top(p.getX(i)) - h1 : h0 === null ? top(p.getX(i)) - 0.075 : h0);
    return geo;
  };
  scene.add(new THREE.Mesh(bent(0.03, 0), new THREE.MeshStandardMaterial({ map: ntex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1 })));
  const band = new THREE.Mesh(bent(null, 0), new THREE.MeshStandardMaterial({ color: 0xf6f6f6, side: THREE.DoubleSide, roughness: 0.6 }));
  band.position.z = 0.004; band.castShadow = true; scene.add(band);

  const steel = new THREE.MeshStandardMaterial({ color: 0x15181f, roughness: 0.45, metalness: 0.6 });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), steel);
    post.position.set(s * 5.1, 0.5, 0); post.castShadow = true; scene.add(post);
  }
}
