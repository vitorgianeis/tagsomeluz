/* ============================================================
   TAG Som e Luz — script.js
   Carregado com defer: o DOM já está pronto quando roda.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Navbar com fundo ao rolar ---------- */
  var navbar = document.getElementById('navbar');
  var scrollTopBtn = document.getElementById('scrollTop');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;

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

  /* ---------- Menu mobile ---------- */
  var hamburger = document.getElementById('hamburger');
  var navLinks = document.getElementById('navLinks');

  function closeMenu() {
    if (hamburger) {
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    }
    if (navLinks) navLinks.classList.remove('active');
  }

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      var open = navLinks.classList.toggle('active');
      hamburger.classList.toggle('active', open);
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }

  // Submenu: no mobile, o primeiro toque abre o submenu em vez de navegar
  document.querySelectorAll('.has-dropdown').forEach(function (item) {
    item.addEventListener('click', function (e) {
      if (window.innerWidth <= 768 && !e.target.closest('.dropdown')) {
        e.preventDefault();
        this.classList.toggle('active');
      }
    });
  });

  /* ---------- Modal Painel de LED ---------- */
  var modal = document.getElementById('ledModal');
  var lastFocused = null;

  function loadVideos() {
    if (!modal) return;
    modal.querySelectorAll('video[data-src]').forEach(function (v) {
      if (!v.getAttribute('src')) {
        v.src = v.dataset.src;
      }
    });
  }

  function unloadVideos() {
    if (!modal) return;
    modal.querySelectorAll('video').forEach(function (v) {
      v.pause();
      v.removeAttribute('src');
      v.load(); // libera a memória dos 12 vídeos
    });
  }

  function openLEDModal() {
    if (!modal) return;
    lastFocused = document.activeElement;
    loadVideos();
    modal.hidden = false;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    var closeBtn = modal.querySelector('.led-modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeLEDModal() {
    if (!modal || modal.hidden) return;
    modal.classList.remove('active');
    modal.hidden = true;
    document.body.style.overflow = '';
    unloadVideos();
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  // Card de serviço clicável (mouse e teclado)
  var ledTrigger = document.querySelector('[data-open-led]');
  if (ledTrigger) {
    ledTrigger.addEventListener('click', openLEDModal);
    ledTrigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLEDModal();
      }
    });
  }

  if (modal) {
    var closeBtn = modal.querySelector('.led-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeLEDModal);

    // Fechar clicando fora do conteúdo
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeLEDModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeLEDModal();
    });
  }

  /* ---------- Rolagem suave para âncoras ---------- */
  function scrollToId(id) {
    var target = document.getElementById(id);
    if (!target) return false;
    // || 70 cobre o caso da navbar não conseguir medir a altura
    var navH = (navbar && navbar.offsetHeight) || 70;
    window.scrollTo({
      top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - navH - 20),
      behavior: 'smooth'
    });
    return true;
  }

  document.addEventListener('click', function (e) {
    var anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    var href = anchor.getAttribute('href');
    if (!href || href === '#') return;

    e.preventDefault();

    // "Painel de LED" abre o modal em vez de rolar
    if (href === '#led') {
      closeMenu();
      openLEDModal();
      return;
    }

    var id = href.slice(1);
    if (href === '#conteudo') {
      // âncora do link "pular para o conteúdo": foca sem animação
      var el = document.getElementById(id);
      if (el) {
        el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
      }
    }

    closeMenu();
    scrollToId(id);

    // Âncora inexistente não pode deixar a URL quebrada
    if (!document.getElementById(id)) {
      history.replaceState(null, '', window.location.pathname);
    }
  });

  // Âncora ao abrir a página direto (ex.: /tagsomeluz/#som)
  window.addEventListener('load', function () {
    if (location.hash && location.hash !== '#') {
      var id = location.hash.slice(1);
      if (id === 'led') {
        openLEDModal();
      } else {
        setTimeout(function () { scrollToId(id); }, 100);
      }
    }
  });

  /* ---------- Item de menu ativo conforme a rolagem ---------- */
  var sections = document.querySelectorAll('section[id], .hero[id]');
  var navItems = document.querySelectorAll('.nav-links a[href^="#"]');
  var ticking = false;

  function updateActiveNav() {
    var current = '';
    var scrollPosition = (window.scrollY || window.pageYOffset) + 120;

    sections.forEach(function (section) {
      var top = section.offsetTop;
      if (scrollPosition >= top && scrollPosition < top + section.offsetHeight) {
        current = section.id;
      }
    });

    navItems.forEach(function (item) {
      var href = (item.getAttribute('href') || '').replace('#', '');
      item.classList.toggle('active', href === current);
    });
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateActiveNav);
    }
  }, { passive: true });
  updateActiveNav();

  /* ---------- Ano do rodapé ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
