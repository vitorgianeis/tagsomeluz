/* ============================================================
   runtimetest.js — checagens de comportamento do site ATUAL.
   Carrega index.html no jsdom, executa o <script> referenciado
   pelo HTML e verifica o que ele precisa fazer de verdade.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const jsRef = (html.match(/<script[^>]*src="([^"]+\.js)"[^>]*>/) || [])[1] || 'js/script.js';
const js = fs.readFileSync(path.join(root, jsRef), 'utf8');

const problems = [];
const ok = [];
const assert = (cond, msg) => (cond ? ok.push(msg) : problems.push(msg));

/* virtualConsole: erros de JS não tratados.
   O jsdom não implementa pause()/load() de <video> e avisa por jsdomError —
   é lacuna da ferramenta, não bug do site: filtramos só isso. */
const vc = new VirtualConsole();
const jsErrors = [];
const isMediaGap = m => /Not implemented: HTMLMediaElement/.test(m);
vc.on('jsdomError', e => { if (!isMediaGap(e.message)) jsErrors.push(e.message); });
vc.on('error', (...a) => jsErrors.push(a.join(' ')));

const DEADLINE = '2026-11-29T09:00:00-03:00';
// relógio congelado 2 dias, 5h, 30min e 15s antes da feira
const FAKE_NOW = Date.parse('2026-11-27T03:29:45-03:00');

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  url: 'http://127.0.0.1:8765/tagsomeluz/',
  pretendToBeVisual: true,
  virtualConsole: vc
});

const { window } = dom;
const { document } = window;

/* jsdom não rola a página: registramos as chamadas de scrollTo */
const scrollCalls = [];
window.scrollTo = (opts) => { scrollCalls.push(opts); };
window.scrollY = 0;

/* jsdom não faz layout: damos posições fixas por id
   (navbar fixa = 70px; as seções começam em 0/800/1600) */
const ID_TOP = { home: 0, sobre: 800, servicos: 1600 };
Object.defineProperty(window.HTMLElement.prototype, 'offsetTop', {
  get() { return Object.prototype.hasOwnProperty.call(ID_TOP, this.id) ? ID_TOP[this.id] : 0; },
  configurable: true
});
Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', {
  get() { return this.id === 'navbar' ? 70 : 500; },
  configurable: true
});
window.HTMLElement.prototype.getBoundingClientRect = function () {
  const top = Object.prototype.hasOwnProperty.call(ID_TOP, this.id) ? ID_TOP[this.id] : 0;
  return { top, bottom: top + 500, left: 0, right: 1200, width: 1200, height: 500, x: 0, y: top };
};

/* relógio congelado enquanto o script roda (contagem regressiva) */
window.Date.now = () => FAKE_NOW;

try {
  window.eval(js);
  assert(true, `${jsRef} executou sem estourar`);
} catch (e) {
  problems.push(`${jsRef} lançou exceção: ${e.message}`);
}
window.Date.now = Date.now;

/* ---------- 1. sem JS quebrado ---------- */
assert(jsErrors.length === 0, 'nenhum erro de JS durante a carga' + (jsErrors.length ? ' → ' + jsErrors.join(' | ') : ''));

/* ---------- 2. ano do rodapé ---------- */
assert(document.getElementById('year').textContent === String(new Date().getFullYear()), 'ano do rodapé atualizado');

/* ---------- 3. menu mobile ---------- */
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.click();
assert(navLinks.classList.contains('active'), 'menu abre (classe .active)');
assert(hamburger.getAttribute('aria-expanded') === 'true', 'hambúrguer com aria-expanded=true ao abrir');
assert(document.body.style.overflow === 'hidden', 'rolagem do fundo travada com menu aberto');

navLinks.querySelector('.fechar').click();
assert(!navLinks.classList.contains('active'), 'menu fecha pelo X');
assert(hamburger.getAttribute('aria-expanded') === 'false', 'aria-expanded volta pra false');
assert(document.body.style.overflow === '', 'rolagem liberada ao fechar');

hamburger.click();
document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
assert(!navLinks.classList.contains('active'), 'menu fecha com Esc');

/* ---------- 4. rolagem suave com desconto da navbar fixa ---------- */
scrollCalls.length = 0;
const navSobre = document.querySelector('.nav-links a[href="#sobre"]');
navSobre.click();
assert(scrollCalls.length === 1, 'clicar em "Sobre" rola a página');
assert(scrollCalls[0] && scrollCalls[0].top === 800 - 70 - 20, `topo da rolagem desconta a navbar (${scrollCalls[0] && scrollCalls[0].top}, esperado 710)`);
assert(scrollCalls[0] && scrollCalls[0].behavior === 'smooth', 'rolagem com behavior=smooth');

/* link do rodapé também rola */
scrollCalls.length = 0;
const footFeira = document.querySelector('.footer-links a[href="#feira"]');
assert(!!footFeira, 'rodapé tem link pra #feira');
footFeira.click();
assert(scrollCalls.length === 1, 'link do rodapé também rola a página');

/* ---------- 5. nenhum link interno quebrado ---------- */
const anchors = [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href'));
const broken = anchors.filter(h => h !== '#' && !document.getElementById(h.slice(1)));
assert(broken.length === 0, `todas as ${anchors.length} âncoras internas resolvem no DOM`);

/* ---------- 6. serviços: abrem, fecham e são acessíveis ---------- */
const items = [...document.querySelectorAll('.svc-item')];
const btns = [...document.querySelectorAll('.svc-btn')];
assert(items.length === 6, `6 serviços na página (${items.length})`);
assert(btns.length === 6, 'um botão por serviço');
assert(btns.every(b => b.getAttribute('role') === 'button' && b.getAttribute('tabindex') === '0'),
  'todo serviço acessível por teclado (role=button + tabindex)');
assert(btns.every(b => {
  const alvo = b.getAttribute('aria-controls');
  return alvo && document.getElementById(alvo);
}), 'aria-controls resolve pra painel existente');
assert(btns.every(b => b.getAttribute('aria-expanded') === 'false'), 'todos os serviços começam fechados');

/* clique abre só aquele */
const btnSom = document.getElementById('som').querySelector('.svc-btn');
btnSom.click();
assert(document.getElementById('som').classList.contains('open'), 'clique abre o serviço');
assert(btnSom.getAttribute('aria-expanded') === 'true', 'aria-expanded=true com aberto');
assert(!document.getElementById('iluminacao').classList.contains('open'), 'abrir um não abre os outros');

/* Enter alterna (teclado) */
const btnIlum = document.getElementById('iluminacao').querySelector('.svc-btn');
btnIlum.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
assert(document.getElementById('iluminacao').classList.contains('open'), 'Enter abre o serviço');
btnIlum.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
assert(!document.getElementById('iluminacao').classList.contains('open'), 'Enter fecha de novo');

/* conteúdo dos painéis */
let comLista = 0, comGaleria = 0, comTitulo = 0, comCta = 0, ctaErrado = 0;
items.forEach(it => {
  const p = it.querySelector('.svc-painel');
  if (!p) return;
  if (it.querySelector('h3')) comTitulo++;
  const lis = p.querySelectorAll('ul.lista li');
  if (lis.length >= 2) comLista++;
  if (p.querySelector('.svc-fotos img, .svc-fotos video')) comGaleria++;
  const zap = p.querySelector('a[href*="wa.me/"]');
  if (zap) {
    comCta++;
    if (!/wa\.me\/5516981719596/.test(zap.getAttribute('href'))) ctaErrado++;
  }
});
assert(comTitulo === 6, 'todo painel tem título próprio');
assert(comLista === 6, 'todo painel lista os equipamentos');
assert(comGaleria === 6, 'todo painel tem galeria de fotos/vídeos');
assert(ctaErrado === 0, `CTA de painel (quando existe) aponta pro WhatsApp certo — ${comCta} painel(es)`);
assert(/wa\.me\/5516981719596/.test(document.querySelector('.hero-ctas .btn').getAttribute('href')),
  'primeiro botão do hero é o WhatsApp da TAG');

/* link de serviço no rodapé: abre o painel (não só rola) */
scrollCalls.length = 0;
const linkDj = document.querySelector('.footer-links a[href="#dj"]');
assert(!!linkDj, 'rodapé tem link direto pro serviço #dj');
linkDj.click();
assert(document.getElementById('dj').classList.contains('open'), 'link de serviço abre o painel dele');
assert(scrollCalls.length === 1, 'e também rola até o serviço');

/* ---------- 7. painel de LED: 12 vídeos carregam ao abrir, liberam ao fechar ---------- */
const ledPanel = document.getElementById('p-led');
const videos = [...ledPanel.querySelectorAll('video')];
assert(videos.length === 12, `painel de LED com 12 vídeos (${videos.length})`);
assert(videos.every(v => !v.getAttribute('src')), 'nenhum vídeo baixado antes de abrir');
assert(videos.every(v => v.getAttribute('preload') === 'none'), 'todo vídeo com preload=none');
assert(videos.every(v => (v.getAttribute('poster') || '').startsWith('assets/poster/')),
  'todo vídeo com poster local');

const btnLed = document.getElementById('led').querySelector('.svc-btn');
btnLed.click();
assert(videos.every(v => v.getAttribute('src') === v.dataset.src), 'abrir o LED carrega os 12 vídeos (data-src → src)');
btnLed.click();
assert(videos.every(v => !v.getAttribute('src')), 'fechar o LED descarrega os vídeos (memória liberada)');

/* vídeos nunca ficam soltos na página */
const soltos = [...document.querySelectorAll('video')].filter(v => !v.closest('.svc-painel'));
assert(soltos.length === 0, 'nenhum <video> fora de painel');

/* ---------- 8. navbar com fundo + voltar ao topo ---------- */
const navbar = document.getElementById('navbar');
const st = document.getElementById('scrollTop');
assert(!navbar.classList.contains('scrolled'), 'navbar começa transparente');
window.scrollY = 600;   // abaixo de 500px o botão topo não aparece
window.dispatchEvent(new window.Event('scroll'));
assert(navbar.classList.contains('scrolled'), 'navbar ganha fundo ao rolar');
assert(st.classList.contains('visible'), 'botão voltar ao topo aparece depois de rolar');
scrollCalls.length = 0;
st.click();
assert(scrollCalls.length === 1 && scrollCalls[0].top === 0, 'voltar ao topo rola pro início');

window.scrollY = 0;
window.dispatchEvent(new window.Event('scroll'));
assert(!navbar.classList.contains('scrolled'), 'navbar volta a ficar transparente no topo');
assert(!st.classList.contains('visible'), 'botão topo some no topo da página');

/* ---------- 9. seção da feira ---------- */
const feira = document.getElementById('feira');
assert(!!feira, 'seção #feira existe');
const feiraTxt = feira.textContent;
['Feira Celebrar e Casar', '29 de novembro de 2026', '9h às 21h', 'A Casa Garcia', 'Gratuita']
  .forEach(t => assert(feiraTxt.includes(t), `feira traz "${t}"`));

/* ---------- 10. contagem regressiva ---------- */
const countdown = document.getElementById('countdown');
assert(!!countdown, '#countdown existe');
assert(countdown.getAttribute('data-deadline') === DEADLINE, 'countdown com data-limite declarada');
const unit = u => (countdown.querySelector(`[data-unit="${u}"]`) || {}).textContent;
assert(unit('days') === '2', `contagem: dias = ${unit('days')} (esperado 2)`);
assert(unit('hours') === '05', `contagem: horas = ${unit('hours')} (esperado 05)`);
assert(unit('minutes') === '30', `contagem: minutos = ${unit('minutes')} (esperado 30)`);
assert(unit('seconds') === '15', `contagem: segundos = ${unit('seconds')} (esperado 15)`);
assert(!countdown.classList.contains('is-past'), 'evento ainda não passou (sem .is-past)');
assert(Date.parse(DEADLINE) > Date.now(), 'a data da feira ainda está no futuro');

/* ---------- 11. posters dos 12 vídeos ---------- */
const posters = [...html.matchAll(/poster="([^"]+)"/g)].map(m => m[1]);
assert(posters.length === 12, `12 posters declarados (${posters.length})`);
assert(posters.every(p => p.startsWith('assets/poster/')), 'todos os posters em assets/poster/');

/* ---------- 12. sprite íntegro ---------- */
const symbols = new Set([...html.matchAll(/<symbol id="([^"]+)"/g)].map(m => m[1]));
const uses = [...new Set([...html.matchAll(/<use href="#([^"]+)"/g)].map(m => m[1]))];
const brokenUse = uses.filter(u => !symbols.has(u));
assert(brokenUse.length === 0, `<use> sem symbol: ${brokenUse.length} (${uses.length} usos / ${symbols.size} símbolos)`);

/* ---------- 12b. FAQ ---------- */
const faqs = [...document.querySelectorAll('details.faq-card')];
assert(faqs.length === 4, `4 perguntas no FAQ (${faqs.length})`);
assert(faqs.every(d => d.querySelector('summary') === d.firstElementChild),
  'summary é o 1º filho de todo <details> (HTML válido)');
assert(faqs.every(d => d.querySelector('summary .q')), 'toda pergunta tem título clicável');
assert(!!document.querySelector('.faq-zap'), 'card "Não achou o que precisava?" presente');

/* ---------- 13. sujeira que não pode voltar ---------- */
assert(!/class="loader"|id="loader"/.test(html), 'sem loader');
assert(!/class="tbd"/.test(html), 'sem dado pendente marcado');
assert(!/font-awesome|fontawesome|cdnjs/i.test(html.replace(/<!--[\s\S]*?-->/g, '')), 'sem Font Awesome via CDN');
assert(!/<i class="fa-/.test(html), 'sem <i> do Font Awesome');
assert(!/unsplash|images\.pexels/i.test(html), 'sem imagem de terceiro');

/* ---------- 14. links externos seguros ---------- */
const blanks = [...document.querySelectorAll('a[target="_blank"]')];
const semNoopener = blanks.filter(a => !/noopener/.test(a.rel || ''));
assert(semNoopener.length === 0, `target=_blank com rel=noopener (${blanks.length} links)`);

console.log('✔ OK (' + ok.length + ')');
ok.forEach(t => console.log('   + ' + t));
console.log('\n✖ PROBLEMAS (' + problems.length + ')');
problems.forEach(t => console.log('   - ' + t));

process.exit(problems.length ? 1 : 0);
