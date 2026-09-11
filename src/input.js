// Controles: teclado en la compu; joystick y botones táctiles en el celular.
const SHOT_KEYS = { KeyJ: 'golpe', Space: 'golpe', KeyK: 'globo', KeyL: 'remate', KeyI: 'dejada' };

export class Input {
  constructor() {
    this.keys = new Set();
    this.stick = { x: 0, y: 0 };
    this.shot = null;
    this.onPause = null;

    addEventListener('keydown', e => {
      if (e.code === 'Escape' || e.code === 'KeyP') { this.onPause?.(); return; }
      this.keys.add(e.code);
      if (SHOT_KEYS[e.code]) { e.preventDefault(); if (!e.repeat) this.shot = SHOT_KEYS[e.code]; }
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    for (const btn of document.querySelectorAll('[data-shot]')) {
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        this.shot = btn.dataset.shot;
        btn.classList.add('on');
        setTimeout(() => btn.classList.remove('on'), 160);
      });
    }
    this.joystick(document.getElementById('stickZone'), document.getElementById('stick'), document.getElementById('knob'));
  }

  // Joystick flotante: aparece donde apoyás el dedo, en la mitad izquierda de la pantalla
  joystick(zone, base, knob) {
    let id = null, cx = 0, cy = 0;
    const move = e => {
      const max = base.offsetWidth * 0.4;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > max) { dx *= max / d; dy *= max / d; }
      this.stick.x = dx / max;
      this.stick.y = -dy / max;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    zone.addEventListener('pointerdown', e => {
      if (id !== null) return;
      id = e.pointerId;
      zone.setPointerCapture(id);
      cx = e.clientX; cy = e.clientY;
      base.style.left = `${cx}px`;
      base.style.top = `${cy}px`;
      base.classList.add('active');
      move(e);
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
    const end = e => {
      if (e.pointerId !== id) return;
      id = null;
      this.stick.x = this.stick.y = 0;
      knob.style.transform = '';
      base.style.left = base.style.top = '';
      base.classList.remove('active');
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  // Estado de este cuadro. El golpe apretado se entrega una sola vez.
  read() {
    const k = this.keys;
    let x = this.stick.x, y = this.stick.y;
    if (k.has('ArrowLeft') || k.has('KeyA')) x = -1;
    if (k.has('ArrowRight') || k.has('KeyD')) x = 1;
    if (k.has('ArrowUp') || k.has('KeyW')) y = 1;
    if (k.has('ArrowDown') || k.has('KeyS')) y = -1;
    const n = Math.hypot(x, y);
    if (n > 1) { x /= n; y /= n; }
    const shot = this.shot;
    this.shot = null;
    return { x, y, shot };
  }
}
