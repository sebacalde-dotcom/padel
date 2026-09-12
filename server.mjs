// Servidor local sin dependencias.
//   node server.mjs        → http://localhost:5173 (sólo esta compu)
//   node server.mjs --red  → también desde el celular en la misma red Wi-Fi
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 5173;
const LAN = process.argv.includes('--red');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = normalize(join(ROOT, path.endsWith('/') ? `${path}index.html` : path));
  if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
  }
}).listen(PORT, LAN ? '0.0.0.0' : '127.0.0.1', () => {
  console.log(`Padel Park en http://localhost:${PORT}`);
  if (LAN) {
    for (const nets of Object.values(networkInterfaces())) {
      for (const n of nets ?? []) if (n.family === 'IPv4' && !n.internal) console.log(`  desde el celular: http://${n.address}:${PORT}`);
    }
  }
});
