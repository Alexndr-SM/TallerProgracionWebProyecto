// =========================================================
// IcaTurismo — perfil.js
// Lógica completa de la página de perfil de cliente
// =========================================================

(function () {
  'use strict';

  // ── Constantes ──────────────────────────────────────────
  const API = () => (window.API_URL || '').replace(/\/$/, '');
  const TOKEN = () => localStorage.getItem('icat_token');

  // Equivalencia de puntos: 10 pts = S/ 1
  const PUNTOS_POR_SOL = 10;

  // ── Estado local ────────────────────────────────────────
  let todasLasReservas = [];
  let filtroActivo = 'todas';

  // ── Helpers de fetch ────────────────────────────────────
  async function apiFetch(path, opts = {}) {
    const res = await fetch(API() + path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + TOKEN(),
        ...(opts.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
    return data;
  }

  // ── Utilidades de UI ────────────────────────────────────
  function formatFecha(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatFechaTour(dateStr) {
    if (!dateStr) return '—';
    const clean = String(dateStr).slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
    }
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? '—' : fallback.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatMoneda(val) {
    return 'S/ ' + Number(val).toFixed(2);
  }

  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  // ── Toast ────────────────────────────────────────────────
  function toast(msg, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const iconos = { success: '✓', error: '✕', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `
      <span class="toast-icono" aria-hidden="true">${iconos[tipo] || 'ℹ'}</span>
      <span>${msg}</span>`;
    container.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(24px)';
      el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }

  // ── Modal de confirmación ─────────────────────────────────
  function abrirModal({ titulo, mensaje, textoBoton = 'Confirmar', claseBoton = '', onConfirm }) {
    const overlay = document.getElementById('modalConfirm');
    const titleEl = document.getElementById('modalTitle');
    const msgEl = document.getElementById('modalMsg');
    const btnConfirm = document.getElementById('modalConfirmBtn');
    const btnCancel = document.getElementById('modalCancel');

    titleEl.textContent = titulo;
    msgEl.textContent = mensaje;
    overlay.hidden = false;
    overlay.style.display = 'flex';

    const close = () => {
      overlay.hidden = true;
      overlay.style.display = 'none';
    };

    // Limpiar listeners previos clonando los botones
    const newConfirm = btnConfirm.cloneNode(true);
    const newCancel = btnCancel.cloneNode(true);
    newConfirm.textContent = textoBoton;
    newConfirm.className = `btn-modal-confirm ${claseBoton}`.trim();
    btnConfirm.replaceWith(newConfirm);
    btnCancel.replaceWith(newCancel);

    document.getElementById('modalConfirmBtn').addEventListener('click', async () => {
      const btn = document.getElementById('modalConfirmBtn');
      if (btn) btn.disabled = true;
      try {
        await onConfirm();
      } finally {
        close();
      }
    });

    document.getElementById('modalCancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); }, { once: true });
  }

  // ── Badges ───────────────────────────────────────────────
  function badgeEstado(estado) {
    const map = {
      pendiente: 'badge-pendiente',
      confirmada: 'badge-confirmada',
      cancelada: 'badge-cancelada',
    };
    return `<span class="badge ${map[estado] || 'badge-pendiente'}">${capitalize(estado)}</span>`;
  }

  function badgePago(estado) {
    const map = {
      pendiente: 'badge-pago-pendiente',
      pagado: 'badge-pago-pagado',
      reembolsado: 'badge-pago-reembolsado',
    };
    const labels = { pendiente: 'Pago pendiente', pagado: 'Pagado', reembolsado: 'Reembolsado' };
    return `<span class="badge ${map[estado] || 'badge-pago-pendiente'}">${labels[estado] || capitalize(estado)}</span>`;
  }

  // ── Render de reservas ───────────────────────────────────
  function renderReservas(lista) {
    const container = document.getElementById('reservasList');
    if (!container) return;

    if (!lista.length) {
      container.innerHTML = `
        <div class="lista-vacia">
          <span class="vacia-icono">🗓️</span>
          <p>No tienes reservas en esta categoría.</p>
          <a href="compras.html" class="btn-nueva-reserva">Explorar promociones</a>
        </div>`;
      return;
    }

    container.innerHTML = lista.map((r, idx) => {
      const noEstaCancelada = r.estado !== 'cancelada';
      const esCancelable = noEstaCancelada && r.estado_pago === 'pendiente';
      const esPagable = noEstaCancelada && r.estado_pago === 'pendiente';
      const esReembolsable = noEstaCancelada && r.estado_pago === 'pagado';
      // Si la reserva está cancelada y no fue pagada, no mostrar "Pago pendiente"
      const mostrarBadgePago = !(r.estado === 'cancelada' && r.estado_pago === 'pendiente');

      return `
        <article class="reserva-card" style="animation-delay:${idx * 0.04}s" data-id="${r.id}">
          <div class="reserva-card-header">
            <div>
              <h4 class="reserva-promo-nombre">${r.promocion_nombre || 'Tour'}</h4>
              ${r.promocion_categoria
                ? `<span class="reserva-categoria">${r.promocion_categoria}</span>`
                : ''}
            </div>
            <div class="reserva-estados">
              ${badgeEstado(r.estado)}
              ${mostrarBadgePago ? badgePago(r.estado_pago) : ''}
            </div>
          </div>

          <div class="reserva-detalles">
            <div class="reserva-detalle">
              <span class="detalle-label">Fecha del tour</span>
              <span class="detalle-valor">${formatFechaTour(r.fecha_tour)}</span>
            </div>
            <div class="reserva-detalle">
              <span class="detalle-label">Asistentes</span>
              <span class="detalle-valor">${r.asistentes} persona${r.asistentes > 1 ? 's' : ''}</span>
            </div>
            <div class="reserva-detalle">
              <span class="detalle-label">Precio unitario</span>
              <span class="detalle-valor">${formatMoneda(r.precio_unitario)}</span>
            </div>
            <div class="reserva-detalle">
              <span class="detalle-label">Total</span>
              <span class="detalle-valor" style="color:var(--peach);font-size:1rem">${formatMoneda(r.total)}</span>
            </div>
            <div class="reserva-detalle">
              <span class="detalle-label">Método de pago</span>
              <span class="detalle-valor">${capitalize(r.metodo_pago)}</span>
            </div>
            <div class="reserva-detalle">
              <span class="detalle-label">Reservado el</span>
              <span class="detalle-valor">${formatFecha(r.created_at)}</span>
            </div>
          </div>

          ${(esCancelable || esPagable || esReembolsable) ? `
          <div class="reserva-acciones">
            ${esCancelable ? `
              <button class="btn-accion btn-cancelar" data-action="cancelar" data-id="${r.id}" data-promo="${r.promocion_nombre || 'este tour'}">
                ✕ Cancelar reserva
              </button>` : ''}
            ${esPagable ? `
              <button class="btn-accion btn-confirmar-pago" data-action="confirmar-pago" data-id="${r.id}" data-promo="${r.promocion_nombre || 'este tour'}" data-total="${r.total}" data-metodo="${r.metodo_pago}">
                💳 Confirmar pago
              </button>` : ''}
            ${esReembolsable ? `
              <button class="btn-accion btn-reembolsar" data-action="reembolsar" data-id="${r.id}" data-promo="${r.promocion_nombre || 'este tour'}" data-total="${r.total}">
                ↩ Reembolso (90%)
              </button>` : ''}
          </div>` : ''}
        </article>`;
    }).join('');

    // Eventos de acciones
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { action, id, promo, total, metodo } = btn.dataset;
        if (action === 'cancelar') confirmarCancelar(Number(id), promo);
        if (action === 'confirmar-pago') confirmarPago(Number(id), promo, total, metodo);
        if (action === 'reembolsar') confirmarReembolso(Number(id), promo, total);
      });
    });
  }

  function filtrarYRenderizar() {
    const filtradas = filtroActivo === 'todas'
      ? todasLasReservas
      : todasLasReservas.filter(r => r.estado === filtroActivo);
    renderReservas(filtradas);
  }

  // ── Acciones de reserva ──────────────────────────────────
  function confirmarCancelar(id, promo) {
    abrirModal({
      titulo: 'Cancelar reserva',
      mensaje: `¿Seguro que deseas cancelar tu reserva de "${promo}"?\n\nLos puntos ganados por esta reserva serán revertidos. Esta acción no se puede deshacer.`,
      textoBoton: 'Confirmar Cancelación',
      claseBoton: 'btn-modal-cancelar',
      onConfirm: async () => {
        try {
          const data = await apiFetch(`/api/perfil/reservas/${id}/cancelar`, { method: 'PATCH' });
          toast(`Reserva cancelada.${data.puntos_revertidos > 0 ? ` Se revirtieron ${data.puntos_revertidos} puntos.` : ''} Puntos actuales: ${data.puntos_actuales}`, 'info');
          await cargarReservas();
          actualizarPuntosSidebar(data.puntos_actuales);
        } catch (err) {
          toast(err.message, 'error');
        }
      },
    });
  }

  function confirmarPago(id, promo, total, metodo) {
    abrirModal({
      titulo: 'Confirmar pago de reserva',
      mensaje: `¿Deseas confirmar el pago de tu reserva para "${promo}"?\n\n• Monto total a confirmar: ${formatMoneda(total)}\n• Método de pago seleccionado: ${capitalize(metodo)}\n\nAl confirmar, la reserva cambiará a estado "Confirmada" y el pago figurará como "Pagado".`,
      textoBoton: 'Confirmar Pago',
      claseBoton: 'btn-modal-pago',
      onConfirm: async () => {
        try {
          const data = await apiFetch(`/api/perfil/reservas/${id}/confirmar-pago`, { method: 'PATCH' });
          toast(data.message || '¡Pago confirmado exitosamente!', 'success');
          await cargarReservas();
          await cargarPerfil();
        } catch (err) {
          toast(err.message, 'error');
        }
      },
    });
  }

  function confirmarReembolso(id, promo, total) {
    const totalNum = Number(total) || 0;
    const montoReembolso = Math.round(totalNum * 0.90 * 100) / 100;
    const montoRetencion = Math.round((totalNum - montoReembolso) * 100) / 100;
    const puntosTotales = Math.floor(totalNum / 10);
    const puntosADescontar = Math.round(puntosTotales * 0.90);

    abrirModal({
      titulo: 'Aviso de Confirmación de Reembolso',
      mensaje: `Estás solicitando el reembolso de tu reserva para "${promo}". Por favor, revisa las condiciones antes de continuar:\n\n• Devolución del 90%: ${formatMoneda(montoReembolso)} serán devueltos a tu medio de pago.\n• Retención del 10%: ${formatMoneda(montoRetencion)} por gastos operativos y penalidad de anulación.\n• Ajuste de puntos: Se descontará el 90% de los puntos obtenidos (-${puntosADescontar} pts).\n• Estado final: La reserva quedará cancelada.\n\n¿Estás seguro de que deseas confirmar el reembolso?`,
      textoBoton: 'Confirmar Reembolso',
      claseBoton: 'btn-modal-reembolso',
      onConfirm: async () => {
        try {
          const data = await apiFetch(`/api/perfil/reservas/${id}/reembolsar`, { method: 'PATCH' });
          toast(data.message || 'Reembolso procesado correctamente.', 'info');
          await cargarReservas();
          if (data.puntos_actuales !== undefined) {
            actualizarPuntosSidebar(data.puntos_actuales);
          } else {
            await cargarPerfil();
          }
        } catch (err) {
          toast(err.message, 'error');
        }
      },
    });
  }

  // ── Carga de datos ───────────────────────────────────────
  async function cargarPerfil() {
    const data = await apiFetch('/api/perfil');
    const p = data.perfil;

    setEl('perfilNombre', p.nombre);
    setEl('perfilEmail', p.email);
    setEl('perfilDni', p.dni || 'Sin registrar');
    setEl('perfilTelefono', p.telefono || 'Sin registrar');
    setEl('perfilPuntos', p.puntos.toLocaleString());
    setEl('puntosActualesTab', `${p.puntos.toLocaleString()} pts`);
    setEl('perfilDesde', formatFecha(p.miembro_desde));
    setEl('perfilUltimo', p.ultimo_acceso ? formatFecha(p.ultimo_acceso) : 'Primera sesión');

    const editNombre = document.getElementById('editNombre');
    if (editNombre) editNombre.value = p.nombre || '';
    const editDni = document.getElementById('editDni');
    if (editDni) editDni.value = p.dni || '';
    const editTelefono = document.getElementById('editTelefono');
    if (editTelefono) editTelefono.value = p.telefono || '';
    const editEmail = document.getElementById('editEmail');
    if (editEmail) editEmail.value = p.email || '';

    // Pre-llenar campos de edición de perfil
    const inpNombre = document.getElementById('editNombre');
    const inpEmail = document.getElementById('editEmail');
    const inpTel = document.getElementById('editTelefono');
    const inpDni = document.getElementById('editDni');
    if (inpNombre) inpNombre.value = p.nombre || '';
    if (inpEmail) inpEmail.value = p.email || '';
    if (inpTel) inpTel.value = p.telefono || '';
    if (inpDni) inpDni.value = p.dni || '';

    const equiv = Math.floor(p.puntos / PUNTOS_POR_SOL);
    setEl('puntosEquiv', `Equivale a S/ ${equiv.toFixed(2)} en descuentos`);

    if (p.foto_perfil_url) {
      const avatar = document.getElementById('perfilAvatar');
      if (avatar) avatar.src = p.foto_perfil_url;
    }
  }

  async function cargarReservas() {
    const container = document.getElementById('reservasList');
    if (container) {
      container.innerHTML = `<div class="perfil-loading">
        <div class="spinner" aria-hidden="true"></div><p>Cargando reservas…</p></div>`;
    }
    const data = await apiFetch('/api/perfil/reservas');
    todasLasReservas = data.reservas || [];
    filtrarYRenderizar();
  }

  async function cargarPuntos() {
    const container = document.getElementById('puntosList');
    if (container) {
      container.innerHTML = `<div class="perfil-loading">
        <div class="spinner" aria-hidden="true"></div><p>Cargando historial…</p></div>`;
    }
    const data = await apiFetch('/api/perfil/puntos');
    const historial = data.historial || [];

    setEl('puntosActualesTab', `${(data.puntos_actuales || 0).toLocaleString()} pts`);

    if (!container) return;

    if (!historial.length) {
      container.innerHTML = `
        <div class="lista-vacia">
          <span class="vacia-icono">⭐</span>
          <p>Aún no tienes movimientos de puntos. ¡Realiza tu primera reserva para empezar a acumular!</p>
        </div>`;
      return;
    }

    const iconoTipo = { ganado: '✅', cancelado: '❌', canjeado: '🎁', ajuste: '⚙️' };

    container.innerHTML = historial.map((h, idx) => `
      <div class="punto-item" style="animation-delay:${idx * 0.03}s">
        <span class="punto-tipo-icono">${iconoTipo[h.tipo] || '⭐'}</span>
        <div class="punto-info">
          <p class="punto-descripcion">${h.descripcion}</p>
          <span class="punto-fecha">${formatFecha(h.created_at)}</span>
        </div>
        <span class="punto-cantidad punto-${h.tipo}">${h.puntos} pts</span>
      </div>`).join('');
  }

  // ── Actualización de sidebar sin recargar ────────────────
  function actualizarPuntosSidebar(puntos) {
    setEl('perfilPuntos', puntos.toLocaleString());
    setEl('puntosActualesTab', `${puntos.toLocaleString()} pts`);
    const equiv = Math.floor(puntos / PUNTOS_POR_SOL);
    setEl('puntosEquiv', `Equivale a S/ ${equiv.toFixed(2)} en descuentos`);
  }

  // ── Utilidad setEl ───────────────────────────────────────
  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Tabs ─────────────────────────────────────────────────
  function initTabs() {
    const btns = document.querySelectorAll('.perfil-nav-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.perfil-tab').forEach(t => {
          t.hidden = true;
          t.classList.remove('active');
        });

        const tabEl = document.getElementById(`tab${capitalize(tab)}`);
        if (tabEl) {
          tabEl.hidden = false;
          tabEl.classList.add('active');
        }

        // Cargar puntos solo cuando se abre esa pestaña
        if (tab === 'puntos') cargarPuntos();
      });
    });
  }

  // ── Editar perfil ────────────────────────────────────────
  function initEditar() {
    const formPerfil = document.getElementById('formEditarPerfil');
    if (formPerfil) {
      formPerfil.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('editNombre').value.trim();
        const dni = document.getElementById('editDni').value.trim();
        const telefono = document.getElementById('editTelefono').value.trim();
        try {
          const data = await apiFetch('/api/perfil', {
            method: 'PATCH',
            body: JSON.stringify({ nombre, dni, telefono }),
          });
          toast(data.message || 'Perfil actualizado', 'success');
          if (data.perfil) {
            setEl('perfilNombre', data.perfil.nombre);
            const editNombre = document.getElementById('editNombre');
            if (editNombre) editNombre.value = data.perfil.nombre || '';
          }
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    }

    const formPass = document.getElementById('formCambiarPassword');
    if (formPass) {
      formPass.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password_actual = document.getElementById('passActual').value;
        const password_nueva = document.getElementById('passNueva').value;
        const password_confirmar = document.getElementById('passConfirmar').value;
        try {
          const data = await apiFetch('/api/perfil/password', {
            method: 'PATCH',
            body: JSON.stringify({ password_actual, password_nueva, password_confirmar }),
          });
          toast(data.message || 'Contraseña actualizada', 'success');
          formPass.reset();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    }
  }

  // ── Filtros de reservas ──────────────────────────────────
  function initFiltros() {
    document.querySelectorAll('.filtro-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filtroActivo = btn.dataset.filtro;
        filtrarYRenderizar();
      });
    });
  }

  // ── Edición de perfil y cambio de contraseña ─────────────
  function initEditarPerfil() {
    const formDatos = document.getElementById('formPerfilDatos');
    const formPass = document.getElementById('formPerfilPassword');

    if (formDatos) {
      formDatos.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnGuardarDatos');
        const nombre = (document.getElementById('editNombre')?.value || '').trim();
        const telefono = (document.getElementById('editTelefono')?.value || '').trim();
        const dni = (document.getElementById('editDni')?.value || '').trim();

        if (!nombre || nombre.length < 2) {
          toast('Por favor, ingresa un nombre válido (mínimo 2 caracteres).', 'error');
          return;
        }

        if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

        try {
          const data = await apiFetch('/api/perfil', {
            method: 'PATCH',
            body: JSON.stringify({ nombre, telefono, dni }),
          });

          toast(data.message || 'Datos actualizados con éxito.', 'success');

          // Actualizar datos en sidebar
          const p = data.perfil;
          setEl('perfilNombre', p.nombre);
          setEl('perfilTelefono', p.telefono || 'Sin registrar');
          setEl('perfilDni', p.dni || 'Sin registrar');

          // Actualizar nombre en el header de usuario
          const userDisplay = document.getElementById('userNameDisplay');
          if (userDisplay) userDisplay.textContent = p.nombre;

          try {
            const stored = JSON.parse(localStorage.getItem('icat_user') || '{}');
            stored.nombre = p.nombre;
            localStorage.setItem('icat_user', JSON.stringify(stored));
          } catch (_) {}

        } catch (err) {
          toast(err.message || 'No se pudieron actualizar los datos.', 'error');
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = 'Guardar información'; }
        }
      });
    }

    if (formPass) {
      formPass.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnGuardarPass');
        const passActual = document.getElementById('passActual')?.value || '';
        const passNueva = document.getElementById('passNueva')?.value || '';
        const passConfirmar = document.getElementById('passConfirmar')?.value || '';

        if (!passActual || !passNueva || !passConfirmar) {
          toast('Todos los campos de contraseña son requeridos.', 'error');
          return;
        }

        if (passNueva.length < 8) {
          toast('La nueva contraseña debe tener al menos 8 caracteres.', 'error');
          return;
        }

        if (passNueva !== passConfirmar) {
          toast('La nueva contraseña y su confirmación no coinciden.', 'error');
          return;
        }

        if (passActual === passNueva) {
          toast('La nueva contraseña debe ser diferente a la actual.', 'error');
          return;
        }

        if (btn) { btn.disabled = true; btn.textContent = 'Actualizando…'; }

        try {
          const data = await apiFetch('/api/perfil/password', {
            method: 'PATCH',
            body: JSON.stringify({
              password_actual: passActual,
              password_nueva: passNueva,
              password_confirmar: passConfirmar,
            }),
          });

          toast(data.message || '¡Contraseña actualizada con éxito!', 'success');
          formPass.reset();
        } catch (err) {
          toast(err.message || 'No se pudo actualizar la contraseña.', 'error');
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = 'Actualizar contraseña'; }
        }
      });
    }
  }

  // ── Entrada principal ────────────────────────────────────
  async function init() {
    // Verificar sesión
    if (!window.Auth || !Auth.isLoggedIn()) {
      window.location.href = 'login.html?redirect=perfil.html';
      return;
    }

    const modal = document.getElementById('modalConfirm');
    if (modal) modal.style.display = 'none';

    const app = document.getElementById('perfilApp');
    const cargando = document.getElementById('perfilCargando');

    try {
      await cargarPerfil();
      await cargarReservas();

       initTabs();
       initFiltros();
       initEditar();
      initEditarPerfil();

      if (cargando) cargando.hidden = true;
      if (app) app.hidden = false;
    } catch (err) {
      console.error('init perfil:', err);
      if (cargando) {
        cargando.innerHTML = `
          <p style="color:#ff7b7b;text-align:center">
            No se pudo cargar el perfil. Intenta recargar la página.<br>
            <small>${err.message}</small>
          </p>`;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
