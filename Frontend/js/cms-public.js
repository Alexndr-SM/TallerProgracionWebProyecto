/* Catálogo público. Todo contenido editorial se inserta como texto, nunca como HTML. */
(function () {
  'use strict';
  const scriptUrl = document.currentScript.src;
  const root = new URL('../', scriptUrl);
  const url = (path) => new URL(path, root).href;
  const link = (kind, slug) => url(`html/${kind}.html?slug=${encodeURIComponent(slug)}`);
  const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  const anchor = (label, href, className) => { const node = el('a', className, label); node.href = href; return node; };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = (value) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value));
  const slug = new URLSearchParams(location.search).get('slug');
  let destinations = [], promotions = [], signature = '', destinationSignature = '', loading = false, loaded = false;
  let observer;
  const carouselCleanups = new Set();
  const carouselSizes = 'ResizeObserver' in window ? new ResizeObserver((entries) => entries.forEach((entry) => entry.target.dispatchEvent(new Event('cms:resize')))) : null;
  if (!reduced && 'IntersectionObserver' in window) observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('cms-visible'); observer.unobserve(entry.target); }
  }), { threshold: .08 });

  const stylesheet = document.createElement('link'); stylesheet.rel = 'stylesheet'; stylesheet.href = url('css/cms-public.css'); document.head.append(stylesheet);
  function imageFor(record) {
    const candidate = record.imagen_principal_url || record.imagen_url;
    if (candidate && /^https:\/\//i.test(candidate)) return candidate;
    const name = record.destino_slug || record.slug || '';
    return name === 'playas'
      ? 'https://res.cloudinary.com/plhejhea/image/upload/v1792338022/imagenplaya.jpg'
      : name === 'cultura'
        ? 'https://res.cloudinary.com/plhejhea/image/upload/v1792338022/imagencultura.jpg'
        : 'https://res.cloudinary.com/plhejhea/image/upload/v1792338022/imagendunas.jpg';
  }
  function photo(src, alt, eager = false) {
    const image = el('img'); image.src = src; image.alt = alt; image.loading = eager ? 'eager' : 'lazy'; image.decoding = 'async';
    image.addEventListener('error', () => { if (image.src !== 'https://res.cloudinary.com/plhejhea/image/upload/v1792338022/imagendunas.jpg') image.src = 'https://res.cloudinary.com/plhejhea/image/upload/v1792338022/imagendunas.jpg'; }, { once: true });
    return image;
  }
  function reveal(node) {
    node.classList.add('cms-reveal');
    if (observer) observer.observe(node); else node.classList.add('cms-visible');
    return node;
  }
  function setupShell() {
    const header = document.querySelector('[data-cms-header]');
    if (header) header.innerHTML = `<header><div class="wrap header-inner"><div class="logo"><a href="${url('index.html')}"><img src="${url('assets/logoIcaTurismo.svg')}" alt="IcaTurismo" class="logo-img"></a><p class="logo-name">IcaTurismo</p></div><nav class="site-nav" aria-label="Principal"><ul class="nav-links" id="navLinks"><li><a href="${url('index.html')}">Inicio</a></li><li><a href="${url('index.html#destinos')}">Destinos</a></li><li><a href="${url('html/contacto.html')}">Contacto</a></li></ul></nav><div class="header-actions"><button type="button" class="hamburger" id="hamburger" aria-label="Abrir menú" aria-expanded="false" aria-controls="navLinks"><span></span><span></span><span></span></button><button type="button" class="theme-toggle" data-theme-toggle aria-label="Cambiar a modo oscuro" aria-pressed="false"><svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg><svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button><a class="cart-link" href="${url('html/compras.html')}" aria-label="Reservas y compras"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2 10h11l3-7H6"/><circle cx="10" cy="19" r="1.5"/><circle cx="18" cy="19" r="1.5"/></svg></a></div></div></header>`;
    const footer = document.querySelector('[data-cms-footer]');
    if (footer) footer.innerHTML = `<footer><div class="wrap footer-content"><div class="footer-top"><div class="footer-brand"><a class="footer-logo" href="${url('index.html')}"><img src="${url('assets/logoIcaTurismo.svg')}" alt=""><span>IcaTurismo</span></a><p>Historias que empiezan con un viaje.</p></div><div class="footer-payment-banner"><img src="${url('https://res.cloudinary.com/plhejhea/image/upload/v1792338038/FormasDePago.png')}" alt="Opciones de pago: Visa, Mastercard, PayPal, Yape y Plin" loading="lazy"></div></div><div class="footer-main"><div class="footer-column"><h2>Explora</h2><ul><li><a href="${url('index.html')}">Inicio</a></li><li><a href="${url('index.html#destinos')}">Nuestros destinos</a></li><li><a href="${url('html/contacto.html')}">Contacto</a></li></ul></div><div class="footer-column"><h2>Destinos</h2><ul data-cms-footer-destinations></ul></div><div class="footer-column"><h2>Tu viaje</h2><ul><li><a href="${url('html/compras.html')}">Reservas y compras</a></li><li><a href="${url('html/perfil.html')}">Mi cuenta</a></li></ul></div><div class="footer-column"><h2>Conversemos</h2><address>Ica, Perú<br><a href="mailto:info@icaturismo.dev">info@icaturismo.dev</a></address><a class="footer-back-to-top" href="#contenido">Volver arriba ↑</a></div></div><div class="footer-bottom"><p>© ${new Date().getFullYear()} IcaTurismo · Hecho para descubrir</p><a href="${url('html/admin.html')}">Acceso del equipo</a></div></div></footer>`;
  }
  setupShell();

  function renderNavigation() {
    document.querySelectorAll('.footer-content a[href="#destinos"], .footer-content a[href="#inicio"]').forEach((item) => { item.href = url(`index.html${item.getAttribute('href')}`); });
    const nav = document.querySelector('#navLinks');
    if (nav) {
      const first = el('li'); first.append(anchor('Inicio', url('index.html')));
      const menuItem = el('li', 'cms-destination-menu');
      const details = el('details'); const summary = el('summary', '', 'Destinos');
      const list = el('ul', 'cms-dropdown');
      if (!destinations.length) { const item = el('li'); item.append(anchor('Explorar destinos', url('index.html#destinos'))); list.append(item); }
      destinations.forEach((destination) => { const item = el('li'); const a = anchor(destination.nombre, link('destino', destination.slug)); if (destination.slug === slug) a.setAttribute('aria-current', 'page'); item.append(a); list.append(item); });
      details.append(summary, list); menuItem.append(details);
      let closeTimer;
      details.addEventListener('pointerenter', (event) => {
        clearTimeout(closeTimer);
        if (event.pointerType !== 'touch' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) details.open = true;
      });
      details.addEventListener('pointerleave', () => {
        closeTimer = setTimeout(() => { if (!details.contains(document.activeElement)) details.open = false; }, 160);
      });
      details.addEventListener('keydown', (event) => { if (event.key === 'Escape') { details.open = false; summary.focus(); } });
      list.addEventListener('click', () => { details.open = false; nav.classList.remove('active'); const button = document.querySelector('#hamburger'); if (button) { button.classList.remove('active'); button.setAttribute('aria-expanded', 'false'); } });
      const contact = el('li'); contact.append(anchor('Contacto', url('html/contacto.html')));
      nav.replaceChildren(first, menuItem, contact);
    }
    document.querySelectorAll('[data-cms-footer-destinations], .footer-column').forEach((container) => {
      if (!container.matches('[data-cms-footer-destinations]') && container.querySelector('h2')?.textContent.trim() !== 'Destinos') return;
      const list = container.matches('ul') ? container : container.querySelector('ul'); if (!list) return;
      list.replaceChildren(...destinations.map((destination) => { const item = el('li'); item.append(anchor(destination.nombre, link('destino', destination.slug))); return item; }));
    });
  }
  document.addEventListener('click', (event) => document.querySelectorAll('.cms-destination-menu details[open]').forEach((details) => { if (!details.contains(event.target)) details.open = false; }));

  function renderHome() {
    const grid = document.querySelector('[data-cms-destinations], .home-page .grid-destinos'); if (!grid) return;
    grid.classList.add('cms-destination-grid');
    grid.replaceChildren(...destinations.map((destination, index) => {
      const card = anchor('', link('destino', destination.slug), 'cms-destination-card');
      const media = el('div', 'cms-destination-media'); media.append(photo(imageFor(destination), destination.nombre), el('span', 'cms-card-number', String(index + 1).padStart(2, '0')));
      const body = el('div', 'cms-destination-body'); body.append(el('span', 'cms-eyebrow', 'Tu próximo lugar favorito'), el('h3', '', destination.nombre), el('p', '', destination.descripcion || `Descubre experiencias y promociones para explorar ${destination.nombre}.`), el('span', 'cms-card-link', 'Descubrir destino ↗'));
      card.append(media, body); return reveal(card);
    }));
    grid.removeAttribute('aria-busy');
    if (!destinations.length) grid.append(el('p', 'cms-state', 'Muy pronto encontrarás nuevos destinos para descubrir.'));
  }
  function carousel(images, title, mini = false, href = '') {
    const outer = el('div', mini ? 'cms-mini-carousel' : 'cms-film');
    const track = el('div', mini ? 'cms-mini-track' : 'cms-film-track');
    track.tabIndex = 0; track.setAttribute('role', 'region'); track.setAttribute('aria-label', `Galería de ${title}`);
    // Dos grupos de reserva a cada lado cubren también una tira de varias fotos visibles.
    const cyclic = images.length > 1;
    const copies = cyclic ? 5 : 1;
    for (let copy = 0; copy < copies; copy++) images.forEach((src, index) => {
      const button = el(mini ? 'a' : 'button', 'cms-photo-button');
      if (mini) button.href = href; else button.type = 'button';
      button.setAttribute('aria-label', mini ? `Ver ${title}` : `Ampliar imagen ${index + 1} de ${title}`);
      if (cyclic && copy !== 2) { button.tabIndex = -1; button.setAttribute('aria-hidden', 'true'); }
      button.append(photo(src, `${title} · imagen ${index + 1}`));
      if (!mini) button.addEventListener('click', () => lightbox(images, index, title));
      track.append(button);
    });
    const controls = el('div', 'cms-carousel-controls cms-carousel-overlay'); const previous = el('button', 'cms-carousel-prev', '←'); const next = el('button', 'cms-carousel-next', '→');
    previous.type = next.type = 'button'; previous.setAttribute('aria-label', `Imagen anterior de ${title}`); next.setAttribute('aria-label', `Imagen siguiente de ${title}`);
    const pause = el('button', 'cms-carousel-pause', reduced ? '▶' : 'Ⅱ'); pause.type = 'button';
    const counter = el('span', 'cms-carousel-count', `1 / ${images.length}`);
    let paused = reduced, hovering = false, touching = false, inView = false, lastInteraction = 0, scrollTimer, ready = false;
    const step = () => (track.firstElementChild?.getBoundingClientRect().width || 320) + (parseFloat(getComputedStyle(track).columnGap) || 0);
    function jump(left) { const behavior = track.style.scrollBehavior; track.style.scrollBehavior = 'auto'; track.scrollTo({ left, behavior: 'instant' }); track.style.scrollBehavior = behavior; }
    function normalize() {
      if (!cyclic || !ready) return;
      const cycle = step() * images.length;
      const start = cycle * 2;
      if (track.scrollLeft < start - 2 || track.scrollLeft >= start + cycle - 2) jump(start + ((track.scrollLeft - start) % cycle + cycle) % cycle);
      const index = ((Math.round(track.scrollLeft / step()) % images.length) + images.length) % images.length;
      counter.textContent = `${index + 1} / ${images.length}`;
    }
    function move(direction) {
      normalize();
      track.scrollBy({ left: step() * direction, behavior: reduced ? 'instant' : 'smooth' });
    }
    previous.addEventListener('click', () => move(-1)); next.addEventListener('click', () => move(1));
    function sync() { if (track.clientWidth > 0 && cyclic) { jump(step() * images.length * 2); ready = true; } }
    function pauseLabel() { pause.textContent = paused ? '▶' : 'Ⅱ'; pause.setAttribute('aria-label', `${paused ? 'Reanudar' : 'Pausar'} galería de ${title}`); pause.setAttribute('aria-pressed', String(paused)); }
    pauseLabel(); pause.addEventListener('click', () => { paused = !paused; pauseLabel(); });
    track.addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(normalize, 180); }, { passive: true });
    outer.addEventListener('pointerenter', () => { hovering = true; }); outer.addEventListener('pointerleave', () => { hovering = false; });
    outer.addEventListener('pointerdown', () => { lastInteraction = Date.now(); touching = true; });
    const pointerUp = () => { touching = false; }; window.addEventListener('pointerup', pointerUp);
    track.addEventListener('cms:resize', sync);
    if (carouselSizes) carouselSizes.observe(track);
    track.addEventListener('keydown', (event) => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); } });
    controls.append(previous, next);
    const status = el('div', 'cms-carousel-status'); status.append(counter, pause);
    outer.append(track); if (cyclic) outer.append(controls, status);
    let visibility;
    if ('IntersectionObserver' in window) { visibility = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { threshold: .15 }); visibility.observe(outer); } else inView = true;
    const timer = cyclic ? setInterval(() => {
      if (!paused && inView && !hovering && !touching && !document.hidden && !outer.contains(document.activeElement) && !document.querySelector('.cms-lightbox[open]') && Date.now() - lastInteraction > 5000) move(1);
    }, mini ? 4800 : 3800) : null;
    carouselCleanups.add(() => { clearInterval(timer); clearTimeout(scrollTimer); visibility?.disconnect(); window.removeEventListener('pointerup', pointerUp); });
    requestAnimationFrame(sync);
    return outer;
  }
  function backgroundFor(record, parent) {
    const source = record.imagen_fondo_url || parent?.imagen_fondo_url || imageFor(record);
    document.body.style.setProperty('--cms-background-image', `url(${JSON.stringify(source)})`);
  }
  function recommendations(excludeIds = [], includeDestinationFallback = false) {
    const candidates = promotions.filter((item) => !excludeIds.includes(item.id));
    if (includeDestinationFallback && candidates.length < 3) candidates.push(...promotions.filter((item) => excludeIds.includes(item.id)));
    // Se mezcla una vez por render; el refresco sin cambios conserva la selección y los carruseles.
    for (let i = candidates.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]]; }
    if (!candidates.length) return document.createDocumentFragment();
    const section = el('section', 'wrap cms-recommendations');
    const heading = el('div', 'cms-section-heading'); heading.append(el('span', 'cms-eyebrow', 'Todavía queda mucho por vivir'), el('h2', '', 'Más experiencias para ti'), el('p', '', 'Una selección diferente para seguir descubriendo Ica.'));
    const grid = el('div', 'cms-offer-grid cms-recommendation-grid'); candidates.slice(0, 4).forEach((offer) => grid.append(promotionCard(offer)));
    section.append(heading, grid); return section;
  }
  function imagesFor(promotion) {
    return [...new Set([imageFor(promotion), ...(Array.isArray(promotion.galeria_urls) ? promotion.galeria_urls.filter((src) => /^https:\/\//i.test(src)) : [])])];
  }
  function lightbox(images, selected, title) {
    const dialog = el('dialog', 'cms-lightbox'); const close = el('button', 'cms-lightbox-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Cerrar imagen');
    const image = photo(images[selected], title, true); const caption = el('p'); const controls = el('div', 'cms-carousel-controls');
    const prev = el('button', '', '←'); const next = el('button', '', '→'); prev.type = next.type = 'button'; prev.setAttribute('aria-label', 'Imagen anterior'); next.setAttribute('aria-label', 'Imagen siguiente');
    function update(delta) { selected = (selected + delta + images.length) % images.length; image.src = images[selected]; image.alt = `${title} · imagen ${selected + 1}`; caption.textContent = `${title} · ${selected + 1} / ${images.length}`; }
    update(0); prev.addEventListener('click', () => update(-1)); next.addEventListener('click', () => update(1)); close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', (event) => { if (event.key === 'ArrowLeft') update(-1); if (event.key === 'ArrowRight') update(1); });
    controls.append(prev, caption, next); dialog.append(close, image, controls); document.body.append(dialog); dialog.showModal(); dialog.addEventListener('close', () => dialog.remove(), { once: true });
  }
  function breadcrumb(...items) {
    const nav = el('nav', 'cms-breadcrumb'); nav.setAttribute('aria-label', 'Ruta de navegación'); nav.append(anchor('Inicio', url('index.html')));
    items.forEach((item) => { nav.append(el('span', '', '/'), item.href ? anchor(item.name, item.href) : el('span', '', item.name)); }); return nav;
  }
  function promotionCard(promotion) {
    const card = reveal(el('article', 'cms-offer-card')); card.append(carousel(imagesFor(promotion).slice(0, 5), promotion.titulo, true, link('promocion', promotion.slug)));
    const content = el('div', 'cms-offer-content'); content.append(el('span', 'cms-eyebrow', promotion.duracion || 'Una experiencia para recordar'), el('h3', '', promotion.titulo), el('p', '', promotion.descripcion_corta || promotion.descripcion || 'Descubre esta experiencia en Ica.'));
    const bottom = el('div', 'cms-offer-bottom'); const price = el('div'); price.append(el('strong', '', money(promotion.precio)), el('small', '', 'por persona'));
    bottom.append(price, anchor('Ver experiencia ↗', link('promocion', promotion.slug), 'cms-text-link')); content.append(bottom); card.append(content); return card;
  }
  function renderDestination(main) {
    const destination = destinations.find((item) => item.slug === slug);
    if (!destination) return unavailable(main, 'Este destino no está disponible', 'Puede que haya cambiado su dirección o se haya retirado del catálogo.');
    const offers = promotions.filter((item) => item.destino_id === destination.id);
    document.title = `${destination.nombre} · IcaTurismo`;
    backgroundFor(destination);
    const hero = el('section', 'cms-destination-hero wrap');
    const info = el('div', 'cms-destination-intro'); info.append(breadcrumb({ name: destination.nombre }), el('span', 'cms-eyebrow', 'Ica, desde otra perspectiva'), el('h1', '', destination.nombre), el('p', 'cms-lead', destination.descripcion || `Déjate sorprender por ${destination.nombre}. Elige tu próxima experiencia y vive un viaje a tu medida.`));
    info.append(anchor(`Explorar ${offers.length} ${offers.length === 1 ? 'experiencia' : 'experiencias'} ↓`, '#experiencias', 'cms-button cms-button--primary'));
    const media = el('div', 'cms-destination-cover'); media.append(photo(imageFor(destination), destination.nombre, true), el('span', '', 'Lugares que se quedan contigo.'));
    hero.append(reveal(info), reveal(media));
    const section = el('section', 'cms-experiences wrap'); section.id = 'experiencias'; const heading = el('div', 'cms-section-heading'); heading.append(el('span', 'cms-eyebrow', 'El viaje empieza aquí'), el('h2', '', 'Encuentra tu próxima historia'), el('p', '', 'Experiencias elegidas para que disfrutes cada momento.'));
    const grid = el('div', 'cms-offer-grid'); offers.forEach((offer) => grid.append(promotionCard(offer))); if (!offers.length) grid.append(el('p', 'cms-state', 'Pronto publicaremos nuevas experiencias en este destino.'));
    section.append(heading, grid);
    const more = el('section', 'wrap cms-discover-heading'); more.append(el('h2', '', 'Sigue descubriendo'), el('p', '', 'Tu próximo recuerdo puede estar en otro rincón de Ica.'));
    main.replaceChildren(hero, section, more, recommendations(offers.map((offer) => offer.id), true));
  }
  function renderPromotion(main) {
    const promotion = promotions.find((item) => item.slug === slug);
    if (!promotion) return unavailable(main, 'Esta experiencia no está disponible', 'La promoción puede haberse retirado o estar temporalmente oculta. Explora otras experiencias.');
    const destination = destinations.find((item) => item.id === promotion.destino_id);
    const destinationLink = destination ? link('destino', destination.slug) : url('index.html#destinos');
    document.title = `${promotion.titulo} · IcaTurismo`;
    backgroundFor(promotion, destination);
    const heading = el('div', 'wrap'); heading.append(breadcrumb({ name: destination?.nombre || 'Destinos', href: destinationLink }, { name: promotion.titulo }));
    const hero = el('section', 'cms-promotion-hero wrap'); const info = el('div', 'cms-promotion-info');
    info.append(el('span', 'cms-eyebrow', `${destination?.nombre || 'Ica'} · Una experiencia inolvidable`), el('h1', '', promotion.titulo), el('p', 'cms-lead', promotion.descripcion_corta || promotion.descripcion));
    const meta = el('div', 'cms-meta'); if (promotion.duracion) meta.append(el('span', '', `◷ ${promotion.duracion}`)); if (promotion.ubicacion) meta.append(el('span', '', `⌖ ${promotion.ubicacion}`)); info.append(meta);
    const description = el('p', 'cms-description', promotion.descripcion_larga || promotion.descripcion); info.append(description);
    if (Array.isArray(promotion.incluye) && promotion.incluye.length) { const box = el('div', 'cms-includes'); const list = el('ul'); promotion.incluye.forEach((item) => list.append(el('li', '', item))); box.append(el('h2', '', 'Tu experiencia incluye'), list); info.append(box); }
    const booking = el('div', 'cms-booking'); const price = el('div', 'cms-booking-price'); price.append(el('span', '', 'Desde'), el('strong', '', money(promotion.precio)), el('small', '', 'por persona'));
    const actions = el('div', 'cms-booking-actions'); actions.append(anchor('Solicitar reserva ↗', url(`html/compras.html?promocion=${encodeURIComponent(promotion.slug)}&accion=reserva`), 'cms-button cms-button--primary'), anchor('Comprar experiencia', url(`html/compras.html?promocion=${encodeURIComponent(promotion.slug)}&accion=compra`), 'cms-button cms-button--outline'));
    booking.append(price, actions, el('small', 'cms-booking-note', 'Elige fecha y viajeros en el siguiente paso. Podrás reservar y probar un pago simulado, sin cobros reales.')); info.append(booking);
    const media = el('div', 'cms-promotion-cover'); media.append(photo(imageFor(promotion), promotion.titulo, true)); const tag = el('div', 'cms-image-caption'); tag.append(el('span', '', 'Vive el momento'), el('small', '', promotion.ubicacion || destination?.nombre || 'Ica, Perú')); media.append(tag);
    hero.append(reveal(info), reveal(media));
    const gallerySection = el('section', 'cms-gallery-section'); const galleryTitle = el('div', 'wrap cms-section-heading'); galleryTitle.append(el('span', 'cms-eyebrow', 'Un vistazo a lo que te espera'), el('h2', '', 'Imagina estar aquí'), el('p', '', 'Desliza, explora y guarda el recuerdo.'));
    gallerySection.append(galleryTitle, carousel(imagesFor(promotion), promotion.titulo));
    const extras = el('section', 'wrap cms-promotion-extras');
    if (promotion.itinerario) { const itinerary = el('div', 'cms-itinerary'); itinerary.append(el('span', 'cms-eyebrow', 'Cada momento cuenta'), el('h2', '', 'Así será tu experiencia'), el('p', '', promotion.itinerario)); extras.append(reveal(itinerary)); }
    const back = el('div', 'cms-more'); back.append(el('h2', '', 'Sigue descubriendo'), el('p', '', `Hay más historias esperándote en ${destination?.nombre || 'Ica'}.`), anchor('Ver todas las experiencias →', destinationLink, 'cms-button cms-button--outline')); extras.append(back);
    main.replaceChildren(heading, hero, gallerySection, extras, recommendations([promotion.id]));
  }
  function unavailable(main, title, description) {
    const box = el('section', 'wrap cms-unavailable'); box.append(el('span', 'cms-eyebrow', 'Sigamos explorando'), el('h1', '', title), el('p', '', description), anchor('Descubrir destinos', url('index.html#destinos'), 'cms-button cms-button--primary')); main.replaceChildren(box); document.title = `${title} · IcaTurismo`;
  }
  function showError(error) {
    const targets = [document.querySelector('[data-cms-page]'), document.querySelector('.home-page .grid-destinos')].filter(Boolean);
    targets.forEach((target) => {
      if (loaded) return;
      const box = el('div', 'cms-state'); box.setAttribute('role', 'status'); box.append(el('p', '', 'No pudimos cargar el contenido. El servidor puede estar iniciando.'));
      const retry = el('button', 'cms-button cms-button--outline', 'Volver a intentar'); retry.type = 'button'; retry.addEventListener('click', refresh); box.append(retry); target.replaceChildren(box); target.removeAttribute('aria-busy');
    });
    console.warn('Catálogo IcaTurismo:', error.message);
  }
  async function request(path) {
    const base = (window.API_URL || '').replace(/\/$/, '');
    if (!base) throw new Error('Falta la configuración de la API.');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 60000);
    try { const response = await fetch(`${base}/api${path}`, { cache: 'no-store', signal: controller.signal }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.message || 'No se pudo cargar el catálogo.'); return data; }
    finally { clearTimeout(timeout); }
  }
  async function refresh() {
    if (loading || document.hidden) return;
    loading = true;
    try {
      const [places, offers] = await Promise.all([request('/destinos'), request('/promociones')]);
      if (!Array.isArray(places.destinos) || !Array.isArray(offers.promotions)) throw new Error('La API devolvió un catálogo inválido.');
      destinations = places.destinos; promotions = offers.promotions;
      const nextDestinations = JSON.stringify(destinations); const next = JSON.stringify([destinations, promotions]);
      if (nextDestinations !== destinationSignature) { renderNavigation(); renderHome(); destinationSignature = nextDestinations; }
      if (next !== signature) { const main = document.querySelector('[data-cms-page]'); if (main) { carouselSizes?.disconnect(); carouselCleanups.forEach((cleanup) => cleanup()); carouselCleanups.clear(); if (main.dataset.cmsPage === 'destino') renderDestination(main); else renderPromotion(main); main.removeAttribute('aria-busy'); } signature = next; }
      loaded = true;
    } catch (error) { showError(error); }
    finally { loading = false; }
  }
  window.IcaCMS = { refresh, link, imageFor };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('focus', refresh);
  window.addEventListener('storage', (event) => { if (event.key === 'icat_catalog_updated') refresh(); });
  window.addEventListener('icat:catalog-updated', refresh);
  function start() {
    const home = document.querySelector('.home-page .grid-destinos');
    if (home) { home.setAttribute('aria-busy', 'true'); home.replaceChildren(el('p', 'cms-state', 'Cargando los destinos para tu próximo viaje…')); }
    refresh(); window.setInterval(refresh, 20000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
