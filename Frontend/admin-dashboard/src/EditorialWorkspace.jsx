import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Compass, ExternalLink, ImagePlus, Images, LayoutDashboard, Pencil, Plus, Trash2, X } from 'lucide-react'
import { cmsRequest } from './cmsApi.js'
import { ImagePicker } from './CmsPanel.jsx'
import './EditorialWorkspace.css'

export function EditorialOverview({ user, products, destinations, loading, error, onNavigate, onRefresh }) {
  const hidden = products.filter((item) => !item.active)
  return <section className="editor-workspace">
    <div className="editor-welcome panel"><p className="eyebrow">TU ESTUDIO DE CONTENIDO</p><h1>¡Hola, <span>{user?.nombre?.split(' ')[0] || 'equipo'}!</span></h1><p>El próximo viaje empieza con lo que creas hoy.</p><div className="editor-quick-actions"><button className="button button--primary" onClick={() => onNavigate('productos', { create: true })}><Plus size={16} />Nueva promoción</button><button className="button button--quiet" onClick={() => onNavigate('destinos', { create: true })}><Compass size={16} />Nuevo destino</button><a className="button button--quiet" href="../index.html" target="_blank" rel="noopener noreferrer">Ver mi sitio<ExternalLink size={15} /></a></div></div>
    {error && <p className="form-error" role="alert">{error} <button className="button button--quiet" onClick={onRefresh}>Reintentar</button></p>}
    <div className="catalog-summary"><div><span>Destinos en el sitio</span><strong>{loading ? '—' : destinations.length}</strong></div><div><span>Experiencias publicadas</span><strong>{loading ? '—' : products.filter((item) => item.active).length}</strong></div><div><span>Promociones ocultas</span><strong>{loading ? '—' : hidden.length}</strong></div></div>
    <div className="editor-tools">{[
      ['destinos', Compass, 'Lugares por descubrir', 'Portadas, fondos y páginas de cada destino.'],
      ['productos', ImagePlus, 'Experiencias que inspiran', 'Precio, itinerario y galería en una misma plantilla.'],
      ['medios', Images, 'Tu archivo visual', 'Reutiliza imágenes y organiza nuevas fotografías.'],
      ['widgets', LayoutDashboard, 'Novedades del inicio', 'Publica avisos, banners y tarjetas de temporada.'],
    ].map(([page, Icon, title, description]) => <button className="panel editor-tool" key={page} onClick={() => onNavigate(page)}><Icon size={24} /><strong>{title}</strong><span>{description}</span><small>Abrir sección <ArrowRight size={15} /></small></button>)}</div>
    <section className="panel editor-checklist"><div><p className="eyebrow">ANTES DE COMPARTIR</p><h2>Una publicación con todos los detalles</h2><p>Comprueba la portada, el precio, la duración y el itinerario desde la vista pública.</p></div><button className="button button--quiet" onClick={() => onNavigate('productos', { status: 'hidden' })}>Revisar {hidden.length} promociones ocultas <ArrowRight size={16} /></button></section>
  </section>
}

function WidgetForm({ record, onClose, onSaved }) {
  const ref = useRef(null)
  const [form, setForm] = useState({ titulo: '', texto: '', tipo: 'aviso', orden: 0, activo: true, imagen_url: '', enlace: '', ...record })
  const [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false), [error, setError] = useState('')
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close() }, [])
  const close = () => { if (!saving && !uploading) onClose() }
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  async function save(event) {
    event.preventDefault(); setSaving(true); setError('')
    try { await cmsRequest(`/equipo/widgets${record ? `/${record.id}` : ''}`, { method: record ? 'PUT' : 'POST', body: { ...form, orden: Number(form.orden) } }); try { localStorage.setItem('icat_catalog_updated', String(Date.now())) } catch { /* Optional. */ } onSaved() }
    catch (failure) { setError(failure.message) } finally { setSaving(false) }
  }
  return <dialog ref={ref} className="cms-dialog editor-widget-dialog" onCancel={(event) => { event.preventDefault(); close() }} aria-labelledby="widget-heading"><form onSubmit={save} className="cms-form"><div className="cms-form-heading"><div><p className="eyebrow">CONTENIDO DEL INICIO</p><h2 id="widget-heading">{record ? 'Editar publicación' : 'Nueva publicación'}</h2></div><button type="button" className="icon-button" onClick={close} disabled={saving || uploading} aria-label="Cerrar publicación"><X size={20} /></button></div><div className="cms-form-body">
    <label className="field-label">Título<input required maxLength="180" value={form.titulo} onChange={(event) => update('titulo', event.target.value)} /></label><label className="field-label">Mensaje<textarea maxLength="1000" value={form.texto} onChange={(event) => update('texto', event.target.value)} /></label>
    <div className="form-grid"><label className="field-label">Formato<select value={form.tipo} onChange={(event) => update('tipo', event.target.value)}><option value="aviso">Aviso</option><option value="banner">Banner</option><option value="tarjeta">Tarjeta</option></select></label><label className="field-label">Orden<input type="number" min="0" max="999" required value={form.orden} onChange={(event) => update('orden', event.target.value)} /></label></div>
    <label className="field-label">Enlace interno (opcional)<input maxLength="500" placeholder="/html/contacto.html" value={form.enlace} onChange={(event) => update('enlace', event.target.value)} /></label><ImagePicker label="Imagen de la publicación" required={false} urls={form.imagen_url ? [form.imagen_url] : []} onChange={(urls) => update('imagen_url', urls[0] || '')} onBusy={setUploading} /><label className="cms-checkbox"><input type="checkbox" checked={form.activo} onChange={(event) => update('activo', event.target.checked)} />Visible en la página principal</label>{error && <p className="form-error" role="alert">{error}</p>}</div><div className="cms-form-footer"><button className="button button--quiet" type="button" onClick={close} disabled={saving || uploading}>Cancelar</button><button className="button button--primary" disabled={saving || uploading}><Check size={15} />{saving ? 'Guardando…' : 'Guardar publicación'}</button></div></form></dialog>
}

export default function WidgetsPanel() {
  const [widgets, setWidgets] = useState([]), [revision, setRevision] = useState(0), [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [query, setQuery] = useState(''), [deleting, setDeleting] = useState(null)
  useEffect(() => { const controller = new AbortController(); cmsRequest('/equipo/widgets', { signal: controller.signal }).then((result) => { setWidgets(result.widgets); setError('') }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) }); return () => controller.abort() }, [revision])
  async function remove(record) { if (!confirm(`¿Eliminar la publicación “${record.titulo}”?`)) return; setDeleting(record.id); try { await cmsRequest(`/equipo/widgets/${record.id}`, { method: 'DELETE' }); setLoading(true); setRevision((value) => value + 1) } catch (failure) { setError(failure.message) } finally { setDeleting(null) } }
  return <section className="cms-panel"><div className="section-heading"><div><p className="eyebrow">EDITOR DEL SITIO</p><h1>Novedades que conectan</h1><p className="section-description">Gestiona los banners, tarjetas y avisos de la página principal.</p></div><button className="button button--primary" onClick={() => setModal({ record: null })}><Plus size={16} />Nueva publicación</button></div><label className="search-box"><input aria-label="Buscar publicaciones" placeholder="Buscar publicación…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}{loading ? <p role="status">Cargando publicaciones…</p> : <div className="editor-tools">{widgets.filter((item) => item.titulo.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map((item) => <article key={item.id} className="panel editor-widget"><span className="eyebrow">{item.tipo} · Orden {item.orden} · {item.activo ? 'Visible' : 'Oculto'}</span><h2>{item.titulo}</h2><p>{item.texto}</p><div className="editor-quick-actions"><button className="button button--quiet" onClick={() => setModal({ record: item })}><Pencil size={15} />Editar</button><button className="icon-button" onClick={() => remove(item)} disabled={deleting !== null} aria-label={`Eliminar ${item.titulo}`}><Trash2 size={16} /></button></div></article>)}{!widgets.length && <p className="empty-state">Crea el primer aviso de temporada para tu sitio.</p>}</div>}{modal && <WidgetForm record={modal.record} onClose={() => setModal(null)} onSaved={() => { setModal(null); setRevision((value) => value + 1) }} />}</section>
}
