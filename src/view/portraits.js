// Retratos de las tarjetas: cada jugador renderizado con el mismo modelo 3D del juego,
// con su remera propia, en tres cuartos de perfil y fondo transparente.
import * as THREE from 'three';
import { makePlayer, posePortrait, disposePlayer } from './players.js';

export function renderPortraits(roster, width = 300, height = 360) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x2a3350, 1.4));
  const key = new THREE.DirectionalLight(0xfff4e6, 2.6);
  key.position.set(-1.2, 2.6, 2.4);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 2.2);
  rim.position.set(1.6, 2.2, -1.8);
  scene.add(key, rim);

  const camera = new THREE.PerspectiveCamera(26, width / height, 0.1, 20);
  camera.position.set(0.32, 1.72, 1.55);
  camera.lookAt(0, 1.6, 0);

  const urls = {};
  for (const p of roster) {
    const v = makePlayer(p.look);
    posePortrait(v);
    v.root.rotation.y = 0.28;
    scene.add(v.root);
    renderer.render(scene, camera);
    urls[p.id] = renderer.domElement.toDataURL('image/png');
    disposePlayer(v);
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return urls;
}
