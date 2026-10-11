// =========================================================
// IcaTurismo — Script.js
// Interacciones de la página principal (index.html)
// =========================================================

// Espera a que el HTML esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {

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
  const navUser = document.getElementById('navUser');

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
