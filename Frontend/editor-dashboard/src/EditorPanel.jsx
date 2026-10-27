/**
 * Panel de Edición — Biblioteca multimedia, gestión de páginas y editor de bloques.
 * Accesible para roles: admin y editor.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  FilePlus2,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  Pencil,
  PenLine,
  Plus,
  Search,
  Trash2,
  Upload,
  Video,
  X,
  Type,
  PanelsTopLeft,
  Layers,
} from 'lucide-react'

const API_BASE = () => (window.API_URL || '').replace(/\/$/, '')
const authHeaders = () => ({
  Authorization: `Bearer ${window.Auth?.getToken() || ''}`,
})

async function editorFetch(path, options = {}) {
  const response = await fetch(`${API_BASE()}/api/editor${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...authHeaders(),
      ...(options.headers || {}),
    },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.ok === false) {
    throw new Error(result.message || 'Error en el Panel de Edición.')
  }
  return result
}

const TEMPLATES = [
  { id: 'default', label: 'Por defecto' },
  { id: 'landing', label: 'Landing / Promoción' },
  { id: 'article', label: 'Artículo / Guía' },
  { id: 'gallery', label: 'Galería' },
]

const BLOCK_TYPES = [
  { id: 'rich_text', label: 'Texto enriquecido', icon: Type },
  { id: 'image', label: 'Imagen', icon: ImageIcon },
  { id: 'video', label: 'Vídeo embebido', icon: Video },
  { id: 'banner', label: 'Banner principal', icon: PanelsTopLeft },
  { id: 'cta', label: 'Llamada a la acción', icon: LayoutTemplate },
  { id: 'widget', label: 'Widget / área libre', icon: Layers },
]

function statusLabel(status) {
  if (status === 'published') return 'Publicada'
  if (status === 'archived') return 'Archivada'
  return 'Borrador'
}

function statusClass(status) {
  if (status === 'published') return 'status status--confirmada'
  if (status === 'archived') return 'status status--cancelada'
  return 'status status--pendiente'
}

/* ---------- Media Library ---------- */
function MediaLibrary({ onSelect, selectable = false, onNotice }) {
  const [media, setMedia] = useState([])
  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (query) params.set('q', query)
      const [list, cats] = await Promise.all([
        editorFetch(`/media?${params}`),
        editorFetch('/media/categories'),
      ])
      setMedia(list.media || [])
      setCategories(cats.categories || [])
    } catch (err) {
      onNotice?.(err.message)
    } finally {
      setLoading(false)
    }
  }, [category, query, onNotice])

  useEffect(() => { load() }, [load])

  async function handleUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('image', file)
      form.append('title', file.name.replace(/\.[^.]+$/, ''))
      form.append('category', category || 'general')
      form.append('crop', 'limit')
      form.append('max_width', '1600')
      await editorFetch('/media', { method: 'POST', body: form })
      onNotice?.('Imagen subida correctamente.')
      load()
    } catch (err) {
      onNotice?.(err.message)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function saveEdit() {
    if (!editItem) return
    try {
      await editorFetch(`/media/${editItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editItem.title,
          alt_text: editItem.alt_text,
          category: editItem.category,
          tags: Array.isArray(editItem.tags) ? editItem.tags.join(', ') : editItem.tags,
        }),
      })
      onNotice?.('Medio actualizado.')
      setEditItem(null)
      load()
    } catch (err) {
      onNotice?.(err.message)
    }
  }

  async function removeMedia(id) {
    if (!window.confirm('¿Eliminar este medio de la biblioteca?')) return
    try {
      await editorFetch(`/media/${id}`, { method: 'DELETE' })
      onNotice?.('Medio eliminado.')
      load()
    } catch (err) {
      onNotice?.(err.message)
    }
  }

  return (
    <section className="panel editor-panel">
      <div className="table-toolbar">
        <div className="panel-title">
          <span className="tile"><FolderOpen size={17} /></span>
          <div>
            <h2>Biblioteca multimedia</h2>
            <span>{media.length} archivos · gestión centralizada</span>
          </div>
        </div>
        <div className="editor-toolbar-actions">
          <label className="search-box">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título o etiqueta..."
            />
          </label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="editor-select">
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>
                {c.category} ({c.count})
              </option>
            ))}
          </select>
          <label className="btn-primary editor-upload-btn">
            {uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
            {uploading ? 'Subiendo…' : 'Subir imagen'}
            <input type="file" accept="image/*" hidden onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {loading ? (
        <p className="empty-state"><Loader2 className="spin" size={20} /> Cargando biblioteca…</p>
      ) : media.length === 0 ? (
        <p className="empty-state">No hay imágenes. Sube la primera para empezar la biblioteca.</p>
      ) : (
        <div className="media-grid">
          {media.map((item) => (
            <article key={item.id} className="media-card">
              <div className="media-card__preview">
                <img src={item.url} alt={item.alt_text || item.title} loading="lazy" />
              </div>
              <div className="media-card__meta">
                <strong title={item.title}>{item.title || 'Sin título'}</strong>
                <small>{item.category} · {item.width}×{item.height}</small>
              </div>
              <div className="media-card__actions">
                {selectable && (
                  <button type="button" className="btn-ghost" onClick={() => onSelect?.(item)}>
                    Usar
                  </button>
                )}
                <button type="button" className="icon-button" title="Editar" onClick={() => setEditItem({ ...item, tags: item.tags || [] })}>
                  <Pencil size={15} />
                </button>
                <button type="button" className="icon-button icon-button--danger" title="Eliminar" onClick={() => removeMedia(item.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editItem && (
        <div className="modal-scrim" role="dialog">
          <div className="modal panel">
            <header className="modal-header">
              <h3>Editar medio</h3>
              <button className="icon-button" onClick={() => setEditItem(null)}><X size={18} /></button>
            </header>
            <div className="modal-body editor-form">
              <label>Título<input value={editItem.title || ''} onChange={(e) => setEditItem({ ...editItem, title: e.target.value })} /></label>
              <label>Texto alternativo (alt)<input value={editItem.alt_text || ''} onChange={(e) => setEditItem({ ...editItem, alt_text: e.target.value })} /></label>
              <label>Categoría<input value={editItem.category || ''} onChange={(e) => setEditItem({ ...editItem, category: e.target.value })} placeholder="ej. playas, cultura, banners" /></label>
              <label>Etiquetas (separadas por coma)<input value={Array.isArray(editItem.tags) ? editItem.tags.join(', ') : (editItem.tags || '')} onChange={(e) => setEditItem({ ...editItem, tags: e.target.value })} /></label>
            </div>
            <footer className="modal-footer">
              <button className="btn-ghost" onClick={() => setEditItem(null)}>Cancelar</button>
              <button className="btn-primary" onClick={saveEdit}>Guardar</button>
            </footer>
          </div>
        </div>
      )}
    </section>
  )
}

/* ---------- Pages Manager ---------- */
function PagesManager({ onOpenEditor, onNotice, autoOpenCreate = false, onCreateConsumed }) {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', slug: '', template: 'default', status: 'draft', meta_description: '' })

  useEffect(() => {
    if (autoOpenCreate) {
      setCreating(true)
      onCreateConsumed?.()
    }
  }, [autoOpenCreate, onCreateConsumed])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filter ? `?status=${filter}` : ''
      const result = await editorFetch(`/pages${params}`)
      setPages(result.pages || [])
    } catch (err) {
      onNotice?.(err.message)
    } finally {
      setLoading(false)
    }
  }, [filter, onNotice])

  useEffect(() => { load() }, [load])

  const visiblePages = pages.filter((p) =>
    `${p.title} ${p.slug}`.toLowerCase().includes(search.trim().toLowerCase()),
  )

  async function createPage(e) {
    e.preventDefault()
    try {
      const result = await editorFetch('/pages', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      onNotice?.('Página creada.')
      setCreating(false)
      setForm({ title: '', slug: '', template: 'default', status: 'draft', meta_description: '' })
      load()
      onOpenEditor?.(result.page.id)
    } catch (err) {
      onNotice?.(err.message)
    }
  }

  async function changeStatus(page, status) {
    try {
      await editorFetch(`/pages/${page.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      onNotice?.(status === 'published' ? 'Página publicada.' : `Estado: ${statusLabel(status)}`)
      load()
    } catch (err) {
      onNotice?.(err.message)
    }
  }

  async function removePage(page) {
    if (!window.confirm(`¿Eliminar la página «${page.title}»? Esta acción no se puede deshacer.`)) return
    try {
      await editorFetch(`/pages/${page.id}`, { method: 'DELETE' })
      onNotice?.('Página eliminada.')
      load()
    } catch (err) {
      onNotice?.(err.message)
    }
  }

  return (
    <section className="panel editor-panel">
      <div className="table-toolbar">
        <div className="panel-title">
          <span className="tile"><FileText size={17} /></span>
          <div>
            <h2>Páginas y rutas</h2>
            <span>Ciclo de vida: borrador → publicada → archivada</span>
          </div>
        </div>
        <div className="editor-toolbar-actions">
          <label className="search-box">
            <Search size={15} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar página o ruta…" />
          </label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="editor-select">
            <option value="">Todas</option>
            <option value="draft">Borradores</option>
            <option value="published">Publicadas</option>
            <option value="archived">Archivadas</option>
          </select>
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <FilePlus2 size={16} /> Nueva página
          </button>
        </div>
      </div>

      {loading ? (
        <p className="empty-state"><Loader2 className="spin" size={20} /> Cargando páginas…</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Ruta (slug)</th>
                <th>Plantilla</th>
                <th>Estado</th>
                <th>Bloques</th>
                <th>Actualizada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visiblePages.map((page) => (
                <tr key={page.id}>
                  <td className="table-strong">{page.title}</td>
                  <td><code>/{page.slug}</code></td>
                  <td>{TEMPLATES.find((t) => t.id === page.template)?.label || page.template}</td>
                  <td><span className={statusClass(page.status)}>{statusLabel(page.status)}</span></td>
                  <td>{page.blocks_count ?? 0}</td>
                  <td>{new Date(page.updated_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <div className="table-actions">
                    <button className="btn-ghost" onClick={() => onOpenEditor(page.id)}><Pencil size={13} /> Editar</button>
                    {page.status !== 'published' && (
                      <button className="btn-ghost" onClick={() => changeStatus(page, 'published')}>Publicar</button>
                    )}
                    {page.status === 'published' && (
                      <button className="btn-ghost" onClick={() => changeStatus(page, 'archived')}><Archive size={14} /></button>
                    )}
                    <button className="icon-button icon-button--danger" title="Eliminar" onClick={() => removePage(page)}><Trash2 size={14} /></button>
                  </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visiblePages.length === 0 && (
            <p className="empty-state">{pages.length === 0 ? 'Aún no hay páginas. Crea la primera.' : 'Ninguna página coincide con tu búsqueda.'}</p>
          )}
        </div>
      )}

      {creating && (
        <div className="modal-scrim" role="dialog">
          <form className="modal panel" onSubmit={createPage}>
            <header className="modal-header">
              <h3>Nueva página</h3>
              <button type="button" className="icon-button" onClick={() => setCreating(false)}><X size={18} /></button>
            </header>
            <div className="modal-body editor-form">
              <label>Título *
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. Experiencias en Paracas" />
              </label>
              <label>Ruta / slug
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Se genera automáticamente si lo dejas vacío" />
              </label>
              <label>Plantilla
                <select value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })}>
                  {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </label>
              <label>Meta descripción
                <textarea rows={2} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} />
              </label>
            </div>
            <footer className="modal-footer">
              <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Crear y editar contenido</button>
            </footer>
          </form>
        </div>
      )}
    </section>
  )
}

/* ---------- Block Editor ---------- */
function PageBlockEditor({ pageId, onBack, onNotice }) {
  const [page, setPage] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    let current = true
    ;(async () => {
      try {
        const result = await editorFetch(`/pages/${pageId}`)
        if (!current) return
        setPage(result.page)
        setBlocks(
          (result.blocks || []).map((b, i) => ({
            ...b,
            content: typeof b.content === 'string' ? JSON.parse(b.content) : (b.content || {}),
            settings: typeof b.settings === 'string' ? JSON.parse(b.settings) : (b.settings || {}),
            localKey: b.id || `new-${i}`,
          }))
        )
      } catch (err) {
        onNotice?.(err.message)
      } finally {
        if (current) setLoading(false)
      }
    })()
    return () => { current = false }
  }, [pageId, onNotice])

  function addBlock(type) {
    setBlocks((prev) => [
      ...prev,
      {
        localKey: `new-${Date.now()}`,
        block_type: type,
        content: type === 'image' || type === 'banner'
          ? { url: '', alt: '', caption: '' }
          : type === 'video'
            ? { embed_url: '', provider: 'youtube' }
            : type === 'cta'
              ? { title: '', text: '', button_label: '', button_url: '' }
              : { html: '', text: '' },
        settings: {},
        sort_order: prev.length,
      },
    ])
    setPickerOpen(false)
  }

  function updateBlock(index, patch) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)))
  }

  function moveBlock(index, dir) {
    setBlocks((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next.map((b, i) => ({ ...b, sort_order: i }))
    })
  }

  function removeBlock(index) {
    setBlocks((prev) => prev.filter((_, i) => i !== index).map((b, i) => ({ ...b, sort_order: i })))
  }

  async function save() {
    setSaving(true)
    try {
      // Guardar meta de la página
      await editorFetch(`/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: page.title,
          slug: page.slug,
          template: page.template,
          meta_description: page.meta_description,
          status: page.status,
        }),
      })
      // Guardar bloques
      await editorFetch(`/pages/${pageId}/blocks`, {
        method: 'PUT',
        body: JSON.stringify({
          blocks: blocks.map((b, i) => ({
            block_type: b.block_type,
            content: b.content,
            settings: b.settings || {},
            sort_order: i,
          })),
        }),
      })
      onNotice?.('Contenido guardado correctamente.')
    } catch (err) {
      onNotice?.(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="empty-state"><Loader2 className="spin" size={20} /> Cargando editor…</p>
  }
  if (!page) {
    return <p className="empty-state">No se pudo cargar la página. <button className="btn-ghost" onClick={onBack}>Volver</button></p>
  }

  return (
    <section className="panel editor-panel">
      <div className="table-toolbar">
        <div className="panel-title">
          <button className="icon-button" onClick={onBack} title="Volver a páginas" aria-label="Volver a páginas"><ArrowLeft size={16} /></button>
          <span className="tile"><PenLine size={17} /></span>
          <div>
            <h2>Editor: {page.title}</h2>
            <span>Ruta pública: /{page.slug} · {statusLabel(page.status)}</span>
          </div>
        </div>
        <div className="editor-toolbar-actions">
          <select
            className="editor-select"
            value={page.status}
            onChange={(e) => setPage({ ...page, status: e.target.value })}
          >
            <option value="draft">Borrador</option>
            <option value="published">Publicada</option>
            <option value="archived">Archivada</option>
          </select>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="editor-sidebar">
          <h4>Metadatos</h4>
          <label>Título
            <input value={page.title || ''} onChange={(e) => setPage({ ...page, title: e.target.value })} />
          </label>
          <label>Slug / ruta
            <input value={page.slug || ''} onChange={(e) => setPage({ ...page, slug: e.target.value })} />
          </label>
          <label>Plantilla
            <select value={page.template || 'default'} onChange={(e) => setPage({ ...page, template: e.target.value })}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label>Meta descripción
            <textarea rows={3} value={page.meta_description || ''} onChange={(e) => setPage({ ...page, meta_description: e.target.value })} />
          </label>
        </div>

        <div className="editor-canvas">
          <div className="editor-blocks-header">
            <h4>Bloques de contenido</h4>
            <button className="btn-primary" type="button" onClick={() => setPickerOpen(true)}>
              <Plus size={16} /> Añadir bloque
            </button>
          </div>

          {blocks.length === 0 && (
            <p className="empty-state">Añade bloques de texto, imagen, vídeo o banner para construir la página.</p>
          )}

          {blocks.map((block, index) => (
            <div key={block.localKey} className="block-card">
              <div className="block-card__header">
                <strong className="block-card__title">
                  <span className="tile">
                    {(() => {
                      const BlockIcon = BLOCK_TYPES.find((t) => t.id === block.block_type)?.icon || Type
                      return <BlockIcon size={15} />
                    })()}
                  </span>
                  {BLOCK_TYPES.find((t) => t.id === block.block_type)?.label || block.block_type}
                  <small>#{index + 1}</small>
                </strong>
                <div className="block-card__tools">
                  <button type="button" className="icon-button" disabled={index === 0} onClick={() => moveBlock(index, -1)} title="Subir"><ChevronUp size={15} /></button>
                  <button type="button" className="icon-button" disabled={index === blocks.length - 1} onClick={() => moveBlock(index, 1)} title="Bajar"><ChevronDown size={15} /></button>
                  <button type="button" className="icon-button icon-button--danger" onClick={() => removeBlock(index)} title="Eliminar"><Trash2 size={14} /></button>
                </div>
              </div>

              {(block.block_type === 'rich_text' || block.block_type === 'text' || block.block_type === 'html' || block.block_type === 'widget') && (
                <textarea
                  className="block-textarea"
                  rows={6}
                  placeholder="Escribe el contenido (HTML básico o texto enriquecido)…"
                  value={block.content?.html || block.content?.text || ''}
                  onChange={(e) => updateBlock(index, { content: { ...block.content, html: e.target.value, text: e.target.value } })}
                />
              )}

              {(block.block_type === 'image' || block.block_type === 'banner') && (
                <div className="editor-form">
                  <label>URL de la imagen
                    <input
                      value={block.content?.url || ''}
                      onChange={(e) => updateBlock(index, { content: { ...block.content, url: e.target.value } })}
                      placeholder="Pega URL de la biblioteca o externa"
                    />
                  </label>
                  <label>Texto alternativo
                    <input
                      value={block.content?.alt || ''}
                      onChange={(e) => updateBlock(index, { content: { ...block.content, alt: e.target.value } })}
                    />
                  </label>
                  <label>Pie de foto / título del banner
                    <input
                      value={block.content?.caption || ''}
                      onChange={(e) => updateBlock(index, { content: { ...block.content, caption: e.target.value } })}
                    />
                  </label>
                  {block.content?.url && (
                    <img src={block.content.url} alt="" className="block-preview-img" />
                  )}
                </div>
              )}

              {block.block_type === 'video' && (
                <div className="editor-form">
                  <label>URL de incrustación (YouTube / Vimeo)
                    <input
                      value={block.content?.embed_url || ''}
                      onChange={(e) => updateBlock(index, { content: { ...block.content, embed_url: e.target.value } })}
                      placeholder="https://www.youtube.com/embed/..."
                    />
                  </label>
                </div>
              )}

              {block.block_type === 'cta' && (
                <div className="editor-form">
                  <label>Título<input value={block.content?.title || ''} onChange={(e) => updateBlock(index, { content: { ...block.content, title: e.target.value } })} /></label>
                  <label>Texto<textarea rows={2} value={block.content?.text || ''} onChange={(e) => updateBlock(index, { content: { ...block.content, text: e.target.value } })} /></label>
                  <label>Texto del botón<input value={block.content?.button_label || ''} onChange={(e) => updateBlock(index, { content: { ...block.content, button_label: e.target.value } })} /></label>
                  <label>URL del botón<input value={block.content?.button_url || ''} onChange={(e) => updateBlock(index, { content: { ...block.content, button_url: e.target.value } })} /></label>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {pickerOpen && (
        <div className="modal-scrim" role="dialog">
          <div className="modal panel">
            <header className="modal-header">
              <h3>Añadir bloque</h3>
              <button className="icon-button" onClick={() => setPickerOpen(false)}><X size={18} /></button>
            </header>
            <div className="block-picker">
              {BLOCK_TYPES.map((t) => {
                const Icon = t.icon
                return (
                  <button key={t.id} type="button" className="block-picker__item" onClick={() => addBlock(t.id)}>
                    <Icon size={22} />
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

/* ---------- Root Editor Panel ---------- */
export default function EditorPanel({ onNotice, initialTab = 'pages', initialPageId = null, autoOpenCreate = false, onCreateConsumed }) {
  const [tab, setTab] = useState(initialPageId ? 'editor' : initialTab === 'media' ? 'media' : 'pages')
  const [editingPageId, setEditingPageId] = useState(initialPageId)

  useEffect(() => {
    if (initialPageId) return
    if (initialTab === 'media' || initialTab === 'pages') {
      setTab(initialTab)
      setEditingPageId(null)
    }
  }, [initialTab, initialPageId])

  const openEditor = (id) => {
    setEditingPageId(id)
    setTab('editor')
  }

  // Si el shell ya tiene navegación lateral, ocultamos las pestañas internas
  const showInnerTabs = false

  return (
    <div className="editor-root">
      {showInnerTabs && (
        <div className="editor-tabs">
          <button
            className={`editor-tab ${tab === 'pages' || tab === 'editor' ? 'editor-tab--active' : ''}`}
            onClick={() => { setTab('pages'); setEditingPageId(null) }}
          >
            <FileText size={16} /> Páginas y rutas
          </button>
          <button
            className={`editor-tab ${tab === 'media' ? 'editor-tab--active' : ''}`}
            onClick={() => setTab('media')}
          >
            <FolderOpen size={16} /> Biblioteca multimedia
          </button>
        </div>
      )}

      {tab === 'media' && <MediaLibrary onNotice={onNotice} />}
      {tab === 'pages' && (
        <PagesManager
          onOpenEditor={openEditor}
          onNotice={onNotice}
          autoOpenCreate={autoOpenCreate}
          onCreateConsumed={onCreateConsumed}
        />
      )}
      {tab === 'editor' && editingPageId && (
        <PageBlockEditor
          pageId={editingPageId}
          onBack={() => { setTab('pages'); setEditingPageId(null) }}
          onNotice={onNotice}
        />
      )}
    </div>
  )
}
