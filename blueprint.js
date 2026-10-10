// Monta blueprint (markdown), tokens CSS, plano de blocos e sugestões de otimização.
const { contrast, mix } = require('./analyzer');

const SYS = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const HEX = /^#[0-9a-fA-F]{6}$/;

// Aplica alterações escolhidas pelo usuário sobre a análise (sem mutar o original).
function effective(a, ov = {}) {
  const T = JSON.parse(JSON.stringify(a.tokens));
  const E = { T, typo: a.typo, accentContrast: a.accentContrast };
  const setC = (k, v) => { if (HEX.test(v || '')) { T[k] = { v: v.toLowerCase(), src: 'ajustado' }; } };
  if (ov.colors) for (const [k, v] of Object.entries(ov.colors)) setC(k, v);
  if (ov.systemFonts) { T['font-body'] = { v: SYS, src: 'ajustado' }; T['font-display'] = { v: SYS, src: 'ajustado' }; }
  if (ov.radiusScale && +ov.radiusScale > 0) for (const k of ['radius-sm', 'radius-md', 'radius-lg']) T[k] = { v: Math.round(parseFloat(T[k].v) * ov.radiusScale) + 'px', src: 'ajustado' };
  if (ov.noShadows) for (const k of ['shadow-sm', 'shadow-md', 'shadow-lg']) T[k] = { v: 'none', src: 'ajustado' };
  if (ov.fixContrast) {
    const bg = T['bg-primary'].v, dk = a.dark;
    let m = T['text-muted'].v, i = 0;
    while (contrast(m, bg) < 4.5 && i++ < 20) m = mix(m, T['text-primary'].v, 0.1);
    T['text-muted'] = { v: m, src: 'ajustado' };
    let ac = T['accent'].v; i = 0;
    while (contrast(ac, bg) < 3 && i++ < 20) ac = mix(ac, dk ? '#ffffff' : '#000000', 0.1);
    T['accent'] = { v: ac, src: 'ajustado' };
  }
  const acc = T['accent'].v;
  E.accentContrast = contrast('#ffffff', acc) >= contrast('#000000', acc) ? '#ffffff' : '#000000';
  E.contrast = {
    text: +contrast(T['text-primary'].v, T['bg-primary'].v).toFixed(2),
    muted: +contrast(T['text-muted'].v, T['bg-primary'].v).toFixed(2),
    accentBtn: +contrast(E.accentContrast, acc).toFixed(2),
    accentOnBg: +contrast(acc, T['bg-primary'].v).toFixed(2),
  };
  E.noAnim = !!ov.noAnimations; E.noLogo = !!ov.noLogo;
  E.drop = new Set(ov.drop || []);
  E.note = ov.note || '';
  return E;
}

// Blocos do clone, na ordem (derivados do mapa de seções detectado).
function blockPlan(a) {
  const mids = a.meta.sections.filter(s => s.role === 'seção').length;
  const plan = [
    { id: 'nav', kind: 'nav', label: 'header / navegação', core: true },
    { id: 'hero', kind: 'hero', label: 'hero (título + CTAs)', core: true },
    { id: 'features', kind: 'features', label: 'cards de recursos', core: true },
  ];
  if (mids >= 3) plan.push({ id: 'stats', kind: 'stats', label: 'faixa de números' });
  if (mids >= 2) plan.push({ id: 'split', kind: 'split', label: 'bloco texto + visual' });
  plan.push({ id: 'cta', kind: 'cta', label: 'chamada final (CTA)' });
  plan.push({ id: 'form', kind: 'form', label: 'formulário de contato' });
  plan.push({ id: 'footer', kind: 'footer', label: 'rodapé', core: true });
  return plan;
}

function tokensCss(a, E) {
  const T = E.T, ty = a.typo;
  const sp = T.space.v;
  const lines = [
    ':root {',
    '  /* cores */',
    `  --bg-primary: ${T['bg-primary'].v};`, `  --bg-alt: ${T['bg-alt'].v};`, `  --text-primary: ${T['text-primary'].v};`, `  --text-muted: ${T['text-muted'].v};`,
    `  --accent: ${T.accent.v};`, `  --accent-contrast: ${E.accentContrast};`, `  --border: ${T.border.v};`, `  --gradient: ${T.gradient.v};`,
    '  /* tipografia */',
    `  --font-display: ${T['font-display'].v};`, `  --font-body: ${T['font-body'].v};`,
    `  --fs-h1: ${ty.h1.size.v};`, `  --fw-h1: ${ty.h1.weight.v};`, `  --lh-h1: ${ty.h1.lh.v};`, `  --ls-h1: ${ty.h1.ls.v};`,
    `  --fs-h2: ${ty.h2.size.v};`, `  --fw-h2: ${ty.h2.weight.v};`, `  --lh-h2: ${ty.h2.lh.v};`,
    `  --fs-body: ${ty.body.size.v};`, `  --fw-body: ${ty.body.weight.v};`, `  --lh-body: ${ty.body.lh.v};`,
    `  --fs-label: ${ty.btn.size.v};`, `  --fw-label: ${ty.btn.weight.v};`,
    '  /* layout */',
    `  --max-width: ${T['max-width'].v};`, `  --gutter: ${T.gutter.v};`, `  --section-y: ${T['section-y'].v};`,
    ...sp.map((v, i) => `  --space-${i + 1}: ${v}px;`),
    '  /* superfícies */',
    `  --radius-sm: ${T['radius-sm'].v};`, `  --radius-md: ${T['radius-md'].v};`, `  --radius-lg: ${T['radius-lg'].v};`,
    `  --shadow-sm: ${T['shadow-sm'].v};`, `  --shadow-md: ${T['shadow-md'].v};`, `  --shadow-lg: ${T['shadow-lg'].v};`,
    '  /* movimento */',
    `  --duration: ${T.duration.v};`, `  --easing: ${T.easing.v};`,
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  *, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; }',
    '}',
  ];
  return lines.join('\n');
}

function suggestions(a, E, html, ov = {}) {
  const S = []; let n = 0;
  const add = (group, text, patch, applied) => S.push({ n: ++n, group, text, patch, applied: !!applied });
  const kb = Math.round(Buffer.byteLength(html) / 1024);
  // SIMPLIFICAR
  for (const b of blockPlan(a).filter(b => !b.core)) add('SIMPLIFICAR', `Remover o bloco "${b.label}" — opcional, não define a identidade.`, { drop: b.id }, E.drop.has(b.id));
  if (a.tokens['shadow-md'].src !== 'est.') add('SIMPLIFICAR', 'Remover sombras (flat) — reduz CSS e ruído visual, perde profundidade original.', { noShadows: true }, ov.noShadows);
  add('SIMPLIFICAR', 'Remover animação de entrada (reveal) dos blocos — mantém só transições de hover/foco.', { noAnimations: true }, ov.noAnimations);
  // LEVE
  const external = a.gfonts.length || a.fontFaces.length;
  if (external || /'/.test(a.tokens['font-body'].v)) add('LEVE', `Trocar fonte "${(a.tokens['font-body'].v.match(/'([^']+)'/) || [, 'da marca'])[1]}" por fonte do sistema — elimina requisição externa (~20–60 KB de fonte).`, { systemFonts: true }, ov.systemFonts);
  add('LEVE', `Peso atual do HTML gerado: ${kb} KB. Alvo: ≤ ${Math.max(12, Math.round(kb * 0.7))} KB (≈ −30%) aplicando as opções de SIMPLIFICAR/LEVE.`, null, false);
  if (a.meta.favicon) add('LEVE', 'Remover logo remoto do site (hotlink) e usar monograma em texto — zero imagens.', { noLogo: true }, ov.noLogo);
  // FIEL
  const est = Object.entries(a.tokens).filter(([, v]) => v.src === 'est.').map(([k]) => k);
  if (est.length) add('FIEL', `Ainda estimados *(est.)*: ${est.join(', ')}. Para colar mais no original: informe o HEX/valor real em "Pedir alteração" (ex.: cor de destaque).`, null, false);
  const C0 = effective(a, {}).contrast;
  if (C0.muted < 4.5 || C0.accentOnBg < 3 || C0.text < 4.5) add('FIEL', `Contraste abaixo de AA (texto ${C0.text}:1, secundário ${C0.muted}:1, destaque/fundo ${C0.accentOnBg}:1). Ajuste automático escurece/clareia o mínimo necessário, mantendo a matiz.`, { fixContrast: true }, ov.fixContrast);
  if (!a.stats.hasCss) add('FIEL', 'CSS não foi legível (site via JS). Envie um print ou os HEX principais em "Pedir alteração" para substituir as estimativas.', null, false);
  return S;
}

function md(a, E, id, html) {
  const T = E.T, ty = a.typo, today = new Date().toISOString().slice(0, 10);
  const all = Object.values(T).length, conf = Object.values(T).filter(v => v.src === 'confirmado').length;
  const pc = Math.round(conf / all * 100);
  const f = k => { const t = T[k]; return t.src === 'est.' ? `${t.v} *(est.)*` : t.v; };
  const tag = o => o.src === 'est.' ? ' *(est.)*' : '';
  const plan = blockPlan(a).filter(b => !E.drop.has(b.id));
  const mapDom = a.meta.sections.map((s, i) => `${i + 1}. **${s.role}** (\`<${s.tag}${s.cls ? '.' + s.cls : ''}>\`)${s.heading ? ' — "' + s.heading + '"' : ''}`).join('\n') || '— (não detectado)';
  const comp = (name, st, tk, note = '') => `| ${name} | ${st} | ${tk} | ${note} |`;
  const hov = a.samples.hover[0], foc = a.samples.focus[0], dis = a.samples.disabled[0];
  return `---
template_id: ${id}
nome: ${a.host}
fonte: ${a.url}
categoria: OUTRO
data: ${today}
status: rascunho
confianca: ${pc}% confirmado / ${100 - pc}% estimado
mobile_parity: ${a.breakpoints.length ? 'parcial' : 'nao-verificado'}
---

## 0. VISÃO GERAL
- Direção visual em 1 frase: ${a.dark ? 'Interface escura' : 'Interface clara'} com destaque \`${T.accent.v}\`, ${a.pill ? 'botões em pílula' : 'cantos ' + (parseFloat(T['radius-md'].v) > 10 ? 'bem arredondados' : 'discretos')} e ${ty.h1.weight.v >= 700 ? 'títulos pesados' : 'títulos leves'} em ${(T['font-display'].v.match(/'([^']+)'/) || [, 'fonte do sistema'])[1]}.
- Personalidade (3 adjetivos): ${a.dark ? 'tecnológica' : 'limpa'}, ${parseFloat(T['radius-md'].v) > 10 ? 'amigável' : 'precisa'}, ${T['shadow-md'].v === 'none' ? 'plana' : 'em camadas'} *(est.)*
- O que torna reconhecível: combinação de fundo \`${T['bg-primary'].v}\`, destaque \`${T.accent.v}\`, família ${(T['font-display'].v.match(/'([^']+)'/) || [, 'do sistema'])[1]} e raio ${T['radius-md'].v}.
- Problemas e ajustes propostos: texto ${E.contrast.text}:1 (${E.contrast.text >= 4.5 ? 'AA ok' : 'abaixo de AA'}); secundário ${E.contrast.muted}:1 (${E.contrast.muted >= 4.5 ? 'ok' : 'ajustar'}); botão ${E.contrast.accentBtn}:1 (${E.contrast.accentBtn >= 4.5 ? 'ok' : 'ajustar texto do botão'}). ${a.states.focus === 0 ? 'Nenhum estilo :focus detectado — adicionar anel de foco visível.' : ''}

## 1. PALETA
| Token | Função | HEX | Nota |
|-------|--------|-----|------|
| --bg-primary | fundo base | ${f('bg-primary')} | ${T['bg-primary'].src} |
| --bg-alt | fundo alter. | ${f('bg-alt')} | ${T['bg-alt'].src} |
| --text-primary | texto principal | ${f('text-primary')} | ${T['text-primary'].src} |
| --text-muted | texto secundário | ${f('text-muted')} | ${T['text-muted'].src} |
| --accent | destaque/CTA | ${f('accent')} | ${T.accent.src} |
| --border | bordas/divisores | ${f('border')} | ${T.border.src} |
| --gradient | gradiente | ${T.gradient.v} | ${T.gradient.src} |

Contraste AA texto-sobre-fundo: ${E.contrast.text >= 4.5 && E.contrast.muted >= 4.5 ? 'passa' : 'falha → use a opção "corrigir contraste" do painel'} (principal ${E.contrast.text}:1, secundário ${E.contrast.muted}:1)

## 2. TIPOGRAFIA
| Papel | Família | Peso | Tamanho | Linha | Espaçamento |
|-------|---------|------|---------|-------|-------------|
| display/h1 | ${T['font-display'].v} | ${ty.h1.weight.v} | ${ty.h1.size.v}${tag(ty.h1.size)} | ${ty.h1.lh.v} | ${ty.h1.ls.v} |
| h2 | ${T['font-display'].v} | ${ty.h2.weight.v} | ${ty.h2.size.v}${tag(ty.h2.size)} | ${ty.h2.lh.v} | ${ty.h2.ls.v} |
| body | ${T['font-body'].v} | ${ty.body.weight.v} | ${ty.body.size.v}${tag(ty.body.size)} | ${ty.body.lh.v} | ${ty.body.ls.v} |
| label/botão | ${T['font-body'].v} | ${ty.btn.weight.v} | ${ty.btn.size.v}${tag(ty.btn.size)} | ${ty.btn.lh.v} | ${ty.btn.ls.v} |

Alternativas para fontes não disponíveis: Inter / DM Sans / Manrope (Google Fonts) ou pilha do sistema \`${SYS}\`.
${a.fontFaces.length ? 'Fontes @font-face detectadas: ' + a.fontFaces.join(', ') + '.' : ''}${a.gfonts.length ? ' Google Fonts em uso.' : ''}

## 3. GRID & ESPAÇAMENTO
- Largura máx. de conteúdo: ${f('max-width')}
- Colunas desktop / mobile: 12 / 4 *(est.)*
- Gutter: ${f('gutter')}
- Escala de espaçamento: ${T.space.v.join(' / ')} px${T.space.src === 'est.' ? ' *(est.)*' : ''}
- Seção padding vertical (desktop / mobile): ${f('section-y')} / ${Math.round(parseFloat(T['section-y'].v) * 0.6)}px *(est.)*
- Breakpoints detectados: ${a.breakpoints.length ? a.breakpoints.join(', ') + ' px' : '—'}

## 4. SOMBRA · BORDA · ARREDONDAMENTO · MOVIMENTO
| Token | Valor | Uso |
|-------|-------|-----|
| --radius-sm / md / lg | ${f('radius-sm')} / ${f('radius-md')} / ${f('radius-lg')} | campos / botões / cards |
| --shadow-sm / md / lg | ${f('shadow-sm')} · ${f('shadow-md')} · ${f('shadow-lg')} | elevação |
| --duration | ${f('duration')} | transições |
| --easing | ${f('easing')} | curva |

Hover/foco relevantes: ${hov ? '`' + hov.sel + ' { ' + hov.decl + ' }`' : 'não detectado'}${foc ? '; foco: `' + foc.sel + ' { ' + foc.decl + ' }`' : ''}
Reduced-motion: transições e animações desligadas via \`@media (prefers-reduced-motion: reduce)\`.
${a.keyframes.length ? 'Keyframes no original: ' + a.keyframes.join(', ') + '.' : ''}${a.sticky ? ' Navegação fixa/sticky detectada.' : ''}

## 5. COMPONENTES
| Componente | Estados | Tokens usados | Notas |
|------------|---------|---------------|-------|
${comp('menu/nav', 'padrão, hover (link sublinha/realça), foco, mobile: menu colapsável', '--text-primary, --accent, --border', a.sticky ? 'sticky' : '')}
${comp('botão primário', `padrão, hover${hov ? '' : ' *(est.)*'}, foco, desabilitado${dis ? '' : ' *(est.)*'}`, '--accent, --accent-contrast, --radius-md')}
${comp('botão secundário', 'padrão, hover, foco, desabilitado', '--border, --text-primary')}
${comp('card', 'padrão, hover (eleva)', '--bg-alt, --radius-lg, --shadow-sm/md')}
${comp('formulário/campo', 'padrão, foco, erro, desabilitado', '--border, --radius-sm, --accent')}
${comp('rodapé', 'padrão', '--bg-alt, --text-muted')}
Estados no CSS original: hover ${a.states.hover} · focus ${a.states.focus} · disabled ${a.states.disabled} · active ${a.states.active} regras.

## 6. DESIGN TOKENS (CSS) — PRONTOS PARA COPIAR
\`\`\`css
${tokensCss(a, E)}
\`\`\`

## 7. MAPA DE SEÇÕES
Detectadas no HTML original (ordem do DOM):
${mapDom}

Blocos gerados no clone:
${plan.map((b, i) => `${i + 1}. ${b.label}`).join('\n')}

## 8. DEMONSTRAÇÃO
Arquivo \`${id}.html\` — HTML + CSS + JS inline, modo GUIA + modo CLONE (${Math.round(Buffer.byteLength(html || '') / 1024)} KB).

## 9. VERIFICAÇÃO & NOTAS
- [x] tokens cobrem paleta, tipografia, layout, superfície e movimento
- [x] layout responsivo (menu colapsa abaixo de 760px)
- [x] estados padrão/hover/foco/desabilitado presentes
- [x] reduced-motion respeitado
${E.note ? '\nNota do usuário: ' + E.note + '\n' : ''}
Confirmado: ${[...new Set(a.notes.confirmed)].join(', ') || '—'}
Estimado: ${[...new Set(a.notes.estimated)].join(', ') || '—'}
Não acessado: ${[...new Set(a.notes.missing)].join('; ') || '—'}
`;
}

module.exports = { effective, blockPlan, tokensCss, suggestions, md };
