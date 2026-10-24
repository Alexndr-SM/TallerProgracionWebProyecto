import { useEffect, useId, useRef, useState } from 'react'
import { Check, Copy, ImageIcon, ImagePlus, LoaderCircle, RefreshCw, Search, ShieldCheck, X } from 'lucide-react'
import { cmsRequest } from './cmsApi.js'
import './MediaLibrary.css'

function size(bytes) { return Number(bytes) >= 1048576 ? `${(Number(bytes) / 1048576).toFixed(1)} MB` : `${Math.round(Number(bytes || 0) / 1024)} KB` }

export function MediaBrowser({ embedded = false, selectedUrls = [], onSelectionChange, multiple = false, onInspect }) {
  const [images, setImages] = useState([]), [cursor, setCursor] = useState(undefined)
  const [loading, setLoading] = useState(false), [error, setError] = useState('')
  const [search, setSearch] = useState(''), [revision, setRevision] = useState(0)
  const controller = useRef(null), pending = useRef(false), generation = useRef(0)
  const scroll = useRef(null), sentinel = useRef(null), fetchNext = useRef(null)
  const isPicker = Boolean(onSelectionChange)
  async function load(next, replace = false) {
    if (pending.current) return
    const current = generation.current
    pending.current = true; setLoading(true); setError('')
    controller.current = new AbortController()
    try {
      const data = await cmsRequest(`/admin/medios${next ? `?cursor=${encodeURIComponent(next)}` : ''}`, { signal: controller.current.signal })
      if (!Array.isArray(data.images)) throw new Error('La biblioteca devolvió una respuesta inválida.')
      if (current !== generation.current) return
      setImages((previous) => [...new Map([...(replace ? [] : previous), ...data.images].map((item) => [item.id, item])).values()])
      setCursor(data.next_cursor || null)
    } catch (failure) {
      if (failure.name !== 'AbortError' && current === generation.current) setError(failure.message)
    } finally {
      if (current === generation.current) { pending.current = false; setLoading(false) }
    }
  }
  fetchNext.current = () => load(cursor)
  useEffect(() => {
    generation.current++; pending.current = false; setImages([]); setCursor(undefined); setSearch('')
    load(undefined, true)
    return () => { generation.current++; controller.current?.abort(); pending.current = false }
    // Cada revisión reinicia la consulta. El cursor avanza al llegar al final.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision])
  useEffect(() => {
    if (!sentinel.current || loading || error || cursor === null || cursor === undefined || search.trim() || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) fetchNext.current() }, { root: embedded ? scroll.current : null, rootMargin: '200px' })
    observer.observe(sentinel.current); return () => observer.disconnect()
  }, [cursor, loading, error, embedded, search])
  function toggle(image) {
    if (!isPicker) { onInspect?.(image); return }
    if (!multiple) return onSelectionChange(selectedUrls.includes(image.url) ? [] : [image.url])
    if (selectedUrls.includes(image.url)) onSelectionChange(selectedUrls.filter((url) => url !== image.url))
    else if (selectedUrls.length < 10) onSelectionChange([...selectedUrls, image.url])
  }
  const visible = images.filter((image) => `${image.nombre} ${image.public_id}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  return <div className={`media-browser ${embedded ? 'media-browser--embedded' : ''}`} onKeyDown={(event) => { if (event.key === 'Enter' && event.target.tagName === 'INPUT') event.preventDefault() }}>
    <div className="media-toolbar"><label className="search-box"><Search size={16} /><input aria-label="Buscar entre las imágenes cargadas" placeholder="Buscar entre las imágenes cargadas…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><button type="button" className="button button--quiet" onClick={() => setRevision((value) => value + 1)} disabled={loading} aria-label="Actualizar biblioteca"><RefreshCw size={15} /></button></div>
    <div className="media-counter" role="status"><span>{images.length} imágenes cargadas{isPicker ? ` · ${selectedUrls.length}${multiple ? '/10' : '/1'} seleccionadas` : ''}</span><span><ShieldCheck size={13} /> Sin imágenes de clientes</span></div>
    <div className="media-scroll" ref={scroll}>
      <div className="media-grid">{visible.map((image) => {
        const selected = selectedUrls.includes(image.url)
        return <button type="button" className={`media-tile ${selected ? 'is-selected' : ''}`} key={image.id} onClick={() => toggle(image)} aria-label={`${isPicker ? selected ? 'Quitar selección de' : 'Seleccionar' : 'Ver'} ${image.nombre}`} aria-pressed={isPicker ? selected : undefined} disabled={isPicker && multiple && selectedUrls.length >= 10 && !selected}>
          <span className="media-thumbnail"><ImageIcon size={28} aria-hidden="true" /><img src={image.thumbnail_url} alt="" loading="lazy" decoding="async" width="420" height="280" onError={(event) => { event.currentTarget.hidden = true }} />{selected && <span className="media-selected"><Check size={16} /></span>}<span className="media-format">{image.format?.toUpperCase() || 'IMG'}</span></span>
          <span className="media-tile-body"><strong title={image.nombre}>{image.nombre}</strong><small>{image.width || '—'} × {image.height || '—'} · {size(image.bytes)}</small></span>
        </button>
      })}</div>
      {!loading && !visible.length && !error && <p className="media-empty">{search ? 'No hay coincidencias entre las imágenes cargadas. Puedes cargar otro bloque o cambiar la búsqueda.' : cursor ? 'Seguimos buscando material disponible. Las fotos de usuarios se omiten.' : 'Todavía no hay imágenes disponibles. Sube material nuevo para comenzar.'}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div ref={sentinel} className="media-sentinel" aria-hidden="true" />
      <div className="media-load-more">{loading ? <span role="status"><LoaderCircle size={17} className="media-spinner" /> Cargando imágenes…</span> : (cursor !== null || error) && <button type="button" className="button button--quiet" onClick={() => load(cursor, cursor === undefined)}>{error ? 'Reintentar carga' : 'Cargar más imágenes'}</button>}</div>
      {!loading && !error && cursor === null && images.length > 0 && <p className="media-end">Has llegado al final de la biblioteca.</p>}
    </div>
  </div>
}

function MediaDetails({ image, onClose }) {
  const ref = useRef(null), titleId = useId()
  const [notice, setNotice] = useState('')
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close() }, [])
  async function copy() {
    try { await navigator.clipboard.writeText(image.url); setNotice('Dirección de la imagen copiada.') }
    catch { setNotice('Puedes seleccionar y copiar la dirección del campo inferior.') }
  }
  return <dialog ref={ref} className="media-detail" aria-labelledby={titleId} onCancel={onClose}>
    <div className="media-detail-heading"><div><span className="eyebrow">Biblioteca multimedia</span><h2 id={titleId}>{image.nombre}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar vista previa"><X size={20} /></button></div>
    <img className="media-detail-image" src={image.url} alt={image.nombre} />
    <div className="media-detail-body"><p>{image.width} × {image.height} · {image.format?.toUpperCase()} · {size(image.bytes)}</p><label className="field-label">Dirección de la imagen<input type="url" readOnly value={image.url} onFocus={(event) => event.target.select()} /></label><button type="button" className="button button--quiet" onClick={copy}><Copy size={15} />Copiar dirección</button><p className="cms-help">Reutiliza esta imagen desde «Elegir de la biblioteca» al crear o editar un destino o una promoción.</p>{notice && <p role="status">{notice}</p>}</div>
  </dialog>
}

export default function MediaLibrary() {
  const [revision, setRevision] = useState(0), [detail, setDetail] = useState(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const input = useRef(null), controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  async function upload(event) {
    const files = Array.from(event.target.files || []); event.target.value = ''
    if (!files.length || busy) return
    setError(''); setNotice('')
    if (files.length > 10 || files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) return setError('Selecciona hasta 10 imágenes JPEG, PNG o WebP de máximo 5 MB por archivo.')
    setBusy(true); controller.current = new AbortController()
    try {
      const form = new FormData(); files.forEach((file) => form.append('imagenes', file))
      const result = await cmsRequest('/uploads', { method: 'POST', body: form, signal: controller.current.signal })
      setRevision((value) => value + 1); setNotice(`${result.urls.length} ${result.urls.length === 1 ? 'imagen guardada. Ya puedes reutilizarla' : 'imágenes guardadas. Ya puedes reutilizarlas'} en el catálogo.`)
    } catch (failure) { if (failure.name !== 'AbortError') setError(failure.message) }
    finally { setBusy(false) }
  }
  return <section className="media-library cms-panel">
    <div className="section-heading"><div><p className="eyebrow">Material gráfico del sitio</p><h1>Biblioteca multimedia</h1><p className="section-description">Un solo lugar para tus fotografías. Súbelas una vez y reutilízalas en todos tus destinos y promociones.</p></div><button type="button" className="button button--primary" onClick={() => input.current?.click()} disabled={busy}><ImagePlus size={17} />{busy ? 'Subiendo imágenes…' : 'Subir material nuevo'}</button><input ref={input} className="media-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={upload} aria-label="Subir material nuevo" /></div>
    <div className="media-intro"><ImageIcon size={22} /><div><strong>Más imágenes, menos carga</strong><p>Desplázate para cargar nuevas fotografías. Las imágenes de perfil y los archivos asociados a usuarios están excluidos.</p></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="cms-notice" role="status">{notice}</p>}
    <MediaBrowser key={revision} onInspect={setDetail} />
    {detail && <MediaDetails image={detail} onClose={() => setDetail(null)} />}
  </section>
}
