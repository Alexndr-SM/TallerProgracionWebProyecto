// =========================================================
// IcaTurismo — Script.js
// Interacciones de la página principal (index.html)
// =========================================================

// Guardar la ruta mientras este script se está ejecutando.
const icatScriptUrl = document.currentScript?.src ||
  Array.from(document.scripts).find(script => /(?:^|\/)js\/Script\.js(?:[?#]|$)/.test(script.getAttribute('src') || ''))?.src ||
  new URL('js/Script.js', document.baseURI).href;

// Espera a que el HTML esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  const defaultAvatarUrl = 'https://res.cloudinary.com/plhejhea/image/upload/v1792620223/Person.svg';
  const headerActions = document.querySelector('.header-actions');
  let navUser = document.getElementById('navUser');

  if (headerActions && !navUser) {
    const scriptUrl = icatScriptUrl;
    if (!scriptUrl) throw new Error('No se pudo determinar la ruta del menú de cuenta.');

    const accountUrl = (file) => new URL(`../html/${file}`, scriptUrl).href;
    navUser = document.createElement('div');
    navUser.className = 'nav-user';
    navUser.id = 'navUser';

    const guestArea = document.createElement('div');
    guestArea.id = 'guestArea';
    guestArea.innerHTML = `
      <button type="button" class="user-btn" id="userBtn" aria-label="Menú de usuario" aria-expanded="false" aria-haspopup="true">
        <img src="${defaultAvatarUrl}" alt="">
        <span>Cuenta</span><span class="chevron" aria-hidden="true">▾</span>
      </button>
      <div class="user-dropdown" id="userDropdown">
        <a href="${accountUrl('login.html')}">Iniciar sesión</a>
        <a href="${accountUrl('registro.html')}">Registrarse</a>
      </div>`;

    const userArea = document.createElement('div');
    userArea.id = 'userArea';
    userArea.className = 'is-hidden';
    userArea.hidden = true;
    userArea.innerHTML = `
      <button type="button" class="user-btn" id="userProfileBtn" aria-label="Menú de usuario" aria-expanded="false" aria-haspopup="true">
        <img src="${defaultAvatarUrl}" alt="">
        <span id="userNameDisplay">Usuario</span><span class="chevron" aria-hidden="true">▾</span>
      </button>
      <div class="user-dropdown" id="userProfileDropdown">
        <a href="${accountUrl('perfil.html')}" id="miPerfilLink">Mi Perfil</a>
        <a href="${accountUrl('canjeo.html')}" id="canjeoLink">Canjear puntos</a>
        <a href="#" id="logoutAction">Cerrar sesión</a>
      </div>`;

    navUser.append(guestArea, userArea);
    headerActions.insertBefore(navUser, headerActions.querySelector('.theme-toggle'));
  }

  const languageAnchor = navUser || headerActions?.querySelector('.theme-toggle');

  if (headerActions && languageAnchor && !headerActions.querySelector('.language-picker')) {
    const scriptUrl = icatScriptUrl;
    const languages = [
      { code: 'en', label: 'English (United States)', flag: '/assets/flags/en.svg' },
      { code: 'es', label: 'Español (Perú)', flag: '/assets/flags/es.svg' },
      { code: 'fr', label: 'Français (France)', flag: '/assets/flags/fr.svg' }
    ];
    const languagePicker = document.createElement('div');
    languagePicker.className = 'language-picker';

    const languageToggle = document.createElement('button');
    languageToggle.type = 'button';
    languageToggle.className = 'language-toggle';
    languageToggle.setAttribute('aria-label', 'Mostrar idiomas');
    languageToggle.setAttribute('aria-expanded', 'false');
    languageToggle.setAttribute('aria-controls', 'languageOptions');
    languageToggle.title = 'Idiomas';
    languageToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>';

    const languageOptions = document.createElement('div');
    languageOptions.className = 'language-options';
    languageOptions.id = 'languageOptions';
    languageOptions.setAttribute('role', 'group');
    languageOptions.setAttribute('aria-label', 'Opciones de idioma');

    languages.forEach(({ code, label, flag }) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'language-option';
      option.setAttribute('aria-label', label);
      option.title = label;
      option.lang = code;
      option.setAttribute('translate', 'no');
      option.dataset.locale = code;

      const image = document.createElement('img');
      image.src = new URL('../' + flag.replace(/^\//, ''), scriptUrl).href;
      image.alt = '';
      image.loading = 'lazy';

      option.appendChild(image);
      if (window.ICAT_I18N && window.ICAT_I18N.lang === code) option.setAttribute('aria-current', 'true');
      option.addEventListener('click', () => {
        closeLanguageOptions();
        if (window.ICAT_I18N) window.ICAT_I18N.setLang(code);
      });
      languageOptions.appendChild(option);
    });

    languagePicker.append(languageToggle, languageOptions);
    const languageSlot = headerActions.querySelector('[data-language-slot]');
    if (languageSlot) languageSlot.replaceWith(languagePicker);
    else if (navUser) navUser.after(languagePicker);
    else languageAnchor.before(languagePicker);

    function closeLanguageOptions(returnFocus = false) {
      languagePicker.classList.remove('open');
      languageToggle.setAttribute('aria-expanded', 'false');
      if (returnFocus) languageToggle.focus();
    }

    languageToggle.addEventListener('click', () => {
      const isOpen = languagePicker.classList.toggle('open');
      languageToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (event) => {
      if (!languagePicker.contains(event.target)) closeLanguageOptions();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && languagePicker.classList.contains('open')) {
        closeLanguageOptions(true);
      }
    });
  }

  /* =========================================================
     MENÚ HAMBURGUESA (móvil)
     Abre y cierra el menú lateral en pantallas pequeñas
     ========================================================= */
  const hamburger = document.getElementById('hamburger'); // Botón de 3 rayas
  const navLinks = document.getElementById('navLinks');   // Lista de enlaces

  if (hamburger && navLinks) {
    // Al hacer clic en el botón: alterna la clase .active
    function setMenu(abierto) {
      hamburger.classList.toggle('active', abierto);
      navLinks.classList.toggle('active', abierto);
      hamburger.setAttribute('aria-expanded', String(abierto));
      hamburger.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    }
    hamburger.addEventListener('click', () => setMenu(!navLinks.classList.contains('active')));
    // Escape cierra el menú móvil y devuelve el foco al botón
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        setMenu(false);
        hamburger.focus();
      }
    });

    // Al hacer clic en cualquier enlace, se cierra el menú (mejor UX en móvil)
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setMenu(false));
    });
  }

  /* =========================================================
     DROPDOWN DE USUARIO (botón Cuenta / Perfil)
     Muestra/oculta las opciones: Iniciar sesión, Registrarse o Cerrar sesión
     ========================================================= */
  function initDropdown(btnId, dropdownId) {
    const btn = document.getElementById(btnId);
    const dropdown = document.getElementById(dropdownId);
    if (!btn || !dropdown || !navUser) return;

    // Clic en el botón: abre o cierra el menú desplegable
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Evita que el clic llegue al document y lo cierre al instante
      const isOpen = navUser.classList.toggle('open'); // Alterna la clase .open
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false'); // Accesibilidad
    });

    // Clic fuera del menú: lo cierra
    document.addEventListener('click', (e) => {
      if (!navUser.contains(e.target)) {
        navUser.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    // Tecla Escape: también cierra el menú
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        navUser.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    // Al hacer clic en un enlace del dropdown, se cierra antes de navegar
    dropdown.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navUser.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Inicializar dropdown de invitado (Cuenta)
  initDropdown('userBtn', 'userDropdown');
  // Inicializar dropdown de usuario logueado (Perfil)
  initDropdown('userProfileBtn', 'userProfileDropdown');


  /* =========================================================
     SESIÓN: mostrar Cuenta O Perfil de Usuario (nunca los dos)
     ========================================================= */
  const guestArea = document.getElementById('guestArea');
  const userArea = document.getElementById('userArea');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const logoutAction = document.getElementById('logoutAction');
  const scriptEl = document.querySelector('script[src*="Script.js"]');
  const pointsUrl = scriptEl ? new URL('../html/canjeo.html', scriptEl.src).href : 'html/canjeo.html';
  const pointsBalance = document.querySelector('.rewards-balance');
  const pointsElement = pointsBalance?.querySelector('#rewardsPoints');

  function updatePointsPosition() {
    if (!pointsBalance || pointsBalance.closest('.rewards-wallet')) return;
    pointsBalance.classList.toggle('is-floating', window.scrollY > 0);
  }

  if (pointsBalance) {
    if (!pointsBalance.closest('.rewards-wallet')) pointsBalance.href = pointsUrl;
    pointsBalance.hidden = true;
    window.addEventListener('scroll', updatePointsPosition, { passive: true });
    window.addEventListener('resize', updatePointsPosition);
    updatePointsPosition();
  }

  async function refreshPointsBalance(points) {
    if (!pointsBalance || !pointsElement) return;
    if (!window.Auth?.isLoggedIn()) {
      pointsBalance.hidden = true;
      return;
    }
    pointsBalance.hidden = false;
    if (Number.isFinite(Number(points))) {
      const formattedPoints = Number(points).toLocaleString('es-PE');
      pointsElement.textContent = formattedPoints;
      pointsBalance.setAttribute('aria-label', pointsBalance.closest('.rewards-wallet') ? `Saldo disponible: ${formattedPoints} puntos. Volver a mi tarjeta.` : `Saldo disponible: ${formattedPoints} puntos. Abrir catálogo de canjes.`);
      pointsBalance.removeAttribute('title');
      return;
    }
    try {
      const response = await fetch(`${(window.API_URL || '').replace(/\/$/, '')}/api/perfil/puntos`, {
        headers: { Authorization: `Bearer ${Auth.getToken()}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || 'No se pudo consultar el saldo.');
      const formattedPoints = Number(result.puntos_actuales).toLocaleString('es-PE');
      pointsElement.textContent = formattedPoints;
      pointsBalance.setAttribute('aria-label', pointsBalance.closest('.rewards-wallet') ? `Saldo disponible: ${formattedPoints} puntos. Volver a mi tarjeta.` : `Saldo disponible: ${formattedPoints} puntos. Abrir catálogo de canjes.`);
      pointsBalance.removeAttribute('title');
    } catch (error) {
      pointsElement.textContent = '—';
      pointsBalance.title = `Saldo no disponible: ${error.message}`;
    }
  }

  if (pointsBalance) {
    document.addEventListener('icat:points-updated', (event) => refreshPointsBalance(event.detail?.points));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshPointsBalance();
    });
    window.setInterval(() => {
      if (!document.hidden) refreshPointsBalance();
    }, 60000);
  }

  function aplicarSesionUI() {
    const logged = !!(window.Auth && Auth.isLoggedIn());
    
    // Ocultar/Mostrar área de invitado
    if (guestArea) {
      guestArea.hidden = logged;
      guestArea.classList.toggle('is-hidden', logged);
    }
    
    // Ocultar/Mostrar área de usuario logueado
    if (userArea) {
      userArea.hidden = !logged;
      userArea.classList.toggle('is-hidden', !logged);
    }

    // Si está logueado, actualizar el nombre en el botón
    if (logged) {
      const user = Auth.getUser();
      if (user && userNameDisplay) {
        userNameDisplay.textContent = user.nombre || 'Mi cuenta';
      }
      const userAvatar = document.querySelector('#userProfileBtn img');
      if (userAvatar) userAvatar.src = user?.foto_perfil_url || defaultAvatarUrl;

      // Asegurar que el enlace a "Mi Perfil" esté presente arriba de "Cerrar sesión"
      const profileDropdown = document.getElementById('userProfileDropdown');
      if (profileDropdown && !document.getElementById('canjeoLink')) {
        const rewardsLink = document.createElement('a');
        rewardsLink.id = 'canjeoLink';
        rewardsLink.href = pointsUrl;
        rewardsLink.textContent = 'Canjear puntos';
        if (logoutAction && logoutAction.parentNode === profileDropdown) {
          profileDropdown.insertBefore(rewardsLink, logoutAction);
        } else {
          profileDropdown.append(rewardsLink);
        }
      }
      if (profileDropdown && Auth.isStaff() && !document.getElementById('editorPanelLink')) {
        const scriptEl = document.querySelector('script[src*="Script.js"]');
        if (scriptEl) {
          const panelLink = document.createElement('a');
          panelLink.id = 'editorPanelLink';
          panelLink.href = new URL('../html/' + Auth.dashboardUrl(), scriptEl.src).href;
          panelLink.textContent = 'Panel del equipo';
          profileDropdown.prepend(panelLink);
        }
      }
      if (profileDropdown && !document.getElementById('miPerfilLink')) {
        const scriptEl = document.querySelector('script[src*="Script.js"]');
        const perfilHref = scriptEl ? new URL('../html/perfil.html', scriptEl.src).href : 'html/perfil.html';
        const perfilLink = document.createElement('a');
        perfilLink.id = 'miPerfilLink';
        perfilLink.href = perfilHref;
        perfilLink.textContent = 'Mi Perfil';
        perfilLink.addEventListener('click', () => {
          if (navUser) navUser.classList.remove('open');
        });

        if (logoutAction && logoutAction.parentNode === profileDropdown) {
          profileDropdown.insertBefore(perfilLink, logoutAction);
        } else {
          profileDropdown.prepend(perfilLink);
        }
      }

      // Si hay sesión, cerrar dropdown por si quedó abierto
      if (navUser) navUser.classList.remove('open');
    } else {
      if (navUser) navUser.classList.remove('open');
    }
  }

  // Ejecutar al cargar la página
  aplicarSesionUI();
  if (pointsBalance) refreshPointsBalance();

  // Evento para cerrar sesión desde el nuevo menú
  if (logoutAction) {
    logoutAction.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.Auth) Auth.logout();
    });
  }

  /* =========================================================
     CARRUSEL PRINCIPAL
     Botones, puntos, autoplay, pausa y accesibilidad
     ========================================================= */
  const track = document.getElementById('carruselSlides');
  if (!track) return; // páginas sin carrusel

  const indicadoresContenedor = document.getElementById('indicadores');
  const prevBtn  = document.getElementById('prevBtn');
  const nextBtn  = document.getElementById('nextBtn');
  const contenedor = track.closest('.carrusel-contenedor');

  const slides = Array.from(track.querySelectorAll('.slide'));
  const total = slides.length;
  if (!total) return;

  const INTERVALO_MS = 5000;
  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let indiceActual = 0;
  let autoplayTimer = null;
  let pausadoPorUsuario = reducirMovimiento; // con "reducir movimiento" no arranca solo
  let pausadoPorHover = false;

  // Puntos: <button> reales (se alcanzan con Tab y Enter/Espacio)
  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Ir a la diapositiva ${i + 1} de ${total}`);
    dot.addEventListener('click', () => irASlide(i));
    return dot;
  });
  if (indicadoresContenedor) {
    indicadoresContenedor.innerHTML = '';
    dots.forEach(d => indicadoresContenedor.appendChild(d));
  }

  function mostrarSlide(indice) {
    slides.forEach((slide, i) => {
      const activo = i === indice;
      slide.classList.toggle('active', activo);
      slide.setAttribute('aria-hidden', String(!activo));
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === indice);
      if (i === indice) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    indiceActual = indice;
  }

  function irASlide(indice) {
    mostrarSlide((indice + total) % total);
    iniciarAutoplay(); // reinicia el temporizador (ya limpia el anterior)
  }

  // Un único temporizador: SIEMPRE se limpia antes de crear otro
  function detenerAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
  function iniciarAutoplay() {
    detenerAutoplay();
    if (pausadoPorUsuario || pausadoPorHover || document.hidden) return;
    autoplayTimer = setInterval(() => mostrarSlide((indiceActual + 1) % total), INTERVALO_MS);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => irASlide(indiceActual - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => irASlide(indiceActual + 1));

  // Pausa mientras hay mouse o foco dentro del carrusel
  if (contenedor) {
    contenedor.addEventListener('mouseenter', () => { pausadoPorHover = true;  iniciarAutoplay(); });
    contenedor.addEventListener('mouseleave', () => { pausadoPorHover = false; iniciarAutoplay(); });
    contenedor.addEventListener('focusin',    () => { pausadoPorHover = true;  iniciarAutoplay(); });
    contenedor.addEventListener('focusout',   () => { pausadoPorHover = false; iniciarAutoplay(); });
  }

  // No gastar CPU con la pestaña oculta
  document.addEventListener('visibilitychange', iniciarAutoplay);

  // Flechas del teclado cuando el carrusel tiene el foco
  if (contenedor) {
    contenedor.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  irASlide(indiceActual - 1);
      if (e.key === 'ArrowRight') irASlide(indiceActual + 1);
    });
  }

  mostrarSlide(0);
  iniciarAutoplay();

  // Restablece el reverso al salir con el mouse; hover mantiene el giro mientras está encima.
  const tarjetaEquipo = document.querySelector('.about-image');
  const giroEquipo = tarjetaEquipo?.querySelector('.about-image-toggle');
  if (tarjetaEquipo && giroEquipo) {
    tarjetaEquipo.addEventListener('pointerleave', (evento) => {
      if (evento.pointerType === 'mouse') {
        giroEquipo.checked = false;
      }
    });
  }

  // Anima los bloques al entrar y salir de pantalla para que se repita al desplazarse.
  const elementosAnimados = document.querySelectorAll('.scroll-reveal');
  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!movimientoReducido && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('scroll-reveal-ready');
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        entrada.target.classList.toggle('is-visible', entrada.isIntersecting);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });

    elementosAnimados.forEach((elemento) => observador.observe(elemento));
  }

});
