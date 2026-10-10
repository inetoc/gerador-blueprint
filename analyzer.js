// Extrai tokens de design de um site: HTML + CSS vinculado. Sem dependências.
const dns = require('dns').promises;
const net = require('net');
const UA = 'Mozilla/5.0 (compatible; BlueprintBot/1.0)';

// Bloqueia destinos internos (SSRF): loopback, redes privadas, link-local e metadata.
function isPrivate(ip) {
  if (net.isIPv6(ip)) { const l = ip.toLowerCase(); return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:') && isPrivate(l.slice(7)); }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
async function assertPublic(u) {
  if (!/^https?:$/.test(u.protocol)) throw new Error('Protocolo inválido');
  const h = u.hostname.replace(/^[|]$/g, '');
  const ips = net.isIP(h) ? [h] : (await dns.lookup(h, { all: true })).map(r => r.address);
  if (!ips.length || ips.some(isPrivate)) throw new Error('Endereço não permitido');
}

async function fetchText(url, max = 2_000_000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    let r, cur = url;
    for (let i = 0; i < 5; i++) {
      await assertPublic(new URL(cur));
      r = await fetch(cur, { headers: { 'user-agent': UA, accept: 'text/html,text/css,*/*' }, signal: ctl.signal, redirect: 'manual' });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { cur = new URL(r.headers.get('location'), cur).href; continue; }
      break;
    }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const s = await r.text();
    return { text: s.slice(0, max), finalUrl: cur };
  } finally { clearTimeout(t); }
}

// ---------- cores ----------
const NAMED = { white: '#ffffff', black: '#000000' };
function toHex(v) {
  v = v.trim().toLowerCase();
  if (NAMED[v]) return NAMED[v];
  let m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length >= 6) return '#' + h.slice(0, 6);
    return null;
  }
  m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) {
    let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (a < 0.5) return null;
    return '#' + [m[1], m[2], m[3]].map(n => Math.min(255, +n).toString(16).padStart(2, '0')).join('');
  }
  return null;
}
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;
function colorsIn(str) { return (str.match(COLOR_RE) || []).map(toHex).filter(Boolean); }
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function lum(h) {
  const [r, g, b] = rgb(h).map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function sat(h) { const [r, g, b] = rgb(h).map(c => c / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; }
function mix(a, b, t) { const A = rgb(a), B = rgb(b); return '#' + A.map((c, i) => Math.round(c + (B[i] - c) * t).toString(16).padStart(2, '0')).join(''); }

// ---------- utilidades ----------
class Counter { constructor() { this.m = new Map(); } add(k, n = 1) { if (k == null || k === '') return; this.m.set(k, (this.m.get(k) || 0) + n); } top(n = 1) { return [...this.m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(e => e[0]); } }
const px = v => { if (!v) return null; const m = String(v).trim().match(/^(-?[\d.]+)(px|rem|em)$/); if (!m) return null; return Math.round(parseFloat(m[1]) * (m[2] === 'px' ? 1 : 16) * 100) / 100; };
const firstFont = v => v && v.split(',')[0].replace(/["']/g, '').trim();

function parseDecls(body, rv) {
  const out = {};
  body.split(';').forEach(d => { const i = d.indexOf(':'); if (i > 0) { const k = d.slice(0, i).trim().toLowerCase(), v = d.slice(i + 1).replace(/!important/i, '').trim(); out[k] = k.startsWith('--') ? v : rv(v); } });
  return out;
}

function analyzeCss(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const gv = {};
  for (const x of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) if (!(x[1] in gv)) gv[x[1]] = x[2].trim();
  const rv = (v, n = 0) => n > 5 ? v : v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, k, f) => rv(k in gv ? gv[k] : (f || ''), n + 1));
  const A = {
    bgBody: null, textBody: null, fontBody: null, fontDisplay: null,
    bg: new Counter(), text: new Counter(), border: new Counter(), accentBg: new Counter(), allColors: new Counter(),
    radius: new Counter(), shadow: new Counter(), dur: new Counter(), ease: new Counter(), maxw: new Counter(), space: new Counter(), secPad: new Counter(), gutter: new Counter(),
    sizes: { h1: new Counter(), h2: new Counter(), body: new Counter(), btn: new Counter() },
    weights: { h1: new Counter(), h2: new Counter(), body: new Counter(), btn: new Counter() },
    lh: { h1: new Counter(), h2: new Counter(), body: new Counter(), btn: new Counter() },
    ls: { h1: new Counter(), h2: new Counter(), body: new Counter(), btn: new Counter() },
    states: { hover: 0, focus: 0, disabled: 0, active: 0 }, hoverSamples: [], focusSamples: [], disabledSamples: [],
    gradients: new Counter(), breakpoints: new Counter(), vars: {}, fontFaces: [], rules: 0, sticky: false, keyframes: [], radiusLg: 0,
  };
  (css.match(/@font-face\s*\{[^}]*\}/g) || []).forEach(f => { const m = f.match(/font-family:\s*([^;]+)/); if (m) A.fontFaces.push(firstFont(m[1])); });
  (css.match(/@keyframes\s+[\w-]+/g) || []).forEach(k => A.keyframes.push(k.replace('@keyframes', '').trim()));
  for (const m of css.matchAll(/@media[^{]*\(\s*(?:max|min)-width:\s*(\d+)px/g)) A.breakpoints.add(+m[1]);

  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].trim();
    if (!sel || sel.startsWith('@')) continue;
    const d = parseDecls(m[2], rv);
    A.rules++;
    const sels = sel.split(',').map(s => s.trim());
    const any = rx => sels.some(s => rx.test(s));
    const isRoot = any(/^(:root|html|body)$/i);

    if (any(/^:root$/i) || any(/^html$/i)) Object.entries(d).forEach(([k, v]) => { if (k.startsWith('--')) A.vars[k] = v; });
    const stateOf = any(/:hover/) ? 'hover' : any(/:focus/) ? 'focus' : any(/:disabled|\[disabled\]|\.disabled/) ? 'disabled' : any(/:active/) ? 'active' : null;
    if (stateOf) {
      A.states[stateOf]++;
      const arr = stateOf === 'hover' ? A.hoverSamples : stateOf === 'focus' ? A.focusSamples : stateOf === 'disabled' ? A.disabledSamples : null;
      if (arr && arr.length < 6 && (any(/btn|button|cta|link|a:|card|nav/i) || arr.length < 2)) arr.push({ sel: sels[0], decl: m[2].trim().replace(/\s+/g, ' ').slice(0, 160) });
    }

    // cores
    for (const [k, v] of Object.entries(d)) {
      if (k.startsWith('--')) continue;
      const cs = colorsIn(v);
      if (/^background(-color)?$/.test(k)) {
        if (cs[0] && !stateOf) {
          A.bg.add(cs[0]); A.allColors.add(cs[0]);
          if (isRoot && sels.some(s => /^(body|html|:root)$/i.test(s))) A.bgBody = A.bgBody || cs[0];
          if (any(/btn|button|cta|primary|badge|pill/i)) A.accentBg.add(cs[0], 3);
        }
      } else if (k === 'color') {
        if (cs[0]) { A.allColors.add(cs[0]); if (!stateOf) A.text.add(cs[0]); if (any(/^(body|html)$/i)) A.textBody = A.textBody || cs[0]; }
      } else if (/^border(-top|-bottom|-left|-right)?(-color)?$/.test(k) || k === 'outline') {
        cs.forEach(c => { A.border.add(c); A.allColors.add(c); });
      }
      if (/gradient\(/.test(v) && /^background/.test(k)) { const g = v.match(/(?:linear|radial)-gradient\((?:[^()]|\([^()]*\))*\)/); if (g) A.gradients.add(g[0].replace(/\s+/g, ' ')); }
    }

    // radius / sombra / movimento
    if (d['border-radius']) { const r = px(d['border-radius'].split(/\s+/)[0]); if (r !== null && r >= 0) { A.radius.add(r); } if (/9999|50%|999/.test(d['border-radius'])) A.radiusLg++; }
    if (d['box-shadow'] && d['box-shadow'] !== 'none' && !stateOf) A.shadow.add(d['box-shadow'].replace(/\s+/g, ' '));
    const tr = d['transition'] || d['transition-duration'];
    if (tr) {
      for (const t of tr.matchAll(/(\d*\.?\d+)(ms|s)\b/g)) A.dur.add(t[2] === 's' ? Math.round(parseFloat(t[1]) * 1000) : Math.round(+t[1]));
      const e = tr.match(/cubic-bezier\([^)]*\)|\bease-in-out\b|\bease-out\b|\bease-in\b|\bease\b|\blinear\b/); if (e) A.ease.add(e[0]);
    }
    if (d['transition-timing-function']) A.ease.add(d['transition-timing-function'].split(',')[0].trim());
    if (/position:\s*(sticky|fixed)/.test(m[2]) && any(/header|nav/i)) A.sticky = true;

    // layout
    const mw = px(d['max-width']); if (mw && mw >= 600 && mw <= 1700 && (any(/container|wrapper|wrap|content|inner|main|page|site|section|layout|width/i) || true)) A.maxw.add(mw, any(/container|wrapper|wrap|inner|content/i) ? 4 : 1);
    for (const k of ['padding', 'margin', 'gap', 'row-gap', 'column-gap', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'margin-top', 'margin-bottom']) {
      if (!d[k]) continue;
      d[k].split(/\s+/).forEach(p => { const v = px(p); if (v && v > 0 && v <= 160) A.space.add(v); });
    }
    if (any(/section|hero|band|block/i)) { const p = d['padding'] ? px(d['padding'].split(/\s+/)[0]) : px(d['padding-top']); if (p && p >= 40) A.secPad.add(p); }
    if (any(/container|wrapper|wrap|inner/i)) { const p = d['padding'] ? px(d['padding'].split(/\s+/)[1] || d['padding'].split(/\s+/)[0]) : px(d['padding-left']); if (p !== null && p > 0 && p <= 64) A.gutter.add(p); }

    // tipografia
    const roles = [];
    if (any(/(^|[\s>])h1\b|\.(hero|display)[\w-]*(title|heading)|\.h1\b/i)) roles.push('h1');
    if (any(/(^|[\s>])h2\b|\.h2\b|section[\w-]*(title|heading)/i)) roles.push('h2');
    if (any(/^(body|html|p)$|\.body\b/i)) roles.push('body');
    if (any(/btn|button|\.cta\b/i) && !stateOf) roles.push('btn');
    for (const r of roles) {
      if (d['font-size']) A.sizes[r].add(d['font-size']);
      if (d['font-weight']) A.weights[r].add(d['font-weight']);
      if (d['line-height']) A.lh[r].add(d['line-height']);
      if (d['letter-spacing']) A.ls[r].add(d['letter-spacing']);
    }
    if (d['font-family']) {
      if (any(/^(body|html|:root)$/i)) A.fontBody = A.fontBody || d['font-family'];
      if (any(/(^|[\s>])h[1-3]\b|\.(display|heading|title)\b/i)) A.fontDisplay = A.fontDisplay || d['font-family'];
    }
  }
  return A;
}

// ---------- HTML ----------
function analyzeHtml(html, base) {
  const H = { lang: 'pt-BR', favicon: null, gfonts: [], sections: [], spa: false };
  H.lang = ((html.match(/<html[^>]+lang=["']([^"']+)["']/i) || [])[1]) || 'en';
  const ic = html.match(/<link[^>]+rel=["'](?:shortcut )?(?:apple-touch-icon|icon)["'][^>]*>/i);
  if (ic) { const h = (ic[0].match(/href=["']([^"']+)["']/) || [])[1]; if (h) try { H.favicon = new URL(h, base).href; } catch {} }
  H.gfonts = [...html.matchAll(/<link[^>]+href=["'](https:\/\/fonts\.googleapis\.com\/css[^"']+)["']/gi)].map(m => m[1].replace(/&amp;/g, '&'));
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const text = strip(body);
  H.spa = text.length < 300 && /id=["'](root|app|__next|__nuxt)["']/.test(html);
  const tagRe = /<(header|nav|section|footer|main)\b([^>]*)>/gi;
  let t; let hasHeader = false;
  while ((t = tagRe.exec(body)) && H.sections.length < 14) {
    const tag = t[1].toLowerCase();
    const cls = ((t[2].match(/(?:class|id)=["']([^"']+)["']/) || [])[1] || '').split(/\s+/)[0];
    if (tag === 'main') continue;
    if (tag === 'nav' && hasHeader) continue;
    if (tag === 'header') hasHeader = true;
    const win = body.slice(t.index, t.index + 900);
    const hd = strip((win.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i) || [])[1] || '');
    const isHero = /<h1/i.test(win) || /hero|banner|masthead/i.test(cls);
    H.sections.push({ tag, cls, heading: hd.slice(0, 80), role: tag === 'header' || tag === 'nav' ? 'header/nav' : tag === 'footer' ? 'rodapé' : isHero && !H.sections.some(s => s.role === 'hero') ? 'hero' : 'seção' });
  }
  return H;
}
function strip(s) { return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }

// ---------- análise completa ----------
async function analyze(rawUrl) {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol)) throw new Error('Protocolo inválido');
  const notes = { confirmed: [], estimated: [], missing: [] };
  const page = await fetchText(u.href);
  const H = analyzeHtml(page.text, page.finalUrl);
  const cssParts = [...page.text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]);
  const links = [...page.text.matchAll(/<link[^>]+>/gi)].map(m => m[0]).filter(l => /rel=["']?stylesheet/i.test(l)).map(l => (l.match(/href=["']([^"']+)["']/) || [])[1]).filter(Boolean);
  let cssBytes = cssParts.join('').length, fetched = 0;
  for (const href of links.slice(0, 8)) {
    try {
      const abs = new URL(href.replace(/&amp;/g, '&'), page.finalUrl).href;
      if (/fonts\.googleapis\.com/.test(abs)) continue;
      const c = await fetchText(abs, 1_500_000); cssParts.push(c.text); cssBytes += c.text.length; fetched++;
    } catch (e) { notes.missing.push('CSS não baixado: ' + href); }
  }
  const css = cssParts.join('\n');
  const A = analyzeCss(css);
  const V = A.vars;
  const hasCss = A.rules > 5;
  if (!hasCss) notes.missing.push('Quase nenhum CSS legível (site renderizado por JS ou bloqueado): tokens são estimativas');
  if (H.spa) notes.missing.push('Página parece SPA: seções do DOM não verificadas');
  notes.missing.push('Comportamento no celular não renderizado (apenas @media lidas do CSS); animações JS não detectadas');

  const T = {}; // token -> {v, src}
  const set = (k, v, ok, label) => { T[k] = { v, src: ok ? 'confirmado' : 'est.' }; (ok ? notes.confirmed : notes.estimated).push(label || k); };
  const varColor = rx => { for (const [k, v] of Object.entries(V)) if (rx.test(k)) { const h = colorsIn(v)[0]; if (h) return h; } return null; };

  // paleta
  let bg = A.bgBody || varColor(/^--(bg|background|surface|color-bg)(-primary|-base|-default)?$/i);
  const bgOk = !!bg; if (!bg) bg = '#ffffff';
  set('bg-primary', bg, bgOk, 'fundo base');
  const dark = lum(bg) < 0.3;
  let txt = A.textBody || varColor(/^--(text|foreground|fg|color-text)(-primary|-default)?$/i) || (A.text.top(1)[0]);
  const txtOk = !!txt; if (!txt) txt = dark ? '#f5f5f5' : '#111111';
  set('text-primary', txt, txtOk, 'texto principal');
  let alt = A.bg.top(6).find(c => c !== bg && Math.abs(lum(c) - lum(bg)) < 0.25 && Math.abs(lum(c) - lum(bg)) > 0.005);
  const altOk = !!alt; if (!alt) alt = mix(bg, dark ? '#ffffff' : '#000000', 0.04);
  set('bg-alt', alt, altOk, 'fundo alternativo');
  let muted = A.text.top(8).find(c => c !== txt && sat(c) < 0.45 && contrast(c, bg) >= 3 && contrast(c, bg) < contrast(txt, bg));
  const mutedOk = !!muted; if (!muted) muted = mix(txt, bg, 0.4);
  set('text-muted', muted, mutedOk, 'texto secundário');
  let acc = A.accentBg.top(5).find(c => sat(c) > 0.2) || varColor(/^--(primary|accent|brand|color-primary)/i) || A.allColors.top(40).find(c => sat(c) > 0.35 && c !== bg);
  const accOk = !!acc; if (!acc) acc = dark ? '#7c9cff' : '#2563eb';
  set('accent', acc, accOk, 'cor de destaque');
  let brd = A.border.top(3).find(c => c !== bg);
  const brdOk = !!brd; if (!brd) brd = mix(bg, dark ? '#ffffff' : '#000000', 0.12);
  set('border', brd, brdOk, 'bordas');
  const grad = A.gradients.top(1)[0];
  T['gradient'] = { v: grad || 'none', src: grad ? 'confirmado' : 'est.' };
  if (grad) notes.confirmed.push('gradiente');
  const accentContrast = contrast('#ffffff', acc) >= contrast('#000000', acc) ? '#ffffff' : '#000000';

  // tipografia
  const fb = A.fontBody || (V['--font-body'] || V['--font-sans'] || V['--font'] || '');
  const fd = A.fontDisplay || V['--font-display'] || V['--font-heading'] || '';
  const bodyFam = firstFont(fb), dispFam = firstFont(fd) || bodyFam;
  const fontStack = f => f ? `'${f}', ${/serif/i.test(f) && !/sans/i.test(f) ? 'Georgia, serif' : 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'}` : null;
  set('font-body', fontStack(bodyFam) || 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', !!bodyFam, 'família do corpo');
  set('font-display', fontStack(dispFam) || T['font-body'].v, !!dispFam, 'família de títulos');
  const typo = {};
  const defaults = { h1: ['56px', '700', '1.1', '-0.02em'], h2: ['36px', '700', '1.2', '-0.01em'], body: ['16px', '400', '1.6', 'normal'], btn: ['15px', '600', '1.2', 'normal'] };
  for (const r of ['h1', 'h2', 'body', 'btn']) {
    const RANGE = { h1: [28, 140], h2: [20, 80], body: [13, 22], btn: [12, 20] };
    const sizePx = v => { const nums = [...String(v).matchAll(/([d.]+)(px|rem)/g)].map(x => parseFloat(x[1]) * (x[2] === 'rem' ? 16 : 1)); return nums.length ? Math.max(...nums) : null; };
    const pick = (o, i) => {
      const vals = A[o][r].top(12).filter(v => !/^(inherit|initial|unset|revert|auto)$/.test(v));
      const v = o === 'sizes' ? vals.find(x => { const p = sizePx(x); return p && p >= RANGE[r][0] && p <= RANGE[r][1]; }) : o === 'weights' ? vals.find(x => /^(d{3}|bold|normal)$/.test(x)) : vals[0];
      return v ? { v, src: 'confirmado' } : { v: defaults[r][i], src: 'est.' };
    };
    typo[r] = { size: pick('sizes', 0), weight: pick('weights', 1), lh: pick('lh', 2), ls: pick('ls', 3) };
    const ok = typo[r].size.src === 'confirmado'; (ok ? notes.confirmed : notes.estimated).push('tipografia ' + r);
  }

  // layout
  const mw = A.maxw.top(1)[0], gut = A.gutter.top(1)[0];
  set('max-width', (mw || 1200) + 'px', !!mw, 'largura máx.');
  set('gutter', (gut || 24) + 'px', !!gut, 'gutter');
  let scale = [...new Set(A.space.top(14))].sort((a, b) => a - b).slice(0, 9);
  const scaleOk = scale.length >= 4; if (!scaleOk) scale = [4, 8, 12, 16, 24, 32, 48, 64];
  T['space'] = { v: scale, src: scaleOk ? 'confirmado' : 'est.' }; (scaleOk ? notes.confirmed : notes.estimated).push('escala de espaçamento');
  const sp = A.secPad.top(1)[0];
  set('section-y', (sp || 80) + 'px', !!sp, 'padding vertical de seção');

  // superfícies
  let radii = [...new Set(A.radius.top(8))].filter(r => r < 200).sort((a, b) => a - b);
  const rOk = radii.length > 0;
  const pickR = (i, def) => radii.length ? radii[Math.min(radii.length - 1, Math.round(i * (radii.length - 1) / 2))] : def;
  set('radius-sm', pickR(0, 4) + 'px', rOk, 'raio sm'); set('radius-md', pickR(1, 8) + 'px', rOk, 'raio md'); set('radius-lg', pickR(2, 16) + 'px', rOk, 'raio lg');
  const sh = A.shadow.top(6);
  const shOk = sh.length > 0;
  set('shadow-sm', sh[sh.length - 1] || '0 1px 2px rgba(0,0,0,.08)', shOk, 'sombra sm');
  set('shadow-md', sh[Math.floor(sh.length / 2)] || sh[0] || '0 4px 12px rgba(0,0,0,.10)', shOk, 'sombra md');
  set('shadow-lg', sh[0] || '0 12px 32px rgba(0,0,0,.14)', shOk, 'sombra lg');
  const dur = A.dur.top(1)[0], ease = A.ease.top(1)[0];
  set('duration', (dur || 200) + 'ms', !!dur, 'duração'); set('easing', ease || 'ease', !!ease, 'easing');

  const cssKB = Math.round(cssBytes / 1024);
  const bp = [...new Set(A.breakpoints.top(5))].sort((a, b) => a - b);

  return {
    url: page.finalUrl, host: u.hostname.replace(/^www\./, ''), meta: H, tokens: T, typo, accentContrast, dark,
    contrast: { text: +contrast(txt, bg).toFixed(2), muted: +contrast(muted, bg).toFixed(2), accentBtn: +contrast(accentContrast, acc).toFixed(2) },
    states: A.states, samples: { hover: A.hoverSamples, focus: A.focusSamples, disabled: A.disabledSamples },
    fontFaces: [...new Set(A.fontFaces)].slice(0, 6), gfonts: H.gfonts, keyframes: [...new Set(A.keyframes)].slice(0, 8), breakpoints: bp, sticky: A.sticky, pill: A.radiusLg > 2,
    stats: { cssKB, cssFiles: fetched, hasCss },
    notes,
  };
}

module.exports = { analyze, contrast, mix, lum, sat };
