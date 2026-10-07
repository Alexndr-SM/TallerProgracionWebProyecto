// =========================================================
// IcaTurismo — theme.js
// Modo claro / oscuro para todo el sitio.
//
// - Se carga en el <head> (sin defer) para aplicar el tema ANTES
//   de pintar la página y evitar el "flash" de color incorrecto.
// - Orden de prioridad: preferencia guardada > preferencia del sistema.
// - Si la persona nunca eligió, el sitio sigue al sistema en vivo.
// - Sincroniza el tema entre pestañas y entre index / login / registro.
// =========================================================
(function () {
  'use strict';

  var STORAGE_KEY = 'icat_theme';
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  // --- Lectura / escritura segura de localStorage (puede fallar en modo privado)
  function getStored() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch (e) { return null; }
  }
  function setStored(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
  }

  function systemTheme() {
    return media && media.matches ? 'dark' : 'light';
  }

  function currentTheme() {
    return root.getAttribute('data-theme') || getStored() || systemTheme();
  }

  // --- Aplica el tema al <html> y actualiza color de barra del navegador
  function apply(theme) {
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f1729' : '#1b2a45');

    syncButtons(theme);
  }

  // --- Mantiene los botones (aria + etiqueta) en sincronía con el tema
  function syncButtons(theme) {
    var isDark = theme === 'dark';
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', isDark ? 'true' : 'false');
      buttons[i].setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      buttons[i].setAttribute('title', isDark ? 'Modo claro' : 'Modo oscuro');
    }
  }

  // --- Transición suave solo durante el cambio (no en la carga inicial)
  function withTransition(fn) {
    root.classList.add('theme-transition');
    fn();
    window.setTimeout(function () { root.classList.remove('theme-transition'); }, 350);
  }

  function toggle() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    setStored(next);
    withTransition(function () { apply(next); });
  }

  // 1) Aplicar de inmediato (antes del primer pintado)
  apply(getStored() || systemTheme());

  // 2) Conectar botones cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', function () {
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) buttons[i].addEventListener('click', toggle);
    syncButtons(currentTheme());
  });

  // 3) Si no hay preferencia guardada, seguir los cambios del sistema
  if (media) {
    var onSystemChange = function () {
      if (!getStored()) withTransition(function () { apply(systemTheme()); });
    };
    if (media.addEventListener) media.addEventListener('change', onSystemChange);
    else if (media.addListener) media.addListener(onSystemChange); // Safari antiguo
  }

  // 4) Sincronizar entre pestañas / páginas
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY) {
      withTransition(function () { apply(getStored() || systemTheme()); });
    }
  });

  // API pública por si la necesitas en otros scripts
  window.Theme = { toggle: toggle, get: currentTheme, set: function (t) {
    if (t === 'light' || t === 'dark') { setStored(t); withTransition(function () { apply(t); }); }
  } };
})();
