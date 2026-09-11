// Estilos gráficos para comparar con la misma escena y la misma cámara:
//  realista   → materiales PBR y sombras suaves (lo que ya había)
//  caricatura → sombreado en 3 tonos y contorno oscuro
//  pixel      → caricatura renderizada a baja resolución, sin suavizado
//  plano      → colores planos sin luces (cómo se vería un 2D vectorial)
function applyStyle(THREE, scene, style) {
  if (style === 'realista') return;
  const gradient = new THREE.DataTexture(new Uint8Array([90, 175, 255]), 3, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;

  const swap = m => {
    if (!m.isMeshStandardMaterial) return m;
    const p = { color: m.color, map: m.map, alphaMap: m.alphaMap, transparent: m.transparent, opacity: m.opacity, side: m.side, depthWrite: m.depthWrite };
    return style === 'plano' ? new THREE.MeshBasicMaterial(p) : new THREE.MeshToonMaterial({ ...p, gradientMap: gradient });
  };
  // El contorno sólo va en sólidos: en vidrios, estelas y público queda mal
  const noOutline = { visible: false };
  scene.traverse(o => {
    // En el plano no va el público ni las torres de luz: fondo limpio
    if (style === 'plano' && (o.userData.decor || o.isSprite)) { o.visible = false; return; }
    if (!o.isMesh) return;
    if (style === 'plano' && o.userData.plano) o.material.color.setHex(o.userData.plano);
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
    for (const m of [].concat(o.material)) if (m.transparent || o.isInstancedMesh) m.userData.outlineParameters = noOutline;
  });
}
