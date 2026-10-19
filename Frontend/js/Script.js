// =========================================================
// IcaTurismo — Script.js
// Interacciones de la página principal (index.html)
// =========================================================

// Espera a que el HTML esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  const headerActions = document.querySelector('.header-actions');
  let navUser = document.getElementById('navUser');

  if (headerActions && !navUser) {
    const scriptUrl = document.querySelector('script[src$="/js/Script.js"]')?.src;
    if (!scriptUrl) throw new Error('No se pudo determinar la ruta del menú de cuenta.');

    const accountUrl = (file) => new URL(`../html/${file}`, scriptUrl).href;
    navUser = document.createElement('div');
    navUser.className = 'nav-user';
    navUser.id = 'navUser';

    const guestArea = document.createElement('div');
    guestArea.id = 'guestArea';
    guestArea.innerHTML = `
      <button type="button" class="user-btn" id="userBtn" aria-label="Menú de usuario" aria-expanded="false" aria-haspopup="true">
        <img src="${new URL('../assets/Person.png', scriptUrl).href}" alt="">
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
        <img src="${new URL('../assets/Person.png', scriptUrl).href}" alt="">
        <span id="userNameDisplay">Usuario</span><span class="chevron" aria-hidden="true">▾</span>
      </button>
      <div class="user-dropdown" id="userProfileDropdown">
        <a href="${accountUrl('perfil.html')}" id="miPerfilLink">Mi Perfil</a>
        <a href="#" id="logoutAction">Cerrar sesión</a>
      </div>`;

    navUser.append(guestArea, userArea);
    headerActions.insertBefore(navUser, headerActions.querySelector('.theme-toggle'));
  }

  const languageAnchor = navUser || headerActions?.querySelector('.theme-toggle');

  if (headerActions && languageAnchor) {
    const languages = [
      {
        label: 'English (United States)',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Flag_of_the_United_States.svg?utm_source=es.wikipedia.org&utm_campaign=index&utm_content=original'
      },
      {
        label: 'Español (Perú)',
        flag: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Flag_of_Peru_%281884%E2%80%931950%29.svg/960px-Flag_of_Peru_%281884%E2%80%931950%29.svg.png?utm_source=es.wikipedia.org&utm_campaign=index&utm_content=thumbnail'
      },
      {
        label: 'Français (France)',
        flag: 'https://www.divinachartermenorca.com/static/img/flags/flag_fr.png?r=455ec45755e6a5c39749b27e97794789872cad68'
      }
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

    languages.forEach(({ label, flag }) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'language-option';
      option.setAttribute('aria-label', label);
      option.title = label;

      const image = document.createElement('img');
      image.src = flag;
      image.alt = '';
      image.loading = 'lazy';

      option.appendChild(image);
      option.addEventListener('click', () => closeLanguageOptions());
      languageOptions.appendChild(option);
    });

    languagePicker.append(languageToggle, languageOptions);
    if (navUser) navUser.after(languagePicker);
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
      // Si hay sesión, cerrar dropdown por si quedó abierto
      if (navUser) navUser.classList.remove('open');
    } else {
      if (navUser) navUser.classList.remove('open');
    }
  }

  // Ejecutar al cargar la página
  aplicarSesionUI();

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
