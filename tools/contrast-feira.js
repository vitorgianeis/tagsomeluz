/* ============================================================
   contrast-feira.js — contraste dentro da seção da feira.
   Separa do teste geral porque aqui o texto cai em cima de
   composição: cartões translúcidos e gradiente com alpha.
   Os valores são extraídos do próprio css/site.css.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const cssRef = (html.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/) || [])[1] || 'css/style.css';
const css = fs.readFileSync(path.join(root, cssRef), 'utf8');

function hex(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}
function over(fg, bg, a) { return fg.map((c, i) => Math.round(a * c + (1 - a) * bg[i])); }
function lum(rgb) {
  const s = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}
function ratio(a, b) { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); }

const problems = [];
const ok = [];

/* --- tokens --- */
const rootBlock = (css.match(/:root\s*\{([\s\S]*?)\}/) || [])[1] || '';
const T = {};
for (const m of rootBlock.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) T[m[1]] = hex(m[2]);
const t = k => T[k];

/* --- extrai a regra de um seletor (primeiro match) --- */
function regra(sel) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp(esc + '\\s*\\{([^}]*)\\}'));
  return m ? m[1] : '';
}
function rgbaDe(txt, origem) {
  const m = txt.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!m) { problems.push(`não achei cor em: ${origem}`); return { rgb: [0, 0, 0], a: 1 }; }
  return { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : parseFloat(m[4]) };
}

const MIN = 4.5;
function checa(rotulo, fg, bg) {
  const r = ratio(fg, bg);
  if (r >= MIN) ok.push(`${rotulo}: ${r.toFixed(2)}:1 (≥ ${MIN})`);
  else problems.push(`${rotulo}: ${r.toFixed(2)}:1 — precisa de ${MIN}:1`);
}

if (!t('fundo-2') || !t('super')) {
  problems.push('tokens --fundo-2/--super ausentes do :root');
} else {
  const F2 = t('fundo-2');
  const WHITE = [255, 255, 255];

  /* cartões da feira: fundo branco a 3.5% sobre o --fundo-2 */
  const card = rgbaDe(regra('.feira-card'), '.feira-card{...background}');
  const cardBg = over(card.rgb, F2, card.a);
  checa('cartão da feira · texto', t('texto'), cardBg);
  checa('cartão da feira · rótulo roxo', t('roxo-txt'), cardBg);
  checa('cartão da feira · legenda', t('fraco'), cardBg);

  /* caixas da contagem: --sobre sólido */
  checa('caixa da contagem · número', WHITE, t('super'));
  checa('caixa da contagem · rótulo', t('fraco'), t('super'));

  /* card lateral: gradiente rgba sobre o --fundo-2 do fundo da seção */
  const g = regra('.feira-lado');
  const stops = [];
  const rx = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g;
  let m;
  while ((m = rx.exec(g)) !== null) stops.push(over([+m[1], +m[2], +m[3]], F2, parseFloat(m[4])));
  if (stops.length < 2) problems.push('não achei os 2 stops do gradiente em .feira-lado');
  const pColor = hex(((regra('.feira-lado p').match(/color:\s*(#[0-9a-fA-F]{3,8})/) || [])[1]) || '#ffffff');
  stops.forEach((bg, i) => {
    checa(`card lateral · parágrafo (stop ${i + 1})`, pColor, bg);
    checa(`card lateral · título branco (stop ${i + 1})`, WHITE, bg);
  });

  /* botão branco dentro do card lateral */
  checa('card lateral · botão branco', t('roxo-esc'), WHITE);

  /* contagem regressiva sobre o fundo da seção */
  checa('contagem · rótulo sobre a seção', t('roxo-txt'), F2);
}

console.log('✔ OK (' + ok.length + ')');
ok.forEach(m => console.log('   + ' + m));
console.log('\n✖ PROBLEMAS (' + problems.length + ')');
problems.forEach(m => console.log('   - ' + m));
process.exit(problems.length ? 1 : 0);
