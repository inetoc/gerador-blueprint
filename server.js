// Servidor local sem dependências. Uso: node server.js  →  http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const { analyze } = require('./analyzer');
const { generate } = require('./generator');
const { suggestions, md } = require('./blueprint');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC = process.env.PUBLIC === '1'; // modo público: não grava em disco
const hits = new Map();
function limited(ip) { const t = Date.now(), a = (hits.get(ip) || []).filter(x => t - x < 60000); a.push(t); hits.set(ip, a); return a.length > 12; }
const BANK = path.join(__dirname, 'banco-de-templates');

function nextId() {
  if (PUBLIC) return 'TPL-' + String(Date.now() % 1000).padStart(3, '0');
  fs.mkdirSync(BANK, { recursive: true });
  const n = fs.readdirSync(BANK).map(d => (d.match(/^(\d{3})-/) || [])[1]).filter(Boolean).map(Number);
  return 'TPL-' + String((n.length ? Math.max(...n) : 0) + 1).padStart(3, '0');
}

function build(a, ov, category, status) {
  const id = nextId();
  const { html, E } = generate(a, ov, id);
  let blueprint = md(a, E, id, html);
  if (category) blueprint = blueprint.replace(/^categoria: .*/m, 'categoria: ' + category);
  if (status) blueprint = blueprint.replace(/^status: .*/m, 'status: ' + status);
  return { id, html, blueprint, suggestions: suggestions(a, E, html, ov), kb: Math.round(Buffer.byteLength(html) / 1024) };
}

function approve(a, ov, category) {
  const r = build(a, ov, category, 'pronto');
  if (PUBLIC) return { ...r, folder: '(modo público: nada salvo no servidor — use os downloads)', row: '| ' + r.id + ' | ' + a.host + ' | ' + (category || 'OUTRO') + ' | ' + a.url + ' | pronto | — |' };
  const slug = a.host.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const folder = `${r.id.replace('TPL-', '')}-${slug}`;
  const dir = path.join(BANK, folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, folder + '.md'), r.blueprint);
  fs.writeFileSync(path.join(dir, folder + '.html'), r.html);
  const conf = (r.blueprint.match(/^confianca: (\d+)%/m) || [])[1] || '—';
  const row = `| ${r.id} | ${slug} | ${category || 'OUTRO'} | ${a.url} | pronto | ${conf}% |`;
  const idx = path.join(BANK, 'INDEX.md');
  if (!fs.existsSync(idx)) fs.writeFileSync(idx, '# Índice do banco\n\n| ID | Nome | Categoria | Fonte | Status | Confiança |\n|----|------|-----------|-------|--------|-----------|\n');
  fs.appendFileSync(idx, row + '\n');
  return { ...r, row, folder: path.relative(__dirname, dir) };
}

function body(req) {
  return new Promise((res, rej) => {
    let s = ''; req.on('data', c => { s += c; if (s.length > 5e6) req.destroy(); });
    req.on('end', () => { try { res(JSON.parse(s || '{}')); } catch (e) { rej(e); } });
  });
}
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
    }
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
    if (req.method === 'POST' && limited(req.headers['x-forwarded-for'] || req.socket.remoteAddress)) return send(res, 429, { error: 'Muitas requisições. Aguarde um minuto.' });
    if (req.method === 'POST' && req.url === '/api/analyze') {
      const { url } = await body(req);
      if (!url) return send(res, 400, { error: 'Informe um link.' });
      const a = await analyze(url);
      return send(res, 200, { analysis: a, ...build(a, {}) });
    }
    if (req.method === 'POST' && req.url === '/api/regenerate') {
      const { analysis, overrides } = await body(req);
      return send(res, 200, build(analysis, overrides || {}));
    }
    if (req.method === 'POST' && req.url === '/api/approve') {
      const { analysis, overrides, category } = await body(req);
      return send(res, 200, approve(analysis, overrides || {}, category));
    }
    res.writeHead(404); res.end('not found');
  } catch (e) {
    send(res, 500, { error: e.name === 'AbortError' ? 'Tempo esgotado ao abrir o site.' : String(e.message || e) });
  }
}).listen(PORT, HOST, () => console.log('Blueprint em http://' + HOST + ':' + PORT));
