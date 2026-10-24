import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ExternalLink, ImagePlus, MapPin, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import './CmsPanel.css'
import { cmsRequest } from './cmsApi.js'
import { MediaBrowser } from './MediaLibrary.jsx'

function notifyPublic() {
  try { localStorage.setItem('icat_catalog_updated', String(Date.now())) } catch { /* Sin almacenamiento: la API sigue siendo la fuente de datos. */ }
  window.dispatchEvent(new Event('icat:catalog-updated'))
}

function publicUrl(kind, slug) {
  return new URL(`${kind === 'destinos' ? 'destino' : 'promocion'}.html?slug=${encodeURIComponent(slug)}`, window.location.href).href
}

function ImagePicker({ label, urls, multiple = false, required = true, onChange, onBusy }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previews, setPreviews] = useState([])
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [selected, setSelected] = useState([])
  const controller = useRef(null)
  const inputId = useId()
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews])

  async function upload(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    setError('')
    const max = multiple ? 10 : 1
    if (files.length + (multiple ? urls.length : 0) > max) return setError(`Puedes seleccionar hasta ${max} ${multiple ? 'imágenes de galería' : 'imagen principal'}.`)
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      return setError('Usa JPEG, PNG o WebP de máximo 5 MB por imagen.')
    }
    setPreviews(files.map((file) => URL.createObjectURL(file)))
    setBusy(true); onBusy(true)
    controller.current = new AbortController()
    try {
      const form = new FormData()
      files.forEach((file) => form.append('imagenes', file))
      const result = await cmsRequest('/uploads', { method: 'POST', body: form, signal: controller.current.signal })
      if (!Array.isArray(result.urls) || result.urls.length !== files.length) throw new Error('La subida no devolvió todas las imágenes.')
      onChange(multiple ? [...new Set([...urls, ...result.urls])] : result.urls)
    } catch (failure) { if (failure.name !== 'AbortError') setError(failure.message) }
    finally { setBusy(false); onBusy(false); setPreviews([]) }
  }
  function move(index, direction) {
    const next = [...urls]
    ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
    onChange(next)
  }
  return <fieldset className="cms-images" disabled={busy}>
    <legend>{label}</legend>
    <div className="cms-image-grid">
      {urls.map((url, index) => <div className="cms-image-preview" key={`${url}-${index}`}>
        <img src={url} alt={`${label} ${index + 1}`} />
        <div><span>{multiple ? `${index + 1}` : 'Principal'}</span>
          {multiple && index > 0 && <button type="button" onClick={() => move(index, -1)} aria-label={`Mover imagen ${index + 1} a la izquierda`}><ArrowLeft size={13} /></button>}
          {multiple && index < urls.length - 1 && <button type="button" onClick={() => move(index, 1)} aria-label={`Mover imagen ${index + 1} a la derecha`}><ArrowRight size={13} /></button>}
          <button type="button" onClick={() => onChange(urls.filter((_, position) => position !== index))} aria-label={`Quitar imagen ${index + 1}`}><X size={14} /></button>
        </div>
      </div>)}
      {previews.map((url) => <div className="cms-image-preview cms-image-preview--loading" key={url}><img src={url} alt="Subiendo imagen" /><span>Subiendo…</span></div>)}
      {(multiple ? urls.length < 10 : !urls.length) && <label className="cms-upload" htmlFor={inputId}><ImagePlus size={24} /><strong>{busy ? 'Subiendo…' : 'Subir imágenes'}</strong><span>JPEG, PNG, WebP · 5 MB</span></label>}
    </div>
    <input id={inputId} className="cms-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} onChange={upload} disabled={busy} aria-label={label} />
    <div className="media-picker-actions"><button type="button" className="button button--quiet" disabled={busy} onClick={() => { setSelected([...urls]); setLibraryOpen((value) => !value) }}><ImagePlus size={15} />{libraryOpen ? 'Cerrar biblioteca' : 'Elegir de la biblioteca'}</button></div>
    {libraryOpen && <div><p className="media-picker-heading">{multiple ? 'Selecciona hasta 10 imágenes para tu galería.' : 'Selecciona una imagen para este campo. Se reemplazará la imagen actual.'}</p><MediaBrowser embedded selectedUrls={selected} onSelectionChange={setSelected} multiple={multiple} /><div className="media-picker-footer"><button type="button" className="button button--primary" disabled={!selected.length} onClick={() => { onChange([...new Set(selected)]); setLibraryOpen(false) }}><Check size={14} />{multiple ? `Usar selección (${selected.length}/10)` : 'Usar imagen seleccionada'}</button><button type="button" className="button button--quiet" onClick={() => setLibraryOpen(false)}>Cerrar</button></div></div>}
    {!multiple && <label className="field-label cms-image-url">O utiliza una URL HTTPS<input type="url" placeholder="https://…" required={required} pattern="https://.*" value={urls[0] || ''} onChange={(event) => onChange(event.target.value ? [event.target.value] : [])} /></label>}
    {multiple && <p className="cms-help">{urls.length}/10 imágenes. Cambia el orden con las flechas; así aparecerán en la galería pública.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </fieldset>
}

function ContentForm({ kind, record, destinations, onClose, onSaved }) {
  const isDestination = kind === 'destinos'
  const [form, setForm] = useState(() => isDestination
    ? { nombre: '', slug: '', descripcion: '', imagen_url: '', imagen_fondo_url: '', ...record }
    : { destino_id: String(destinations[0]?.id || ''), titulo: '', slug: '', descripcion_corta: '', descripcion_larga: '', precio: '', duracion: '', imagen_principal_url: '', imagen_fondo_url: '', galeria_urls: [], ubicacion: '', incluye: [], itinerario: '', activo: true, ...record })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState({})
  const [dirty, setDirty] = useState(false)
  const ref = useRef(null)
  const titleId = useId()
  const busy = saving || Object.values(uploading).some(Boolean)
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close() }, [])
  const update = (key, value) => { setDirty(true); setForm((current) => ({ ...current, [key]: value })) }
  function close() {
    if (busy) return
    if (dirty && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return
    onClose()
  }
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setSaving(true); setError('')
    try {
      const body = { ...form }
      if (!body.slug.trim()) delete body.slug
      if (!isDestination) body.destino_id = Number(body.destino_id)
      if (!isDestination) body.incluye = body.incluye.map((item) => item.trim()).filter(Boolean)
      const result = await cmsRequest(`/${kind}${record ? `/${record.id}` : ''}`, { method: record ? 'PUT' : 'POST', body })
      notifyPublic()
      onSaved(isDestination ? result.destino : result.promotion)
    } catch (failure) { setError(failure.message) }
    finally { setSaving(false) }
  }
  return <dialog ref={ref} className="cms-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); close() }}>
    <form onSubmit={submit} className="cms-form">
      <div className="cms-form-heading"><div><span className="eyebrow">Plantilla del sitio público</span><h2 id={titleId}>{record ? 'Editar' : 'Crear'} {isDestination ? 'destino' : 'promoción'}</h2><p>Tu contenido se publica al guardar.</p></div><button type="button" className="icon-button" onClick={close} disabled={busy} aria-label="Cerrar formulario"><X size={20} /></button></div>
      <div className="cms-form-body"><div className="cms-form-fields">
        <label className="field-label">{isDestination ? 'Nombre del destino' : 'Título de la promoción'}<input autoFocus required maxLength={180} value={isDestination ? form.nombre : form.titulo} onChange={(event) => update(isDestination ? 'nombre' : 'titulo', event.target.value)} placeholder={isDestination ? 'Ej. Selva peruana' : 'Ej. Atardecer en las dunas'} /></label>
        <label className="field-label">Dirección de la página (slug)<input maxLength={120} value={form.slug} onChange={(event) => update('slug', event.target.value)} placeholder="Se genera desde el nombre si lo dejas vacío" /><small>Ejemplo: aventura-selva. Si cambias una dirección publicada, cambiará su enlace.</small></label>
        {isDestination ? <label className="field-label">Descripción del destino<textarea rows={4} maxLength={2000} value={form.descripcion} onChange={(event) => update('descripcion', event.target.value)} placeholder="Lo que hace especial a este lugar…" /></label> : <>
          <div className="form-grid"><label className="field-label">Destino<select required value={form.destino_id} onChange={(event) => update('destino_id', event.target.value)}><option value="">Selecciona un destino</option>{destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.nombre}</option>)}</select></label><label className="field-label">Precio por persona (S/)<input required type="number" min="0.01" max="99999999.99" step="0.01" value={form.precio} onChange={(event) => update('precio', event.target.value)} /></label></div>
          <div className="form-grid"><label className="field-label">Duración<input required maxLength={120} value={form.duracion} onChange={(event) => update('duracion', event.target.value)} placeholder="Ej. 2 días / 1 noche" /></label><label className="field-label">Ubicación<input maxLength={180} value={form.ubicacion} onChange={(event) => update('ubicacion', event.target.value)} placeholder="Ej. Huacachina, Ica" /></label></div>
          <label className="field-label">Descripción corta<textarea required rows={2} maxLength={500} value={form.descripcion_corta} onChange={(event) => update('descripcion_corta', event.target.value)} placeholder="Una invitación para descubrir la experiencia…" /></label>
          <label className="field-label">Descripción completa<textarea required rows={5} maxLength={50000} value={form.descripcion_larga} onChange={(event) => update('descripcion_larga', event.target.value)} /></label>
          <label className="field-label">¿Qué incluye? (una opción por línea)<textarea rows={4} maxLength={5000} value={form.incluye.join('\n')} onChange={(event) => update('incluye', event.target.value.split('\n'))} placeholder={'Guía local\nTransporte\nEquipo de seguridad'} /></label>
          <label className="field-label">Itinerario<textarea rows={4} maxLength={10000} value={form.itinerario} onChange={(event) => update('itinerario', event.target.value)} placeholder={'Día 1: bienvenida y recorrido.\nDía 2: desayuno y regreso.'} /></label>
          <label className="cms-checkbox"><input type="checkbox" checked={form.activo} onChange={(event) => update('activo', event.target.checked)} /><span>Publicar promoción · Desmarca para ocultarla del sitio</span></label>
        </>}
      </div><aside className="cms-form-media">
        <ImagePicker label={isDestination ? 'Portada del destino' : 'Imagen principal'} urls={(isDestination ? form.imagen_url : form.imagen_principal_url) ? [isDestination ? form.imagen_url : form.imagen_principal_url] : []}
          onChange={(urls) => update(isDestination ? 'imagen_url' : 'imagen_principal_url', urls[0] || '')} onBusy={(value) => setUploading((current) => ({ ...current, principal: value }))} />
        {!isDestination && <ImagePicker label="Galería de la promoción" urls={form.galeria_urls} multiple onChange={(urls) => update('galeria_urls', urls)} onBusy={(value) => setUploading((current) => ({ ...current, gallery: value }))} />}
        <ImagePicker label="Imagen de fondo de la página (opcional)" required={false} urls={form.imagen_fondo_url ? [form.imagen_fondo_url] : []} onChange={(urls) => update('imagen_fondo_url', urls[0] || '')} onBusy={(value) => setUploading((current) => ({ ...current, fondo: value }))} />
        <p className="cms-help">Una fotografía horizontal se verá mejor detrás del contenido. El velo y la transparencia se adaptan al tema. Si no eliges fondo, se utiliza {isDestination ? 'la portada' : 'el fondo del destino o la imagen principal'}.</p>
        <div className="cms-template-note"><MapPin size={19} /><strong>Una página lista para explorar</strong><p>{isDestination ? 'La portada aparecerá en Inicio, en el menú y en la página de este destino.' : 'La plantilla presenta tu información junto a una imagen principal y una galería panorámica debajo.'}</p></div>
      </aside></div>
      <div className="cms-form-footer">{error && <p className="form-error" role="alert">{error}</p>}<button type="button" className="button button--quiet" onClick={close} disabled={busy}>Cancelar</button><button type="submit" className="button button--primary" disabled={busy}><Check size={16} />{saving ? 'Guardando…' : busy ? 'Subiendo imágenes…' : record ? 'Guardar cambios' : 'Crear y publicar'}</button></div>
    </form>
  </dialog>
}

export default function CmsPanel({ kind, onCatalogChange }) {
  const isDestination = kind === 'destinos'
  const [destinations, setDestinations] = useState([])
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [destinationFilter, setDestinationFilter] = useState('')
  const [modal, setModal] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    Promise.all([cmsRequest('/destinos', { signal: controller.signal }), cmsRequest('/admin/promociones', { signal: controller.signal })])
      .then(([places, offers]) => { setDestinations(places.destinos); setPromotions(offers.promotions) })
      .catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision])
  const records = (isDestination ? destinations : promotions).filter((record) =>
    `${record.nombre || record.titulo} ${record.slug}`.toLowerCase().includes(query.toLowerCase())
    && (isDestination || !destinationFilter || String(record.destino_id) === destinationFilter))
  function saved(record) {
    if (isDestination) setDestinations((current) => modal.record ? current.map((item) => item.id === record.id ? record : item) : [record, ...current])
    else {
      const next = modal.record ? promotions.map((item) => item.id === record.id ? record : item) : [record, ...promotions]
      setPromotions(next)
      onCatalogChange?.(next)
    }
    setModal(null); setNotice('Guardado. Tu sitio ya utiliza el contenido actualizado.')
  }
  async function remove(record) {
    if (!window.confirm(`¿Eliminar “${record.nombre || record.titulo}”? ${isDestination ? 'Solo se puede eliminar un destino que no tenga promociones.' : 'Esta acción retira la promoción del sitio; las reservas conservan su historial.'}`)) return
    setDeleting(record.id); setError('')
    try {
      await cmsRequest(`/${kind}/${record.id}`, { method: 'DELETE' })
      if (isDestination) setDestinations((current) => current.filter((item) => item.id !== record.id))
      else { const next = promotions.filter((item) => item.id !== record.id); setPromotions(next); onCatalogChange?.(next) }
      notifyPublic(); setNotice('Registro eliminado del sitio.')
    } catch (failure) { setError(failure.message) }
    finally { setDeleting(null) }
  }
  return <section className="cms-panel">
    <div className="section-heading"><div><p className="eyebrow">Editor del sitio</p><h1>{isDestination ? 'Destinos para descubrir' : 'Experiencias que inspiran'}</h1><p className="section-description">{isDestination ? 'Crea lugares que aparecerán en Inicio, menú y pie de página.' : 'Diseña promociones con su propia página, imágenes y reserva.'}</p></div><button className="button button--primary" disabled={loading || Boolean(error)} onClick={() => setModal({ record: null })}><Plus size={17} />{isDestination ? 'Nuevo destino' : 'Nueva promoción'}</button></div>
    <div className="cms-stats"><div><MapPin size={20} /><span>Destinos publicados<strong>{destinations.length}</strong></span></div><div><ImagePlus size={20} /><span>Promociones activas<strong>{promotions.filter((item) => item.activo).length}</strong></span></div><a href="../index.html" target="_blank" rel="noopener noreferrer">Explorar mi sitio <ExternalLink size={16} /></a></div>
    <div className="cms-toolbar"><label className="search-box"><Search size={17} /><input aria-label="Buscar contenido" placeholder="Buscar por nombre…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>{!isDestination && <select className="select" aria-label="Filtrar por destino" value={destinationFilter} onChange={(event) => setDestinationFilter(event.target.value)}><option value="">Todos los destinos</option>{destinations.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>}<button className="button button--quiet" onClick={() => setRevision((value) => value + 1)} disabled={loading}><RefreshCw size={15} />Actualizar</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="cms-notice" role="status">{notice}</p>}
    {loading ? <p className="empty-state" role="status">Cargando el contenido de tu sitio…</p> : <div className="cms-record-grid">{records.map((record) => {
      const destination = destinations.find((item) => item.id === record.destino_id)
      const image = isDestination ? record.imagen_url : record.imagen_principal_url
      return <article className="cms-record" key={record.id}><div className="cms-record-image">{image ? <img src={image} alt="" loading="lazy" /> : <ImagePlus size={35} />}<span>{isDestination ? 'Destino' : record.activo ? 'Publicada' : 'Oculta'}</span></div><div className="cms-record-body"><small>{isDestination ? `${promotions.filter((item) => item.destino_id === record.id).length} promociones` : destination?.nombre || 'Experiencia'}</small><h2>{isDestination ? record.nombre : record.titulo}</h2><p>{isDestination ? record.descripcion || 'Añade una descripción para invitar a descubrir este destino.' : record.descripcion_corta || record.descripcion}</p>{!isDestination && <strong className="cms-price">S/ {Number(record.precio).toFixed(2)} <small>por persona</small></strong>}<div className="cms-record-actions"><button className="button button--quiet" onClick={() => setModal({ record })}><Pencil size={14} />Editar</button>{(isDestination || record.activo) && <a href={publicUrl(kind, record.slug)} target="_blank" rel="noopener noreferrer" aria-label={`Ver página de ${record.nombre || record.titulo}`}><ExternalLink size={16} /></a>}<button className="icon-button icon-button--danger" onClick={() => remove(record)} disabled={deleting !== null} aria-label={`Eliminar ${record.nombre || record.titulo}`}><Trash2 size={16} /></button></div></div></article>
    })}</div>}
    {!loading && !error && !records.length && <div className="cms-empty"><MapPin size={32} /><h2>{query || destinationFilter ? 'Sin resultados' : 'Tu próxima historia empieza aquí'}</h2><p>{query || destinationFilter ? 'Prueba otra búsqueda o destino.' : `Crea tu primer ${isDestination ? 'destino' : 'promoción'} usando la plantilla.`}</p>{!isDestination && !destinations.length && <p>Primero crea un destino desde la sección Destinos.</p>}</div>}
    {modal && <ContentForm key={`${kind}-${modal.record?.id || 'new'}`} kind={kind} record={modal.record} destinations={destinations} onClose={() => setModal(null)} onSaved={saved} />}
  </section>
}

