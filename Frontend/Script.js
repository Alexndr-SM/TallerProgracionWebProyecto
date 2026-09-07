// =========================================================
// IcaTurismo — interacciones del sitio
// =========================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Menú hamburguesa (móvil) ---------- */
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
    });

    // Cierra el menú al hacer clic en un enlace (útil en móvil)
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }

  /* ---------- Carrusel principal ---------- */
  const track = document.getElementById('carruselSlides');
  const indicadoresContenedor = document.getElementById('indicadores');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (!track) return;

  const slides = Array.from(track.querySelectorAll('.slide'));
  const total = slides.length;
  let indiceActual = 0;
  let autoplayTimer = null;
  const INTERVALO_MS = 5000; // cada cuánto cambia sola la imagen

  // Crear los puntos indicadores dinámicamente
  if (indicadoresContenedor) {
    indicadoresContenedor.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.setAttribute('aria-label', `Ir a la imagen ${i + 1}`);
      dot.addEventListener('click', () => irASlide(i));
      indicadoresContenedor.appendChild(dot);
    });
  }
  const dots = indicadoresContenedor
    ? Array.from(indicadoresContenedor.children)
    : [];

  function mostrarSlide(indice) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === indice);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === indice);
    });
    indiceActual = indice;
  }

  function irASlide(indice) {
    mostrarSlide((indice + total) % total);
    reiniciarAutoplay();
  }

  function siguiente() { irASlide(indiceActual + 1); }
  function anterior() { irASlide(indiceActual - 1); }

  function iniciarAutoplay() {
    autoplayTimer = setInterval(() => {
      mostrarSlide((indiceActual + 1) % total);
    }, INTERVALO_MS);
  }

  function reiniciarAutoplay() {
    clearInterval(autoplayTimer);
    iniciarAutoplay();
  }

  if (prevBtn) prevBtn.addEventListener('click', anterior);
  if (nextBtn) nextBtn.addEventListener('click', siguiente);

  // Pausar el avance automático mientras el mouse está sobre el carrusel
  const contenedor = track.closest('.carrusel-contenedor');
  if (contenedor) {
    contenedor.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
    contenedor.addEventListener('mouseleave', iniciarAutoplay);
  }

  // Estado inicial + arranque del autoplay
  mostrarSlide(0);
  iniciarAutoplay();

  /* ---------- Reveal on scroll (si hay elementos .reveal) ---------- */
  const revelables = document.querySelectorAll('.reveal');
  if (revelables.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entradas) => {
      entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('is-visible');
          observer.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.15 });

    revelables.forEach(el => observer.observe(el));
  }

});
