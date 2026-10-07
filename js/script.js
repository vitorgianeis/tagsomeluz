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

  /* ---------- Modal de Serviços (um painel por card) ---------- */
  var modal = document.getElementById('serviceModal');
  var lastFocused = null;
  // ids dos cards que abrem o modal (o rodapé/menu usa os mesmos âncoras)
  var SERVICE_KEYS = ['som', 'iluminacao', 'led', 'video', 'dj', 'estrutura'];

  function getPanels() {
    return modal ? modal.querySelectorAll('.svc-panel') : [];
  }

  // Só o painel aberto carrega a mídia (img/video usam data-src)
  function loadMedia(root) {
    root.querySelectorAll('[data-src]').forEach(function (el) {
      if (!el.getAttribute('src')) el.src = el.dataset.src;
    });
  }

  function unloadMedia(root) {
    root.querySelectorAll('[data-src]').forEach(function (el) {
      if (el.tagName === 'VIDEO') {
        el.pause();
        el.removeAttribute('src');
        el.load(); // libera a memória dos 12 vídeos
      } else {
        el.removeAttribute('src');
      }
    });
  }

  function openServiceModal(key) {
    if (!modal) return;
    var target = null;

    getPanels().forEach(function (panel) {
      var isTarget = panel.dataset.panel === key;
      panel.hidden = !isTarget;
      if (isTarget) target = panel;
    });
    if (!target) return;

    var title = target.querySelector('.svc-title');
    if (title) modal.setAttribute('aria-labelledby', title.id);

    lastFocused = document.activeElement;
    loadMedia(target);
    modal.hidden = false;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    var closeBtn = modal.querySelector('.svc-modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeServiceModal() {
    if (!modal || modal.hidden) return;
    modal.classList.remove('active');
    modal.hidden = true;
    document.body.style.overflow = '';
    getPanels().forEach(unloadMedia);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  // Cards de serviço clicáveis (mouse e teclado)
  document.querySelectorAll('[data-open-service]').forEach(function (card) {
    var key = card.dataset.openService;
    card.addEventListener('click', function () {
      openServiceModal(key);
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openServiceModal(key);
      }
    });
  });

  if (modal) {
    var closeBtn = modal.querySelector('.svc-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeServiceModal);

    // Fechar clicando fora do conteúdo
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeServiceModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeServiceModal();
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

    var id = href.slice(1);

    // Link de serviço (#som, #iluminacao, #led, #video, #dj, #estrutura)
    // abre o modal do serviço em vez de só rolar até o card
    if (SERVICE_KEYS.indexOf(id) !== -1) {
      closeMenu();
      openServiceModal(id);
      return;
    }

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
      if (SERVICE_KEYS.indexOf(id) !== -1) {
        openServiceModal(id);
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

  /* ---------- Contagem regressiva da feira ---------- */
  var countdown = document.getElementById('countdown');
  if (countdown) {
    var deadline = new Date(countdown.dataset.deadline).getTime();
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

      if (diff <= 0) {
        // Evento encerrado: mostra uma frase no lugar dos números
        clearInterval(timer);
        timer = null;
        countdown.classList.add('is-past');
        var title = countdown.querySelector('.fair-countdown-title');
        if (title) title.textContent = 'A feira já aconteceu — veja o que preparamos no portfólio';
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

  /* ---------- Ano do rodapé ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
