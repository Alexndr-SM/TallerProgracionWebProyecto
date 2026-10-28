/* Paneles del equipo: HTML nativo y API existente, sin framework ni compilación. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const view = $('#view'), dialog = $('#dialog'), role = document.body.dataset.role;
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pen = n => new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(n || 0));
  const date = v => new Date(v).toLocaleString('es-PE',{timeZone:'America/Lima',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  const today = () => new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'});
  const paths = {grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',map:'m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z M9 3v15 M15 6v15',tag:'M3 3h8l10 10-8 8L3 11V3z M7 7h.01',image:'M3 3h18v18H3z m0 14 6-6 5 5 3-3 4 4 M8 7h.01',chat:'M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 19 0z M7 10h10 M7 14h6',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3a4 4 0 0 1 0 8',cash:'M2 5h20v14H2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M5 12h.01 M19 12h.01',plus:'M12 5v14 M5 12h14',arrow:'M4 12h16 m-6-6 6 6-6 6',close:'m6 6 12 12 M6 18 18 6',edit:'m4 16 12-12 4 4L8 20H4v-4z',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2'};
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.grid}"/></svg>`;
  const cfg = {editor:{title:'Panel de edición',icon:'edit',tabs:[['inicio','Vista general','grid'],['destinos','Destinos','map'],['promociones','Promociones','tag'],['canjes','Catálogo de canje','tag'],['medios','Biblioteca de imágenes','image'],['widgets','Widgets de la web','grid']]},soporte:{title:'Centro de soporte',icon:'chat',tabs:[['casos','Conversaciones','chat']]},registrador:{title:'Recepción y caja',icon:'cash',tabs:[['caja','Caja del día','cash'],['clientes','Clientes presenciales','users']]}}[role];
  let user, tab = cfg.tabs[0][0], data = {}, selected = null, generation = 0, busy = false, mediaCursor = null;
  const narrow = window.matchMedia('(max-width:760px)');
  $('#sidebar').insertAdjacentHTML('afterbegin','<button class="icon-btn sidebar-close" id="close-menu" aria-label="Cerrar menú">×</button>');
  function setMenu(open) {
    $('#sidebar').classList.toggle('open',open);
    $('#sidebar').inert = narrow.matches && !open;
    $('.app').inert = narrow.matches && open;
    $('#menu').setAttribute('aria-expanded',String(open));
    if(open && narrow.matches) $('#close-menu').focus();
  }
  function notice(message, error = false) { const n = $('#notice'); n.hidden = false; n.classList.toggle('error',error); $('span',n).textContent = message; }
  function changed() { localStorage.setItem('icat_catalog_updated',String(Date.now())); }
  async function api(path, method = 'GET', body) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(),30000);
    try {
      const form = body instanceof FormData;
      const response = await fetch(`${(window.API_URL || '').replace(/\/$/,'')}/api${path}`,{method,headers:{Authorization:`Bearer ${Auth.getToken()}`,...(!form && body ? {'Content-Type':'application/json'} : {})},body:body ? (form ? body : JSON.stringify(body)) : undefined,signal:controller.signal,cache:'no-store'});
      if (response.status === 401) { Auth.logout(); throw new Error('La sesión expiró.'); }
      const result = response.status === 204 ? {} : await response.json();
      if (!response.ok || result.ok === false) throw new Error(result.message || 'No se pudo completar la operación.');
      return result;
    } catch(e) { if(e.name === 'AbortError') throw new Error('El servidor tardó demasiado. Vuelve a intentarlo.'); throw e; }
    finally {clearTimeout(timeout);}
  }
  const button = (label, action, primary = false, ico = '') => `<button class="btn ${primary ? 'primary' : ''}" data-action="${action}">${ico ? icon(ico) : ''}${label}</button>`;
  const heading = (title,sub,action = '') => `<div class="page-head"><div><div class="eyebrow">${cfg.title}</div><h1>${title}</h1><p>${sub}</p></div>${action}</div>`;
  const empty = (title,sub = '',action = '') => `<div class="empty">${icon(cfg.icon)}<h3>${title}</h3><p>${sub}</p>${action}</div>`;
  const badge = (text,kind='') => `<span class="badge ${esc(kind)}">${esc(text)}</span>`;
  const stat = (label,value,sub,ico) => `<div class="stat"><div class="stat-top">${label}${icon(ico)}</div><strong>${esc(value)}</strong><small>${sub}</small></div>`;
  function image(url, fallback = '../assets/imagenplaya.jpg') {
    let safe = fallback; try { if(new URL(url).protocol === 'https:') safe = url; } catch { /* imagen local de respaldo */ }
    return `<img class="card-image" src="${esc(safe)}" alt="" loading="lazy">`;
  }
  function showDialog(title, content, save, label = 'Guardar cambios') {
    if (dialog.open) dialog.close();
    dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div><form id="dialog-form">${content}<p class="form-error" role="alert" id="dialog-error"></p><div class="form-actions"><button class="btn" type="button" data-close>Cancelar</button><button class="btn primary" type="submit">${label}</button></div></form>`;
    dialog.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dialog.close());
    $('#dialog-form').onsubmit = async e => {
      e.preventDefault(); const submit = e.submitter; submit.disabled = true; $('#dialog-error').textContent = '';
      try { await save(new FormData(e.currentTarget)); dialog.close(); }
      catch(error) { $('#dialog-error').textContent = error.message; }
      finally {submit.disabled = false;}
    };
    dialog.showModal();
  }
  const field = (label,name,value='',type='text',attrs='') => `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
  const area = (label,name,value='',attrs='') => `<label class="full">${label}<textarea name="${name}" ${attrs}>${esc(value)}</textarea></label>`;
  const options = (list,current) => list.map(([v,l]) => `<option value="${esc(v)}" ${String(v)===String(current) ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const select = (label,name,list,current) => `<label>${label}<select name="${name}" required>${options(list,current)}</select></label>`;
  const check = (label,name,value = true) => `<label class="check full"><input name="${name}" type="checkbox" ${value ? 'checked' : ''}>${label}</label>`;
  const toolbar = (placeholder,count,extra='') => `<div class="toolbar"><label class="full"><span class="sr-only">Buscar</span><input id="search" type="search" placeholder="${placeholder}" aria-label="${placeholder}"></label>${extra}<span class="count">${count} registros</span></div>`;
  function filterCards() { const q = $('#search')?.value.toLocaleLowerCase() || ''; view.querySelectorAll('[data-search]').forEach(el => el.hidden = !el.dataset.search.includes(q)); }
  async function go(next = tab) {
    tab = next; const version = ++generation; selected = null;
    $('#crumb').textContent = cfg.tabs.find(t => t[0]===tab)?.[1] || cfg.title;
    $('#nav').querySelectorAll('button').forEach(b => {b.classList.toggle('active',b.dataset.tab===tab); if(b.dataset.tab===tab)b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');});
    setMenu(false);
    view.innerHTML = '<div class="loading">Cargando tu espacio de trabajo…</div>';
    try {
      let nextData;
      if(role==='editor') {
        const [places,offers,widgets,rewards] = await Promise.all([api('/destinos'),api('/admin/promociones'),api('/equipo/widgets'),api('/admin/recompensas')]);
        nextData = {places:places.destinos,offers:offers.promotions,widgets:widgets.widgets,rewards:rewards.recompensas};
      } else if(role==='soporte') nextData = await api('/equipo/soporte');
      else { const [cash,clients,offers] = await Promise.all([api('/equipo/caja'),api('/equipo/clientes'),api('/promociones')]); nextData = {...cash,clients:clients.clientes,offers:offers.promotions}; }
      if(version !== generation) return;
      data = nextData; render();
      if(tab==='medios') await loadMedia();
    } catch(error) {if(version !== generation)return;view.innerHTML=empty('No pudimos cargar el panel','Comprueba tu conexión e inténtalo de nuevo.',button('Reintentar','reload',true));notice(error.message,true);}
  }
  function render() {
    if(role==='editor') renderEditor();
    if(role==='soporte') renderSupport();
    if(role==='registrador') renderReception();
  }
  function offerCard(p) {return `<article class="card" data-search="${esc(`${p.titulo} ${p.destino_nombre}`.toLowerCase())}">${image(p.imagen_principal_url)}<div class="card-body"><div class="case-meta">${esc(p.destino_nombre)}${badge(p.activo ? 'Publicada' : 'Oculta')}</div><h3>${esc(p.titulo)}</h3><p class="description">${esc(p.descripcion_corta)}</p><div class="card-footer"><strong>${pen(p.precio)} <small>/ persona</small></strong><button class="btn small" data-edit="promociones:${p.id}">${icon('edit')}Editar</button></div></div></article>`;}
  function renderEditor() {
    if(tab==='inicio') {
      view.innerHTML = `<section class="hero"><span class="hero-stamp">CONTENIDO & EXPERIENCIAS</span><div class="eyebrow">El siguiente viaje empieza aquí</div><h1>Historias que inspiran.<br>Experiencias que conectan.</h1><p>Hola, ${esc(user.nombre.split(' ')[0])}. Dale vida a Ica: prepara destinos, comparte imágenes y crea nuevas experiencias para nuestros viajeros.</p>${button('Crear una promoción','new-offer',true,'plus')}</section><div class="stats">${stat('Destinos en el catálogo',data.places.length,'Lugares para seguir descubriendo','map')}${stat('Promociones publicadas',data.offers.filter(p=>p.activo).length,`${data.offers.length} experiencias en total`,'tag')}${stat('Widgets activos',data.widgets.filter(w=>w.activo).length,'Contenido de la página de inicio','grid')}</div><div class="section-title"><h2>Tu catálogo de experiencias</h2><button class="btn small" data-tab="promociones">Ver todas ${icon('arrow')}</button></div><div class="cards">${data.offers.slice(0,3).map(offerCard).join('')}</div>${!data.offers.length ? empty('Tu próxima experiencia empieza aquí','Crea la primera promoción del catálogo.') : ''}<div class="section-title"><h2>Todo listo para publicar</h2></div><div class="cards">${[['map','Destinos','Información, portadas y paisajes.','destinos'],['image','Biblioteca visual','Sube y reutiliza las imágenes de Ica.','medios'],['grid','Widgets del inicio','Avisos, banners y tarjetas a tu medida.','widgets']].map(([ico,title,desc,dest])=>`<article class="panel">${icon(ico)}<h3 style="margin-top:16px">${title}</h3><p class="muted">${desc}</p><button class="btn small" data-tab="${dest}">Explorar ${icon('arrow')}</button></article>`).join('')}</div>`;
    } else if(tab==='destinos') {
      view.innerHTML = heading('Un lugar, mil historias.','Edita la información y las imágenes que ven tus viajeros.',button('Nuevo destino','new-place',true,'plus')) + toolbar('Buscar destino…',data.places.length) + `<div class="cards">${data.places.map(p=>`<article class="card" data-search="${esc(p.nombre.toLowerCase())}">${image(p.imagen_url)}<div class="card-body"><div class="eyebrow">Destino Ica</div><h3>${esc(p.nombre)}</h3><p class="description">${esc(p.descripcion || 'Añade una descripción para inspirar a tus viajeros.')}</p><div class="card-footer"><small>${data.offers.filter(o=>o.destino_id===p.id).length} promociones</small><button class="btn small" data-edit="destinos:${p.id}">${icon('edit')}Editar</button></div></div></article>`).join('')}</div>` + (!data.places.length ? empty('Añade tu primer destino') : '');
    } else if(tab==='promociones') {
      view.innerHTML = heading('Experiencias para recordar.','Gestiona precios, detalles, galerías y disponibilidad.',button('Nueva promoción','new-offer',true,'plus')) + toolbar('Buscar promoción o destino…',data.offers.length) + `<div class="cards">${data.offers.map(offerCard).join('')}</div>` + (!data.offers.length ? empty('Crea la primera experiencia','Primero registra un destino y luego añade una promoción.') : '');
    } else if(tab==='canjes') {
      view.innerHTML = heading('Beneficios para tus viajeros.','Administra los productos, promociones y descuentos disponibles en el catálogo de canje.',button('Agregar beneficio','new-reward',true,'plus')) + toolbar('Buscar beneficio…',data.rewards.length) + `<div class="cards">${data.rewards.map(rewardCard).join('')}</div>` + (!data.rewards.length ? empty('Aún no hay beneficios','Agrega el primer beneficio para que tus clientes puedan canjear sus puntos.') : '');
    } else if(tab==='widgets') {
      view.innerHTML = heading('Una web que siempre cambia.','Banners, tarjetas y avisos que se publican en el inicio.',button('Nuevo widget','new-widget',true,'plus')) + `<div class="cards">${data.widgets.map(w=>`<article class="card">${w.imagen_url ? image(w.imagen_url) : ''}<div class="card-body"><div class="case-meta">${esc(w.tipo)} · Orden ${w.orden}${badge(w.activo?'Visible':'Oculto')}</div><h3>${esc(w.titulo)}</h3><p class="description">${esc(w.texto)}</p><button class="btn small" data-edit="widgets:${w.id}">${icon('edit')}Editar widget</button></div></article>`).join('')}</div>` + (!data.widgets.length ? empty('Dale una nueva voz al inicio','Publica un aviso de temporada o destaca una experiencia.') : '');
    } else if(tab==='medios') {
      view.innerHTML = heading('La mirada de Ica.','Sube JPG, PNG o WebP. Hasta 10 imágenes de 5 MB por carga.',button('Subir imágenes','upload',true,'plus')) + '<div id="media-grid" class="cards"></div><div class="actions" style="margin-top:20px" id="media-more"></div>';
    }
    function rewardCard(reward) {
      const type = ({producto:'Producto',promocion:'Promoción',descuento:'Descuento'})[reward.tipo] || 'Beneficio';
      const stock = reward.stock === null ? 'Stock ilimitado' : `${reward.stock} disponibles`;
      return `<article class="card" data-search="${esc(`${reward.nombre} ${type}`.toLowerCase())}">${reward.imagen_url ? image(reward.imagen_url) : ''}<div class="card-body"><div class="case-meta">${type}${badge(reward.activo ? 'Activo' : 'Inactivo',reward.activo ? '' : 'pendiente')}</div><h3>${esc(reward.nombre)}</h3><p class="description">${esc(reward.descripcion || 'Sin descripción.')}</p><div class="card-footer"><strong>${esc(reward.puntos)} pts <small>· ${esc(stock)}</small></strong><button class="btn small" data-edit="recompensas:${reward.id}">${icon('edit')}Editar</button></div></div></article>`;
    }
  }
  function imageFields(name,value,secondName,secondValue) {
    return `<div class="full upload-row">${field('Imagen principal · URL HTTPS',name,value,'url','required maxlength="2048"')}<button class="btn" type="button" data-upload-field="${name}">${icon('image')}Subir imagen</button></div>${field('Imagen de fondo · URL HTTPS (opcional)',secondName,secondValue,'url','maxlength="2048"')}`;
  }
  function edit(kind,item = {}) {
    let content,save;
    if(kind==='destinos') {
      content = field('Nombre','nombre',item.nombre,'text','required maxlength="180"') + field('Identificador de URL (slug)','slug',item.slug,'text','maxlength="120" placeholder="Se genera desde el nombre"') + area('Descripción','descripcion',item.descripcion,'maxlength="2000"') + imageFields('imagen_url',item.imagen_url,'imagen_fondo_url',item.imagen_fondo_url);
      save = f => {const b=Object.fromEntries(f); if(!b.slug)delete b.slug; return api(`/destinos${item.id?'/'+item.id:''}`,item.id?'PUT':'POST',b);};
    } else if(kind==='promociones') {
      if(!data.places.length) {notice('Primero crea un destino para vincular la promoción.',true);return;}
      content = field('Título','titulo',item.titulo,'text','required maxlength="180"') + select('Destino','destino_id',data.places.map(p=>[p.id,p.nombre]),item.destino_id) + field('Precio por persona · S/','precio',item.precio,'number','required min="0.01" max="99999999.99" step="0.01"') + field('Duración','duracion',item.duracion,'text','required maxlength="120" placeholder="Ej. 3 horas"') + field('Slug','slug',item.slug,'text','maxlength="120" placeholder="Se genera desde el título"') + field('Ubicación','ubicacion',item.ubicacion,'text','maxlength="180"') + area('Descripción breve','descripcion_corta',item.descripcion_corta,'required maxlength="500"') + area('Descripción completa','descripcion_larga',item.descripcion_larga,'required maxlength="50000"') + imageFields('imagen_principal_url',item.imagen_principal_url,'imagen_fondo_url',item.imagen_fondo_url) + area('Galería · una URL HTTPS por línea, hasta 10','galeria_urls',(item.galeria_urls||[]).join('\n')) + `<div class="full"><button type="button" class="btn small" data-upload-field="galeria_urls" data-multiple="true">Subir imágenes a la galería</button></div>` + area('Incluye · un elemento por línea','incluye',(item.incluye||[]).join('\n'),'maxlength="5200"') + area('Itinerario','itinerario',item.itinerario,'maxlength="10000"') + check('Publicar en la web','activo',item.activo ?? true);
      save = f => {const b=Object.fromEntries(f);b.activo=f.has('activo');b.galeria_urls=b.galeria_urls.split('\n').map(s=>s.trim()).filter(Boolean);b.incluye=b.incluye.split('\n').map(s=>s.trim()).filter(Boolean);if(!b.slug)delete b.slug;return api(`/promociones${item.id?'/'+item.id:''}`,item.id?'PUT':'POST',b);};
    } else if(kind==='recompensas') {
      content = field('Nombre','nombre',item.nombre,'text','required maxlength="180"') + select('Tipo','tipo',[['producto','Producto'],['promocion','Promoción'],['descuento','Descuento']],item.tipo || 'producto') + field('Costo en puntos','puntos',item.puntos,'number','required min="1" max="10000000" step="1"') + field('Stock · vacío para ilimitado','stock',item.stock ?? '', 'number','min="0" max="10000000" step="1"') + area('Descripción','descripcion',item.descripcion,'maxlength="1000"') + field('Imagen · URL HTTPS (opcional)','imagen_url',item.imagen_url,'url','maxlength="2048"') + check('Disponible para canje','activo',item.activo ?? true);
      save = f => {
        const body = Object.fromEntries(f);
        body.activo = f.has('activo');
        return api(`/admin/recompensas${item.id ? `/${item.id}` : ''}`,item.id ? 'PATCH' : 'POST',body);
      };
    } else {
      content = field('Título','titulo',item.titulo,'text','required maxlength="180"') + select('Tipo de widget','tipo',[['banner','Banner destacado'],['tarjeta','Tarjeta informativa'],['aviso','Aviso']],item.tipo) + area('Texto','texto',item.texto,'maxlength="1000"') + `<div class="full upload-row">${field('Imagen · URL HTTPS (opcional)','imagen_url',item.imagen_url,'url','maxlength="2048"')}<button class="btn" type="button" data-upload-field="imagen_url">Subir imagen</button></div>` + field('Enlace interno (opcional)','enlace',item.enlace,'text','maxlength="500" placeholder="/html/contacto.html"') + field('Orden de aparición','orden',item.orden ?? 0,'number','required min="0" max="999" step="1"') + check('Visible en el inicio','activo',item.activo ?? true);
      save = f => {const b=Object.fromEntries(f);b.activo=f.has('activo');b.orden=Number(b.orden);return api(`/equipo/widgets${item.id?'/'+item.id:''}`,item.id?'PUT':'POST',b);};
    }
    const kindLabel = ({destinos:'destino',promociones:'promoción',recompensas:'beneficio',widgets:'widget'})[kind] || 'contenido';
    showDialog(`${item.id?'Editar':'Crear'} ${kindLabel}`,`<div class="form-grid">${content}</div>${item.id ? `<div style="margin-top:20px"><button type="button" class="btn danger small" data-delete="${kind}:${item.id}">Eliminar ${kindLabel}</button></div>`:''}`,async f=>{await save(f);changed();notice('Contenido guardado. Los cambios ya están disponibles en la web.');await go();});
  }
  async function upload(fieldName, multiple = false) {
    const picker = document.createElement('input');picker.type='file';picker.accept='image/jpeg,image/png,image/webp';picker.multiple=multiple;
    picker.onchange = async()=> {
      if(!picker.files.length)return;
      const errorTarget = dialog.open ? $('#dialog-error') : null;
      let controls = [];
      try {
        if(picker.files.length>10 || [...picker.files].some(f=>f.size>5*1024*1024))throw new Error('Selecciona hasta 10 imágenes de máximo 5 MB cada una.');
        if(errorTarget)errorTarget.textContent='Subiendo imágenes…';else notice('Subiendo imágenes…');
        controls = [...dialog.querySelectorAll('button')].filter(b=>!b.disabled); controls.forEach(b=>b.disabled=true);
        const payload = new FormData();[...picker.files].forEach(f=>payload.append('imagenes',f));
        const result = await api('/uploads','POST',payload);
        if(fieldName) {const input=dialog.querySelector(`[name="${fieldName}"]`);if(input)input.value=multiple ? [input.value.trim(),...result.urls].filter(Boolean).join('\n') : result.urls[0];}
        else if(tab==='medios')await loadMedia();
        if(errorTarget)errorTarget.textContent='';notice('Imágenes subidas. Puedes usarlas en tu contenido.');
      } catch(e) {if(errorTarget)errorTarget.textContent=e.message;else notice(e.message,true);}
      finally {controls.forEach(b=>b.disabled=false);}
    };picker.click();
  }
  async function loadMedia(cursor) {
    const version = generation;
    try {const result=await api('/admin/medios'+(cursor?'?cursor='+encodeURIComponent(cursor):''));if(tab!=='medios'||version!==generation)return;
      const html=result.images.map(m=>`<article class="card">${image(m.thumbnail_url || m.url)}<div class="card-body"><p>${esc(m.nombre)}</p><button class="btn small" data-copy="${esc(m.url)}">Copiar URL</button></div></article>`).join('');
      if(!cursor)$('#media-grid').innerHTML=html || empty('Tu biblioteca está vacía','Sube las primeras imágenes de tus experiencias.');else $('#media-grid').insertAdjacentHTML('beforeend',html);
      mediaCursor=result.next_cursor;$('#media-more').innerHTML=mediaCursor ? button('Cargar más','more-media') : '';
    } catch(error) {notice(error.message,true);}
  }
  function renderSupport() {
    view.innerHTML = heading('Escuchar también es acompañar.','Atiende los casos que necesitan una conversación con el equipo.') + `<div class="stats">${stat('Por atender',data.casos.filter(c=>c.estado==='abierto').length,'Casos escalados por los viajeros','chat')}${stat('En atención',data.casos.filter(c=>c.estado==='en_atencion').length,'Conversaciones en seguimiento','users')}${stat('Resueltos',data.casos.filter(c=>c.estado==='resuelto').length,'De los últimos 200 casos','grid')}</div>` + toolbar('Buscar cliente, asunto o caso…',data.casos.length,`<select id="case-filter" aria-label="Filtrar estado">${options([['','Todos los estados'],['abierto','Abiertos'],['en_atencion','En atención'],['resuelto','Resueltos']],'')}</select>`) + `<div class="support-layout"><div class="inbox" id="inbox">${caseList()}</div><section class="panel conversation" id="conversation" aria-label="Conversación del caso">${empty('Cada conversación importa','Selecciona un caso para revisar el historial, responder al cliente o dejar una nota interna.')}</section></div>`;
  }
  function caseList() {
    return data.casos.map(c=>`<button class="case-btn ${selected===c.id?'selected':''}" data-case="${c.id}" data-state="${c.estado}" data-search="${esc(`${c.cliente} ${c.asunto} ${c.id}`.toLowerCase())}"><span class="case-meta"><span>#${c.id} · ${esc(c.cliente)}</span>${badge(c.prioridad,c.prioridad)}</span><strong>${esc(c.asunto)}</strong><small>${esc(c.ultimo_mensaje || '')}</small><span class="case-meta"><span>${esc(({abierto:'Abierto',en_atencion:'En atención',resuelto:'Resuelto'})[c.estado])}</span>${esc(date(c.updated_at))}</span></button>`).join('') || empty('Todo al día','Los casos enviados desde Atención humana aparecerán aquí.');
  }
  let messageSignature='';
  async function openCase(id) {
    selected=id;messageSignature='';
    const c=data.casos.find(c=>c.id===id);
    view.querySelectorAll('[data-case]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.case)===id));
    $('#conversation').innerHTML=`<div class="conversation-head"><small>CASO #${c.id} · ${esc(c.cliente)}</small><h3>${esc(c.asunto)}</h3><small>${esc(c.email)} · ${c.agente?'Responsable: '+esc(c.agente):'Sin asignar'}</small><form id="case-state" class="case-controls">${select('Estado','estado',[['abierto','Abierto'],['en_atencion','En atención'],['resuelto','Resuelto']],c.estado)}${select('Prioridad','prioridad',[['normal','Normal'],['alta','Alta'],['urgente','Urgente']],c.prioridad)}<button class="btn small" type="submit">Asignarme y guardar</button></form></div><div class="messages" id="messages" role="log" aria-label="Historial de mensajes"></div><form class="reply-form" id="reply">${area('Respuesta al cliente','contenido','','required maxlength="4000" placeholder="Escribe una respuesta cercana y clara…"')}<div class="actions"><label class="check"><input name="interno" type="checkbox">Nota interna (el cliente no la ve)</label><button class="btn primary" type="submit">Enviar ${icon('arrow')}</button></div><p class="form-error" role="alert"></p></form>`;
    $('#reply').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),b=e.submitter;b.disabled=true;try{await api(`/equipo/soporte/${selected}/mensajes`,'POST',{contenido:f.get('contenido'),interno:f.has('interno')});e.target.reset();await refreshMessages();}catch(err){$('.form-error',e.target).textContent=err.message;}finally{b.disabled=false;}};
    $('#case-state').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{const result=await api(`/equipo/soporte/${selected}`,'PATCH',Object.fromEntries(new FormData(e.target)));Object.assign(c,result.caso,{agente:user.nombre});notice('Caso actualizado y asignado a tu cuenta.');await refreshMessages();}catch(err){notice(err.message,true);}finally{e.submitter.disabled=false;}};
    await refreshMessages();
  }
  async function refreshMessages() {
    const id=selected,version=generation;if(!id)return;
    try {const result=await api(`/equipo/soporte/${id}`);if(id!==selected||version!==generation)return;
      const next=JSON.stringify(result.mensajes),box=$('#messages');
      if(next!==messageSignature){const near=box.scrollHeight-box.scrollTop-box.clientHeight<70;box.innerHTML=result.mensajes.map(m=>`<article class="bubble ${m.rol!=='cliente'?'team':''} ${m.interno?'internal':''}"><small>${esc(m.autor)} ${m.interno?'· NOTA INTERNA':''}</small><p>${esc(m.contenido)}</p><small>${esc(date(m.created_at))}</small></article>`).join('');if(near||!messageSignature)box.scrollTop=box.scrollHeight;messageSignature=next;}
      const closed=result.caso.estado==='resuelto';$('#reply button[type=submit]').disabled=closed;$('#reply textarea').disabled=closed;$('#reply .form-error').textContent=closed?'Caso resuelto. Cambia el estado para reabrir la conversación.':'';
    }catch(error){notice(error.message,true);}
  }
  function renderReception() {
    if(tab==='clientes') {view.innerHTML=heading('Una bienvenida con nombre propio.','Registra a los viajeros que nos visitan en persona.',button('Registrar cliente','new-customer',true,'plus'))+toolbar('Buscar nombre o documento…',data.clients.length)+`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Documento</th><th>Teléfono</th><th>Correo</th><th>Registrado</th></tr></thead><tbody>${data.clients.map(c=>`<tr data-search="${esc(`${c.nombre} ${c.documento}`.toLowerCase())}"><td><strong>${esc(c.nombre)}</strong></td><td>${esc(c.documento)}</td><td>${esc(c.telefono||'—')}</td><td>${esc(c.email||'—')}</td><td>${date(c.created_at)}</td></tr>`).join('')}</tbody></table></div>`+(!data.clients.length?empty('Recibe al primer viajero','El registro presencial no crea una cuenta ni una contraseña.'):'');return;}
    const t=data.turno,s=data.resumen,open=t&&!t.closed_at;
    view.innerHTML=heading('El comienzo de un gran viaje.','Registra clientes, cobra experiencias y lleva tu caja al día.',badge(open?'Caja abierta':'Caja cerrada',open?'':'pendiente'))+`<div class="stats">${stat('Ventas del turno',pen(s?.total),`${s?.operaciones||0} operaciones registradas`,'cash')}${stat('Efectivo esperado',pen(open?Number(t.fondo_inicial)+Number(s.efectivo):t?.efectivo_esperado),'Fondo inicial + ventas en efectivo','cash')}${stat('Pagos digitales',pen(s?.digital),'Yape, tarjeta y transferencia','tag')}</div>`;
    if(!open){view.innerHTML+=`<section class="hero"><div class="eyebrow">Tu punto de partida</div><h1>Todo empieza con<br>una buena bienvenida.</h1><p>Abre tu turno con el fondo inicial de efectivo. Cada venta quedará vinculada a tu usuario y a esta caja.</p>${button('Abrir mi caja','open-shift',true,'plus')}${t?.closed_at?`<p style="margin:15px 0 0">Último cierre: ${date(t.closed_at)} · Diferencia: ${pen(Number(t.efectivo_contado)-Number(t.efectivo_esperado))}</p>`:''}</section>`;}
    else {
      view.innerHTML+=`<div class="split"><section class="panel"><div class="section-title" style="margin-top:0"><h2>Registrar una venta</h2>${button('Nuevo cliente','new-customer',false,'plus')}</div><form id="sale-form"><div class="form-grid">${select('Cliente presencial','cliente_id',[['','Selecciona un cliente'],...data.clients.map(c=>[c.id,`${c.nombre} · ${c.documento}`])],'')}${select('Experiencia','promocion_id',[['','Selecciona una promoción'],...data.offers.map(p=>[p.id,`${p.titulo} · ${pen(p.precio)}`])],'')}${field('Fecha del tour','fecha_tour',today(),'date',`required min="${today()}"`)}${field('Viajeros','asistentes',1,'number','required min="1" max="15" step="1"')}${select('Método de pago','metodo',[['efectivo','Efectivo'],['yape','Yape'],['tarjeta','Tarjeta'],['transferencia','Transferencia']],'efectivo')}${field('Efectivo recibido · S/','recibido','','number','min="0" max="999999999.99" step="0.01" required')}${field('Referencia del pago digital','referencia','','text','maxlength="120" placeholder="N.º de operación verificada"')}</div><div class="sale-total"><span>Total de la experiencia</span><strong id="sale-total">S/ 0.00</strong></div><p id="change" class="muted"></p><p class="form-error" role="alert"></p><button class="btn primary" type="submit">Registrar cobro ${icon('arrow')}</button><p><small>Confirma el dinero recibido antes de registrar el cobro. El precio final se valida en el servidor.</small></p></form></section><aside><section class="panel"><div class="eyebrow">Tu turno en recepción</div><h2>Caja #${t.id}</h2><p class="muted">${esc(user.nombre)}<br>Abierta ${date(t.opened_at)}</p><div class="sale-total"><span>Fondo inicial</span><strong style="font-size:24px">${pen(t.fondo_inicial)}</strong></div><p><small>Cierra el turno al terminar y cuenta solo el efectivo disponible en caja.</small></p>${button('Realizar cierre de caja','close-shift')}</section></aside></div>`;
      const form=$('#sale-form');form.oninput=updateTotal;form.onchange=updateTotal;form.dataset.operation=crypto.randomUUID();form.onsubmit=sell;
    }
    view.innerHTML+=`<div class="section-title"><h2>Movimientos del turno</h2><small>Últimos 100 cobros · Totales del turno completo</small></div>`+(data.ventas.length?`<div class="table-wrap"><table><thead><tr><th>Operación</th><th>Viajero</th><th>Experiencia</th><th>Método</th><th>Total</th><th></th></tr></thead><tbody>${data.ventas.map(v=>`<tr><td>#${v.id}<br><small>${date(v.created_at)}</small></td><td>${esc(v.cliente)}</td><td>${esc(v.promocion_nombre)}</td><td>${esc(v.metodo)}</td><td>${pen(v.total)}</td><td><button class="btn small" data-receipt="${v.id}">Ver constancia</button></td></tr>`).join('')}</tbody></table></div>`:empty('Aún no hay movimientos','Los cobros registrados aparecerán aquí.'));
    // Insertar el historial no debe reemplazar el formulario ni sus eventos.
    if(open){const form=$('#sale-form');form.oninput=updateTotal;form.onchange=updateTotal;form.dataset.operation=crypto.randomUUID();form.onsubmit=sell;updateTotal();}
  }
  function updateTotal(){const f=$('#sale-form');if(!f)return;const p=data.offers.find(p=>String(p.id)===f.promocion_id.value),n=Number(f.asistentes.value)||0,total=Number(p?.precio||0)*n,cash=f.metodo.value==='efectivo';$('#sale-total').textContent=pen(total);f.recibido.required=cash;f.recibido.disabled=!cash;f.referencia.required=!cash;f.referencia.disabled=cash;$('#change').textContent=cash?`Vuelto estimado: ${pen(Math.max(0,Number(f.recibido.value)-total))}`:'Verifica el abono y registra su número de operación.';}
  async function sell(e){e.preventDefault();const form=e.currentTarget,submit=e.submitter;submit.disabled=true;const body=Object.fromEntries(new FormData(form));body.operacion=form.dataset.operation;
    try{const result=await api('/equipo/ventas','POST',body);notice('Cobro registrado correctamente.');await go();receipt(result.venta);}catch(error){$('.form-error',form).textContent=error.message;}finally{submit.disabled=false;}}
  function customer(){showDialog('Registrar cliente presencial',`<div class="form-grid">${field('Nombre completo','nombre','','text','required maxlength="120"')}${field('DNI / documento','documento','','text','required minlength="6" maxlength="20"')}${field('Teléfono (opcional)','telefono','','tel','maxlength="20"')}${field('Correo (opcional)','email','','email','maxlength="180"')}</div><p><small>Este registro sirve para la atención presencial. No genera una cuenta de acceso.</small></p>`,async f=>{await api('/equipo/clientes','POST',Object.fromEntries(f));notice('Cliente registrado. Ya puedes seleccionarlo en caja.');await go();},'Registrar cliente');}
  function receipt(v){const customer=data.clients.find(c=>c.id===v.cliente_id);dialog.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">Constancia de atención</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div><section class="receipt"><div class="eyebrow">IcaTurismo · Recepción</div><h2>Un nuevo viaje comienza.</h2><small>Operación #${v.id} · ${date(v.created_at)}</small><div class="receipt-lines">${[['Cliente',customer?.nombre||v.cliente],['Documento',customer?.documento||v.documento],['Experiencia',v.promocion_nombre],['Fecha de tour',String(v.fecha_tour).slice(0,10)],['Viajeros',v.asistentes],['Precio por persona',pen(v.precio_unitario)],['Método',v.metodo],['Recibido',pen(v.recibido)],['Vuelto',pen(Number(v.recibido)-Number(v.total))],['Referencia',v.referencia||'—']].map(([k,value])=>`<p><span>${k}</span><strong>${esc(value)}</strong></p>`).join('')}</div><small>Total cobrado</small><p class="total">${pen(v.total)}</p><p><small>Constancia interna de atención. No es un comprobante tributario.</small></p></section><div class="form-actions"><button class="btn" data-close>Cerrar</button><button class="btn primary" id="print">Imprimir constancia</button></div>`;dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());$('#print').onclick=()=>window.print();dialog.showModal();}
  async function action(name){
    if(name==='reload')return go();if(name==='new-place')return edit('destinos');if(name==='new-offer')return edit('promociones');if(name==='new-reward')return edit('recompensas');if(name==='new-widget')return edit('widgets');if(name==='upload')return upload(null,true);if(name==='more-media')return loadMedia(mediaCursor);if(name==='new-customer')return customer();
    if(name==='open-shift')return showDialog('Abrir mi caja',field('Fondo inicial en efectivo · S/','fondo_inicial','0','number','required min="0" max="999999999.99" step="0.01"'),async f=>{await api('/equipo/caja','POST',Object.fromEntries(f));await go();notice('Tu caja está abierta. Ya puedes registrar cobros.');},'Abrir caja');
    if(name==='close-shift')return showDialog('Cierre de caja',`<p class="muted">Efectivo esperado: <strong>${pen(Number(data.turno.fondo_inicial)+Number(data.resumen.efectivo))}</strong></p>${field('Efectivo contado · S/','efectivo_contado','','number','required min="0" max="999999999.99" step="0.01"')}${area('Observación de cierre','observacion','','maxlength="1000"')}`,async f=>{await api(`/equipo/caja/${data.turno.id}/cierre`,'POST',Object.fromEntries(f));await go();notice('Caja cerrada. Se guardaron el conteo y la diferencia.');},'Cerrar y guardar turno');
  }
  document.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    try{
      if(b.dataset.tab)return go(b.dataset.tab);
      if(b.dataset.action){if(busy)return;busy=true;b.disabled=true;try{await action(b.dataset.action);}finally{busy=false;b.disabled=false;}return;}
      if(b.dataset.edit){const [kind,id]=b.dataset.edit.split(':'),list=kind==='destinos'?data.places:kind==='promociones'?data.offers:kind==='recompensas'?data.rewards:data.widgets;return edit(kind,list.find(p=>p.id===Number(id)));}
      if(b.dataset.delete){const [kind,id]=b.dataset.delete.split(':');const kindLabel=({widgets:'widget',destinos:'destino',promociones:'promoción',recompensas:'beneficio'})[kind]||'contenido';showDialog('Eliminar contenido',`<p>¿Eliminar este ${kindLabel}? Esta acción no se puede deshacer.</p>`,async()=>{const endpoint=kind==='widgets'?`/equipo/widgets/${id}`:kind==='recompensas'?`/admin/recompensas/${id}`:`/${kind}/${id}`;await api(endpoint,'DELETE');changed();notice('Contenido eliminado.');await go();},'Eliminar definitivamente');return;}
      if(b.dataset.uploadField)return upload(b.dataset.uploadField,b.dataset.multiple==='true');
      if(b.dataset.copy){await navigator.clipboard.writeText(b.dataset.copy);notice('URL de imagen copiada.');}
      if(b.dataset.case)return openCase(Number(b.dataset.case));
      if(b.dataset.receipt)return receipt(data.ventas.find(v=>v.id===Number(b.dataset.receipt)));
    }catch(error){notice(error.message,true);}
  });
  document.addEventListener('input',e=>{if(e.target.id==='search')applyFilter();});
  document.addEventListener('change',e=>{if(e.target.id==='case-filter')applyFilter();});
  function applyFilter(){filterCards();if(role==='soporte'){const state=$('#case-filter').value;view.querySelectorAll('[data-case]').forEach(el=>{if(state&&el.dataset.state!==state)el.hidden=true;});}}
  $('#notice button').onclick=()=>$('#notice').hidden=true;
  $('#menu').onclick=()=>setMenu(!$('#sidebar').classList.contains('open'));
  $('#close-menu').onclick=()=>{setMenu(false);$('#menu').focus();};
  narrow.addEventListener('change',()=>setMenu(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open){setMenu(false);$('#menu').focus();}});
  setMenu(false);
  $('#logout').onclick=()=>Auth.logout();$('#refresh').onclick=()=>go();
  $('#today').textContent=new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',timeZone:'America/Lima'});
  async function start(){try{
    if(!Auth.isLoggedIn()){location.replace('login.html');return;}
    // El servidor vuelve a consultar la cuenta. No confiamos en el rol guardado en localStorage.
    user=await Auth.me();if(!user){Auth.logout();return;}
    if(user.rol!==role&&user.rol!=='admin'){location.replace(Auth.dashboardUrl());return;}
    $('#user-name').textContent=user.nombre;$('#avatar').textContent=user.nombre.split(' ').map(s=>s[0]).slice(0,2).join('');$('#workspace-icon').innerHTML=icon(cfg.icon);
    $('#nav').innerHTML=cfg.tabs.map(([id,label,ico])=>`<button data-tab="${id}">${icon(ico)}${label}</button>`).join('');
    if(user.rol==='admin')$('#nav').insertAdjacentHTML('afterend','<div class="role-links" style="margin-top:24px"><a href="admin.html">Admin</a><a href="editor.html">Editor</a><a href="soporte.html">Soporte</a><a href="registrador.html">Recepción</a></div>');
    await go();
  }catch(error){view.innerHTML=empty('No se pudo validar tu sesión','Comprueba la conexión con la API y recarga el panel.');notice(error.message,true);}}
  start();
  // Se actualiza el historial sin reemplazar ni borrar la respuesta que se está escribiendo.
  let polling=false;
  setInterval(async()=>{if(role!=='soporte'||document.hidden||polling||dialog.open||!user)return;polling=true;const version=generation;try{const result=await api('/equipo/soporte');if(version!==generation)return;data=result;const inbox=$('#inbox');if(inbox){inbox.innerHTML=caseList();applyFilter();}if(selected)await refreshMessages();}catch(error){notice(error.message,true);}finally{polling=false;}},10000);
})();
