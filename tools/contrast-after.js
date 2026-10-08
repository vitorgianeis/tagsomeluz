/* ============================================================
   contrast-after.js — contraste do site atual (index.html).
   Lê os tokens de css/site.css na hora: se alguém trocar uma cor,
   o teste reprova na hora, sem precisar de número mágico no código.
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

/* tokens do :root */
const problems = [];
const ok = [];
const rootBlock = (css.match(/:root\s*\{([\s\S]*?)\}/) || [])[1] || '';
const T = {};
for (const m of rootBlock.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) T[m[1]] = hex(m[2]);

const T_KEYS = ['roxo', 'roxo-esc', 'roxo-cla', 'roxo-txt', 'fundo', 'fundo-2', 'super', 'texto', 'fraco'];
T_KEYS.forEach(k => {
  if (!T[k]) problems.push(`token --${k} não encontrado em ${cssRef} (o :root mudou?)`);
});
const t = k => T[k] || [0, 0, 0];

const WHITE = [255, 255, 255];
const MIN = 4.5;   // texto normal (WCAG AA)
const UI = 3.0;    // componentes e bordas (não-texto)

function checa(rotulo, fg, bg, min) {
  const r = ratio(fg, bg);
  const alvo = min || MIN;
  if (r >= alvo) ok.push(`${rotulo}: ${r.toFixed(2)}:1 (≥ ${alvo})`);
  else problems.push(`${rotulo}: ${r.toFixed(2)}:1 — precisa de ${alvo}:1`);
}

if (problems.length === 0) {
  /* --- corpo do texto sobre os três fundos --- */
  checa('texto sobre --fundo', t('texto'), t('fundo'));
  checa('texto sobre --fundo-2', t('texto'), t('fundo-2'));
  checa('texto sobre --super (cards)', t('texto'), t('super'));

  /* --- texto fraco (descrições, legendas, rodapé) --- */
  checa('fraco sobre --fundo', t('fraco'), t('fundo'));
  checa('fraco sobre --fundo-2', t('fraco'), t('fundo-2'));
  checa('fraco sobre --super', t('fraco'), t('super'));

  /* --- roxo de destaque (kickers, links, números) --- */
  checa('roxo-txt sobre --fundo', t('roxo-txt'), t('fundo'));
  checa('roxo-txt sobre --fundo-2', t('roxo-txt'), t('fundo-2'));
  checa('roxo-txt sobre --super', t('roxo-txt'), t('super'));

  /* --- botões --- */
  checa('branco sobre --roxo (pill do topo)', WHITE, t('roxo'));
  checa('branco sobre --roxo-cla (hover do pill)', WHITE, t('roxo-cla'));
  checa('--roxo-esc sobre branco (botão sólido)', t('roxo-esc'), WHITE);
  checa('branco sobre --roxo-esc (CTA/fundo escuro)', WHITE, t('roxo-esc'));

  /* --- gradiente do CTA final: os 3 stops com texto branco --- */
  checa('CTA gradiente · stop escuro', WHITE, t('roxo-esc'));
  checa('CTA gradiente · stop médio', WHITE, t('roxo'));
  checa('CTA gradiente · stop claro', WHITE, t('roxo-cla'));

  /* --- badge da feira: roxo 14% sobre o fundo-2 --- */
  checa('badge roxo-txt / fundo + roxo 14%', t('roxo-txt'), over(t('roxo-txt'), t('fundo-2'), 0.14));

  /* --- legenda da faixa: branco sobre a máscara (pior caso: foto branca) --- */
  checa('legenda de foto / máscara 92% sobre branco', WHITE, over(t('fundo'), WHITE, 0.92));

  /* --- números da contagem sobre --super --- */
  checa('números da contagem sobre --super', WHITE, t('super'));

  /* --- foco visível (componente, 3:1) --- */
  checa('anel de foco roxo-txt / --fundo (UI)', t('roxo-txt'), t('fundo'), UI);
  checa('anel de foco roxo-txt / --super (UI)', t('roxo-txt'), t('super'), UI);

  /* --- bordas/decoração (3:1) --- */
  checa('borda do card / --super (UI)', t('roxo-txt'), t('super'), UI);
}

console.log('✔ OK (' + ok.length + ')');
ok.forEach(m => console.log('   + ' + m));
console.log('\n✖ PROBLEMAS (' + problems.length + ')');
problems.forEach(m => console.log('   - ' + m));
process.exit(problems.length ? 1 : 0);
