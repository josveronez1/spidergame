// Spiderbench Lite: static files + multiplayer relay.
// Run: node lite/server/server.mjs   then open http://<this-ip>:3000/lite/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = +process.env.PORT || 3000;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); // the spiderbench folder
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') { res.writeHead(302, { Location: '/lite/' }); res.end(); return; }
  if (url.endsWith('/')) url += 'index.html';
  const file = path.join(ROOT, url);
  if (!file.startsWith(ROOT + path.sep) || file.includes(`${path.sep}server${path.sep}`)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
});

// ---------- relay ----------
// client -> server: {t:'hello', name} | {t:'s', ...state} | {t:'hit', to, dir:[x,y,z]}
// server -> client: {t:'welcome', id, color} | {t:'s', id, ...} | {t:'hit', from, dir} | {t:'bye', id} | {t:'name', id, name, color}
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Map(); // id -> {ws, name, color}
let nextId = 1, nextColor = 1;

const send = (ws, msg) => { if (ws.readyState === 1) ws.send(msg); };
const broadcast = (from, obj) => { const m = JSON.stringify(obj); for (const [id, c] of clients) if (id !== from) send(c.ws, m); };

wss.on('connection', ws => {
  const id = nextId++, me = { ws, name: `Aranha ${id}`, color: nextColor++ % 8, named: false };
  clients.set(id, me);
  send(ws, JSON.stringify({ t: 'welcome', id, color: me.color }));
  for (const [oid, c] of clients) if (oid !== id && c.named) send(ws, JSON.stringify({ t: 'name', id: oid, name: c.name, color: c.color }));
  console.log(`+ jogador ${id} (${clients.size} online)`);

  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'hello') {
      me.name = String(m.name || me.name).slice(0, 20); me.named = true;
      broadcast(id, { t: 'name', id, name: me.name, color: me.color });
    } else if (m.t === 's') {
      m.id = id; broadcast(id, m);
    } else if (m.t === 'hit') {
      const c = clients.get(m.to); if (c) send(c.ws, JSON.stringify({ t: 'hit', from: id, dir: m.dir }));
    }
  });
  ws.on('close', () => { clients.delete(id); broadcast(id, { t: 'bye', id }); console.log(`- jogador ${id} (${clients.size} online)`); });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Spiderbench Lite rodando na porta ${PORT}`);
  console.log(`  Neste PC:        http://localhost:${PORT}/lite/`);
  for (const list of Object.values(os.networkInterfaces()))
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log(`  Outros PCs:       http://${a.address}:${PORT}/lite/`);
});
