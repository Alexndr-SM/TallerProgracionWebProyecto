const formReserva = document.getElementById('form-reserva');
const reservaLayout = document.querySelector('.reserva-layout');
const panelPago = document.getElementById('panel-pago');
const selectorPago = document.getElementById('pago');
const selectorPromocion = document.getElementById('promocion');
const selectorPersonas = document.getElementById('personas');
const formularioAcceso = document.getElementById('reserva-acceso');
const mensajeReserva = document.getElementById('reserva-mensaje');
const botonConfirmar = document.getElementById('confirmar-reserva');
const precioTotal = document.getElementById('reserva-total');
const promociones = new Map();
const usuario = window.Auth.getUser();

const formatoPrecio = (amount) => new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
}).format(amount);

if (!window.Auth.getToken() || !usuario?.email) {
  formReserva.hidden = true;
  formularioAcceso.hidden = false;
} else {
  document.getElementById('nombre').value = usuario.nombre || '';
  document.getElementById('email').value = usuario.email;
  document.getElementById('nombre').readOnly = true;
  document.getElementById('email').readOnly = true;
}

function selectedPromotion() {
  return promociones.get(Number(selectorPromocion.value));
}

function updatePrice() {
  const promotion = selectedPromotion();
  if (!promotion) {
    precioTotal.textContent = 'Selecciona una promoción para ver el total.';
    return;
  }
  const attendees = Number(selectorPersonas.value) || 0;
  precioTotal.textContent = `${formatoPrecio(Number(promotion.precio))} por persona · Total: ${formatoPrecio(Number(promotion.precio) * attendees)}`;
}

async function loadPromotions() {
  const base = (window.API_URL || '').replace(/\/$/, '');
  if (!base) throw new Error('No se configuró la dirección de la API.');
  const response = await fetch(`${base}/api/promociones`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok || !Array.isArray(data.promotions)) {
    throw new Error(data.message || 'No se pudieron cargar las promociones.');
  }

  const requestedSlug = new URLSearchParams(window.location.search).get('promocion');
  selectorPromocion.replaceChildren(new Option('Selecciona una promoción', ''));
  data.promotions.forEach((promotion) => {
    promociones.set(Number(promotion.id), promotion);
    selectorPromocion.add(new Option(`${promotion.nombre} · ${formatoPrecio(Number(promotion.precio))} por persona`, promotion.id));
  });
  const selected = data.promotions.find((promotion) => promotion.slug === requestedSlug);
  if (selected) selectorPromocion.value = String(selected.id);
  selectorPromocion.disabled = data.promotions.length === 0;
  if (data.promotions.length === 0) {
    selectorPromocion.replaceChildren(new Option('No hay promociones disponibles', ''));
  }
  updatePrice();
}

loadPromotions().catch((error) => {
  selectorPromocion.replaceChildren(new Option('No se pudieron cargar las promociones', ''));
  precioTotal.textContent = error.message;
});

selectorPromocion.addEventListener('change', updatePrice);
selectorPersonas.addEventListener('input', updatePrice);

formReserva.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!window.Auth.getToken()) {
    formularioAcceso.hidden = false;
    return;
  }

  if (!selectedPromotion()) {
    mensajeReserva.hidden = false;
    mensajeReserva.textContent = 'Selecciona una promoción disponible.';
    return;
  }

  if (!selectorPago.value) {
    selectorPago.focus();
    return;
  }

  const promotion = selectedPromotion();
  document.getElementById('resumen-promocion').textContent = promotion.nombre;
  document.getElementById('resumen-total').textContent = `Total de la reserva: ${formatoPrecio(Number(promotion.precio) * Number(selectorPersonas.value))}`;
  panelPago.hidden = false;
  reservaLayout.classList.add('mostrar-pago');
  panelPago.setAttribute('aria-label', `Resumen de reserva: ${promotion.nombre}`);
  mensajeReserva.hidden = true;
});

botonConfirmar.addEventListener('click', async () => {
  botonConfirmar.disabled = true;
  mensajeReserva.hidden = false;
  mensajeReserva.textContent = 'Registrando reserva...';

  try {
    const response = await fetch(`${(window.API_URL || '').replace(/\/$/, '')}/api/reservas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${window.Auth.getToken()}`,
      },
      body: JSON.stringify({
        fecha_tour: document.getElementById('fecha').value,
        asistentes: Number(selectorPersonas.value),
        metodo_pago: selectorPago.value,
        promocion_id: Number(selectorPromocion.value),
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      if (response.status === 401) {
        formReserva.hidden = true;
        formularioAcceso.hidden = false;
        panelPago.hidden = true;
        reservaLayout.classList.remove('mostrar-pago');
      }
      throw new Error(result.message || 'No se pudo registrar la reserva.');
    }

    mensajeReserva.textContent = `Reserva #${result.reserva.id} registrada por ${formatoPrecio(Number(result.reserva.total))}. Estado del pago: pendiente.`;
    botonConfirmar.hidden = true;
    document.getElementById('volver-reserva').hidden = true;
  } catch (error) {
    mensajeReserva.textContent = error.message || 'No se pudo conectar con el servidor.';
    botonConfirmar.disabled = false;
  }
});

document.getElementById('volver-reserva').addEventListener('click', () => {
  reservaLayout.classList.remove('mostrar-pago');
  panelPago.hidden = true;
  selectorPago.focus();
});

document.getElementById('fecha').min = new Date().toISOString().split('T')[0];
