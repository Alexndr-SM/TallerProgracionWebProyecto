/**
 * Panel de Edición — mismo lenguaje visual que el panel de administración
 * (sidebar con espacio de trabajo, hero con atardecer, KPIs, gráficos).
 * Roles: admin y editor
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Compass,
  CornerDownLeft,
  ExternalLink,
  FileText,
  FolderOpen,
  Images,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import EditorPanel from './EditorPanel'
import './App.css'

const API_URL = (import.meta.env.VITE_API_URL || window.API_URL || 'http://localhost:3000').replace(/\/$/, '')
const SITE_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:5173'
const STORAGE_KEY = 'icat_editor_session'
const ALLOWED_ROLES = ['admin', 'editor']
const TZ = 'America/Lima'

/* ---------- Sesión ---------- */
function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.token || !data?.user) return null
    if (!ALLOWED_ROLES.includes(data.user.rol)) return null
    return data
  } catch {
    return null
  }
}

function saveSession(token, user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }))
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

function bindGlobals(session) {
  window.API_URL = API_URL
  if (session) {
    window.Auth = {
      getToken: () => session.token,
      getUser: () => session.user,
      logout: () => {
        clearSession()
        window.location.reload()
      },
    }
  } else {
    window.Auth = { getToken: () => '', getUser: () => null, logout: () => {} }
  }
}

async function editorApi(path) {
  const response = await fetch(`${API_URL}/api/editor${path}`, {
    headers: { Authorization: `Bearer ${window.Auth?.getToken() || ''}` },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.ok === false) {
    throw new Error(result.message || 'Error en el Panel de Edición.')
  }
  return result
}

/* ---------- Utilidades ---------- */
function initials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'ED'
  )
}

const dayKey = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: TZ })
const atNoon = (key) => new Date(`${key}T12:00:00-05:00`)
const shortDate = (key) =>
  atNoon(key).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', timeZone: TZ })

function buildDays(range) {
  const today = dayKey(Date.now())
  const base = atNoon(today).getTime()
  const out = []
  for (let i = range - 1; i >= 0; i -= 1) {
    out.push(dayKey(base - i * 86400000))
  }
  return out
}

function statusLabel(status) {
  if (status === 'published') return 'Publicada'
  if (status === 'archived') return 'Archivada'
  return 'Borrador'
}

function useWidth(ref) {
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/* ---------- Marca ---------- */
function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id="ic-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#f28a3a" />
        </linearGradient>
      </defs>
      <g stroke="#ffc15e" strokeWidth="2.4" strokeLinecap="round">
        <path d="M24 5v6M10.5 10.5l4 4M37.5 10.5l-4 4M5 24h6M43 24h-6" />
      </g>
      <path d="M13 28a11 11 0 0 1 22 0z" fill="url(#ic-sun)" />
      <path d="M6 33c4 0 4-2.4 8-2.4s4 2.4 8 2.4 4-2.4 8-2.4 4 2.4 8 2.4" fill="none" stroke="#6fd0d6" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M9 39c3.4 0 3.4-2 6.8-2s3.4 2 6.8 2 3.4-2 6.8-2 3.4 2 6.8 2" fill="none" stroke="#3fb6bf" strokeWidth="2.2" strokeLinecap="round" opacity=".75" />
    </svg>
  )
}

/* ---------- Gráficos (SVG propio, sin dependencias) ---------- */
function ActivityChart({ days, values }) {
  const wrapRef = useRef(null)
  const width = useWidth(wrapRef)
  const [hover, setHover] = useState(null)

  const height = 250
  const pad = { l: 30, r: 12, t: 14, b: 28 }
  const innerW = Math.max(width - pad.l - pad.r, 10)
  const innerH = height - pad.t - pad.b

  const maxVal = Math.max(3, ...values)
  const step = Math.ceil(maxVal / 3)
  const top = step * 3
  const ticks = [0, step, step * 2, top]

  const x = (i) => pad.l + (values.length <= 1 ? innerW / 2 : (i / (values.length - 1)) * innerW)
  const y = (v) => pad.t + innerH - (v / top) * innerH

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(values.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`

  const labelCount = width < 520 ? 4 : 6
  const labelIdx = Array.from({ length: labelCount }, (_, k) =>
    Math.round((k / (labelCount - 1)) * (values.length - 1)),
  )

  function onMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - rect.left - pad.l
    const idx = Math.round((px / innerW) * (values.length - 1))
    setHover(Math.min(values.length - 1, Math.max(0, idx)))
  }

  return (
    <div ref={wrapRef} className="chart-wrap">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Actividad diaria"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="ic-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6fd0d6" stopOpacity="0.38" />
            <stop offset="1" stopColor="#6fd0d6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} className={t === 0 ? 'grid-base' : 'grid-line'} />
            <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" className="axis-text">
              {t}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#ic-area)" />
        <path d={line} className="chart-line" />
        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === values.length - 1 ? 'end' : 'middle'} className="axis-text">
            {shortDate(days[i])}
          </text>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} className="hover-line" />
            <circle cx={x(hover)} cy={y(values[hover])} r="4.5" className="hover-dot" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="chart-tip"
          style={{ left: Math.min(Math.max(x(hover), 70), width - 70), top: Math.max(y(values[hover]) - 52, 0) }}
        >
          <small>{shortDate(days[hover])}</small>
          <strong>{values[hover]}</strong>
        </div>
      )}
    </div>
  )
}

const STATUS_SEGMENTS = [
  { id: 'published', label: 'Publicadas', color: '#6fd0d6' },
  { id: 'draft', label: 'Borradores', color: '#6a9fd8' },
  { id: 'archived', label: 'Archivadas', color: '#a78bcb' },
]

function StatusDonut({ counts, total }) {
  const size = 200
  const stroke = 24
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const gap = total > 0 && STATUS_SEGMENTS.filter((s) => counts[s.id] > 0).length > 1 ? 5 : 0

  let offset = 0
  const arcs = STATUS_SEGMENTS.map((seg) => {
    const len = total ? (counts[seg.id] / total) * c : 0
    const arc = { ...seg, len: Math.max(len - gap, 0), offset }
    offset += len
    return arc
  })

  return (
    <div className="donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Páginas por estado">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#10262f" strokeWidth={stroke} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {arcs.map(
            (arc) =>
              arc.len > 0 && (
                <circle
                  key={arc.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  strokeDasharray={`${arc.len} ${c - arc.len}`}
                  strokeDashoffset={-arc.offset}
                />
              ),
          )}
        </g>
      </svg>
      <div className="donut__center">
        <strong>{total}</strong>
        <span>{total === 1 ? 'página' : 'páginas'}</span>
      </div>
    </div>
  )
}

/* ---------- Búsqueda global (⌘K) ---------- */
function GlobalSearch({ nav, pages, onGo, onOpenPage }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  useEffect(() => {
    function onKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    const sections = nav.map((n) => ({ key: `s-${n.id}`, kind: 'Sección', label: n.label, icon: n.icon, run: () => onGo(n.id) }))
    const pageItems = pages.map((p) => ({
      key: `p-${p.id}`,
      kind: 'Página',
      label: p.title,
      hint: `/${p.slug}`,
      icon: FileText,
      run: () => onOpenPage(p.id),
    }))
    const all = [...sections, ...pageItems]
    if (!term) return all.slice(0, 7)
    return all.filter((item) => `${item.label} ${item.hint || ''}`.toLowerCase().includes(term)).slice(0, 8)
  }, [q, nav, pages, onGo, onOpenPage])

  function pick(item) {
    item.run()
    setQ('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault()
      pick(results[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="gsearch">
      <label className="global-search">
        <Search size={15} />
        <input
          ref={inputRef}
          value={q}
          placeholder="Buscar en el panel…"
          onChange={(e) => {
            setQ(e.target.value)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
        <kbd>{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
      </label>
      {open && (
        <ul className="gsearch__menu" role="listbox">
          {results.length === 0 && <li className="gsearch__empty">Sin resultados para “{q}”</li>}
          {results.map((item, i) => {
            const Icon = item.icon
            return (
              <li key={item.key}>
                <button
                  type="button"
                  className={i === active ? 'is-active' : ''}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(item)
                  }}
                >
                  <span className="gsearch__icon"><Icon size={15} /></span>
                  <span className="gsearch__label">
                    {item.label}
                    {item.hint && <small>{item.hint}</small>}
                  </span>
                  <em>{item.kind}</em>
                  {i === active && <CornerDownLeft size={13} />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ---------- Resumen ---------- */
function StatCards({ stats, onNavigate }) {
  const cards = [
    { id: 'pages', label: 'Páginas', value: stats.pages, hint: 'Total en el sitio', icon: FileText, tone: 'teal', action: 'pages' },
    { id: 'published', label: 'Publicadas', value: stats.published, hint: 'Visibles al público', icon: CircleCheck, tone: 'green', action: 'pages' },
    { id: 'drafts', label: 'Borradores', value: stats.drafts, hint: 'Pendientes de publicar', icon: PenLine, tone: 'purple', action: 'pages' },
    { id: 'media', label: 'Medios', value: stats.media, hint: 'En la biblioteca', icon: Images, tone: 'blue', action: 'media' },
    { id: 'blocks', label: 'Bloques', value: stats.blocks, hint: 'Contenido estructurado', icon: Layers, tone: 'amber', action: 'pages' },
  ]

  return (
    <div className="stat-grid">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <button key={card.id} type="button" className="stat-card" onClick={() => onNavigate(card.action)}>
            <div className="stat-card__top">
              <span className={`tile tile--${card.tone}`}><Icon size={17} /></span>
              <span className="stat-card__label">{card.label}</span>
              <ArrowUpRight size={14} className="stat-card__arrow" />
            </div>
            <strong>{card.value}</strong>
            <small>{card.hint}</small>
          </button>
        )
      })}
    </div>
  )
}

function DashboardHome({ user, stats, pages, updatedAt, refreshing, onRefresh, onNavigate, onOpenPage, onNewPage }) {
  const [range, setRange] = useState(30)
  const [metric, setMetric] = useState('updated_at')

  const today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TZ,
  })
  const firstName = (user?.nombre || 'Editor').split(' ')[0]

  const days = useMemo(() => buildDays(range), [range])
  const values = useMemo(() => {
    const bucket = Object.fromEntries(days.map((d) => [d, 0]))
    pages.forEach((p) => {
      if (!p[metric]) return
      const key = dayKey(p[metric])
      if (key in bucket) bucket[key] += 1
    })
    return days.map((d) => bucket[d])
  }, [days, pages, metric])
  const periodTotal = values.reduce((a, b) => a + b, 0)

  const counts = {
    published: pages.filter((p) => p.status === 'published').length,
    draft: pages.filter((p) => p.status === 'draft').length,
    archived: pages.filter((p) => p.status === 'archived').length,
  }
  const total = pages.length
  const recent = [...pages].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5)

  return (
    <div className="dash-home">
      <header className="dash-hero">
        <div className="dash-hero__text">
          <p className="dash-date">
            <CalendarDays size={13} /> {today}
          </p>
          <h1>
            ¡Hola, <span>{firstName}</span>!
          </h1>
          <p className="dash-sub">Una nueva mirada a tus páginas, tu contenido y tu biblioteca multimedia.</p>
          <p className="dash-range">
            {shortDate(days[0])} — {shortDate(days[days.length - 1])} · Perú
          </p>
        </div>
        <div className="dash-hero__side">
          <span className="live-pill">
            <i /> Datos actualizados
            {updatedAt && <em>{updatedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: TZ })}</em>}
          </span>
          <div className="dash-hero__actions">
            <button type="button" className="btn-ghost" onClick={onRefresh}>
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Actualizar
            </button>
            <button type="button" className="btn-primary" onClick={onNewPage}>
              <Plus size={15} /> Nueva página
            </button>
          </div>
        </div>
      </header>

      <StatCards stats={stats} onNavigate={onNavigate} />

      <div className="dash-grid">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div className="panel-title">
              <span className="tile tile--teal"><CalendarDays size={17} /></span>
              <div>
                <h2>El pulso de tu contenido</h2>
                <span>Actividad diaria · hora de Perú</span>
              </div>
            </div>
            <select className="editor-select" value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Periodo">
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
          </div>

          <div className="chart-meta">
            <p>
              <strong>{periodTotal}</strong>
              <span>{metric === 'created_at' ? 'páginas creadas' : 'páginas editadas'} en el periodo</span>
            </p>
            <div className="segmented" role="tablist">
              <button type="button" role="tab" aria-selected={metric === 'updated_at'} className={metric === 'updated_at' ? 'is-on' : ''} onClick={() => setMetric('updated_at')}>
                Editadas
              </button>
              <button type="button" role="tab" aria-selected={metric === 'created_at'} className={metric === 'created_at' ? 'is-on' : ''} onClick={() => setMetric('created_at')}>
                Creadas
              </button>
            </div>
          </div>

          <ActivityChart days={days} values={values} />
        </section>

        <section className="panel donut-panel">
          <div className="panel-head">
            <div className="panel-title">
              <span className="tile tile--teal"><Layers size={17} /></span>
              <div>
                <h2>Páginas por estado</h2>
                <span>Ciclo de vida del contenido</span>
              </div>
            </div>
          </div>
          <StatusDonut counts={counts} total={total} />
          <ul className="legend">
            {STATUS_SEGMENTS.map((seg) => (
              <li key={seg.id}>
                <i style={{ background: seg.color }} />
                <span>{seg.label}</span>
                <b>{counts[seg.id]}</b>
                <em>{total ? Math.round((counts[seg.id] / total) * 100) : 0}%</em>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="dash-columns">
        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">
              <span className="tile tile--blue"><FileText size={17} /></span>
              <div>
                <h2>Páginas recientes</h2>
                <span>Lo último que tocaste</span>
              </div>
            </div>
            <button type="button" className="btn-ghost" onClick={() => onNavigate('pages')}>
              Ver todas <ChevronRight size={14} />
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="empty-state">Aún no hay páginas. Crea la primera desde el botón superior.</p>
          ) : (
            <ul className="recent-list">
              {recent.map((page) => (
                <li key={page.id}>
                  <button type="button" onClick={() => onOpenPage(page.id)}>
                    <span className="tile tile--ghost"><FileText size={16} /></span>
                    <span className="recent-list__main">
                      <strong>{page.title}</strong>
                      <small>/{page.slug}</small>
                    </span>
                    <span className={`status status--${page.status}`}>{statusLabel(page.status)}</span>
                    <ChevronRight size={15} className="recent-list__go" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">
              <span className="tile tile--amber"><Compass size={17} /></span>
              <div>
                <h2>Guía rápida</h2>
                <span>Del borrador a publicado</span>
              </div>
            </div>
          </div>
          <ol className="tips-list">
            <li><b>1</b><div><strong>Biblioteca</strong><span>Sube y organiza imágenes por categorías.</span></div></li>
            <li><b>2</b><div><strong>Nueva página</strong><span>Define título, slug (ruta) y plantilla.</span></div></li>
            <li><b>3</b><div><strong>Bloques</strong><span>Añade texto, banners, vídeo o CTAs.</span></div></li>
            <li><b>4</b><div><strong>Publicar</strong><span>Cambia el estado a “Publicada” cuando esté lista.</span></div></li>
          </ol>
        </section>
      </div>
    </div>
  )
}

/* ---------- App ---------- */
export default function App() {
  const [session, setSession] = useState(() => loadSession())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [section, setSection] = useState('resumen')
  const [mobileNav, setMobileNav] = useState(false)
  const [stats, setStats] = useState({ pages: 0, published: 0, drafts: 0, media: 0, blocks: 0 })
  const [pages, setPages] = useState([])
  const [updatedAt, setUpdatedAt] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const [openCreate, setOpenCreate] = useState(false)
  const [openPageId, setOpenPageId] = useState(null)

  useEffect(() => {
    bindGlobals(session)
  }, [session])

  const loadStats = useCallback(async () => {
    if (!session) return
    setRefreshing(true)
    try {
      const [pagesRes, mediaRes] = await Promise.all([editorApi('/pages'), editorApi('/media?limit=1')])
      const list = pagesRes.pages || []
      setPages(list)
      setStats({
        pages: list.length,
        published: list.filter((p) => p.status === 'published').length,
        drafts: list.filter((p) => p.status === 'draft').length,
        media: mediaRes.total || (mediaRes.media || []).length,
        blocks: list.reduce((acc, p) => acc + (p.blocks_count || 0), 0),
      })
      setUpdatedAt(new Date())
    } catch (err) {
      setNotice(err.message)
    } finally {
      setRefreshing(false)
    }
  }, [session])

  useEffect(() => {
    loadStats()
  }, [loadStats, section])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.message || 'No se pudo iniciar sesión.')
      if (!ALLOWED_ROLES.includes(data.user?.rol)) {
        throw new Error('Tu cuenta no tiene permiso de edición. Se requiere rol editor o admin.')
      }
      saveSession(data.token, data.user)
      setSession({ token: data.token, user: data.user })
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    clearSession()
    setSession(null)
  }

  const go = useCallback((sectionId) => {
    setSection(sectionId)
    setMobileNav(false)
    setOpenPageId(null)
    setEditorKey((k) => k + 1)
  }, [])

  const openPage = useCallback((id) => {
    setOpenPageId(id)
    setSection('pages')
    setMobileNav(false)
    setEditorKey((k) => k + 1)
  }, [])

  const newPage = useCallback(() => {
    setOpenCreate(true)
    go('pages')
  }, [go])

  const navItems = useMemo(
    () => [
      { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
      { id: 'pages', label: 'Páginas y rutas', icon: FileText },
      { id: 'media', label: 'Biblioteca multimedia', icon: FolderOpen },
    ],
    [],
  )

  if (!session) {
    return (
      <div className="editor-login">
        <div className="login-sun" aria-hidden="true" />
        <form className="editor-login__card" onSubmit={handleLogin}>
          <div className="editor-login__brand">
            <LogoMark size={46} />
            <div>
              <h1>Panel de Edición</h1>
              <p>IcaTurismo · Contenido y multimedia</p>
            </div>
          </div>
          {error && (
            <div className="editor-login__error" role="alert">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <label>
            Correo
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          </label>
          <label>
            Contraseña
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar al panel'}
          </button>
          <p className="editor-login__hint">
            Solo cuentas con rol <strong>editor</strong> o <strong>admin</strong>.
          </p>
        </form>
      </div>
    )
  }

  const current = navItems.find((n) => n.id === section) || navItems[0]
  const CurrentIcon = current.icon

  return (
    <div className="editor-shell">
      {mobileNav && <button type="button" className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Cerrar menú" />}

      <aside className={`editor-sidebar-nav ${mobileNav ? 'is-open' : ''}`}>
        <div className="side-brand">
          <LogoMark size={38} />
          <div>
            <strong>IcaTurismo</strong>
            <small>Edición</small>
          </div>
        </div>

        <div className="workspace">
          <span className="workspace__icon"><Compass size={16} /></span>
          <div>
            <strong>IcaTurismo</strong>
            <small>Panel de contenido</small>
          </div>
          <ChevronRight size={15} />
        </div>

        <nav className="side-nav">
          <span className="side-label">Principal</span>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`side-link ${section === id ? 'is-active' : ''}`} onClick={() => go(id)}>
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="side-footer">
          <button type="button" className="side-promo" onClick={newPage}>
            <span>
              <strong>Crea contenido nuevo</strong>
              <small>Publica una página en minutos.</small>
            </span>
            <i><ArrowRight size={15} /></i>
          </button>

          <a className="side-public" href={SITE_URL} target="_blank" rel="noreferrer">
            <ExternalLink size={15} /> Ver sitio público
          </a>

          <div className="side-user">
            <span className="avatar">{initials(session.user.nombre)}</span>
            <div>
              <strong>{session.user.nombre}</strong>
              <small>{session.user.rol === 'admin' ? 'Administrador' : 'Editor'}</small>
            </div>
            <button type="button" className="icon-button icon-button--bare" title="Cerrar sesión" onClick={handleLogout}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="editor-main-wrap">
        <div className={`hero-bg ${section === 'resumen' ? '' : 'hero-bg--soft'}`} aria-hidden="true">
          <span className="hero-bg__sun" />
        </div>

        <header className="editor-topbar">
          <div className="topbar-left">
            <button type="button" className="icon-button mobile-only" onClick={() => setMobileNav(true)} aria-label="Menú">
              <Menu size={18} />
            </button>
            <span className="breadcrumb">
              Panel <ChevronRight size={13} />
              <CurrentIcon size={14} className="breadcrumb__icon" />
              <b>{current.label}</b>
            </span>
          </div>
          <div className="topbar-right">
            <GlobalSearch nav={navItems} pages={pages} onGo={go} onOpenPage={openPage} />
            <button type="button" className="icon-button" title="Actualizar datos" onClick={loadStats}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            </button>
            <LogoMark size={26} />
            <span className="avatar avatar--sm">{initials(session.user.nombre)}</span>
          </div>
        </header>

        <main className="editor-main">
          {section === 'resumen' && (
            <DashboardHome
              user={session.user}
              stats={stats}
              pages={pages}
              updatedAt={updatedAt}
              refreshing={refreshing}
              onRefresh={loadStats}
              onNavigate={go}
              onOpenPage={openPage}
              onNewPage={newPage}
            />
          )}
          {(section === 'pages' || section === 'media') && (
            <EditorPanel
              key={`${section}-${editorKey}`}
              onNotice={setNotice}
              initialTab={section === 'media' ? 'media' : 'pages'}
              initialPageId={openPageId}
              autoOpenCreate={openCreate}
              onCreateConsumed={() => setOpenCreate(false)}
            />
          )}
        </main>
      </div>

      {notice && (
        <div className="toast" role="status">
          <CircleCheck size={16} />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Cerrar">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
