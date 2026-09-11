// Escena: renderer, cámara tipo transmisión detrás del fondo, luces y HUD.
async function startGame(THREE, RoomEnvironment, OutlineEffect) {
  const style = window.ESTILO || 'realista';
  const pixel = style === 'pixel', outlined = pixel || style === 'caricatura';
  try { await document.fonts.load('800 70px "Barlow Condensed"'); await document.fonts.ready; } catch (e) { /* sigue con la fuente del sistema */ }
  const screen = document.getElementById('screen');
  const W = screen.clientWidth, H = screen.clientHeight;
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: !pixel, preserveDrawingBuffer: true });
  renderer.setPixelRatio(pixel ? 0.3 : 2);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = style !== 'plano';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = style === 'plano' ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b18);
  scene.fog = new THREE.Fog(0x070b18, 30, 70);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;

  scene.add(new THREE.HemisphereLight(0xd6e6ff, 0x1a2344, 1.1));
  const key = new THREE.DirectionalLight(0xfff7ea, 2.6);
  key.position.set(5, 16, -7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 13, bottom: -13, near: 2, far: 40 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
  scene.add(key);

  buildCourt(THREE, scene, renderer);
  buildWalls(THREE, scene);
  buildArena(THREE, scene);
  const { me } = buildPlayers(THREE, scene);
  applyStyle(THREE, scene, style);

  const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 200);
  camera.position.set(0, 8.2, -15.5);
  camera.lookAt(0, 0, 0.8);
  if (outlined) new OutlineEffect(renderer, { defaultThickness: pixel ? 0.007 : 0.0035, defaultColor: [0.03, 0.04, 0.08] }).render(scene, camera);
  else renderer.render(scene, camera);

  const v = me.head.getWorldPosition(new THREE.Vector3());
  v.y += 0.34; v.project(camera);
  const tag = document.getElementById('tag');
  tag.style.left = (v.x + 1) / 2 * W + 'px';
  tag.style.top = (1 - v.y) / 2 * H + 'px';
  document.title = 'listo';
}
