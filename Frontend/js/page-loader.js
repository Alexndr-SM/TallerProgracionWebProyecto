/* IcaTurismo · shared, dependency-free entrance and admin transition. */
(() => {
  'use strict';
  if (window.IcaLoader) return;
  const root = document.documentElement;
  const adminPage = location.pathname.endsWith('/html/admin.html');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const seenKey = 'icat_welcome_seen';
  let overlay, observer, deadline, exitTimer, slowTimer, started, previousFocus;
  let active = false, closing = false, navigating = false, domReady = false;
  const inertElements = new Map();

  const scene = `<svg class="ica-loading__scene" viewBox="0 0 560 260" fill="none" aria-hidden="true">
    <circle class="ica-loading__halo" cx="280" cy="112" r="79"/>
    <g class="ica-loading__sun"><circle cx="280" cy="112" r="39"/><path d="M280 53V43M280 181V171M221 112H211M349 112H339M238 70L231 63M329 161L322 154M238 154L231 161M329 63L322 70"/></g>
    <path class="ica-loading__ridge" d="M12 192C94 171 136 103 219 150S357 206 437 143S518 137 548 153"/>
    <path class="ica-loading__dune ica-loading__dune--back" d="M0 211C104 201 139 122 236 159S405 223 560 156V260H0Z"/>
    <path class="ica-loading__dune ica-loading__dune--front" d="M0 213C90 167 171 186 265 216S445 195 560 218V260H0Z"/>
    <ellipse class="ica-loading__water" cx="304" cy="235" rx="67" ry="7"/>
    <path class="ica-loading__ripple" d="M265 235H341M282 240H323"/>
    <g class="ica-loading__palm"><path d="M389 226Q377 188 390 155"/><path d="M390 157Q362 128 346 154Q368 148 390 157ZM390 157Q399 124 426 140Q405 142 390 157ZM390 157Q415 150 429 176Q405 164 390 157ZM390 157Q365 156 359 179Q372 164 390 157Z"/></g>
    <path class="ica-loading__route" d="M66 221C116 183 147 210 174 222"/>
    <circle class="ica-loading__point" cx="66" cy="221" r="4"/><circle class="ica-loading__point" cx="174" cy="222" r="4"/>
  </svg>`;

  function lockContent() {
    for (const element of document.body.children) {
      if (element === overlay || /^(SCRIPT|STYLE|LINK)$/.test(element.tagName) || inertElements.has(element)) continue;
      inertElements.set(element, element.inert);
      element.inert = true;
    }
  }

  function remove() {
    clearTimeout(deadline); clearTimeout(exitTimer); clearTimeout(slowTimer);
    observer?.disconnect();
    const hadFocus = overlay?.contains(document.activeElement);
    overlay?.remove(); overlay = null;
    root.classList.remove('ica-loading-active');
    for (const [element, wasInert] of inertElements) element.inert = wasInert;
    inertElements.clear(); active = false; closing = false;
    if (hadFocus && previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({ preventScroll: true });
  }

  function finish(immediate = false) {
    if (!active || closing) return;
    closing = true;
    if (!navigating && !adminPage) { try { sessionStorage.setItem(seenKey, '1'); } catch { /* Storage is optional. */ } }
    clearTimeout(deadline); clearTimeout(slowTimer);
    if (immediate || reduced.matches) { remove(); return; }
    exitTimer = setTimeout(() => {
      overlay?.classList.add('is-leaving');
      exitTimer = setTimeout(remove, 320);
    }, Math.max(0, 450 - (performance.now() - started)));
  }

  function setStatus(text) {
    const status = overlay?.querySelector('[data-loading-status]');
    if (status && status.textContent !== text) status.textContent = text;
  }

  function checkReady() {
    if (!active || closing || navigating || !domReady) return;
    lockContent();
    if (adminPage) {
      const status = document.getElementById('adminStatus');
      if (status?.textContent) setStatus(status.textContent);
      const retry = document.getElementById('adminRetry');
      const content = document.getElementById('adminContent');
      if ((retry && !retry.hidden) || (content && !content.hidden)) finish();
      return;
    }
    if (document.querySelector('[data-cms-page][aria-busy="true"]')) return;
    const hero = document.querySelector('.slide.active img, .cms-hero img');
    if (hero && !hero.complete) return;
    finish();
  }

  function show(mode = adminPage ? 'admin' : 'welcome') {
    if (!document.body || active) return;
    active = true; closing = false; started = performance.now(); previousFocus = document.activeElement;
    overlay = document.createElement('section');
    overlay.className = 'ica-loading';
    overlay.setAttribute('aria-label', 'Cargando IcaTurismo');
    if (mode === 'admin') {
      let dark = true;
      try { dark = JSON.parse(localStorage.getItem('icat_admin_theme') ?? 'true') !== false; } catch { /* Default admin palette. */ }
      overlay.dataset.theme = dark ? 'dark' : 'light';
    }
    overlay.innerHTML = `<div class="ica-loading__content">
      <p class="ica-loading__eyebrow">ICA, PERÚ <span>·</span> ${mode === 'admin' ? 'ESPACIO DEL EQUIPO' : 'EL VIAJE COMIENZA AQUÍ'}</p>
      ${scene}<p class="ica-loading__brand">Ica<span>Turismo</span></p>
      <h2 class="ica-loading__title">${mode === 'admin' ? 'Detrás de cada experiencia' : 'Un destino. Mil historias.'}</h2>
      <div class="ica-loading__status" role="status" aria-live="polite"><i aria-hidden="true"></i><span data-loading-status>${mode === 'admin' ? 'Preparando tu panel de administración…' : 'Preparando tu próxima aventura…'}</span></div>
      <div class="ica-loading__places" aria-hidden="true"><span>DUNAS</span><b>✦</b><span>OASIS</span><b>✦</b><span>MAR</span></div>
      <button class="ica-loading__skip" type="button">Continuar sin esperar <span aria-hidden="true">↗</span></button>
    </div><span class="ica-loading__signature" aria-hidden="true">HECHO PARA DESCUBRIR</span>`;
    document.body.append(overlay);
    // A missing stylesheet must not leave unstyled artwork covering the page.
    if (getComputedStyle(overlay).position !== 'fixed') { remove(); return; }
    root.classList.add('ica-loading-active'); lockContent();
    overlay.querySelector('button').addEventListener('click', () => finish(true));
    observer = new MutationObserver(checkReady);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-busy'], characterData: true });
    // Fail open: a stalled image, API or bundle must never trap the visitor.
    deadline = setTimeout(() => finish(true), mode === 'admin' ? 12000 : 8000);
    slowTimer = setTimeout(() => setStatus('La conexión está tardando. Puedes continuar sin esperar.'), 5000);
    checkReady();
  }

  window.IcaLoader = { show, hide: () => finish(true) };
  let seen = false;
  try { seen = sessionStorage.getItem(seenKey) === '1'; } catch { /* Show normally without storage. */ }
  const reload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
  const shouldShow = adminPage || !seen || reload;
  const mount = () => { if (shouldShow) show(); };
  if (document.body) mount();
  else {
    const bodyObserver = new MutationObserver(() => { if (document.body) { bodyObserver.disconnect(); mount(); } });
    bodyObserver.observe(root, { childList: true });
  }
  function ready() {
    domReady = true;
    if (active) { lockContent(); overlay.querySelector('button').focus({ preventScroll: true }); }
    // Run after the other DOMContentLoaded handlers create the public CMS shell.
    requestAnimationFrame(() => requestAnimationFrame(checkReady));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true }); else ready();
  document.addEventListener('load', checkReady, true);
  document.addEventListener('error', checkReady, true);
  window.addEventListener('pageshow', (event) => { if (event.persisted) remove(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && active) finish(true); });
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const target = new URL(link.href, location.href);
    if (target.origin !== location.origin || !target.pathname.endsWith('/html/admin.html')) return;
    navigating = true; show('admin'); // Keep native navigation, history and authentication intact.
  });
})();
