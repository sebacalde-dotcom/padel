// Entorno: carteles LED, tribunas con público y torres de luz.
function buildArena(THREE, scene) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 100;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 1024, 0);
  gr.addColorStop(0, '#0b2b70'); gr.addColorStop(0.5, '#1846b5'); gr.addColorStop(1, '#0b2b70');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 100);
  g.font = '800 70px "Barlow Condensed", sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.fillStyle = '#d4ff3f'; g.fillText('PÁDEL 3D', 256, 54);
  g.fillStyle = '#ffffff'; g.fillText('¡VAMOS!', 768, 54);
  const ad = new THREE.CanvasTexture(c);
  ad.colorSpace = THREE.SRGBColorSpace; ad.wrapS = THREE.RepeatWrapping;
  const back = new THREE.MeshStandardMaterial({ color: 0x0c1020, roughness: 0.8 });
  function board(w, x, z, ry) {
    const t = ad.clone(); t.repeat.x = Math.round(w / 6); t.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, 0.15), [back, back, back, back, new THREE.MeshBasicMaterial({ map: t }), back]);
    m.position.set(x, 0.45, z); m.rotation.y = ry; scene.add(m);
  }
  board(15, 0, 12.8, Math.PI);
  board(26, 7.2, 0, -Math.PI / 2);
  board(26, -7.2, 0, Math.PI / 2);

  // Tribunas: escalones + público instanciado (cuerpo y cabeza)
  const MAX = 4000;
  const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.15, 0.24, 3, 8), new THREE.MeshStandardMaterial({ roughness: 0.9 }), MAX);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.095, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.8 }), MAX);
  const shirts = [0xeeeeee, 0x2a2e38, 0xd83b3b, 0x2f6fe0, 0xf3c24f, 0x3aa56a, 0x7b52d8, 0xf28a4a, 0x15181f, 0xa4b6ca, 0xd4ff3f];
  const skins = [0xf1c6a0, 0xe0ac85, 0xc68d62, 0x9c6b45, 0x6e4a31];
  const pick = a => a[(Math.random() * a.length) | 0];
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x1a2238, roughness: 0.95 });
  const o = new THREE.Object3D(), col = new THREE.Color(), m4 = new THREE.Matrix4();
  let n = 0;
  function stand(len, x, z, ry, rows) {
    const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry; grp.userData.decor = true; scene.add(grp);
    grp.updateMatrixWorld(true);
    for (let r = 0; r < rows; r++) {
      const h = 0.5 + r * 0.5, d = r * 0.9, top = h - 0.3;
      const step = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.9), stepMat);
      step.position.set(0, top - h / 2, d); grp.add(step);
      for (let s = -len / 2 + 0.35; s < len / 2 - 0.3; s += 0.62) {
        if (Math.random() < 0.15) continue;
        o.position.set(s + (Math.random() - 0.5) * 0.15, top + 0.28, d + 0.05);
        o.rotation.set(0, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.12);
        o.updateMatrix();
        bodies.setMatrixAt(n, m4.multiplyMatrices(grp.matrixWorld, o.matrix));
        bodies.setColorAt(n, col.setHex(pick(shirts)).multiplyScalar(0.55));
        o.position.y += 0.36; o.updateMatrix();
        heads.setMatrixAt(n, m4.multiplyMatrices(grp.matrixWorld, o.matrix));
        heads.setColorAt(n, col.setHex(pick(skins)).multiplyScalar(0.7));
        n++;
      }
    }
  }
  stand(22, 0, 15.5, 0, 8);
  stand(30, 10.2, 0, Math.PI / 2, 8);
  stand(30, -10.2, 0, -Math.PI / 2, 8);
  bodies.count = heads.count = n;
  bodies.userData.decor = heads.userData.decor = true;
  scene.add(bodies, heads);

  // Torres de luz sobre la estructura (4 por lado)
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1a1e27, metalness: 0.6, roughness: 0.4 });
  const housing = new THREE.MeshStandardMaterial({ color: 0x23272f, metalness: 0.5, roughness: 0.5 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffdf4 });
  const gc = document.createElement('canvas'); gc.width = gc.height = 128;
  const gg = gc.getContext('2d'), rg = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.15, 'rgba(255,250,230,0.7)'); rg.addColorStop(1, 'rgba(255,240,200,0)');
  gg.fillStyle = rg; gg.fillRect(0, 0, 128, 128);
  const glowMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const sx of [-1, 1]) for (const z of [-3.1, 3.1, 9.4]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 6.3, 10), poleMat);
    pole.position.set(sx * 5.3, 3.15, z); pole.userData.decor = true; scene.add(pole);
    const head = new THREE.Group(); head.position.set(sx * 5.1, 6.25, z); head.rotation.z = -sx * 0.55; head.userData.decor = true; scene.add(head);
    head.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.38), housing));
    const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.3), lampMat);
    lamp.rotation.x = Math.PI / 2; lamp.position.y = -0.052; head.add(lamp);
    const glow = new THREE.Sprite(glowMat); glow.scale.set(2.2, 2.2, 1); glow.position.y = -0.15; head.add(glow);
  }
}
