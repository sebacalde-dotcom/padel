// Modo sin conexión: guarda la app (y Three.js la primera vez que se baja).
// Primero intenta la red, así se ven los cambios; si no hay conexión usa lo guardado.
const CACHE = 'padel-v3';
const APP = [
  './', 'index.html', 'style.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'src/main.js', 'src/game.js', 'src/physics.js', 'src/shots.js', 'src/rules.js', 'src/ai.js',
  'src/input.js', 'src/hud.js', 'src/sound.js', 'src/menu.js', 'src/roster.js',
  'src/view/court.js', 'src/view/players.js', 'src/view/ball.js', 'src/view/looks.js', 'src/view/portraits.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
