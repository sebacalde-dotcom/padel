// Arranque: escena 3D, cámara, bucle de juego, controles, sonido y marcador.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Game } from './game.js';
import { predict, sideOf } from './physics.js';
import { buildCourt } from './view/court.js';
import { makePlayer, animatePlayer, disposePlayer } from './view/players.js';
import { renderPortraits } from './view/portraits.js';
import { ROSTER, TEAM_KITS, byId, drawLineup } from './roster.js';
import { Menu } from './menu.js';
import { BallView } from './view/ball.js';
import { Input } from './input.js';
import { Hud } from './hud.js';
import { Sound } from './sound.js';

// ?demo: juegan los cuatro solos · ?warp=8: adelanta 8 s de partido (para capturas)
const params = new URLSearchParams(location.search);
const demo = params.has('demo');

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b18);
scene.fog = new THREE.Fog(0x070b18, 30, 70);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
scene.add(new THREE.HemisphereLight(0xd6e6ff, 0x1a2344, 1.1));
const sun = new THREE.DirectionalLight(0xfff7ea, 2.6);
sun.position.set(5, 16, -7);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 13, bottom: -13, near: 2, far: 40 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun);
buildCourt(scene, renderer);

const game = new Game({ demo });
let views = [], lineup = [];

// lineup: [vos, compañero, rival, rival], tomados de ROSTER
function setLineup(players) {
  lineup = players;
  views.forEach(disposePlayer);
  views = players.map((p, i) => {
    const v = makePlayer(p.look, { ...TEAM_KITS[i < 2 ? 0 : 1], ring: i === 0 && !demo });
    scene.add(v.root);
    return v;
  });
  hud.names(players);
}
const ballView = new BallView(scene);

const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200);
camera.position.set(0, 8.6, -16.2);
const input = new Input();
const hud = new Hud();
const sound = new Sound();

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = Math.min(80, 46 * Math.max(1, 2.1 / camera.aspect) ** 0.75);   // que entre la cancha a lo ancho
  camera.updateProjectionMatrix();
  hud.orientation(h > w);
}
addEventListener('resize', resize);
resize();

let running = demo, paused = false;
const touch = matchMedia('(pointer: coarse)').matches;

function serveHint() {
  const mine = game.state === 'serve' && game.server.human;
  hud.hint(mine ? (touch ? 'Tocá GOLPE para sacar' : 'Apretá J o espacio para sacar') : '');
}

function handleEvents() {
  for (const e of game.events) {
    switch (e.type) {
      case 'hit': {
        sound.play(e.shot === 'remate' ? 'smash' : 'hit');
        ballView.hideMarker();
        hud.hint('');
        // Marca dónde va a picar la pelota que viene hacia tu campo
        const land = e.team === 1 && predict(game.ball, 3).find(p => p.floor);
        if (land && sideOf(land.z) === 0) ballView.showMarker(land.x, land.z);
        break;
      }
      case 'floor': sound.play('floor'); ballView.hideMarker(); break;
      case 'wall': sound.play(e.glass ? 'glass' : 'mesh'); break;
      case 'net': sound.play('net'); break;
      case 'fault': hud.message('Falta', e.reason); break;
      case 'serve-ready':
        serveHint();
        if (e.second) hud.message('Segundo saque');
        break;
      case 'point': {
        let sub = e.reason;
        if (e.info?.game) sub += e.info.team === 0 ? ' · Game para ustedes' : ' · Game rival';
        else if (e.info?.golden) sub += ' · era punto de oro';
        hud.message(e.winner < 0 ? 'Se repite' : e.winner === 0 ? '¡Punto!' : 'Punto rival', sub);
        if (e.winner >= 0) sound.play(e.winner === 0 ? 'win' : 'lose');
        break;
      }
      case 'match':
        running = false;
        hud.end(game.score);
        break;
    }
  }
  hud.score(game.score, game.serveTeam);
}

const tmp = new THREE.Vector3();
function draw(dt) {
  game.players.forEach((p, i) => animatePlayer(views[i], p, dt));
  ballView.update(game.ball, game.ball.active || game.state === 'serve', dt);
  const me = game.human;
  camera.position.x += ((me ? me.x * 0.2 : 0) - camera.position.x) * Math.min(1, dt * 2);
  camera.lookAt(camera.position.x * 0.6, 0, 0.2);
  renderer.render(scene, camera);
  if (me) {
    views[0].head.getWorldPosition(tmp);
    tmp.y += 0.35;
    tmp.project(camera);
    hud.tag((tmp.x + 1) / 2 * innerWidth, (1 - tmp.y) / 2 * innerHeight, running && !paused);
  }
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const controls = input.read();
  if (running && !paused) {
    game.update(dt, demo ? {} : controls);
    handleEvents();
  }
  draw(dt);
});

// Pantallas
function pause() { if (running && !paused) { paused = true; hud.show('pause'); } }
function resume() { paused = false; hud.show(null); }
function start() {
  sound.unlock();
  game.restart();
  running = true;
  paused = false;
  hud.show(null);
  hud.score(game.score, game.serveTeam);
  serveHint();
  if (touch) {
    document.documentElement.requestFullscreen?.()
      .then(() => screen.orientation?.lock?.('landscape'))
      .catch(() => { /* no todos los navegadores lo permiten */ });
  }
}
// Elegiste jugador: se sortean compañero y rivales y se muestran las parejas
function choose(id) {
  setLineup(drawLineup(id));
  menu.vs(lineup, portraits);
  hud.show('vs');
}
hud.on('playBtn', start);
hud.on('changeBtn', () => hud.show('select'));
hud.on('resumeBtn', resume);
hud.on('restartBtn', start);
hud.on('againBtn', start);
hud.on('menuBtn', () => { running = false; hud.show('select'); });
hud.on('pauseBtn', () => (paused ? resume() : pause()));
input.onPause = () => (paused ? resume() : pause());
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ?equipo=fer,tincho,jochi,gato fija las parejas (vos, compañero, rivales); si no, se sortean
const fixed = (params.get('equipo') ?? '').split(',').map(byId).filter(Boolean);
setLineup(fixed.length === 4 ? fixed : drawLineup(ROSTER[Math.floor(Math.random() * ROSTER.length)].id));
const portraits = renderPortraits(ROSTER);
const menu = new Menu(ROSTER, portraits, choose);
hud.score(game.score, game.serveTeam);
if (demo) {
  hud.show(null);
  const warp = Number(params.get('warp')) || 0;
  for (let i = 0; i < warp * 60; i++) game.update(1 / 60, {});
} else if (params.get('elegir')) {
  choose(params.get('elegir'));   // ?elegir=fer abre directo la pantalla de parejas (para capturas)
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline */ });
}
