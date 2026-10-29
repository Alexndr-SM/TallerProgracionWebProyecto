/* Prepara una consulta para el cliente de correo; no simula envíos al servidor. */
(function () {
  'use strict';
  const t = (text) => window.ICAT_I18N ? window.ICAT_I18N.t(text) : text;
  const form = document.querySelector('.contact-form');
  if (!form) return;
  const status = form.querySelector('[data-contact-status]');
  const fallback = form.querySelector('.contact-copy-fallback');
  const fallbackText = form.querySelector('[data-contact-copy-text]');
  function message() {
    const data = new FormData(form);
    return `${t('Hola, IcaTurismo:')}\n\n${String(data.get('Mensaje') || '').trim()}\n\n${String(data.get('Nombre') || '').trim()} ${String(data.get('Apellido') || '').trim()}\n${t('Correo:')} ${String(data.get('Correo') || '').trim()}`;
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const destination = form.getAttribute('action');
    status.textContent = 'Tu consulta está preparada. Confirma el envío en tu aplicación de correo. Si no se abre, utiliza Copiar mensaje.';
    window.location.href = `${destination}?subject=${encodeURIComponent(t('Consulta de viaje · IcaTurismo'))}&body=${encodeURIComponent(message())}`;
  });
  form.querySelector('[data-copy-contact]').addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    const text = message();
    try {
      await navigator.clipboard.writeText(text);
      fallback.hidden = true;
      status.textContent = 'Mensaje copiado. Pégalo en tu correo o en WhatsApp para enviarlo.';
    } catch {
      fallback.hidden = false;
      fallbackText.value = text;
      fallbackText.focus(); fallbackText.select();
      status.textContent = 'Seleccionamos el mensaje para que puedas copiarlo manualmente.';
    }
  });
})();
