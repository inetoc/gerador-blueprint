// Gera o HTML único autocontido: modo GUIA + modo CLONE.
const { effective, blockPlan, tokensCss } = require('./blueprint');

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function generate(a, ov = {}, id = 'TPL-000') {
  const E = effective(a, ov);
  const T = E.T, ty = a.typo;
  const plan = blockPlan(a).filter(b => !E.drop.has(b.id));
  const name = a.host.split('.')[0].replace(/^./, c => c.toUpperCase());
  const lang = /^pt/i.test(a.meta.lang) ? 'pt' : 'en';
  const L = lang === 'pt' ? {
    links: ['Produto', 'Recursos', 'Preços', 'Contato'], cta: 'Começar agora', sec: 'Ver detalhes', eyebrow: 'Demonstração de estilo',
    h1: 'Uma página nova com a mesma identidade visual', lead: 'Texto demonstrativo próprio. Tokens, grid e componentes foram extraídos do site de referência para você criar páginas consistentes.',
    featT: 'Tudo o que você precisa', cards: [['Rápido', 'Carrega leve e responde ao toque sem atraso.'], ['Consistente', 'Cores, tipografia e espaçamento vêm dos mesmos tokens.'], ['Acessível', 'Foco visível, contraste revisado e movimento reduzido.']],
    stats: [['3×', 'mais rápido'], ['12', 'colunas'], ['100%', 'tokens']], splitT: 'Do blueprint ao template', splitP: 'Cada seção segue o mapa original. Troque textos e imagens e publique.',
    ctaT: 'Pronto para criar sua página?', form: ['Nome', 'E-mail', 'Mensagem', 'Enviar', 'Indisponível'], footer: 'Todos os direitos reservados.', fcols: [['Produto', 'Recursos', 'Preços'], ['Empresa', 'Sobre', 'Contato']], hov: 'Hover', foc: 'Foco', dis: 'Desabilitado', def: 'Padrão',
  } : {
    links: ['Product', 'Features', 'Pricing', 'Contact'], cta: 'Get started', sec: 'See details', eyebrow: 'Style demo',
    h1: 'A new page with the same visual identity', lead: 'Original demo copy. Tokens, grid and components were extracted from the reference site so new pages stay consistent.',
    featT: 'Everything you need', cards: [['Fast', 'Loads light and responds instantly to touch.'], ['Consistent', 'Colors, type and spacing come from the same tokens.'], ['Accessible', 'Visible focus, reviewed contrast and reduced motion.']],
    stats: [['3×', 'faster'], ['12', 'columns'], ['100%', 'tokens']], splitT: 'From blueprint to template', splitP: 'Every section follows the original map. Swap copy and images, then ship.',
    ctaT: 'Ready to build your page?', form: ['Name', 'Email', 'Message', 'Send', 'Unavailable'], footer: 'All rights reserved.', fcols: [['Product', 'Features', 'Pricing'], ['Company', 'About', 'Contact']], hov: 'Hover', foc: 'Focus', dis: 'Disabled', def: 'Default',
  };
  const anim = !E.noAnim;
  const gf = !ov.systemFonts && a.gfonts[0] ? `<link rel="stylesheet" href="${esc(a.gfonts[0])}">` : '';
  const logo = !E.noLogo && a.meta.favicon ? `<img class="logo-img" src="${esc(a.meta.favicon)}" alt="" width="28" height="28" onerror="this.remove()">` : '';
  const dispName = (T['font-display'].v.match(/'([^']+)'/) || [, 'system-ui'])[1];

  const css = `${tokensCss(a, E)}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg-primary);color:var(--text-primary);font:var(--fw-body) var(--fs-body)/var(--lh-body) var(--font-body);-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:var(--font-display);margin:0}
h1{font-size:clamp(34px,6vw,var(--fs-h1));font-weight:var(--fw-h1);line-height:var(--lh-h1);letter-spacing:var(--ls-h1)}
h2{font-size:clamp(26px,4vw,var(--fs-h2));font-weight:var(--fw-h2);line-height:var(--lh-h2)}
h3{font-size:20px;font-weight:600}
p{margin:0}a{color:inherit}
.wrap{max-width:var(--max-width);margin:0 auto;padding:0 var(--gutter)}
.muted{color:var(--text-muted)}
.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px}
:focus-visible{outline:3px solid var(--accent);outline-offset:3px;border-radius:var(--radius-sm)}
/* botões */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 22px;font:var(--fw-label) var(--fs-label)/1 var(--font-body);border-radius:var(--radius-md);border:1px solid transparent;cursor:pointer;text-decoration:none;transition:transform var(--duration) var(--easing),box-shadow var(--duration) var(--easing),background var(--duration) var(--easing),border-color var(--duration) var(--easing)}
.btn-primary{background:var(--accent);color:var(--accent-contrast)}
.btn-primary:hover,.btn-primary.is-hover{transform:translateY(-1px);box-shadow:var(--shadow-md);filter:brightness(1.08)}
.btn-secondary{background:transparent;color:var(--text-primary);border-color:var(--border)}
.btn-secondary:hover,.btn-secondary.is-hover{border-color:var(--accent);color:var(--accent)}
.btn.is-focus{outline:3px solid var(--accent);outline-offset:3px}
.btn:disabled,.btn.is-disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none;filter:none}
/* nav */
.nav{position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--bg-primary) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--border)}
.nav .wrap{display:flex;align-items:center;justify-content:space-between;height:68px;gap:16px}
.brand{display:flex;align-items:center;gap:10px;font:700 18px var(--font-display);text-decoration:none}
.brand .mono-logo{width:28px;height:28px;border-radius:var(--radius-sm);background:var(--accent);color:var(--accent-contrast);display:grid;place-items:center;font-size:14px}
.nav-links{display:flex;align-items:center;gap:28px}
.nav-links a:not(.btn){text-decoration:none;color:var(--text-muted);transition:color var(--duration) var(--easing)}
.nav-links a:not(.btn):hover{color:var(--text-primary)}
.burger{display:none;background:none;border:1px solid var(--border);border-radius:var(--radius-sm);width:44px;height:44px;color:inherit;cursor:pointer}
/* seções */
section{padding:var(--section-y) 0}
.hero{padding-top:calc(var(--section-y)*.9);background:var(--gradient,none),var(--bg-primary);}
.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
.eyebrow{display:inline-block;padding:6px 12px;border:1px solid var(--border);border-radius:999px;color:var(--text-muted);font-size:13px;margin-bottom:20px}
.hero p.lead{font-size:clamp(17px,2vw,20px);color:var(--text-muted);margin:20px 0 32px;max-width:52ch}
.row{display:flex;flex-wrap:wrap;gap:12px}
.visual{aspect-ratio:4/3;border-radius:var(--radius-lg);background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 25%,var(--bg-alt)));box-shadow:var(--shadow-lg);position:relative;overflow:hidden}
.visual::after{content:"";position:absolute;inset:14% 12%;border-radius:var(--radius-md);background:color-mix(in srgb,var(--bg-primary) 82%,transparent);border:1px solid var(--border)}
.alt{background:var(--bg-alt)}
.head{max-width:640px;margin-bottom:40px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.card{background:var(--bg-alt);border:1px solid var(--border);border-radius:var(--radius-lg);padding:28px;box-shadow:var(--shadow-sm);transition:transform var(--duration) var(--easing),box-shadow var(--duration) var(--easing)}
.card:hover{transform:translateY(-4px);box-shadow:var(--shadow-md)}
.card .ico{width:44px;height:44px;border-radius:var(--radius-md);background:var(--accent);color:var(--accent-contrast);display:grid;place-items:center;font-weight:700;margin-bottom:18px}
.card p{color:var(--text-muted);margin-top:8px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;text-align:center}
.stats b{display:block;font:var(--fw-h2) clamp(32px,5vw,48px)/1.1 var(--font-display);color:var(--accent)}
.split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.split p{color:var(--text-muted);margin-top:14px}
.cta{text-align:center}.cta .wrap{background:var(--accent);color:var(--accent-contrast);border-radius:var(--radius-lg);padding:56px 24px;max-width:calc(var(--max-width) - 2*var(--gutter))}
.cta .btn-primary{background:var(--accent-contrast);color:var(--accent)}
form{display:grid;gap:16px;max-width:520px}
label{display:grid;gap:6px;font-weight:600;font-size:14px}
input,textarea{font:inherit;color:inherit;background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;min-height:44px;transition:border-color var(--duration) var(--easing),box-shadow var(--duration) var(--easing)}
input:hover,textarea:hover{border-color:var(--text-muted)}
input:focus,textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 30%,transparent)}
input:disabled{opacity:.5;cursor:not-allowed}
footer{background:var(--bg-alt);border-top:1px solid var(--border);padding:48px 0 32px}
footer .cols{display:grid;grid-template-columns:2fr 1fr 1fr;gap:32px}
footer ul{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}footer a{color:var(--text-muted);text-decoration:none}footer a:hover{color:var(--text-primary)}
footer .legal{margin-top:32px;padding-top:20px;border-top:1px solid var(--border);font-size:14px}
${anim ? `.rv{opacity:0;transform:translateY(18px);transition:opacity calc(var(--duration)*3) var(--easing),transform calc(var(--duration)*3) var(--easing)}.rv.in{opacity:1;transform:none}` : ''}
/* barra de modos + guia */
.modebar{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 16px;background:#111;color:#fff;font:600 13px system-ui,sans-serif}
.modebar .sp{flex:1}.modebar button{font:inherit;color:#fff;background:#2a2a2a;border:1px solid #444;border-radius:8px;padding:8px 14px;min-height:36px;cursor:pointer}
.modebar button[aria-pressed=true]{background:#fff;color:#111}.modebar .dl{background:#16a34a;border-color:#16a34a}
.modebar .id{opacity:.7;font-weight:400}
.view{display:none}.view.on{display:block}
.guide{padding:40px 0 80px}.guide h2{font-size:26px;margin:48px 0 16px;padding-top:8px;border-top:1px solid var(--border)}.guide h2:first-child{border:0;margin-top:0}
.sw{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px}
.sw button{all:unset;cursor:pointer;border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;background:var(--bg-primary)}
.sw button:focus-visible{outline:3px solid var(--accent)}
.sw i{display:block;height:72px}.sw span{display:block;padding:10px 12px;font-size:13px}.sw b{display:block}
.tag{display:inline-block;font-size:11px;padding:2px 6px;border-radius:999px;border:1px solid var(--border);color:var(--text-muted);margin-left:6px}
.tbl{width:100%;border-collapse:collapse;font-size:14px}.tbl td,.tbl th{padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
.bars{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap}.bars div{background:var(--accent);border-radius:3px;min-width:28px;text-align:center;color:var(--accent-contrast);font-size:11px;padding-top:2px}
.demo{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;align-items:center}
.demo small{display:block;color:var(--text-muted);margin-bottom:6px}
.surf{display:flex;flex-wrap:wrap;gap:16px}.surf div{width:120px;height:80px;background:var(--bg-alt);border:1px solid var(--border);display:grid;place-items:center;font-size:12px}
pre.code{background:var(--bg-alt);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;overflow:auto;font-size:12.5px;line-height:1.55;max-height:420px}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:10px 16px;border-radius:8px;font:600 13px system-ui;opacity:0;pointer-events:none;transition:opacity .2s;z-index:99}.toast.on{opacity:1}
@media (max-width:900px){.grid3,.stats{grid-template-columns:1fr}.hero .wrap,.split{grid-template-columns:1fr}footer .cols{grid-template-columns:1fr 1fr}}
@media (max-width:760px){:root{--section-y:${Math.round(parseFloat(T['section-y'].v) * 0.6)}px}.burger{display:block}.nav-links{display:none;position:absolute;top:68px;left:0;right:0;flex-direction:column;align-items:stretch;gap:0;padding:12px var(--gutter) 20px;background:var(--bg-primary);border-bottom:1px solid var(--border)}.nav-links.open{display:flex}.nav-links a:not(.btn){padding:14px 0;border-bottom:1px solid var(--border)}.nav-links .btn{margin-top:14px}}`;

  const nav = `<header class="nav"><div class="wrap"><a class="brand" href="#top">${logo || `<span class="mono-logo" aria-hidden="true">${esc(name[0])}</span>`}<span>${esc(name)}</span></a>
<button class="burger" aria-label="Menu" aria-expanded="false" aria-controls="nl">☰</button>
<nav class="nav-links" id="nl" aria-label="Principal">${L.links.map(l => `<a href="#${l.toLowerCase()}">${l}</a>`).join('')}<a class="btn btn-primary" href="#form">${L.cta}</a></nav></div></header>`;
  const B = {
    hero: `<section class="hero" id="top"><div class="wrap"><div class="rv"><span class="eyebrow">${L.eyebrow}</span><h1>${L.h1}</h1><p class="lead">${L.lead}</p><div class="row"><a class="btn btn-primary" href="#form">${L.cta}</a><a class="btn btn-secondary" href="#recursos">${L.sec}</a></div></div><div class="visual rv" role="img" aria-label="Ilustração demonstrativa"></div></div></section>`,
    features: `<section id="recursos"><div class="wrap"><div class="head rv"><h2>${L.featT}</h2></div><div class="grid3">${L.cards.map((c, i) => `<article class="card rv"><div class="ico">${i + 1}</div><h3>${c[0]}</h3><p>${c[1]}</p></article>`).join('')}</div></div></section>`,
    stats: `<section class="alt"><div class="wrap stats">${L.stats.map(s => `<div class="rv"><b>${s[0]}</b><span class="muted">${s[1]}</span></div>`).join('')}</div></section>`,
    split: `<section id="produto"><div class="wrap split"><div class="rv"><h2>${L.splitT}</h2><p>${L.splitP}</p><div class="row" style="margin-top:24px"><a class="btn btn-secondary" href="#form">${L.sec}</a></div></div><div class="visual rv" role="img" aria-label="Ilustração demonstrativa"></div></div></section>`,
    cta: `<section class="cta" id="preços"><div class="wrap rv"><h2>${L.ctaT}</h2><div class="row" style="justify-content:center;margin-top:24px"><a class="btn btn-primary" href="#form">${L.cta}</a></div></div></section>`,
    form: `<section id="form"><div class="wrap"><div class="head rv"><h2 id="contato">${L.links[3]}</h2></div><form class="rv" onsubmit="event.preventDefault();toast('OK')"><label>${L.form[0]}<input name="n" autocomplete="name" required></label><label>${L.form[1]}<input type="email" name="e" autocomplete="email" required></label><label>${L.form[2]}<textarea name="m" rows="4"></textarea></label><div class="row"><button class="btn btn-primary" type="submit">${L.form[3]}</button><button class="btn btn-secondary" type="button" disabled>${L.form[4]}</button></div></form></div></section>`,
    footer: `<footer><div class="wrap"><div class="cols"><div><a class="brand" href="#top"><span class="mono-logo" aria-hidden="true">${esc(name[0])}</span><span>${esc(name)}</span></a><p class="muted" style="margin-top:12px;max-width:34ch">${L.lead}</p></div>${L.fcols.map(c => `<div><h3 style="font-size:15px">${c[0]}</h3><ul>${c.slice(1).map(x => `<li><a href="#top">${x}</a></li>`).join('')}</ul></div>`).join('')}</div><div class="legal muted">© ${new Date().getFullYear()} ${esc(name)} (demo). ${L.footer}</div></div></footer>`,
  };
  const clone = nav + '<main>' + plan.filter(b => b.kind !== 'nav' && b.kind !== 'footer').map(b => B[b.kind]).join('') + '</main>' + B.footer;

  // ----- GUIA -----
  const sw = [['bg-primary', 'fundo base'], ['bg-alt', 'fundo alternativo'], ['text-primary', 'texto principal'], ['text-muted', 'texto secundário'], ['accent', 'destaque / CTA'], ['border', 'bordas']]
    .map(([k, f]) => `<button type="button" data-copy="${T[k].v}" aria-label="Copiar ${T[k].v}"><i style="background:${T[k].v}"></i><span><b>--${k}</b>${T[k].v}<em class="tag">${T[k].src}</em><br><small class="muted">${f}</small></span></button>`).join('');
  const tyRows = [['display / h1', T['font-display'].v, ty.h1], ['h2', T['font-display'].v, ty.h2], ['body', T['font-body'].v, ty.body], ['label / botão', T['font-body'].v, ty.btn]]
    .map(([r, fam, t]) => `<tr><td>${r}</td><td class="mono">${esc(fam.split(',')[0])}</td><td>${t.weight.v}</td><td>${t.size.v}<em class="tag">${t.size.src}</em></td><td>${t.lh.v}</td><td>${t.ls.v}</td></tr>`).join('');
  const bars = T.space.v.map((v, i) => `<div style="width:${Math.max(28, v * 2)}px;height:${Math.max(16, Math.min(v, 70))}px" title="--space-${i + 1}">${v}</div>`).join('');
  const surf = ['sm', 'md', 'lg'].map(s => `<div style="border-radius:var(--radius-${s});box-shadow:var(--shadow-${s})">${s}<br>${T['radius-' + s].v}</div>`).join('');
  const states = (cls, label) => ['', 'is-hover', 'is-focus', 'is-disabled'].map((s, i) => `<div><small>${[L.def, L.hov, L.foc, L.dis][i]}</small><button class="btn ${cls} ${s}" type="button" tabindex="-1">${label}</button></div>`).join('');
  const guide = `<div class="wrap guide">
<h2>Resumo</h2><p class="muted">${esc(a.host)} · ${a.dark ? 'tema escuro' : 'tema claro'} · fonte de títulos ${esc(dispName)} · ${a.stats.cssFiles} CSS lidos (${a.stats.cssKB} KB) · <a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.url)}</a></p>
<h2>Paleta <small class="muted">(clique para copiar)</small></h2><div class="sw">${sw}</div>
<p class="muted" style="margin-top:12px">Contraste: texto ${E.contrast.text}:1 · secundário ${E.contrast.muted}:1 · botão ${E.contrast.accentBtn}:1</p>
<h2>Tipografia</h2><div style="overflow:auto"><table class="tbl"><tr><th>Papel</th><th>Família</th><th>Peso</th><th>Tamanho</th><th>Linha</th><th>Espaç.</th></tr>${tyRows}</table></div>
<h2>Grid & espaçamento</h2><p class="muted">Máx. ${T['max-width'].v}<em class="tag">${T['max-width'].src}</em> · gutter ${T.gutter.v} · seção ${T['section-y'].v}${a.breakpoints.length ? ' · breakpoints ' + a.breakpoints.join('/') : ''}</p><div class="bars" style="margin-top:12px">${bars}</div>
<h2>Raio, sombra e movimento</h2><div class="surf">${surf}</div><p class="muted" style="margin-top:12px">duração ${T.duration.v} · easing ${esc(T.easing.v)}</p>
<h2>Componentes e estados</h2><div class="demo">${states('btn-primary', 'Primário')}</div><div class="demo" style="margin-top:12px">${states('btn-secondary', 'Secundário')}</div>
<div class="demo" style="margin-top:16px"><div><small>Campo — padrão</small><input placeholder="Texto" style="width:100%"></div><div><small>Campo — foco</small><input placeholder="Texto" style="width:100%;border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 30%,transparent)"></div><div><small>Campo — desabilitado</small><input placeholder="Texto" disabled style="width:100%"></div></div>
<div class="grid3" style="margin-top:16px"><div class="card"><h3>Card</h3><p>Passe o mouse para elevar.</p></div></div>
<h2>Design tokens</h2><div class="row" style="margin-bottom:10px"><button class="btn btn-primary" id="cpt" type="button">Copiar tokens</button></div><pre class="code mono" id="tk">${esc(tokensCss(a, E))}</pre>
<h2>Confiança</h2><p><b>Confirmado:</b> ${esc([...new Set(a.notes.confirmed)].join(', ') || '—')}</p><p><b>Estimado:</b> ${esc([...new Set(a.notes.estimated)].join(', ') || '—')}</p><p><b>Não acessado:</b> ${esc([...new Set(a.notes.missing)].join('; ') || '—')}</p>
</div>`;

  const js = `(function(){var $=function(s,r){return(r||document).querySelector(s)},$$=function(s){return[].slice.call(document.querySelectorAll(s))};
window.toast=function(m){var t=$('.toast');t.textContent=m;t.classList.add('on');setTimeout(function(){t.classList.remove('on')},1400)};
function copy(t){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast('Copiado: '+t.slice(0,24))}).catch(function(){var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast('Copiado')}catch(e){}a.remove()})}
$$('[data-copy]').forEach(function(b){b.onclick=function(){copy(b.dataset.copy)}});$('#cpt').onclick=function(){copy($('#tk').textContent)};
function mode(m){$$('.view').forEach(function(v){v.classList.toggle('on',v.id==='v-'+m)});$$('.modebar [data-mode]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.mode===m)});if(m==='guia')scrollTo(0,0)}
$$('.modebar [data-mode]').forEach(function(b){b.onclick=function(){mode(b.dataset.mode)}});
var bg=$('.burger'),nl=$('#nl');if(bg){bg.onclick=function(){var o=nl.classList.toggle('open');bg.setAttribute('aria-expanded',o)};$$('#nl a').forEach(function(a){a.onclick=function(){nl.classList.remove('open');bg.setAttribute('aria-expanded',false)}})}
var rm=matchMedia('(prefers-reduced-motion: reduce)').matches,rv=$$('.rv');
if(rm||!('IntersectionObserver' in window)){rv.forEach(function(e){e.classList.add('in')})}else{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});rv.forEach(function(e){io.observe(e)})}
$('#dl').onclick=function(){var h='<!DOCTYPE html>\\n'+document.documentElement.outerHTML;var b=new Blob([h],{type:'text/html'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='${id}.html';a.click();setTimeout(function(){URL.revokeObjectURL(u)},500)};
mode('clone');})();`;

  const html = `<!DOCTYPE html>
<html lang="${lang === 'pt' ? 'pt-BR' : 'en'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${id} · ${esc(name)} — blueprint</title>${gf}
<style>${css}</style></head>
<body>
<div class="modebar" role="toolbar" aria-label="Modos"><span class="id">${id}</span><button data-mode="guia" aria-pressed="false">GUIA</button><button data-mode="clone" aria-pressed="true">CLONE</button><span class="sp"></span><button class="dl" id="dl" type="button">⬇ BAIXAR ESTE HTML</button></div>
<div class="view" id="v-guia">${guide}</div>
<div class="view on" id="v-clone">${clone}</div>
<div class="toast" role="status" aria-live="polite"></div>
<script>${js}</script>
</body></html>`;
  return { html, E };
}

module.exports = { generate };
