const fs = require('fs');
const { JSDOM } = require('jsdom');

const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(`${root}/index.html`, 'utf8');
const js = fs.readFileSync(`${root}/js/script.js`, 'utf8');

const problems = [];
const ok = [];
const assert = (cond, msg) => (cond ? ok.push(msg) : problems.push(msg));

// virtualConsole para capturar erros não capturados
const { VirtualConsole } = require('jsdom');
const vc = new VirtualConsole();
const jsErrors = [];
vc.on('jsdomError', e => jsErrors.push(e.message));
vc.on('error', (...a) => jsErrors.push(a.join(' ')));

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  url: 'http://127.0.0.1:8765/tagsomeluz/',
  pretendToBeVisual: true,
  virtualConsole: vc
});

const { window } = dom;
const { document } = window;

// jsdom não implementa scrollTo — registramos as chamadas
const scrollCalls = [];
window.scrollTo = (opts) => { scrollCalls.push(opts); };
window.scrollY = 0;

// jsdom não faz layout: simulamos posições para testar o offset de rolagem
Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', {
  get() { return this.id === 'navbar' ? 70 : 500; },
  configurable: true
});
Object.defineProperty(window.HTMLElement.prototype, 'offsetTop', {
  get() { return { home: 0, sobre: 800, servicos: 1600 }[this.id] || 0; },
  configurable: true
});
window.HTMLElement.prototype.getBoundingClientRect = function () {
  const top = { home: 0, sobre: 800, servicos: 1600, som: 1700 }[this.id] || 0;
  return { top, bottom: top + 400, left: 0, right: 800, width: 800, height: 400, x: 0, y: top };
};

// Relógio mockado ANTES de rodar o script: o tick() do countdown
// executa na avaliação e não pode ser reexecutado depois.
// O window.eval roda no realm do jsdom, então o mock tem que valer para
// window.Date.now — não basta trocar o Date.now do Node.
const DEADLINE = Date.parse('2026-11-29T09:00:00-03:00');
const OFFSET = ((2 * 24 + 5) * 3600 + 30 * 60 + 15) * 1000; // 2d 5h 30m 15s
const REAL_NOW = Date.now();   // instante real, capturado como número
const nodeNow = Date.now;      // função original, para restaurar
const winNow = window.Date.now;

// Roda o script real
try {
  window.Date.now = () => DEADLINE - OFFSET;
  Date.now = () => DEADLINE - OFFSET;
  window.eval(js);
  assert(jsErrors.length === 0, 'script.js roda sem erro' + (jsErrors.length ? ' -> ' + jsErrors.join(' | ') : ''));
} catch (e) {
  problems.push('script.js lançou exceção: ' + e.message);
}
window.Date.now = winNow; // devolve o relógio real o quanto antes
Date.now = nodeNow;

// --- ano dinâmico ---
const year = document.getElementById('year');
assert(year && year.textContent === String(new Date().getFullYear()),
  `ano do rodapé dinâmico (${year && year.textContent})`);

// --- menu mobile ---
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.dispatchEvent(new window.Event('click', { bubbles: true }));
assert(navLinks.classList.contains('active'), 'hambúrguer abre o menu');
assert(hamburger.getAttribute('aria-expanded') === 'true', 'hambúrguer atualiza aria-expanded');
hamburger.dispatchEvent(new window.Event('click', { bubbles: true }));
assert(!navLinks.classList.contains('active'), 'hambúrguer fecha o menu');
assert(hamburger.getAttribute('aria-expanded') === 'false', 'aria-expanded volta para false');

// --- clique em link fecha o menu ---
hamburger.dispatchEvent(new window.Event('click', { bubbles: true }));
const sobreLink = document.querySelector('.nav-links a[href="#sobre"]');
sobreLink.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
assert(!navLinks.classList.contains('active'), 'clicar num link fecha o menu mobile');

// --- âncora rola com offset da navbar (não pode ficar atrás da barra fixa) ---
const last = scrollCalls[scrollCalls.length - 1];
assert(last && last.top === 800 - 70 - 20,
  `rolagem respeita a navbar fixa (top=${last && last.top}, esperado 710)`);
assert(last && last.behavior === 'smooth', 'rolagem suave');

// --- TODOS os links do menu/rodapé levam a um destino real ---
const anchors = [...document.querySelectorAll('a[href^="#"]')]
  .map(a => a.getAttribute('href'))
  .filter(h => h !== '#');
const broken = [...new Set(anchors)].filter(h => !document.getElementById(h.slice(1)));
assert(broken.length === 0,
  `nenhum link interno quebrado (testados ${new Set(anchors).size})` +
  (broken.length ? ' -> faltando: ' + broken.join(', ') : ''));

// --- modal: fecha por padrão e NÃO carrega vídeo ---
const modal = document.getElementById('serviceModal');
assert(modal.hasAttribute('hidden'), 'modal começa oculto (hidden)');
const videos = [...modal.querySelectorAll('video')];
assert(videos.length === 12, `12 vídeos no modal (achados: ${videos.length})`);
assert(videos.every(v => !v.getAttribute('src')), 'nenhum vídeo carregado antes de abrir (0 de 39MB baixados)');
const panels = [...modal.querySelectorAll('.svc-panel')];
assert(panels.length === 6, `6 painéis de serviço (achados: ${panels.length})`);
assert(panels.every(p => p.hidden), 'todos os painéis começam ocultos');
assert(modal.querySelectorAll('.svc-panel img[data-src]').length === 20,
  `20 fotos na galeria dos painéis (${modal.querySelectorAll('.svc-panel img[data-src]').length})`);

// --- abre pelo link #led (menu e rodapé) ---
document.querySelector('.footer-links a[href="#led"]')
  .dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
assert(!modal.hasAttribute('hidden') && modal.classList.contains('active'), 'link "Painel de LED" abre o modal');
assert(!modal.querySelector('.svc-panel[data-panel="led"]').hidden, 'painel do LED fica visível');
assert(modal.querySelector('.svc-panel[data-panel="som"]').hidden, 'os outros painéis continuam ocultos');
assert(videos.every(v => v.getAttribute('src')), 'abrir o modal carrega os 12 vídeos');
assert(document.body.style.overflow === 'hidden', 'rolagem do body travada com o modal aberto');
assert(document.activeElement === modal.querySelector('.svc-modal-close'), 'foco vai para o botão fechar');
assert(modal.getAttribute('aria-labelledby') === 'svc-panel-led-title', 'aria-labelledby aponta pro título do painel aberto');

// --- fecha com Escape ---
document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
assert(modal.hasAttribute('hidden'), 'Escape fecha o modal');
assert(videos.every(v => !v.getAttribute('src')), 'fechar libera a memória dos vídeos');
assert(document.body.style.overflow === '', 'rolagem do body destravada');

// --- abre pelo card e fecha pelo X ---
const ledCard = document.querySelector('[data-open-service="led"]');
ledCard.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(!modal.hasAttribute('hidden'), 'card "Painel de LED" abre o modal');
modal.querySelector('.svc-modal-close').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(modal.hasAttribute('hidden'), 'botão X fecha o modal');

// --- TODOS os cards abrem o modal, cada um com o seu painel ---
const serviceCards = [...document.querySelectorAll('[data-open-service]')];
assert(serviceCards.length === 6, `6 cards de serviço clicáveis (achados: ${serviceCards.length})`);
for (const card of serviceCards) {
  const key = card.dataset.openService;
  const panel = modal.querySelector(`.svc-panel[data-panel="${key}"]`);
  card.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert(!modal.hasAttribute('hidden') && panel && !panel.hidden,
    `card "${key}" abre o painel ${key}`);
  assert(modal.querySelectorAll('.svc-panel:not([hidden])').length === 1,
    `só o painel ${key} fica visível`);
  assert(modal.getAttribute('aria-labelledby') === `svc-panel-${key}-title`,
    `aria-labelledby do painel ${key}`);
  if (key !== 'led') {
    const media = [...panel.querySelectorAll('[data-src]')];
    assert(media.length > 0 && media.every(m => m.getAttribute('src')),
      `painel ${key} carrega a própria galeria (${media.length} itens)`);
    assert(videos.every(v => !v.getAttribute('src')),
      `painel ${key} não carrega os vídeos do LED`);
  }
  const list = panel.querySelector('.svc-list');
  assert(list && list.querySelectorAll('li').length >= 4,
    `painel ${key} lista os tipos de equipamento`);
  modal.querySelector('.svc-modal-close').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const after = [...panel.querySelectorAll('[data-src]')];
  assert(after.every(m => !m.getAttribute('src')),
    `fechar libera a mídia do painel ${key}`);
}

// --- card acessível por teclado ---
const kd = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
ledCard.dispatchEvent(kd);
assert(!modal.hasAttribute('hidden') && kd.defaultPrevented, 'card abre com Enter (teclado)');
document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

// --- link de serviço no menu/rodapé abre o modal em vez de rolar ---
const somLink = document.querySelector('.dropdown a[href="#som"]');
const scrollCountBefore = scrollCalls.length;
somLink.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
assert(!modal.hasAttribute('hidden') && !modal.querySelector('.svc-panel[data-panel="som"]').hidden,
  'link "#som" do menu abre o painel de som');
assert(scrollCalls.length === scrollCountBefore, 'link de serviço não rola a página (abre o modal)');
document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

// --- fecha clicando fora ---
ledCard.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
modal.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(modal.hasAttribute('hidden'), 'clique fora do conteúdo fecha o modal');

// --- botão voltar ao topo ---
const st = document.getElementById('scrollTop');
window.scrollY = 600;
window.dispatchEvent(new window.Event('scroll'));
assert(st.classList.contains('visible'), 'botão "voltar ao topo" aparece após rolar');
st.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(scrollCalls.some(c => c.top === 0), 'botão "voltar ao topo" rola para o topo');

// --- navbar ganha fundo ao rolar ---
window.dispatchEvent(new window.Event('scroll'));
assert(document.getElementById('navbar').classList.contains('scrolled'), 'navbar ganha fundo ao rolar');

// --- CTA de conversão no hero ---
const heroBtns = [...document.querySelectorAll('.hero-buttons a')];
assert(heroBtns.length === 4, `hero com 4 botões (achados: ${heroBtns.length})`);
assert(heroBtns[0].getAttribute('href').startsWith('https://wa.me/'),
  `CTA do orçamento é o 1º botão (${heroBtns[0].getAttribute('href').slice(0, 30)}…)`);
assert(/orçamento/i.test(heroBtns[0].textContent), 'CTA diz "Peça seu orçamento"');
assert(heroBtns[0].rel === 'noopener' && heroBtns[0].target === '_blank', 'CTA com rel=noopener');

// --- sprite de ícones ---
const symbols = document.querySelectorAll('symbol[id^="i-"]');
const uses = document.querySelectorAll('use[href^="#i-"]');
const ids = new Set([...symbols].map(s => s.id));
const brokenUse = [...new Set([...uses].map(u => u.getAttribute('href').slice(1)))].filter(h => !ids.has(h));
assert(symbols.length === 16, `16 symbols no sprite (achados: ${symbols.length})`);
assert(uses.length === 37, `37 usos de ícone (achados: ${uses.length})`);
assert(brokenUse.length === 0, 'nenhum <use> apontando pra symbol inexistente' + (brokenUse.length ? ' -> ' + brokenUse : ''));
assert(document.querySelectorAll('i[class*="fa-"]').length === 0, 'nenhum <i> do Font Awesome sobrou');

// --- loader removido ---
assert(!document.getElementById('loader'), 'loader não existe mais');
assert(document.querySelectorAll('[class*="loader"]').length === 0, 'nenhum elemento de loader no DOM');

// --- seção da feira ---
const fair = document.getElementById('feira');
assert(!!fair, 'seção #feira existe');
assert(!!document.querySelector('.nav-links a[href="#feira"]'), 'menu tem link pra Feira');
assert(!!document.querySelector('.footer-links a[href="#feira"]'), 'rodapé tem link pra Feira');
const fairText = fair ? fair.textContent : '';
assert(/Celebrar e Casar/.test(fairText), 'nome da feira correto');
assert(/29 de novembro de 2026/.test(fairText), 'data da feira correta');
assert(/9h às 21h/.test(fairText), 'horário da feira correto');
assert(/A Casa Garcia/.test(fairText), 'local da feira correto');
assert(/Gratuita/.test(fairText), 'informa entrada gratuita');

// --- contagem regressiva (relógio já mockado antes do eval) ---
assert(!isNaN(DEADLINE), 'data-limite é válida');
assert(DEADLINE > REAL_NOW, 'a feira ainda não passou');
const cd = document.getElementById('countdown');
assert(!!cd, 'elemento do countdown existe');
const u = n => (cd.querySelector(`[data-unit="${n}"]`) || {}).textContent;
assert(u('days') === '2', `countdown dias = ${u('days')} (esperado 2)`);
assert(u('hours') === '05', `countdown horas = ${u('hours')} (esperado 05)`);
assert(u('minutes') === '30', `countdown minutos = ${u('minutes')} (esperado 30)`);
assert(u('seconds') === '15', `countdown segundos = ${u('seconds')} (esperado 15)`);
assert(!cd.classList.contains('is-past'), 'não marca como encerrado antes da hora');

// --- posters e sprite ---
const posterEls = [...document.querySelectorAll('video[poster]')];
assert(posterEls.length === 12, `12 vídeos com poster (achados: ${posterEls.length})`);
assert(posterEls.every(v => /^assets\/poster\/video\d+\.jpg$/.test(v.getAttribute('poster'))),
  'todos os posters apontam pra assets/poster/');

// --- nenhum marcador de dado pendente sobrou (CNPJ, endereço, CEP preenchidos) ---
const tbds = document.querySelectorAll('.tbd');
assert(tbds.length === 0, `nenhum marcador de dado pendente no HTML (achados: ${tbds.length})`);

// --- resumo ---
console.log('✔ OK (' + ok.length + ')');
ok.forEach(t => console.log('   + ' + t));
console.log('\n✖ PROBLEMAS (' + problems.length + ')');
problems.forEach(t => console.log('   - ' + t));
process.exit(problems.length ? 1 : 0);
