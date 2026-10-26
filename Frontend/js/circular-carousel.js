/* IcaTurismo: adaptación Vanilla del panorama de CircularCarousel (React Bits).
 * Copyright (c) 2026 David Haz. Aviso completo: ../licenses/react-bits.md.
 * Solo la plantilla de promociones carga este módulo; no requiere React ni un build.
 */
(function () {
  'use strict';
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const modulo = (n, size) => ((n % size) + size) % size;
  const wrap = (angle) => modulo(angle + 180, 360) - 180;
  const rad = Math.PI / 180;
  const make = (tag, className, text) => { const node = document.createElement(tag); node.className = className; if (text !== undefined) node.textContent = text; return node; };
  let sequence = 0;

  function create({ images, title, onOpen, photo }) {
    const sources = [...new Set(images)];
    if (!sources.length) return null;
    const count = sources.length, id = `ica-panorama-${++sequence}`;
    const controller = new AbortController(), signal = controller.signal;
    const listen = (target, type, fn, options = {}) => target.addEventListener(type, fn, { ...options, signal });
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const host = make('div', 'cms-circular-gallery');
    const viewport = make('div', 'circular-carousel');
    viewport.tabIndex = 0; viewport.setAttribute('role', 'region'); viewport.setAttribute('aria-roledescription', 'carrusel'); viewport.setAttribute('aria-label', `Galería de ${title}`); viewport.setAttribute('aria-describedby', `${id}-help`);
    const view = make('div', 'circular-carousel__view'); view.setAttribute('aria-hidden', 'true');
    const stage = make('div', 'circular-carousel__stage'), camera = make('div', 'circular-carousel__camera'), ring = make('div', 'circular-carousel__ring');
    stage.append(camera); camera.append(ring); view.append(stage); viewport.append(view);
    const controls = make('div', 'circular-carousel__arrows');
    function button(className, text, label) { const node = make('button', className, text); node.type = 'button'; node.setAttribute('aria-label', label); return node; }
    const prev = button('circular-carousel__prev', '←', `Imagen anterior de ${title}`), next = button('circular-carousel__next', '→', `Imagen siguiente de ${title}`);
    controls.append(prev, next); viewport.append(controls);
    const caption = make('div', 'circular-carousel__caption');
    const counter = make('span', 'circular-carousel__count', `01 / ${String(count).padStart(2, '0')}`);
    const pause = button('circular-carousel__pause', '', 'Pausar galería');
    const open = button('circular-carousel__open', 'Ampliar imagen', 'Ampliar imagen actual');
    const status = make('div', 'circular-carousel__status'); status.append(counter, pause, open);
    const hint = make('p', 'circular-carousel__hint', count > 1 ? 'Arrastra o usa las flechas. Pulsa la foto centrada para ampliarla.' : 'Un recuerdo de esta experiencia. Pulsa la imagen para ampliarla.'); hint.id = `${id}-help`;
    const live = make('span', 'circular-carousel__live'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
    caption.append(status, hint); host.append(viewport, caption, live);

    const flat = count === 1 || !window.CSS?.supports('transform-style', 'preserve-3d');
    host.classList.toggle('is-single', count === 1); host.classList.toggle('is-flat', flat);
    const slots = flat ? count : count * Math.ceil(8 / count), step = 360 / slots;
    const cards = Array.from({ length: slots }, (_, index) => {
      const card = make('div', 'circular-carousel__card'); card.dataset.ccIndex = String(index);
      const tiles = Array.from({ length: flat ? 1 : 8 }, () => {
        const tile = make('div', 'circular-carousel__tile'), frame = make('div', 'circular-carousel__frame');
        const image = photo(sources[index % count], '', false); image.className = 'circular-carousel__photo'; image.draggable = false;
        const shade = make('span', 'circular-carousel__shade'); frame.append(image, shade); tile.append(frame); card.append(tile);
        return { tile, frame, image };
      });
      ring.append(card); return { card, tiles };
    });
    let raf = 0, holdTimer = 0, wheelTimer = 0, wheeling = false, destroyed = false, inView = false, last = 0, active = 0, width = 220, height = 293, radius = 400, fit = 1;
    let angle = 0, velocity = 0, target = null, hover = false, focus = false, modal = null, manualPause = motion.matches;
    let press = null, dragging = false, suppressClick = false, holdUntil = 0, introStart = null, introduced = motion.matches, manualChange = false;
    let pointer = { x: 0, y: 0 }, yaw = 0, pitch = 0;
    function pauseLabel() { pause.textContent = manualPause ? '▶' : 'Ⅱ'; pause.setAttribute('aria-label', `${manualPause ? 'Reanudar' : 'Pausar'} galería de ${title}`); pause.setAttribute('aria-pressed', String(manualPause)); }
    pauseLabel();
    function announce() { live.textContent = `Imagen ${active + 1} de ${count} · ${title}`; }
    function setActive(index) { const value = modulo(index, count); if (active === value) return; active = value; counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`; }
    function stop() { cancelAnimationFrame(raf); raf = 0; last = 0; }
    function wake() { if (!destroyed && !raf && inView && !document.hidden && !modal) raf = requestAnimationFrame(frame); }
    function hold() { clearTimeout(holdTimer); holdUntil = performance.now() + 3200; holdTimer = setTimeout(wake, 3210); }
    function focusSlot(index) {
      hold(); introduced = true; introStart = null; velocity = 0; manualChange = true;
      if (flat) { angle = index * step; setActive(index); cards[active].card.scrollIntoView({ block: 'nearest', inline: 'center', behavior: motion.matches ? 'instant' : 'smooth' }); announce(); return; }
      target = index * step;
      target += 360 * Math.round((angle - target) / 360);
      if (motion.matches) { angle = target; target = null; render(performance.now()); announce(); manualChange = false; }
      wake();
    }
    function move(delta) { focusSlot((target === null ? Math.round(angle / step) : Math.round(target / step)) + delta); }
    function showImage() {
      if (destroyed) return;
      velocity = 0; introduced = true; introStart = null; stop();
      modal = onOpen(active) || null;
      if (modal) modal.addEventListener('close', () => { modal = null; hold(); wake(); }, { once: true, signal });
      else wake();
    }
    function measure() {
      if (destroyed || flat) return;
      const rect = viewport.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      width = clamp(rect.width * .23, 190, 300); height = width / .75;
      radius = Math.max(slots * (width + 25) / (2 * Math.PI), width * .6);
      fit = Math.min(1, (rect.height * .88) / height);
      stage.style.perspective = `${radius}px`; stage.style.transform = `scale(${fit})`;
      cards.forEach(({ tiles }) => tiles.forEach(({ tile, frame: tileFrame, image }, i) => {
        const start = i * width / 8 - (i ? 1.25 : 0), end = (i + 1) * width / 8 + (i < 7 ? 1.25 : 0);
        const center = (start + end) / 2 - width / 2, alpha = center / radius;
        const size = end - start;
        Object.assign(tile.style, { left: `${-size / 2}px`, top: `${-height / 2}px`, width: `${size}px`, height: `${height}px`, transform: `translate3d(${radius * Math.sin(alpha)}px,0,${radius * (1 - Math.cos(alpha))}px) rotateY(${-alpha / rad}deg)` });
        Object.assign(tileFrame.style, { height: `${height}px`, borderRadius: `${i === 0 ? 12 : 0}px ${i === 7 ? 12 : 0}px ${i === 7 ? 12 : 0}px ${i === 0 ? 12 : 0}px` });
        Object.assign(image.style, { left: `${-start}px`, top: '0', width: `${width}px`, height: `${height}px` });
      }));
      render(performance.now()); wake();
    }
    function render(now) {
      if (flat) return;
      const progress = introStart === null ? 1 : clamp((now - introStart) / 1800, 0, 1);
      const spin = introStart === null ? 0 : -300 * Math.pow(1 - progress, 4);
      const scale = 1 + .06 * Math.min(1, Math.abs(velocity) / 420);
      const r = radius * scale;
      camera.style.transform = `translate3d(0,0,${radius - 1}px) rotateX(${pitch}deg) rotateY(${yaw}deg)`;
      ring.style.transform = `rotateY(${angle + spin}deg)`;
      cards.forEach(({ card }, index) => {
        const base = -index * step, world = wrap(base + angle + spin), facing = Math.cos(world * rad);
        card.style.transform = `rotateY(${base}deg) translateZ(${-r}px)`;
        card.style.visibility = Math.abs(world) > 86 ? 'hidden' : '';
        card.style.setProperty('--cc-depth', (.55 * Math.pow((1 - facing) / 2, 1.25)).toFixed(3));
      });
      setActive(Math.round(angle / step));
    }
    function frame(now) {
      raf = 0; if (destroyed || !inView || document.hidden || modal || flat) { last = 0; return; }
      const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60; last = now;
      const paused = manualPause || hover || focus || dragging || now < holdUntil;
      if (!introduced && !paused) { if (introStart === null) introStart = now; if (now - introStart >= 1800) { introduced = true; introStart = null; } }
      if (paused && introStart !== null) { introduced = true; introStart = null; }
      let busy = dragging || introStart !== null;
      if (!dragging && !wheeling && target !== null) {
        let remaining = dt;
        while (remaining > 0) { const h = Math.min(remaining, 1 / 240); velocity += (118 * (target - angle) - 2 * Math.sqrt(118) * velocity) * h; angle += velocity * h; remaining -= h; }
        if (Math.abs(target - angle) < .004 && Math.abs(velocity) < .03) { angle = target; velocity = 0; target = null; if (manualChange) { setActive(Math.round(angle / step)); announce(); manualChange = false; } }
        busy = target !== null;
      } else if (!dragging && !wheeling && introStart === null) {
        const cruise = paused ? 0 : 5;
        velocity += (cruise - velocity) * (1 - Math.exp(-dt / 1.08)); angle += velocity * dt;
        if (!cruise && Math.abs(velocity) < 9) {
          const nearest = Math.round(angle / step) * step;
          if (Math.abs(nearest - angle) > .004) target = nearest;
          else { angle = nearest; velocity = 0; }
        }
        busy = cruise !== 0 || Math.abs(velocity) > .01 || target !== null;
      }
      const aimX = motion.matches || !hover ? 0 : pointer.x * 2.7, aimY = motion.matches || !hover ? 0 : -pointer.y * 1.8;
      const ease = 1 - Math.exp(-dt / .35); yaw += (aimX - yaw) * ease; pitch += (aimY - pitch) * ease;
      busy ||= Math.abs(aimX - yaw) > .01 || Math.abs(aimY - pitch) > .01;
      render(now);
      // No se mantienen bucles de animación o temporizadores cuando está en pausa.
      if (busy && !destroyed) raf = requestAnimationFrame(frame); else last = 0;
    }
    listen(prev, 'click', () => move(-1)); listen(next, 'click', () => move(1)); listen(open, 'click', showImage);
    listen(pause, 'click', () => { manualPause = !manualPause; pauseLabel(); if (!manualPause) { clearTimeout(holdTimer); holdUntil = 0; focus = false; } wake(); });
    listen(host, 'focusin', (event) => { focus = event.target !== pause; wake(); });
    listen(host, 'focusout', (event) => { if (!host.contains(event.relatedTarget)) { focus = false; wake(); } });
    listen(host, 'pointerenter', (event) => { if (event.pointerType === 'mouse') { hover = true; wake(); } });
    listen(host, 'pointerleave', (event) => { if (event.pointerType === 'mouse') { hover = false; pointer = { x: 0, y: 0 }; wake(); } });
    listen(viewport, 'keydown', (event) => {
      if (event.target.closest('button')) return;
      if (event.key === 'ArrowRight') move(1); else if (event.key === 'ArrowLeft') move(-1);
      else if (event.key === 'Home') focusSlot(0); else if (event.key === 'End') focusSlot(count - 1);
      else if (event.key === 'Enter' || event.key === ' ') showImage(); else return;
      event.preventDefault();
    });
    listen(viewport, 'click', (event) => {
      if (suppressClick) { suppressClick = false; return; }
      const card = event.target.closest('[data-cc-index]'); if (!card) return;
      const slot = Number(card.dataset.ccIndex);
      if (modulo(slot, count) === active || flat) { if (flat) setActive(slot); showImage(); } else focusSlot(slot);
    });
    if (!flat) {
      viewport.dataset.draggable = '';
      listen(viewport, 'pointerdown', (event) => {
        if (event.button !== 0 || event.target.closest('button')) return;
        clearTimeout(wheelTimer); wheeling = false;
        suppressClick = false; press = { id: event.pointerId, x: event.clientX, y: event.clientY, angle, samples: [] }; hold();
      });
      listen(viewport, 'pointermove', (event) => {
        if (event.pointerType === 'mouse') { const box = viewport.getBoundingClientRect(); pointer = { x: clamp((event.clientX - box.left) / box.width * 2 - 1, -1, 1), y: clamp((event.clientY - box.top) / box.height * 2 - 1, -1, 1) }; wake(); }
        if (!press || press.id !== event.pointerId) return;
        const dx = event.clientX - press.x, dy = event.clientY - press.y;
        if (!dragging) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 5) return;
          if (Math.abs(dy) > Math.abs(dx) * 1.2 && event.pointerType !== 'mouse') { press = null; return; }
          dragging = true; introduced = true; introStart = null; target = null; velocity = 0; viewport.dataset.dragging = '';
          try { viewport.setPointerCapture(event.pointerId); } catch { /* Un gesto cancelado no debe bloquear la página. */ }
        }
        angle = press.angle - dx * 180 / (Math.PI * radius * fit);
        const now = performance.now(); press.samples.push({ time: now, angle }); while (press.samples.length > 2 && now - press.samples[0].time > 110) press.samples.shift(); wake();
      });
      function release(event) {
        if (!press || press.id !== event.pointerId) return;
        const samples = press.samples; press = null;
        if (!dragging) return;
        dragging = false; delete viewport.dataset.dragging; suppressClick = true;
        if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
        const first = samples[0], final = samples.at(-1), duration = first && final ? (final.time - first.time) / 1000 : 0;
        velocity = motion.matches || event.type === 'pointercancel' || duration < .008 ? 0 : clamp((final.angle - first.angle) / duration, -400, 400);
        target = Math.round((angle + velocity * 1.08 * .55) / step) * step; manualChange = true; hold();
        if (motion.matches) { angle = target; target = null; velocity = 0; render(performance.now()); announce(); manualChange = false; }
        wake();
      }
      listen(viewport, 'pointerup', release); listen(viewport, 'pointercancel', release); listen(viewport, 'lostpointercapture', release);
      listen(viewport, 'wheel', (event) => {
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 2) return;
        event.preventDefault(); introduced = true; introStart = null; wheeling = true; target = null;
        const delta = event.deltaX * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1);
        const degrees = delta * 180 / (Math.PI * radius * fit);
        angle += degrees; velocity = motion.matches ? 0 : clamp(degrees * 30, -400, 400); hold();
        clearTimeout(wheelTimer); wheelTimer = setTimeout(() => {
          wheeling = false; manualChange = true; target = Math.round((angle + velocity * .12) / step) * step;
          if (motion.matches) { angle = target; target = null; render(performance.now()); announce(); manualChange = false; }
          wake();
        }, 140); wake();
      }, { passive: false });
    }
    if (flat && count > 1) listen(view, 'scroll', () => { const center = view.getBoundingClientRect().left + view.clientWidth / 2; let nearest = 0, distance = Infinity; cards.forEach(({ card }, index) => { const box = card.getBoundingClientRect(), gap = Math.abs(box.left + box.width / 2 - center); if (gap < distance) { nearest = index; distance = gap; } }); angle = nearest * step; setActive(nearest); }, { passive: true });
    listen(document, 'visibilitychange', () => { if (document.hidden) stop(); else wake(); });
    listen(motion, 'change', () => { manualPause = motion.matches; introduced = true; introStart = null; velocity = 0; pauseLabel(); wake(); });
    const resize = !flat && 'ResizeObserver' in window ? new ResizeObserver(measure) : null; resize?.observe(viewport);
    if (!resize && !flat) listen(window, 'resize', measure);
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (inView) { measure(); wake(); } else stop(); }, { threshold: .05 }) : null;
    observer?.observe(viewport); if (!observer) { inView = true; requestAnimationFrame(measure); }
    viewport.dataset.ready = ''; controls.hidden = count === 1; pause.hidden = flat;
    return { element: host, destroy() { if (destroyed) return; destroyed = true; stop(); clearTimeout(holdTimer); clearTimeout(wheelTimer); controller.abort(); resize?.disconnect(); observer?.disconnect(); if (modal?.open) modal.close(); modal = null; } };
  }
  window.IcaCircularCarousel = { create };
})();
