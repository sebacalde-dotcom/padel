// Sonidos sintetizados, sin archivos: golpe, pique, vidrio, malla, red y punto.
const SOUNDS = {
  hit:   { type: 'triangle', f: 700, to: 240, dur: 0.07, vol: 0.55, noise: 0.35 },
  smash: { type: 'square', f: 520, to: 120, dur: 0.1, vol: 0.4, noise: 0.5 },
  floor: { type: 'sine', f: 210, to: 90, dur: 0.06, vol: 0.45 },
  glass: { type: 'triangle', f: 1500, to: 900, dur: 0.09, vol: 0.22 },
  mesh:  { type: 'sawtooth', f: 260, to: 140, dur: 0.14, vol: 0.18, noise: 0.3 },
  net:   { type: 'sine', f: 140, to: 70, dur: 0.12, vol: 0.35 },
  win:   { type: 'triangle', f: 660, to: 990, dur: 0.22, vol: 0.2 },
  lose:  { type: 'triangle', f: 440, to: 280, dur: 0.25, vol: 0.18 },
};

export class Sound {
  constructor() { this.ctx = null; this.noise = null; }

  // Los navegadores sólo dejan sonar después de un toque del usuario
  unlock() {
    try {
      this.ctx ??= new AudioContext();
      this.ctx.resume();
      if (!this.noise) {
        const len = Math.floor(this.ctx.sampleRate * 0.2);
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
    } catch {
      this.ctx = null;
    }
  }

  play(name) {
    const c = this.ctx, s = SOUNDS[name];
    if (!c || !s || c.state !== 'running') return;
    const t = c.currentTime, out = c.createGain();
    out.gain.setValueAtTime(s.vol, t);
    out.gain.exponentialRampToValueAtTime(0.001, t + s.dur);
    out.connect(c.destination);
    const osc = c.createOscillator();
    osc.type = s.type;
    osc.frequency.setValueAtTime(s.f, t);
    osc.frequency.exponentialRampToValueAtTime(s.to, t + s.dur);
    osc.connect(out);
    osc.start(t);
    osc.stop(t + s.dur);
    if (s.noise && this.noise) {
      const src = c.createBufferSource(), gain = c.createGain();
      src.buffer = this.noise;
      gain.gain.value = s.noise;
      src.connect(gain).connect(out);
      src.start(t);
      src.stop(t + s.dur);
    }
  }
}
