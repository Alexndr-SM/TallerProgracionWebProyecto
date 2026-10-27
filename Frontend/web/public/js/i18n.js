// =========================================================
// IcaTurismo — i18n.js
// Traduce al vuelo las páginas que todavía están escritas en español
// (html/*.html) y los mensajes que generan los scripts (Script.js,
// reviews.js, perfil.js, auth.js, alert(), etc.).
//
//  - Idioma: prefijo de la URL (/en/) > localStorage 'icat_lang' > navegador.
//  - Diccionario: js/i18n-dict.js  (clave = texto original en español).
//  - Si el idioma es español no hace nada.
//  - Para agregar un texto nuevo: añade su línea en i18n-dict.js
//    (o en build_dict.py si regeneras el archivo).
// =========================================================
(function () {
  'use strict';

  var SUPPORTED = ['es', 'en', 'fr'];
  var STORAGE_KEY = 'icat_lang';
  var DATE_LOCALES = { en: 'en-US', fr: 'fr-FR' };

  function readStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function writeStored(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }
  function fromBrowser() {
    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'es'];
    for (var i = 0; i < prefs.length; i++) {
      var code = String(prefs[i]).slice(0, 2).toLowerCase();
      if (SUPPORTED.indexOf(code) !== -1) return code;
    }
    return 'es';
  }

  var m = location.pathname.match(/^\/(es|en|fr)(\/|$)/);
  var lang = (m && m[1]) || null;
  if (!lang) {
    var s = readStored();
    lang = SUPPORTED.indexOf(s) !== -1 ? s : fromBrowser();
  }
  writeStored(lang);
  document.documentElement.lang = lang;

  var dict = window.ICAT_DICT || {};
  var patterns = (window.ICAT_PATTERNS || []).map(function (p) {
    return { re: new RegExp(p[0]), en: p[1], fr: p[2] };
  });
  var idx = lang === 'en' ? 0 : 1;

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

  // Traduce un texto en español -> idioma actual (devuelve el mismo texto si no lo conoce)
  function t(text) {
    if (lang === 'es' || typeof text !== 'string') return text;
    var lead = text.match(/^\s*/)[0];
    var trail = text.match(/\s*$/)[0];
    var core = text.trim();
    if (!core) return text;

    var hit = dict[norm(core)];
    if (hit && hit[idx]) return lead + hit[idx] + (core.length ? trail : '');

    for (var i = 0; i < patterns.length; i++) {
      if (patterns[i].re.test(core)) {
        return lead + core.replace(patterns[i].re, patterns[i][lang]) + trail;
      }
    }
    return text;
  }

  function setLang(code) {
    if (SUPPORTED.indexOf(code) === -1) return;
    writeStored(code);
    // Páginas de Astro (/es/, /en/, /fr/): ir a la versión del idioma
    if (/^\/(es|en|fr)(\/|$)/.test(location.pathname)) {
      location.href = '/' + code + '/' + location.hash;
    } else {
      location.reload();
    }
  }

  window.ICAT_I18N = { lang: lang, t: t, setLang: setLang, supported: SUPPORTED };

  if (lang === 'es') return; // español: nada que traducir

  // ---------- alert / confirm / prompt ----------
  ['alert', 'confirm', 'prompt'].forEach(function (name) {
    var original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function (msg) {
      var args = Array.prototype.slice.call(arguments);
      args[0] = t(String(msg));
      return original.apply(window, args);
    };
  });

  // ---------- Fechas: perfil.js, reviews.js usan 'es-PE' fijo ----------
  var dateLocale = DATE_LOCALES[lang];
  ['toLocaleDateString', 'toLocaleString', 'toLocaleTimeString'].forEach(function (fn) {
    var orig = Date.prototype[fn];
    Date.prototype[fn] = function (loc, opts) {
      if (typeof loc === 'string' && loc.indexOf('es') === 0) loc = dateLocale;
      return orig.call(this, loc, opts);
    };
  });

  // ---------- Evitar "parpadeo" en español antes de traducir ----------
  var hideStyle = document.createElement('style');
  hideStyle.textContent = 'html.i18n-pending body{visibility:hidden}';
  document.head.appendChild(hideStyle);
  document.documentElement.classList.add('i18n-pending');
  function reveal() { document.documentElement.classList.remove('i18n-pending'); }
  setTimeout(reveal, 1500); // seguridad

  // ---------- Recorrido del DOM ----------
  var ATTRS = ['placeholder', 'aria-label', 'alt', 'title'];
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };

  function skipEl(el) {
    return !el || SKIP[el.nodeName] || (el.closest && el.closest('[data-no-i18n],[translate="no"]'));
  }

  function doText(node) {
    var parent = node.parentNode;
    if (skipEl(parent)) return;
    var v = node.nodeValue;
    if (!v || !v.trim()) return;
    var r = t(v);
    if (r !== v) node.nodeValue = r;
  }

  function doAttrs(el) {
    // (los atributos sí se traducen en <textarea>, <code>, etc.; solo se respeta data-no-i18n)
    if (!el || (el.closest && el.closest('[data-no-i18n],[translate="no"]'))) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      var v = el.getAttribute && el.getAttribute(a);
      if (v) {
        var r = t(v);
        if (r !== v) el.setAttribute(a, r);
      }
    }
    if (el.nodeName === 'INPUT' && /^(submit|button)$/.test(el.type) && el.value) {
      var rv = t(el.value);
      if (rv !== el.value) el.value = rv;
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doAttrs(root);          // atributos siempre (placeholder de <textarea>, etc.)
    if (skipEl(root)) return; // pero no el texto interno de script/style/textarea
    var child = root.firstChild;
    while (child) {
      var next = child.nextSibling;
      if (child.nodeType === 3) doText(child);
      else if (child.nodeType === 1) walk(child);
      child = next;
    }
  }

  function doHead() {
    if (document.title) {
      var rt = t(document.title);
      if (rt !== document.title) document.title = rt;
    }
    var meta = document.querySelector('meta[name="description"]');
    if (meta) {
      var c = meta.getAttribute('content');
      var rc = c && t(c);
      if (rc && rc !== c) meta.setAttribute('content', rc);
    }
  }

  function full() { doHead(); walk(document.body); }

  // Observa cambios (contenido que agregan los scripts después)
  var observer = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var rec = records[i];
      if (rec.type === 'characterData') doText(rec.target);
      else if (rec.type === 'attributes') doAttrs(rec.target);
      else if (rec.type === 'childList') {
        for (var j = 0; j < rec.addedNodes.length; j++) walk(rec.addedNodes[j]);
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ATTRS
  });

  document.addEventListener('DOMContentLoaded', function () { full(); reveal(); });
  window.addEventListener('load', full);
})();
