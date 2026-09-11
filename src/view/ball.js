// La pelota en pantalla: algo más grande que la real para que se vea en el celular,
// con sombra debajo (para leer la altura), estela y marca de dónde va a picar.
import * as THREE from 'three';

const VISUAL_R = 0.055;
const TRAIL = 8;

const flat = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; return m; };

export class BallView {
  constructor(scene) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(VISUAL_R, 20, 14),
      new THREE.MeshStandardMaterial({ color: 0xdcf53a, emissive: 0x6d7a10, emissiveIntensity: 0.7, roughness: 0.5 }),
    );
    this.mesh.castShadow = true;

    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    this.shadow = flat(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));

    this.trail = Array.from({ length: TRAIL }, (_, i) => new THREE.Mesh(
      new THREE.SphereGeometry(VISUAL_R * (1 - (i / TRAIL) * 0.6), 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xe8ff6a, transparent: true, opacity: 0.35 * (1 - i / TRAIL), depthWrite: false }),
    ));
    this.history = [];

    this.marker = new THREE.Group();
    this.marker.add(flat(new THREE.RingGeometry(0.16, 0.22, 36), new THREE.MeshBasicMaterial({ color: 0xd4ff3f, transparent: true, depthWrite: false })));
    this.marker.add(flat(new THREE.CircleGeometry(0.16, 36), new THREE.MeshBasicMaterial({ color: 0xd4ff3f, transparent: true, opacity: 0.2, depthWrite: false })));
    this.marker.visible = false;
    this.markerLife = 0;

    scene.add(this.mesh, this.shadow, this.marker, ...this.trail);
  }

  showMarker(x, z) {
    this.marker.position.set(x, 0.01, z);
    this.marker.visible = true;
    this.markerLife = 3;
  }

  hideMarker() { this.marker.visible = false; }

  update(ball, visible, dt) {
    this.mesh.visible = visible;
    this.mesh.position.set(ball.x, ball.y, ball.z);

    const h = Math.max(0, ball.y), s = 0.34 + h * 0.08;
    this.shadow.visible = visible && Math.abs(ball.x) < 5.2 && Math.abs(ball.z) < 10.2;
    this.shadow.position.set(ball.x, 0.006, ball.z);
    this.shadow.scale.setScalar(s);
    this.shadow.material.opacity = Math.max(0.15, 1 - h * 0.2);

    this.history.unshift([ball.x, ball.y, ball.z]);
    if (this.history.length > TRAIL * 2 + 1) this.history.length = TRAIL * 2 + 1;
    const moving = visible && ball.active && !ball.rolling;
    this.trail.forEach((m, i) => {
      const p = this.history[(i + 1) * 2];
      m.visible = moving && Boolean(p);
      if (p) m.position.set(p[0], p[1], p[2]);
    });

    if (this.marker.visible) {
      this.markerLife -= dt;
      this.marker.scale.setScalar(1 + 0.12 * Math.sin(this.markerLife * 12));
      if (this.markerLife <= 0) this.marker.visible = false;
    }
  }
}
