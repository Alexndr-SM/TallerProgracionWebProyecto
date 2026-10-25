const gridPromociones = document.querySelector('.promotion-grid, .offer-grid');

if (gridPromociones) {
  const categoryByPath = {
    playas: 'Naturaleza',
    dunas: 'Aventura',
    cultura: 'Cultura',
  };
  const category = Object.entries(categoryByPath)
    .find(([path]) => window.location.pathname.includes(`/${path}/`))?.[1];
  const categoryImages = {
    Naturaleza: 'https://res.cloudinary.com/plhejhea/image/upload/v1792338022/imagenplaya.jpg',
    Aventura: 'https://res.cloudinary.com/plhejhea/image/upload/v1792338022/imagendunas.jpg',
    Cultura: 'https://res.cloudinary.com/plhejhea/image/upload/v1792338022/imagencultura.jpg',
  };
  const price = (amount) => new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(amount));

  const offerLayout = gridPromociones.classList.contains('offer-grid');
  const disclaimerClass = offerLayout ? 'offer-disclaimer' : 'promotion-disclaimer';
  const previousDisclaimer = gridPromociones.nextElementSibling;
  if (previousDisclaimer?.classList.contains('promotion-disclaimer') || previousDisclaimer?.classList.contains('offer-disclaimer')) {
    previousDisclaimer.remove();
  }
  const loadingMessage = document.createElement('p');
  loadingMessage.className = disclaimerClass;
  loadingMessage.textContent = 'Cargando promociones disponibles...';
  gridPromociones.replaceChildren(loadingMessage);
  gridPromociones.setAttribute('aria-busy', 'true');

  async function renderPromotions() {
    const apiBase = (window.API_URL || '').replace(/\/$/, '');
    if (!apiBase) throw new Error('No se configuró la dirección de la API.');
    const response = await fetch(`${apiBase}/api/promociones`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || !Array.isArray(result.promotions)) {
      throw new Error(result.message || 'No se pudieron cargar las promociones.');
    }

    const promotions = result.promotions.filter((item) => item.categoria === category);
    const cards = promotions.map((promotion) => {
      const card = document.createElement('a');
      card.className = offerLayout ? 'offer-card' : 'promotion-card';
      card.href = `../../promocion.html?slug=${encodeURIComponent(promotion.slug)}`;

      const image = document.createElement('div');
      image.className = offerLayout ? 'offer-image' : 'promotion-image';
      const imageElement = document.createElement('img');
      imageElement.src = categoryImages[category];
      imageElement.alt = '';
      imageElement.loading = 'lazy';
      image.append(imageElement);
      const tag = document.createElement('span');
      tag.className = offerLayout ? 'offer-tag' : 'promotion-tag';
      tag.textContent = promotion.categoria;
      image.append(tag);

      const content = document.createElement('div');
      content.className = offerLayout ? 'offer-body' : 'promotion-content';
      const duration = document.createElement('p');
      duration.className = offerLayout ? 'offer-meta' : 'promotion-duration';
      duration.textContent = 'Experiencia turística · Ica';
      const heading = document.createElement('h2');
      heading.textContent = promotion.nombre;
      const description = document.createElement('p');
      description.textContent = promotion.descripcion || 'Descubre esta experiencia turística en Ica.';
      const footer = document.createElement('div');
      footer.className = offerLayout ? 'offer-footer' : 'promotion-card-footer';
      const amount = document.createElement('span');
      amount.className = offerLayout ? 'offer-price' : 'promotion-price';
      amount.textContent = `${price(promotion.precio)} por persona`;
      const link = document.createElement('span');
      link.className = offerLayout ? 'offer-more' : 'promotion-link';
      link.textContent = 'Reservar →';
      footer.append(amount, link);
      content.append(duration, heading, description, footer);
      card.append(image, content);
      return card;
    });

    gridPromociones.replaceChildren(...cards);
    gridPromociones.removeAttribute('aria-busy');
    const emptyState = document.createElement('p');
    emptyState.className = disclaimerClass;
    emptyState.textContent = cards.length ? 'Precios por persona. El pago se procesa fuera de este sitio y se registra como pendiente hasta su verificación.' : 'Por el momento no hay promociones disponibles en esta categoría.';
    gridPromociones.after(emptyState);
  }

  renderPromotions().catch((error) => {
    const message = document.createElement('p');
    message.className = disclaimerClass;
    message.setAttribute('role', 'status');
    message.textContent = error.message;
    gridPromociones.replaceChildren(message);
    gridPromociones.removeAttribute('aria-busy');
  });
}
