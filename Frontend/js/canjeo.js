(function () {
  'use strict';
  const pointsElement = document.getElementById('rewardsPoints');
  const notice = document.getElementById('rewardsNotice');
  const login = document.getElementById('rewardsLogin');
  const grid = document.getElementById('rewardsGrid');
  const redemptions = document.getElementById('redemptionsList');
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
      title.textContent = reward.nombre;
      const description = document.createElement('p');
      description.textContent = reward.descripcion || 'Un beneficio especial para disfrutar tu próxima experiencia.';
      const footer = document.createElement('div');
      footer.className = 'reward-card__footer';
      const cost = document.createElement('span');
      cost.className = 'reward-card__cost';
      cost.textContent = `${number(reward.puntos)} pts`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rewards-button';
      button.textContent = 'Canjear';
      button.disabled = Number(points) < Number(reward.puntos) || Auth.getUser()?.rol !== 'cliente';
      button.addEventListener('click', () => redeem(reward, button));
      footer.append(cost, button);
      body.append(type, title, description, footer);
      card.append(media, body);
      return card;
    }));
  }

  function renderRedemptions(items) {
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
      detail.textContent = `${item.recompensa_nombre} · ${number(item.puntos)} puntos`;
      const code = document.createElement('code');
      code.textContent = item.codigo;
      row.append(detail, code);
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
    }
    if (catalogResult.status === 'rejected') throw catalogResult.reason;
    const catalog = catalogResult.value;
    const points = accountResult.status === 'fulfilled' ? accountResult.value.puntos_actuales : catalog.puntos;
    renderRewards(catalog.recompensas, points);
    renderRedemptions(catalog.canjes);
    if (accountResult.status === 'rejected') {
      showNotice(`Mostramos el saldo del catálogo. No se pudo actualizar desde el perfil: ${accountResult.reason.message}`, true);
    }
  }

  async function redeem(reward, button) {
    if (!window.confirm(`¿Canjear ${reward.nombre} por ${number(reward.puntos)} puntos?`)) return;
    showNotice('Procesando tu canje…');
    grid.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    try {
      const result = await request(`/api/canjeos/${reward.id}/canjear`, { method: 'POST' });
      const successMessage = `¡Canje realizado! Guarda tu código ${result.canje.codigo}.`;
      showNotice(successMessage);
      try {
        await loadCatalog();
        showNotice(successMessage);
      } catch (error) {
        showNotice(`${successMessage} Recarga la página para actualizar tu saldo. ${error.message}`, true);
      }
    } catch (error) {
      showNotice(error.message, true);
      try {
        await loadCatalog();
      } catch (refreshError) {
        showNotice(`${error.message} No se pudo actualizar el catálogo: ${refreshError.message}`, true);
        button.disabled = false;
      }
    }
  }

  if (!Auth.isLoggedIn()) {
    login.hidden = false;
    grid.hidden = true;
    redemptions.hidden = true;
    return;
  }
  loadCatalog().catch((error) => showNotice(error.message, true));
})();
