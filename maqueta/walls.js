// Cerramiento reglamentario:
//  fondos  → 3 m de vidrio + 1 m de malla (4 m)
//  laterales → primeros 2 m: vidrio de 3 m + malla hasta 4 m;
//              siguientes 2 m: vidrio de 2 m + malla hasta 3 m;
//              zona central de 12 m: malla de 3 m.
// El fondo cercano a la cámara va atenuado, como haría el juego.
function buildWalls(THREE, scene) {
  const T = 0.012; // vidrio templado de 12 mm

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
  const glassMat = op => new THREE.MeshPhysicalMaterial({
    color: 0xe3faff, alphaMap: streaks, transparent: true, opacity: op, roughness: 0.04, metalness: 0,
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

  const place = (obj, x, y, z, ry) => { obj.position.set(x, y, z); obj.rotation.y = ry; scene.add(obj); return obj; };

  function glass(w, h, x, z, ry, near) {
    const geo = new THREE.BoxGeometry(w - 0.016, h, T);
    place(new THREE.Mesh(geo, near ? glassNear : glassFar), x, h / 2, z, ry);
    place(new THREE.LineSegments(new THREE.EdgesGeometry(geo), near ? edgeNear : edgeFar), x, h / 2, z, ry);
  }
  function mesh(w, h, x, y0, z, ry, near) {
    const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 0.05, uv.getY(i) * h / 0.05);
    place(new THREE.Mesh(geo, near ? meshNear : meshFar), x, y0 + h / 2, z, ry);
    if (near) return;
    for (const yy of y0 > 0 ? [y0, y0 + h] : [y0 + h]) place(new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.05), steel), x, yy, z, ry);
  }
  function post(x, z, y0, y1) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, y1 - y0, 0.07), steel);
    p.castShadow = true; place(p, x, (y0 + y1) / 2, z, 0);
  }

  const R = Math.PI / 2;
  for (const s of [-1, 1]) {
    const near = s < 0;
    for (let i = 0; i < 5; i++) glass(2, 3, -4 + i * 2, s * 10, 0, near);
    mesh(10, 1, 0, 3, s * 10, 0, near);
    if (!near) for (const x of [-3, -1, 1, 3]) post(x, s * 10.05, 3, 4);
    for (const sx of [-1, 1]) {
      glass(2, 3, sx * 5, s * 9, R, false);
      glass(2, 2, sx * 5, s * 7, R, false);
      mesh(2, 1, sx * 5, 3, s * 9, R, false);
      mesh(2, 1, sx * 5, 2, s * 7, R, false);
      post(sx * 5.05, s * 10.05, 0, 4);
      post(sx * 5.05, s * 8, 0, 4);
      post(sx * 5.05, s * 6, 0, 3);
    }
  }
  for (const sx of [-1, 1]) {
    mesh(12, 3, sx * 5, 0, 0, R, false);
    for (const z of [-4, -2, 0, 2, 4]) post(sx * 5.05, z, 0, 3);
  }
}
