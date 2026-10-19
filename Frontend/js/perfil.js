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
    const [y, m, d] = dateStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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
  function abrirModal({ titulo, mensaje, onConfirm }) {
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
    btnConfirm.replaceWith(newConfirm);
    btnCancel.replaceWith(newCancel);

    document.getElementById('modalConfirmBtn').addEventListener('click', async () => {
      document.getElementById('modalConfirmBtn').disabled = true;
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
      const esCancelable = ['pendiente', 'confirmada'].includes(r.estado);
      const esReembolsable = r.estado === 'cancelada' && r.estado_pago === 'pagado';
      const estaCancelada = r.estado === 'cancelada';

      return `
        <article class="reserva-card" style="animation-delay:${idx * 0.04}s" data-id="${r.id}">
          <div class="reserva-card-header">
            <div>
              <h4 class="reserva-promo-nombre">${r.promocion_nombre || 'Tour'}</h4>
              ${r.promocion_categoria
                ? `<span class="reserva-categoria">${r.promocion_categoria}</span>`
                : ''}
            </div>
            <div style="display:flex;gap:0.4rem;flex-wrap:wrap;justify-content:flex-end">
              ${badgeEstado(r.estado)}
              ${badgePago(r.estado_pago)}
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

          ${(esCancelable || esReembolsable) && !estaCancelada || esReembolsable ? `
          <div class="reserva-acciones">
            ${esCancelable && !estaCancelada ? `
              <button class="btn-accion btn-cancelar" data-action="cancelar" data-id="${r.id}" data-promo="${r.promocion_nombre || 'este tour'}">
                ✕ Cancelar reserva
              </button>` : ''}
            ${esReembolsable ? `
              <button class="btn-accion btn-reembolsar" data-action="reembolsar" data-id="${r.id}" data-promo="${r.promocion_nombre || 'este tour'}">
                ↩ Solicitar reembolso
              </button>` : ''}
          </div>` : ''}
        </article>`;
    }).join('');

    // Eventos de acciones
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { action, id, promo } = btn.dataset;
        if (action === 'cancelar') confirmarCancelar(Number(id), promo);
        if (action === 'reembolsar') confirmarReembolso(Number(id), promo);
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
      mensaje: `¿Seguro que deseas cancelar tu reserva de "${promo}"? Los puntos ganados por esta reserva serán revertidos. Esta acción no se puede deshacer.`,
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

  function confirmarReembolso(id, promo) {
    abrirModal({
      titulo: 'Solicitar reembolso',
      mensaje: `¿Deseas solicitar el reembolso de tu reserva de "${promo}"? Un agente procesará la solicitud en 3–5 días hábiles.`,
      onConfirm: async () => {
        try {
          const data = await apiFetch(`/api/perfil/reservas/${id}/reembolsar`, { method: 'PATCH' });
          toast(data.message, 'success');
          await cargarReservas();
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
    setEl('perfilPuntos', p.puntos.toLocaleString());
    setEl('puntosActualesTab', `${p.puntos.toLocaleString()} pts`);
    setEl('perfilDesde', formatFecha(p.miembro_desde));
    setEl('perfilUltimo', p.ultimo_acceso ? formatFecha(p.ultimo_acceso) : 'Primera sesión');

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

