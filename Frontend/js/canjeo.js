(function () {
  'use strict';
  const pointsElement = document.getElementById('rewardsPoints');
  const balance = pointsElement.closest('.rewards-balance');
  const notice = document.getElementById('rewardsNotice');
  const login = document.getElementById('rewardsLogin');
  const grid = document.getElementById('rewardsGrid');
  const redemptions = document.getElementById('redemptionsList');
  let redemptionItems = [], catalogItems = [], currentPoints = 0, selectedReward = null, redeeming = false, catalogReady = false;
  const dialog = document.getElementById('redeemDialog');
  const confirmButton = document.getElementById('redeemConfirm');
  const cancelButton = document.getElementById('redeemCancel');
  const customer = window.Auth?.getUser()?.rol === 'cliente';
  const search = document.getElementById('rewardSearch'), typeFilter = document.getElementById('rewardType'), sort = document.getElementById('rewardSort'), affordable = document.getElementById('rewardAffordable');
  const labels = { producto: 'Producto', promocion: 'Promoción', descuento: 'Descuento' };
  const icons = { producto: '🎁', promocion: '✦', descuento: '%' };
  const number = (value) => Number(value).toLocaleString('es-PE');

  function showNotice(message, error = false) {
    notice.textContent = message;
    notice.classList.toggle('is-error', error);
  }

  async function request(path, options = {}) {
    const base = (window.API_URL || '').replace(/\/$/, '');
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${Auth.getToken()}`,
        ...options.headers,
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || 'No se pudo completar la solicitud.');
    return result;
  }

  function renderRewards(rewards, points) {
    pointsElement.textContent = number(points);
    if (!rewards.length) {
      const empty = document.createElement('p');
      empty.className = 'rewards-empty';
      empty.textContent = 'Pronto agregaremos nuevos beneficios. Vuelve a visitarnos.';
      grid.replaceChildren(empty);
      return;
    }

    grid.replaceChildren(...rewards.map((reward) => {
      const card = document.createElement('article');
      card.className = 'reward-card';
      const media = document.createElement('div');
      media.className = 'reward-card__image';
      if (reward.imagen_url) {
        const image = document.createElement('img');
        image.src = reward.imagen_url;
        image.alt = reward.nombre;
        image.loading = 'lazy';
        media.append(image);
      } else {
        const icon = document.createElement('span');
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = icons[reward.tipo] || '✦';
        media.append(icon);
      }
      const body = document.createElement('div');
      body.className = 'reward-card__body';
      const type = document.createElement('span');
      type.className = 'reward-card__type';
      type.textContent = labels[reward.tipo] || 'Beneficio';
      const title = document.createElement('h3');
      title.textContent = reward.nombre; title.setAttribute('data-no-i18n','');
      const description = document.createElement('p');
      if (reward.descripcion) description.setAttribute('data-no-i18n','');
      description.textContent = reward.descripcion || 'Un beneficio especial para disfrutar tu próxima experiencia.';
      const footer = document.createElement('div');
      footer.className = 'reward-card__footer';
      const cost = document.createElement('span');
      cost.className = 'reward-card__cost';
      cost.textContent = `${number(reward.puntos)} pts`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rewards-button';
      button.textContent = reward.tipo === 'producto' ? 'Canjear producto' : 'Canjear';
      button.disabled = !customer || !catalogReady || redeeming || Number(points) < Number(reward.puntos) || reward.stock === 0;
      button.addEventListener('click', () => redeem(reward, button));
      footer.append(cost, button);
      const stock = document.createElement('span'); stock.className = 'reward-card__availability'; stock.textContent = reward.stock === null ? 'Disponible en el catálogo' : reward.stock === 0 ? 'Temporalmente agotado' : number(reward.stock) + ' disponibles';
      const progress = document.createElement('p'); progress.className = 'reward-card__progress'; progress.textContent = Number(points) >= Number(reward.puntos) ? 'Tienes los puntos para disfrutarlo.' : 'Te faltan ' + number(Number(reward.puntos) - Number(points)) + ' puntos. Cada viaje suma.';
      if (!customer) progress.textContent = 'El canje de puntos está disponible para cuentas de clientes.';
      body.append(type, title, description, stock, footer, progress);
      card.append(media, body);
      return card;
    }));
  }

  function renderRedemptions(items) {
    redemptionItems = items;
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'redemptions-empty';
      empty.textContent = 'Aquí aparecerán los beneficios que hayas canjeado.';
      redemptions.replaceChildren(empty);
      return;
    }
    redemptions.replaceChildren(...items.map((item) => {
      const row = document.createElement('div');
      row.className = 'redemption-row';
      const detail = document.createElement('span');
      const name=document.createElement('span'); name.setAttribute('data-no-i18n',''); name.textContent=item.recompensa_nombre; detail.append(name,document.createTextNode(` · ${number(item.puntos)} `),document.createTextNode('puntos'));
      const code = document.createElement('code');
      code.textContent = item.codigo;
      const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'rewards-button rewards-button--quiet'; copy.textContent = 'Copiar código'; copy.setAttribute('aria-label', 'Copiar código ' + item.codigo);
      copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(item.codigo); showNotice('Código copiado: ' + item.codigo); } catch { const range = document.createRange(); range.selectNodeContents(code); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); showNotice('Selecciona el código y cópialo manualmente.'); } });
      row.append(detail, code, copy);
      if (item.created_at) {
        const createdAt = new Date(item.created_at);
        if (!Number.isNaN(createdAt.getTime())) {
          const date = document.createElement('time');
          date.className = 'redemption-row__date';
          date.dateTime = createdAt.toISOString();
          date.textContent = createdAt.toLocaleString(window.ICAT_I18N?.locale || 'es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' });
          detail.append(date);
        }
      }
      return row;
    }));
  }

  async function loadCatalog() {
    const [catalogResult, accountResult] = await Promise.allSettled([
      request('/api/canjeos'),
      request('/api/perfil/puntos'),
    ]);
    if (accountResult.status === 'fulfilled') {
      pointsElement.textContent = number(accountResult.value.puntos_actuales);
      document.dispatchEvent(new CustomEvent('icat:points-updated', {
        detail: { points: accountResult.value.puntos_actuales },
      }));
    }
    if (catalogResult.status === 'rejected') throw catalogResult.reason;
    const catalog = catalogResult.value;
    const points = accountResult.status === 'fulfilled' ? accountResult.value.puntos_actuales : catalog.puntos;
    catalogItems = catalog.recompensas; currentPoints = Number(points); catalogReady = true; renderFiltered();
    const available = catalogItems.filter((item) => item.stock !== 0 && Number(item.puntos) <= currentPoints);
    document.getElementById('rewardsAvailable').textContent = number(available.length);
    const next = catalogItems.filter((item) => item.stock !== 0 && Number(item.puntos) > currentPoints).sort((a,b) => Number(a.puntos)-Number(b.puntos))[0];
    document.getElementById('rewardsNext').textContent = next ? 'Tu siguiente beneficio está a ' + number(Number(next.puntos)-currentPoints) + ' puntos.' : available.length ? 'Ya puedes elegir tu próxima recompensa.' : 'Nuevos beneficios están por llegar.';
    grid.removeAttribute('aria-busy');
    renderRedemptions(catalog.canjes);
    if (accountResult.status === 'rejected') {
      showNotice(`Mostramos el saldo del catálogo. No se pudo actualizar desde el perfil: ${accountResult.reason.message}`, true);
    }
  }

  function renderFiltered() {
    const query = search.value.trim().toLocaleLowerCase();
    const items = catalogItems.filter((item) => (typeFilter.value === 'all' || item.tipo === typeFilter.value) && (!affordable.checked || (Number(item.puntos) <= currentPoints && item.stock !== 0)) && (item.nombre + ' ' + item.descripcion).toLocaleLowerCase().includes(query)).sort((a,b) => sort.value === 'asc' ? Number(a.puntos)-Number(b.puntos) : Number(b.puntos)-Number(a.puntos));
    renderRewards(items,currentPoints);
    document.getElementById('rewardsCount').textContent = items.length + ' de ' + catalogItems.length + ' beneficios';
    if (!items.length && catalogItems.length) grid.querySelector('p').textContent = 'No hay beneficios con estos filtros. Prueba otro tipo o una búsqueda distinta.';
  }
  for (const field of [search,typeFilter,sort,affordable]) field.addEventListener('input',renderFiltered);
  function redeem(reward, button) {
    if (redeeming) return;
    selectedReward = { reward, button };
    document.getElementById('redeemName').textContent = reward.nombre;
    document.getElementById('redeemBefore').textContent = number(currentPoints) + ' pts';
    document.getElementById('redeemCost').textContent = number(reward.puntos) + ' pts';
    document.getElementById('redeemAfter').textContent = number(currentPoints - Number(reward.puntos)) + ' pts';
    document.getElementById('redeemError').textContent = '';
    dialog.showModal();
  }
  cancelButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', (event) => { if(redeeming) event.preventDefault(); });
  document.getElementById('redeemForm').addEventListener('submit', async (event) => { event.preventDefault(); if (!selectedReward || redeeming) return; await commitRedeem(selectedReward.reward,selectedReward.button); });
  async function commitRedeem(reward, button) {
    redeeming = true; confirmButton.disabled = true; cancelButton.disabled = true; confirmButton.textContent = 'Confirmando…';
    showNotice('Procesando tu canje…');
    grid.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    try {
      const result = await request(`/api/canjeos/${reward.id}/canjear`, { method: 'POST' });
      dialog.close();
      const successMessage = `¡Canje realizado! Guarda tu código ${result.canje.codigo}.`;
      renderRedemptions([result.canje, ...redemptionItems.filter((item) => item.codigo !== result.canje.codigo)].slice(0, 20));
      showNotice(successMessage);
      try {
        await loadCatalog();
        showNotice(successMessage);
      } catch (error) {
        showNotice(`${successMessage} Recarga la página para actualizar tu saldo. ${error.message}`, true);
      }
    } catch (error) {
      document.getElementById('redeemError').textContent = error.message;
      showNotice(error.message, true);
      try {
        await loadCatalog();
      } catch (refreshError) {
        catalogReady = false;
        showNotice(`${error.message} No se pudo actualizar el catálogo: ${refreshError.message}`, true);
        button.disabled = false;
      }
    } finally { redeeming = false; confirmButton.disabled = false; cancelButton.disabled = false; confirmButton.textContent = 'Confirmar canje'; dialog.close(); renderFiltered(); }
  }

  document.addEventListener('icat:language-changed', () => { renderRedemptions(redemptionItems); });

  if (!Auth.isLoggedIn()) {
    document.getElementById('rewardsFilters').hidden = true;
    document.getElementById('rewardsRefresh').hidden = true;
    document.getElementById('rewardsNext').textContent = 'Inicia sesión para descubrir tu saldo y tus beneficios.';
    balance.hidden = true;
    login.hidden = false;
    grid.hidden = true;
    redemptions.hidden = true;
    return;
  }
  grid.setAttribute('aria-busy','true'); grid.textContent = 'Preparando tus beneficios…';
  async function refreshCatalog() {
    const button = document.getElementById('rewardsRefresh'); button.disabled = true; grid.setAttribute('aria-busy','true');
    try { await loadCatalog(); } catch (error) { catalogReady=false; showNotice(error.message,true); grid.textContent='No se pudo cargar el catálogo. Usa Actualizar catálogo para reintentar.'; } finally { button.disabled=false; grid.removeAttribute('aria-busy'); }
  }
  document.getElementById('rewardsRefresh').addEventListener('click', refreshCatalog);
  refreshCatalog();
})();
