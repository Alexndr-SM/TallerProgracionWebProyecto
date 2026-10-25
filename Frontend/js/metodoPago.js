/* Carrito de demostración. Las reservas y sus estados se guardan en la API. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('form-reserva'), fields = $('reserva-campos'), select = $('promocion');
  const guests = $('personas'), date = $('fecha'), method = $('pago'), notice = $('reserva-mensaje');
  const user = window.Auth.getUser(), params = new URLSearchParams(location.search);
  const promotions = new Map(), reservations = new Map();
  const storageKey = `icat_checkout_reservation_${user?.id || user?.email || 'guest'}`;
  const money = (value) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value));
  const labels = { tarjeta: 'Tarjeta · demostración', paypal: 'PayPal · demostración', yape: 'Yape / Plin · demostración' };
  let active = null, busy = false, listing = false;
  function node(tag, cls, text) { const item = document.createElement(tag); if (cls) item.className = cls; if (text !== undefined) item.textContent = text; return item; }
  function message(text, error = false) { notice.hidden = !text; notice.textContent = text; notice.dataset.error = String(error); }
  function remember(id) { try { if (id) sessionStorage.setItem(storageKey, String(id)); else sessionStorage.removeItem(storageKey); } catch { /* La API sigue siendo la fuente del estado. */ } }
  function remembered() { try { return Number(sessionStorage.getItem(storageKey)); } catch { return null; } }
  function setBusy(value) {
    busy = value; fields.disabled = value || Boolean(active);
    document.querySelectorAll('.checkout-page button:not(dialog button)').forEach((button) => { button.disabled = value; });
    $('confirmar-reserva').textContent = value ? 'Guardando…' : 'Guardar mi reserva ↗';
    document.querySelector('.checkout-grid').setAttribute('aria-busy', String(value));
  }
  async function api(path, options = {}) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(`${(window.API_URL || '').replace(/\/$/, '')}/api${path}`, {
        ...options, cache: 'no-store', signal: controller.signal,
        headers: { Authorization: `Bearer ${window.Auth.getToken() || ''}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        if (response.status === 401) { form.hidden = true; $('reserva-guardada').hidden = true; $('reserva-acceso').hidden = false; }
        throw new Error(data.message || 'No se pudo completar la operación.');
      }
      return data;
    } catch (error) { if (error.name === 'AbortError') throw new Error('El servidor está tardando. Actualiza tus reservas antes de volver a intentarlo.'); throw error; }
    finally { clearTimeout(timer); }
  }
  function friendlyDate(value) {
    const raw = String(value || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Por elegir';
  }
  function stateLabel(reservation) {
    if (reservation.estado === 'cancelada') return reservation.estado_pago === 'reembolsado' ? 'Cancelada · Reembolso simulado' : 'Reserva cancelada';
    return reservation.estado_pago === 'pagado' ? 'Confirmada · Pago de demostración completado' : 'Reserva guardada · Pago pendiente';
  }
  function summary() {
    const promotion = promotions.get(Number(active ? active.promocion_id : select.value));
    const count = active ? Number(active.asistentes) : Number(guests.value);
    const unit = active ? Number(active.precio_unitario) : Number(promotion?.precio || 0);
    const total = active ? Number(active.total) : Math.round(unit * 100) * (Number.isInteger(count) && count > 0 ? count : 0) / 100;
    $('resumen-promocion').textContent = active?.promocion_nombre || promotion?.titulo || promotion?.nombre || 'Elige tu experiencia';
    $('resumen-fecha').textContent = friendlyDate(active?.fecha_tour || date.value);
    $('resumen-personas').textContent = `${count || 0} ${count === 1 ? 'persona' : 'personas'}`;
    $('resumen-unitario').textContent = unit ? money(unit) : '—';
    $('resumen-total').textContent = unit ? money(total) : '—';
    $('resumen-metodo').textContent = labels[active?.metodo_pago || method.value] || 'Por elegir';
    $('reserva-total').textContent = active ? stateLabel(active) : promotion ? 'El total se confirma al guardar la reserva. Pago de prueba, sin cargos reales.' : 'Selecciona una experiencia para calcular el total.';
    const image = $('resumen-imagen');
    image.src = promotion?.imagen_principal_url || window.IcaCMS?.imageFor(promotion || {}) || 'https://res.cloudinary.com/plhejhea/image/upload/v1792338022/imagendunas.jpg';
    image.alt = promotion?.titulo || 'Paisaje de Ica';
    $('resumen-destino').textContent = promotion?.destino_nombre || 'Ica, Perú';
    const link = $('ver-experiencia'); link.href = promotion ? `promocion.html?slug=${encodeURIComponent(promotion.slug)}` : '../index.html#destinos'; link.textContent = promotion ? 'Ver experiencia ↗' : 'Explorar experiencias ↗';
  }
  $('resumen-imagen').addEventListener('error', function () { if (!this.src.endsWith('/https://res.cloudinary.com/plhejhea/image/upload/v1792338022/imagendunas.jpg')) this.src = 'https://res.cloudinary.com/plhejhea/image/upload/v1792338022/imagendunas.jpg'; });
  function showReservation(reservation, scroll = false) {
    active = reservation; remember(reservation.id);
    form.hidden = true; $('reserva-guardada').hidden = false;
    $('reserva-numero').textContent = `Reserva #${reservation.id}`; $('reserva-estado').textContent = stateLabel(reservation);
    const pending = reservation.estado !== 'cancelada' && reservation.estado_pago === 'pendiente';
    $('completar-pago').hidden = !pending; $('cancelar-reserva').hidden = !pending; $('pago-aviso').hidden = !pending;
    document.querySelectorAll('.checkout-steps li').forEach((item, index) => {
      item.removeAttribute('aria-current'); if (index === (reservation.estado_pago === 'pagado' ? 2 : 1)) item.setAttribute('aria-current', 'step');
    });
    summary(); if (scroll) document.querySelector('.checkout-form').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
  function renderReservations() {
    const list = $('lista-reservas'); list.replaceChildren(); $('mis-reservas').hidden = false;
    if (!reservations.size) list.append(node('p', 'checkout-help', 'Aún no tienes reservas. Tu próxima experiencia puede empezar hoy.'));
    [...reservations.values()].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 8).forEach((reservation) => {
      const card = node('article', 'checkout-reservation');
      card.append(node('span', 'checkout-badge', stateLabel(reservation)), node('h3', '', reservation.promocion_nombre || 'Experiencia en Ica'),
        node('p', '', `#${reservation.id} · ${friendlyDate(reservation.fecha_tour)} · ${reservation.asistentes} viajeros · ${money(reservation.total)}`));
      const button = node('button', 'checkout-button checkout-button--quiet', reservation.estado_pago === 'pendiente' && reservation.estado !== 'cancelada' ? 'Retomar reserva →' : 'Ver resumen →');
      button.type = 'button'; button.disabled = busy; button.addEventListener('click', () => { if (!busy) { message(''); showReservation(reservation, true); } }); card.append(button); list.append(card);
    });
  }
  async function loadReservations(restore = false) {
    if (!window.Auth.getToken() || listing) return;
    listing = true;
    try {
      const data = await api('/perfil/reservas'); reservations.clear();
      data.reservas.forEach((item) => reservations.set(Number(item.id), item)); renderReservations();
      if (active && reservations.has(Number(active.id))) showReservation(reservations.get(Number(active.id)));
      else if (restore && reservations.has(remembered())) {
        const saved = reservations.get(remembered());
        if (!params.get('promocion') || promotions.get(Number(saved.promocion_id))?.slug === params.get('promocion')) showReservation(saved);
      }
    } finally { listing = false; }
  }
  function confirmAction(title, text, label) {
    const dialog = $('checkout-confirmacion'); $('confirmacion-titulo').textContent = title; $('confirmacion-texto').textContent = text; $('confirmacion-aceptar').textContent = label; dialog.returnValue = '';
    return new Promise((resolve) => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirmar'), { once: true }); dialog.showModal(); });
  }
  async function mutate(action) {
    if (busy || !active) return;
    const reservation = active;
    const paid = action === 'confirmar-pago';
    const accepted = await confirmAction(paid ? 'Prueba tu pago' : '¿Cancelar esta reserva?',
      paid ? `Simularemos un pago de ${money(reservation.total)} con ${labels[reservation.metodo_pago] || 'tu método elegido'}. Tu reserva quedará confirmada. Es una demostración: no se hará ningún cobro ni se necesitan datos bancarios.` : `Se cancelará la reserva #${reservation.id} de “${reservation.promocion_nombre}”. Podrás preparar otra reserva cuando quieras.`,
      paid ? 'Completar pago de prueba' : 'Sí, cancelar reserva');
    if (!accepted) return;
    setBusy(true); message(paid ? 'Procesando tu pago de prueba…' : 'Cancelando reserva…');
    try {
      const data = await api(`/perfil/reservas/${reservation.id}/${action}`, { method: 'PATCH' });
      const updated = data.reserva || { ...reservation, estado: 'cancelada' };
      reservations.set(Number(reservation.id), updated); showReservation(updated); renderReservations();
      message(paid ? `Pago ficticio completado: ${money(updated.total)}. Tu reserva #${updated.id} está confirmada. ¡Nos vemos en Ica!` : 'Reserva cancelada. Puedes elegir otra experiencia cuando quieras.');
    } catch (error) { message(error.message, true); try { await loadReservations(); } catch { /* Se conserva el error de la operación. */ } }
    finally { setBusy(false); }
  }
  $('completar-pago').addEventListener('click', () => mutate('confirmar-pago'));
  $('cancelar-reserva').addEventListener('click', () => mutate('cancelar'));
  $('nueva-reserva').addEventListener('click', () => {
    if (busy) return; active = null; remember(null); form.hidden = false; $('reserva-guardada').hidden = true; fields.disabled = false; message('');
    document.querySelectorAll('.checkout-steps li').forEach((item, index) => { item.removeAttribute('aria-current'); if (!index) item.setAttribute('aria-current', 'step'); }); summary(); select.focus();
  });
  $('actualizar-reservas').addEventListener('click', async () => { if (busy || listing) return; setBusy(true); try { await loadReservations(); message('Reservas actualizadas.'); } catch (error) { message(error.message, true); } finally { setBusy(false); } });
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (busy || active || !form.reportValidity()) return;
    if (!promotions.has(Number(select.value))) return message('Selecciona una experiencia disponible.', true);
    setBusy(true); message('Guardando tu reserva…');
    try {
      const data = await api('/reservas', { method: 'POST', body: { fecha_tour: date.value, asistentes: Number(guests.value), metodo_pago: method.value, promocion_id: Number(select.value) } });
      reservations.set(Number(data.reserva.id), data.reserva); showReservation(data.reserva); renderReservations(); message('Reserva guardada. Ahora puedes simular el pago o cancelarla desde aquí.');
    } catch (error) { message(error.message, true); }
    finally { setBusy(false); }
  });
  [select, guests, date, method].forEach((input) => input.addEventListener('input', summary));
  date.min = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (!window.Auth.getToken() || !user?.email) { form.hidden = true; $('reserva-acceso').hidden = false; }
  else { $('nombre').value = user.nombre || ''; $('email').value = user.email; }
  async function start() {
    try {
      const data = await api('/promociones'); select.replaceChildren(new Option('Selecciona tu experiencia', ''));
      data.promotions.forEach((item) => { promotions.set(Number(item.id), item); select.add(new Option(`${item.titulo || item.nombre} · ${money(item.precio)}`, item.id)); });
      const selected = data.promotions.find((item) => item.slug === params.get('promocion')); if (selected) select.value = String(selected.id);
      select.disabled = !promotions.size;
      if (!promotions.size) select.replaceChildren(new Option('Pronto tendremos nuevas experiencias', ''));
      summary();
    } catch (error) { select.replaceChildren(new Option('No se pudieron cargar las experiencias', '')); message(error.message, true); }
    try { await loadReservations(true); } catch (error) { message(`No pudimos consultar tus reservas: ${error.message}`, true); }
  }
  start();
})();
