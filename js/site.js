/* ============================================================
   TAG Som e Luz — site.js
   Carregado com defer: o DOM já está pronto quando roda.

   ATENÇÃO: este é o script do site ATUAL (index.html).
   O script original está preservado em js/script.js, usado
   apenas por index1.html.
   ============================================================ */
(function () {
  'use strict';

  var navbar = document.getElementById('navbar');
  var scrollTopBtn = document.getElementById('scrollTop');
  var SERVICE_KEYS = ['som', 'iluminacao', 'led', 'video', 'dj', 'estrutura'];

  /* ---------- rolagem: navbar ganha fundo + botão voltar ao topo ---------- */
  function onScroll() {
    var y = window.scrollY || window.pageYOffset || 0;
    if (navbar) navbar.classList.toggle('scrolled', y > 50);
    if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', y > 500);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- menu mobile (tela cheia) ---------- */
  var hamburger = document.getElementById('hamburger');
  var navLinks = document.getElementById('navLinks');
  var fecharMenu = document.getElementById('fecharMenu');

  function fechaMenu() {
    if (!navLinks || !navLinks.classList.contains('active')) return;
    navLinks.classList.remove('active');
    document.body.style.overflow = '';
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
  }

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      var aberto = navLinks.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      document.body.style.overflow = aberto ? 'hidden' : '';
      if (aberto && fecharMenu) fecharMenu.focus();
    });
    if (fecharMenu) fecharMenu.addEventListener('click', fechaMenu);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') fechaMenu();
    });
  }

  /* ---------- serviços: linhas que abrem (e liberam a mídia ao fechar) ---------- */
  function painelDe(item) { return item ? item.querySelector('.svc-painel') : null; }

  function carregarMidias(painel) {
    if (!painel) return;
    painel.querySelectorAll('[data-src]').forEach(function (el) {
      if (!el.getAttribute('src')) el.setAttribute('src', el.dataset.src);
    });
  }

  function liberarMidias(painel) {
    if (!painel) return;
    painel.querySelectorAll('[data-src]').forEach(function (el) {
      if (el.tagName === 'VIDEO') {
        try { el.pause(); } catch (e) { /* jsdom/autoplay */ }
        el.removeAttribute('src');
        try { el.load(); } catch (e) { /* libera a memória dos 12 vídeos */ }
      } else {
        el.removeAttribute('src');
      }
    });
  }

  function abrirServico(id, rolar) {
    var item = document.getElementById(id);
    if (!item) return;
    item.classList.add('open');
    var btn = item.querySelector('.svc-btn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    carregarMidias(painelDe(item));
    if (rolar) rolagemPara(item);
  }

  document.querySelectorAll('.svc-btn').forEach(function (btn) {
    function alterna() {
      var item = btn.closest('.svc-item');
      if (!item) return;
      var aberto = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      if (aberto) carregarMidias(painelDe(item));
      else liberarMidias(painelDe(item));
    }
    btn.addEventListener('click', alterna);
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        alterna();
      }
    });
  });

  /* ---------- rolagem suave respeitando a navbar fixa ---------- */
  function rolagemPara(el) {
    if (!el) return false;
    var navH = (navbar && navbar.offsetHeight) || 70;
    window.scrollTo({
      top: Math.max(0, el.getBoundingClientRect().top + (window.scrollY || 0) - navH - 20),
      behavior: 'smooth'
    });
    return true;
  }

  document.addEventListener('click', function (e) {
    var anchor = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!anchor) return;

    var href = anchor.getAttribute('href');
    if (!href || href === '#') return;

    e.preventDefault();
    fechaMenu();

    var id = href.slice(1);
    var alvo = document.getElementById(id);

    if (!alvo) {
      // âncora inexistente não pode deixar a URL quebrada
      if (history.replaceState) history.replaceState(null, '', window.location.pathname);
      return;
    }

    // link de serviço (#som, #led, ...) abre o painel em vez de só rolar
    if (SERVICE_KEYS.indexOf(id) !== -1) abrirServico(id, true);
    else rolagemPara(alvo);
  });

  // página aberta direto com hash (ex.: /tagsomeluz/#led)
  function trataHash() {
    var id = (location.hash || '').slice(1);
    if (!id) return;
    if (SERVICE_KEYS.indexOf(id) !== -1) abrirServico(id, true);
    else rolagemPara(document.getElementById(id));
  }
  window.addEventListener('hashchange', trataHash);
  trataHash();

  /* ---------- item de menu ativo conforme a rolagem ---------- */
  var secoes = document.querySelectorAll('section[id], header.hero[id]');
  var itensNav = document.querySelectorAll('.nav-links a[href^="#"]');
  var ticking = false;

  function atualizaNav() {
    var pos = (window.scrollY || window.pageYOffset || 0) + 120;
    var atual = '';
    secoes.forEach(function (s) {
      var topo = s.offsetTop;
      if (pos >= topo && pos < topo + s.offsetHeight) atual = s.id;
    });
    itensNav.forEach(function (item) {
      var href = (item.getAttribute('href') || '').replace('#', '');
      item.classList.toggle('active', href === atual);
    });
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(atualizaNav);
    }
  }, { passive: true });
  atualizaNav();

  /* ---------- slides do hero (contador 01/03) ---------- */
  var slides = document.querySelectorAll('.slide');
  var slideNum = document.getElementById('slideNum');
  var atual = 0;

  if (slides.length > 1) {
    setInterval(function () {
      slides[atual].classList.remove('on');
      atual = (atual + 1) % slides.length;
      slides[atual].classList.add('on');
      if (slideNum) slideNum.textContent = atual + 1 < 10 ? '0' + (atual + 1) : String(atual + 1);
    }, 5000);
  }

  /* ---------- revelar ao rolar ---------- */
  var itens = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    itens.forEach(function (el) { io.observe(el); });
  } else {
    itens.forEach(function (el) { el.classList.add('on'); });
  }

  /* ---------- contagem regressiva da feira ---------- */
  var countdown = document.getElementById('countdown');
  if (countdown) {
    var deadline = Date.parse(countdown.getAttribute('data-deadline'));
    var units = {
      days: countdown.querySelector('[data-unit="days"]'),
      hours: countdown.querySelector('[data-unit="hours"]'),
      minutes: countdown.querySelector('[data-unit="minutes"]'),
      seconds: countdown.querySelector('[data-unit="seconds"]')
    };
    var timer = null;

    function pad(n) { return n < 10 ? '0' + n : String(n); }

    function tick() {
      var diff = deadline - Date.now();

      if (isNaN(deadline) || diff <= 0) {
        clearInterval(timer);
        timer = null;
        countdown.classList.add('is-past');
        units.days.textContent = '00';
        units.hours.textContent = '00';
        units.minutes.textContent = '00';
        units.seconds.textContent = '00';
        return;
      }

      var s = Math.floor(diff / 1000);
      units.days.textContent = String(Math.floor(s / 86400));
      units.hours.textContent = pad(Math.floor((s % 86400) / 3600));
      units.minutes.textContent = pad(Math.floor((s % 3600) / 60));
      units.seconds.textContent = pad(s % 60);
    }

    tick();
    timer = setInterval(tick, 1000);
  }

  /* ---------- ano do rodapé ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
