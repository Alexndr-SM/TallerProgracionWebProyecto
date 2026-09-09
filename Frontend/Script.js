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
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active'); // Anima a forma de X
      navLinks.classList.toggle('active');  // Expande / colapsa el menú
    });

    // Al hacer clic en cualquier enlace, se cierra el menú (mejor UX en móvil)
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }

  /* =========================================================
     DROPDOWN DE USUARIO (botón Cuenta)
     Muestra/oculta las opciones: Iniciar sesión y Registrarse
     ========================================================= */
  const navUser = document.getElementById('navUser'); // Contenedor <li>
  const userBtn = document.getElementById('userBtn'); // Botón "Cuenta"

  if (navUser && userBtn) {
    // Clic en el botón: abre o cierra el menú desplegable
    userBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Evita que el clic llegue al document y lo cierre al instante
      const isOpen = navUser.classList.toggle('open'); // Alterna la clase .open
      userBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false'); // Accesibilidad
    });

    // Clic fuera del menú: lo cierra
    document.addEventListener('click', (e) => {
      if (!navUser.contains(e.target)) {
        navUser.classList.remove('open');
        userBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Tecla Escape: también cierra el menú
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        navUser.classList.remove('open');
        userBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Al hacer clic en un enlace del dropdown, se cierra antes de navegar
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
      dropdown.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          navUser.classList.remove('open');
          userBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  /* =========================================================
     CARRUSEL PRINCIPAL
     Cambia de imagen con botones, puntos y autoplay
     ========================================================= */
  const track = document.getElementById('carruselSlides');           // Contenedor de slides
  const indicadoresContenedor = document.getElementById('indicadores'); // Contenedor de puntos
  const prevBtn = document.getElementById('prevBtn');                // Botón anterior
  const nextBtn = document.getElementById('nextBtn');                // Botón siguiente

  // Si no hay carrusel en esta página, no continúa
  if (!track) return;

  const slides = Array.from(track.querySelectorAll('.slide')); // Todas las diapositivas
  const total = slides.length;
  let indiceActual = 0;        // Índice del slide visible
  let autoplayTimer = null;    // Referencia al setInterval
  const INTERVALO_MS = 5000;   // Cada 5 segundos cambia sola

  // Crea un punto (dot) por cada slide
  if (indicadoresContenedor) {
    indicadoresContenedor.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.setAttribute('aria-label', `Ir a la imagen ${i + 1}`);
      dot.addEventListener('click', () => irASlide(i)); // Clic en el punto salta a ese slide
      indicadoresContenedor.appendChild(dot);
    });
  }
  const dots = indicadoresContenedor
    ? Array.from(indicadoresContenedor.children)
    : [];

  // Muestra el slide del índice indicado y actualiza los puntos
  function mostrarSlide(indice) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === indice); // Solo uno tiene .active
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === indice);
    });
    indiceActual = indice;
  }

  // Va a un índice (con ciclo: al final vuelve al primero)
  function irASlide(indice) {
    mostrarSlide((indice + total) % total);
    reiniciarAutoplay(); // Reinicia el temporizador al interactuar
  }

  function siguiente() { irASlide(indiceActual + 1); }
  function anterior()  { irASlide(indiceActual - 1); }

  // Inicia el cambio automático de slides
  function iniciarAutoplay() {
    autoplayTimer = setInterval(() => {
      mostrarSlide((indiceActual + 1) % total);
    }, INTERVALO_MS);
  }

  // Detiene y vuelve a iniciar el autoplay
  function reiniciarAutoplay() {
    clearInterval(autoplayTimer);
    iniciarAutoplay();
  }

  // Eventos de los botones
  if (prevBtn) prevBtn.addEventListener('click', anterior);
  if (nextBtn) nextBtn.addEventListener('click', siguiente);

  // Pausa el autoplay mientras el mouse está sobre el carrusel
  const contenedor = track.closest('.carrusel-contenedor');
  if (contenedor) {
    contenedor.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
    contenedor.addEventListener('mouseleave', iniciarAutoplay);
  }

  // Estado inicial: primer slide + arranque del autoplay
  mostrarSlide(0);
  iniciarAutoplay();

});