const reviewsScriptUrl = document.currentScript?.src || new URL('js/reviews.js', window.location.href).href;

document.addEventListener('DOMContentLoaded', () => {
  const scriptUrl = reviewsScriptUrl;
  const placeholderImage = 'https://res.cloudinary.com/plhejhea/image/upload/v1792620223/Person.svg';
  const loginUrl = new URL('../html/login.html', scriptUrl).href;
  const apiUrl = (path) => `${(window.API_URL || '').replace(/\/$/, '')}${path}`;
  const list = document.querySelector('[data-reviews-limit]');
  const listStatus = document.querySelector('[data-comments-status]');
  const form = document.getElementById('reviewForm');
  const formStatus = document.querySelector('[data-review-status]');
  const photoInput = document.getElementById('review-photo');
  const photoPreview = document.getElementById('review-photo-preview');
  let previewUrl;

  const ratingGroup = form?.querySelector('.review-rating-stars');
  if (ratingGroup) {
    const radios = [...ratingGroup.querySelectorAll('input[type="radio"]')];
    const feedback = document.createElement('output');
    feedback.id = 'review-rating-value'; feedback.className = 'review-rating-value';
    feedback.setAttribute('aria-live', 'polite'); feedback.setAttribute('aria-atomic', 'true');
    ratingGroup.setAttribute('aria-describedby', feedback.id);
    radios.forEach((radio) => radio.setAttribute('aria-label', `${radio.value} ${radio.value === '1' ? 'estrella' : 'estrellas'}`));
    ratingGroup.after(feedback);
    const descriptions = ['Selecciona de 1 a 5 estrellas', 'Necesita mejorar', 'Regular', 'Buena', 'Muy buena', 'Excelente'];
    function updateRating() {
      const value = Number(radios.find((radio) => radio.checked)?.value || 0);
      feedback.textContent = value ? `${value} de 5 · ${descriptions[value]}` : descriptions[0];
    }
    ratingGroup.addEventListener('change', updateRating);
    ratingGroup.addEventListener('pointermove', () => { ratingGroup.dataset.input = 'pointer'; });
    ratingGroup.addEventListener('pointerdown', () => { ratingGroup.dataset.input = 'pointer'; });
    ratingGroup.addEventListener('focusin', (event) => { if (event.target.matches(':focus-visible')) ratingGroup.dataset.input = 'keyboard'; });
    ratingGroup.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      ratingGroup.dataset.input = 'keyboard';
      const value = Number(radios.find((radio) => radio.checked)?.value || 0);
      const next = event.key === 'Home' ? 1 : event.key === 'End' ? 5 : Math.min(5, Math.max(1, value + (['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1)));
      const radio = radios.find((item) => Number(item.value) === next);
      radio.checked = true; radio.focus(); radio.dispatchEvent(new Event('change', { bubbles: true }));
    });
    form.addEventListener('reset', () => queueMicrotask(updateRating));
    updateRating();
  }

  function showLoginPrompt() {
    if (!formStatus) return;
    formStatus.replaceChildren(document.createTextNode('Para publicar, '));
    const link = document.createElement('a');
    link.href = loginUrl;
    link.textContent = 'inicia sesión';
    formStatus.append(link, document.createTextNode('.'));
    formStatus.classList.add('is-error');
  }

  function createCommentCard(comment) {
    const card = document.createElement('article');
    card.className = 'review-card';

    const heading = document.createElement('div');
    heading.className = 'review-heading';

    const user = document.createElement('div');
    user.className = 'review-user';

    const avatar = document.createElement('img');
    avatar.className = 'review-avatar';
    avatar.src = comment.foto_perfil_url || placeholderImage;
    avatar.alt = comment.foto_perfil_url ? `Foto de perfil de ${comment.nombre}` : '';
    avatar.loading = 'lazy';
    avatar.addEventListener('error', () => {
      avatar.src = placeholderImage;
    }, { once: true });

    const name = document.createElement('h3');
    name.textContent = comment.nombre;
    user.append(avatar, name);

    const stars = document.createElement('span');
    stars.className = 'review-stars';
    stars.setAttribute('role', 'img');
    stars.setAttribute('aria-label', `${comment.calificacion} de 5 estrellas`);
    stars.textContent = `${'★'.repeat(comment.calificacion)}${'☆'.repeat(5 - comment.calificacion)}`;
    heading.append(user, stars);

    const content = document.createElement('p');
    content.textContent = comment.contenido;
    card.append(heading, content);

    if (comment.created_at) {
      const date = new Date(comment.created_at);
      if (!Number.isNaN(date.getTime())) {
        const time = document.createElement('time');
        time.className = 'review-date';
        time.dateTime = date.toISOString();
        time.textContent = date.toLocaleDateString('es-PE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        card.append(time);
      }
    }

    return card;
  }

  async function loadComments() {
    if (!list) return;
    const limit = list.dataset.reviewsLimit || '100';

    try {
      const response = await fetch(apiUrl(`/api/comentarios?limit=${encodeURIComponent(limit)}`));
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'No se pudieron cargar los comentarios.');
      }

      list.replaceChildren(...data.comments.map(createCommentCard));
      if (listStatus) {
        listStatus.textContent = data.comments.length
          ? 'Experiencias compartidas por nuestros visitantes.'
          : 'Aún no hay comentarios. ¡Sé la primera persona en compartir su experiencia!';
      }
    } catch (error) {
      if (listStatus) listStatus.textContent = error.message || 'No se pudieron cargar los comentarios.';
    }
  }

  if (photoInput && photoPreview) {
    photoInput.addEventListener('change', () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = undefined;
      photoPreview.replaceChildren();

      const file = photoInput.files?.[0];
      if (!file) {
        photoPreview.hidden = true;
        return;
      }

      previewUrl = URL.createObjectURL(file);
      const image = document.createElement('img');
      image.src = previewUrl;
      image.alt = 'Vista previa de la foto de perfil';
      const fileName = document.createElement('span');
      fileName.textContent = file.name;
      photoPreview.append(image, fileName);
      photoPreview.hidden = false;
    });
  }

  if (form) {
    if (!window.Auth?.getToken()) showLoginPrompt();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!window.Auth?.getToken()) {
        showLoginPrompt();
        return;
      }

      const file = photoInput?.files?.[0];
      if (file) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          formStatus.textContent = 'La foto debe estar en formato JPG, PNG o WebP.';
          formStatus.classList.add('is-error');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          formStatus.textContent = 'La foto no puede superar los 5 MB.';
          formStatus.classList.add('is-error');
          return;
        }
      }

      const submitButton = form.querySelector('[type="submit"]');
      const formData = new FormData(form);
      submitButton.disabled = true;
      submitButton.textContent = 'Publicando...';
      formStatus.textContent = '';
      formStatus.classList.remove('is-error', 'is-success');

      try {
        const response = await fetch(apiUrl('/api/comentarios'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${window.Auth.getToken()}` },
          body: formData,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          throw new Error(data.message || 'No se pudo publicar el comentario.');
        }

        form.reset();
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = undefined;
        if (photoPreview) {
          photoPreview.replaceChildren();
          photoPreview.hidden = true;
        }
        formStatus.textContent = data.message;
        formStatus.classList.add('is-success');
        await loadComments();
      } catch (error) {
        formStatus.textContent = error.message || 'No se pudo publicar el comentario.';
        formStatus.classList.add('is-error');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Publicar comentario';
      }
    });
  }

  loadComments();
});
