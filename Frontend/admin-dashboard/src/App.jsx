import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Compass,
  Download,
  ExternalLink,
  Gift,
  Images,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Trash2,
  X,
} from 'lucide-react'
import './App.css'
import CmsPanel from './CmsPanel.jsx'
import MediaLibrary from './MediaLibrary.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import AdminHeader from './AdminHeader.jsx'
import { cmsRequest } from './cmsApi.js'
import { downloadCSV, limaDate } from './dashboardUtils.js'
import './AdminTheme.css'

const navGroups = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
      { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag },
      { id: 'clientes', label: 'Clientes', icon: Users },
      { id: 'destinos', label: 'Destinos', icon: Compass },
      { id: 'productos', label: 'Promociones', icon: Package },
      { id: 'recompensas', label: 'Catálogo de canje', icon: Gift },
      { id: 'medios', label: 'Biblioteca multimedia', icon: Images },
    ],
  },
  {
    label: 'Administración',
    items: [
      { id: 'puntos', label: 'Puntos y beneficios', icon: Sparkles },
      { id: 'equipo', label: 'Equipo', icon: ShieldCheck },
    ],
  },
]

function readSaved(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch (error) {
    console.error(`No se pudieron leer los datos locales de "${key}".`, error)
    return fallback
  }
}

function saveSaved(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`No se pudieron guardar los datos locales de "${key}".`, error)
    return false
  }
}

function money(value) {
  return `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function loadAdminResource(path, options = {}) {
  const base = (window.API_URL || '').replace(/\/$/, '')
  const response = await fetch(`${base}/api/admin${path}`, {
    signal: options.signal, cache: 'no-store',
    headers: { Authorization: `Bearer ${window.Auth?.getToken() || ''}` },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.ok) throw new Error(result.message || 'No se pudieron cargar las métricas.')
  return result
}

async function updateAdminResource(path, body, method = 'PATCH') {
  const base = (window.API_URL || '').replace(/\/$/, '')
  const response = await fetch(`${base}/api/admin${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${window.Auth?.getToken() || ''}`,
    },
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.ok) throw new Error(result.message || 'No se pudo guardar el cambio.')
  return result
}

function Avatar({ initials, tone = 'mint', size = '' }) {
  return <span className={`avatar avatar--${tone} ${size ? `avatar--${size}` : ''}`}>{initials}</span>
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="section-description">{description}</p>}
      </div>
      {action}
    </div>
  )
}

function EmployeesPage({ employees, onAdd, onUpdate, currentUserId, loading }) {
  const roleLabels = { admin: 'Administrador', registrador: 'Registrador', soporte: 'Soporte', editor: 'Editor' }
  return <>
    <SectionHeading eyebrow="Administración" title="Equipo y permisos" description="Invita a tu equipo y define qué puede hacer cada persona." action={<button className="button button--primary" onClick={onAdd}><Plus size={16} /> Nuevo empleado</button>} />
    <div className="permission-notice"><ShieldCheck size={18} /><p><strong>Administración segura.</strong> Los roles y estados se guardan en la base de datos y se validan en el servidor.</p></div>
    <div className="catalog-summary"><div><span>Miembros del equipo</span><strong>{loading ? '—' : employees.length}</strong></div><div><span>Administradores activos</span><strong>{employees.filter((employee) => employee.rol === 'admin' && employee.estado_cuenta === 'activo').length}</strong></div><div><span>Cuentas inactivas</span><strong>{employees.filter((employee) => employee.estado_cuenta === 'inactivo').length}</strong></div></div>
    <section className="panel table-panel">
      <div className="table-toolbar"><div><h2>Mi equipo</h2><span>{employees.length} cuentas de personal</span></div><span className="secure-label"><ShieldCheck size={15} /> Acceso protegido</span></div>
      <div className="table-scroll"><table><thead><tr><th>Empleado</th><th>Permiso</th><th>Estado</th><th>Última actividad</th></tr></thead><tbody>
        {employees.map((employee) => <tr key={employee.id}><td><div className="table-person"><Avatar initials={employee.nombre.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()} tone="mint" /><div><strong>{employee.nombre}</strong><small>{employee.email}</small></div></div></td><td><select className="role-select" value={employee.rol} onChange={(event) => onUpdate(employee, event.target.value, employee.estado_cuenta)} aria-label={`Permiso para ${employee.nombre}`}><option value="admin">Administrador</option><option value="registrador">Registrador</option><option value="soporte">Soporte</option><option value="editor">Editor</option></select></td><td><select className="role-select" value={employee.estado_cuenta} onChange={(event) => onUpdate(employee, employee.rol, event.target.value)} aria-label={`Estado de ${employee.nombre}`} disabled={Number(employee.id) === Number(currentUserId)}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></td><td className="muted-cell">{employee.ultimo_acceso ? new Date(employee.ultimo_acceso).toLocaleString('es-PE') : 'Sin actividad'}</td></tr>)}
      </tbody></table>{!loading && employees.length === 0 && <p className="empty-state">Todavía no hay cuentas de personal registradas.</p>}</div>
    </section>
  </>
}

function CustomerPointsControl({ customer, onSave }) {
  const [points, setPoints] = useState(String(customer.puntos || 0))
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => setPoints(String(customer.puntos || 0)), [customer.puntos])
  if (!editing) return <div className="customer-points-display"><span className="table-strong">{Number(customer.puntos || 0).toLocaleString('es-PE')} pts</span><button className="button button--quiet customer-points-toggle" type="button" onClick={() => setEditing(true)} aria-label={`Ajustar puntos de ${customer.nombre}`}>Ajustar</button></div>
  return <form className="customer-points-control" onSubmit={async (event) => {
    event.preventDefault()
    setSaving(true)
    const saved = await onSave(customer.id, Number(points))
    setSaving(false)
    if (saved) setEditing(false)
  }}>
    <input autoFocus aria-label={`Puntos de ${customer.nombre}`} type="number" min="0" step="1" value={points} onChange={(event) => setPoints(event.target.value)} />
    <button className="icon-button" type="submit" aria-label={`Guardar puntos de ${customer.nombre}`} disabled={saving}><Check size={15} /></button>
    <button className="icon-button" type="button" aria-label={`Cancelar ajuste de puntos para ${customer.nombre}`} onClick={() => { setPoints(String(customer.puntos || 0)); setEditing(false) }} disabled={saving}><X size={15} /></button>
  </form>
}

function CustomersPage({ customers, onNavigate, onStatusChange, onPointsChange, canManage, loading, initialQuery = '' }) {
  const [search, setSearch] = useState(initialQuery)
  const filtered = customers.filter((customer) => `${customer.nombre} ${customer.email}`.toLowerCase().includes(search.trim().toLowerCase()))
  const currentMonth = new Date()
  const newThisMonth = customers.filter((customer) => {
    const created = new Date(customer.created_at)
    return created.getMonth() === currentMonth.getMonth() && created.getFullYear() === currentMonth.getFullYear()
  }).length
  const frequent = customers.filter((customer) => Number(customer.reservas) >= 2).length
  return <>
    <SectionHeading eyebrow="Comunidad" title="Clientes" description="Conoce a las personas que viajan con nosotros." action={<button className="button button--quiet" onClick={() => onNavigate('puntos')}><Sparkles size={16} /> Programa de puntos</button>} />
    <div className="catalog-summary"><div><span>Clientes registrados</span><strong>{loading ? '—' : customers.length}</strong></div><div><span>Nuevos este mes</span><strong>{loading ? '—' : newThisMonth}</strong></div><div><span>Clientes frecuentes</span><strong>{loading ? '—' : frequent}</strong></div></div>
    <section className="panel table-panel"><div className="table-toolbar"><div><h2>Clientes registrados</h2><span>{filtered.length} de {customers.length} cuentas</span></div><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente..." /></label></div><div className="table-scroll"><table><thead><tr><th>Cliente</th><th>Se unió</th><th>Reservas</th><th>Puntos</th><th>Estado</th></tr></thead><tbody>
      {filtered.map((customer) => <tr key={customer.id}><td><div className="table-person"><Avatar initials={customer.nombre.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()} tone="mint" /><div><strong>{customer.nombre}</strong><small>{customer.email}</small></div></div></td><td>{new Date(customer.created_at).toLocaleDateString('es-PE')}</td><td>{customer.reservas}</td><td>{canManage ? <CustomerPointsControl customer={customer} onSave={onPointsChange} /> : <span className="table-strong">{Number(customer.puntos || 0).toLocaleString('es-PE')}</span>}</td><td>{canManage ? <select className="role-select" value={customer.estado_cuenta} onChange={(event) => onStatusChange(customer.id, event.target.value)} aria-label={`Estado de ${customer.nombre}`}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select> : <span className={`status status--${customer.estado_cuenta}`}>{customer.estado_cuenta}</span>}</td></tr>)}
    </tbody></table>{!loading && filtered.length === 0 && <p className="empty-state">{search ? 'No hay clientes que coincidan con la búsqueda.' : 'Todavía no hay clientes registrados.'}</p>}</div></section>
    <div className="coming-note"><Sparkles size={18} /><div><strong>Fidelización en camino</strong><span>Pronto podrás recompensar las compras y reservas de tus clientes con puntos.</span></div><button className="text-link" onClick={() => onNavigate('puntos')}>Ver detalles <ArrowRight size={15} /></button></div>
  </>
}

function OrdersPage({ reservations, initialTarget = {}, onRefresh, onClear }) {
  const [query, setQuery] = useState(initialTarget.query || '')
  const [status, setStatus] = useState(initialTarget.status || 'todas')
  const [departure, setDeparture] = useState('todas')
  const today = limaDate()
  const filtered = reservations.filter((reservation) => {
    const searchable = `${reservation.id} ${reservation.nombre} ${reservation.email} ${reservation.promocion_nombre || ''}`.toLowerCase()
    const tourDate = String(reservation.fecha_tour).slice(0, 10)
    return (!initialTarget.id || Number(reservation.id) === Number(initialTarget.id)) && searchable.includes(query.trim().toLowerCase())
      && (status === 'todas' || reservation.estado === status)
      && (departure === 'todas' || (departure === 'proximas' ? tourDate >= today : tourDate < today))
  })
  return <>
    <SectionHeading eyebrow="Actividad" title="Reservas" description="Consulta las reservas recientes y su estado. Los gráficos del resumen incluyen todo el histórico." action={<div className="table-filters"><button className="button button--quiet" onClick={onRefresh}><RefreshCw size={16} />Actualizar</button><button className="button button--quiet" onClick={() => downloadCSV(`reservas-${today}.csv`, [['Código', 'Cliente', 'Experiencia', 'Fecha de salida', 'Total PEN', 'Estado', 'Pago'], ...filtered.map((r) => [r.id, r.nombre, r.promocion_nombre, String(r.fecha_tour).slice(0, 10), r.total, r.estado, r.estado_pago])])}><Download size={16} />CSV</button>{initialTarget.id && <button className="button button--quiet" onClick={onClear}>Ver todas las reservas</button>}</div>} />
    <div className="catalog-summary"><div><span>Reservas registradas</span><strong>{reservations.length}</strong></div><div><span>Por atender</span><strong>{reservations.filter((reservation) => reservation.estado === 'pendiente').length}</strong></div><div><span>Ingresos pagados</span><strong>{money(reservations.filter((reservation) => reservation.estado_pago === 'pagado').reduce((sum, reservation) => sum + Number(reservation.total || 0), 0))}</strong></div></div>
    <section className="panel table-panel"><div className="table-toolbar"><div><h2>Reservas de viajeros</h2><span>{filtered.length} de {reservations.length} registros</span></div><div className="table-filters"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, tour o código..." /></label><select className="select select--small" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar reservas por estado"><option value="todas">Todos los estados</option><option value="pendiente">Pendientes</option><option value="confirmada">Confirmadas</option><option value="cancelada">Canceladas</option></select><select className="select select--small" value={departure} onChange={(event) => setDeparture(event.target.value)} aria-label="Filtrar por fecha de salida"><option value="todas">Todas las salidas</option><option value="proximas">Próximas salidas</option><option value="pasadas">Salidas pasadas</option></select></div></div><div className="table-scroll"><table><thead><tr><th>Reserva</th><th>Cliente</th><th>Experiencia</th><th>Fecha del tour</th><th>Total</th><th>Estado</th><th>Pago</th></tr></thead><tbody>{filtered.map((reservation) => <tr key={reservation.id}><td className="table-strong">#{reservation.id}</td><td><div className="table-person"><strong>{reservation.nombre}</strong><small>{reservation.email}</small></div></td><td>{reservation.promocion_nombre || 'Reserva de tour'}</td><td>{new Date(`${String(reservation.fecha_tour).slice(0, 10)}T00:00:00`).toLocaleDateString('es-PE')}</td><td className="table-strong">{money(reservation.total)}</td><td><span className={`status status--${reservation.estado}`}>{reservation.estado}</span></td><td><span className={`status status--${reservation.estado_pago}`}>{reservation.estado_pago}</span></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="empty-state">No hay reservas que coincidan con estos filtros.</p>}</div></section>
  </>
}

function PointsPage({ customers }) {
  const totalPoints = customers.reduce((sum, customer) => sum + Number(customer.puntos || 0), 0)
  const topCustomer = [...customers].sort((a, b) => Number(b.puntos || 0) - Number(a.puntos || 0))[0]
  return <>
    <SectionHeading eyebrow="Fidelización" title="Puntos y beneficios" description="Saldos registrados en las cuentas de clientes." />
    <section className="points-hero panel"><div className="points-hero__content"><span className="points-chip"><Sparkles size={14} /> SALDOS REALES</span><h2>Puntos de la comunidad</h2><p>Consulta los puntos asignados a clientes. Puedes ajustar el saldo directamente desde la tabla de clientes.</p><div className="points-steps"><span><b>01</b> Clientes registrados: {customers.length}</span><span><b>02</b> Saldo acumulado: {totalPoints.toLocaleString('es-PE')} pts</span></div></div><div className="points-card"><span className="points-card__brand"><Compass size={18} /> ICA CLUB</span><Sparkles className="points-card__sparkle" size={27} /><strong>{Number(topCustomer?.puntos || 0).toLocaleString('es-PE')}</strong><span>{topCustomer?.nombre || 'Sin clientes'}</span><div className="points-progress"><i style={{ width: `${totalPoints ? Math.max(4, (Number(topCustomer?.puntos || 0) / totalPoints) * 100) : 0}%` }} /></div><small>Mayor saldo individual</small></div></section>
    <div className="catalog-summary points-stats"><div><span>Clientes con puntos</span><strong>{customers.filter((customer) => Number(customer.puntos || 0) > 0).length}</strong></div><div><span>Puntos asignados</span><strong>{totalPoints.toLocaleString('es-PE')}</strong></div><div><span>Saldo mayor</span><strong className="stat-text">{topCustomer?.nombre || 'Sin datos'}</strong></div></div>
  </>
}

function RewardsPage({ rewards, onCreate, onUpdate, onDelete, onToggle, onUpload, loading }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '', tipo: 'producto', puntos: '', stock: '', imagen_url: '' })
  const [editingReward, setEditingReward] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const data = {
      ...form,
      puntos: Number(form.puntos),
      stock: form.stock === '' ? null : Number(form.stock),
    }
    const saved = editingReward
      ? await onUpdate(editingReward.id, { ...data, activo: editingReward.activo })
      : await onCreate(data)
    if (saved) {
      setForm({ nombre: '', descripcion: '', tipo: 'producto', puntos: '', stock: '', imagen_url: '' })
      setEditingReward(null)
      setError('')
      document.getElementById('reward-create-dialog')?.close()
    }
    setSaving(false)
  }

  function openCreate() {
    setEditingReward(null)
    setForm({ nombre: '', descripcion: '', tipo: 'producto', puntos: '', stock: '', imagen_url: '' })
    setError('')
    document.getElementById('reward-create-dialog')?.showModal()
  }

  function openEdit(reward) {
    setEditingReward(reward)
    setForm({
      nombre: reward.nombre,
      descripcion: reward.descripcion || '',
      tipo: reward.tipo,
      puntos: String(reward.puntos),
      stock: reward.stock === null ? '' : String(reward.stock),
      imagen_url: reward.imagen_url || '',
    })
    setError('')
    document.getElementById('reward-create-dialog')?.showModal()
  }

  async function removeReward(reward) {
    if (!window.confirm(`¿Eliminar «${reward.nombre}» del catálogo? Los canjes ya efectuados conservarán sus datos históricos.`)) return
    await onDelete(reward)
  }

  async function selectImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Selecciona una imagen JPEG, PNG o WebP de máximo 5 MB.')
      return
    }
    setError('')
    setUploading(true)
    try {
      const url = await onUpload(file)
      setForm((current) => ({ ...current, imagen_url: url }))
    } catch (failure) {
      setError(failure.message)
    } finally {
      setUploading(false)
    }
  }

  return <>
    <SectionHeading eyebrow="Fidelización" title="Catálogo de canje" description="Crea, actualiza y elimina productos, promociones y descuentos para tus clientes." action={<button className="button button--primary" type="button" onClick={openCreate}><Plus size={16} /> Agregar beneficio</button>} />
    <dialog id="reward-create-dialog" className="modal reward-create-dialog" onClose={() => setError('')}>
      <form className="reward-admin-form" onSubmit={submit}>
        <div className="modal-heading"><div><span className="eyebrow">Catálogo de canje</span><h2>{editingReward ? 'Editar beneficio' : 'Agregar un beneficio'}</h2></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={() => document.getElementById('reward-create-dialog')?.close()}><X size={18} /></button></div>
        <p className="modal-description">{editingReward ? 'Los cambios se aplicarán al beneficio en el catálogo.' : 'El beneficio se publicará en la página de canje cuando lo guardes.'}</p>
        <label className="field-label">Nombre del beneficio<input required maxLength="180" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} placeholder="Ej. Botella reutilizable IcaTurismo" /></label>
        <label className="field-label">Tipo<select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}><option value="producto">Producto</option><option value="promocion">Promoción</option><option value="descuento">Descuento</option></select></label>
        <label className="field-label">Costo en puntos<input required type="number" min="1" max="10000000" step="1" value={form.puntos} onChange={(event) => setForm({ ...form, puntos: event.target.value })} /></label>
        <label className="field-label">Stock disponible<input type="number" min="0" max="10000000" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} placeholder="Ilimitado" /><small>Déjalo vacío para no limitar las unidades.</small></label>
        <label className="field-label reward-admin-description">Descripción<textarea maxLength="1000" rows="3" value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} placeholder="Describe qué incluye este beneficio." /></label>
        <div className="field-label reward-admin-description"><span>Imagen del beneficio</span><label className="reward-image-picker"><ImagePlus size={17} />{uploading ? 'Subiendo a Cloudinary…' : form.imagen_url ? 'Cambiar imagen' : 'Elegir imagen del dispositivo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} disabled={uploading || saving} /></label><small>JPEG, PNG o WebP · máximo 5 MB. Se guarda automáticamente en Cloudinary.</small>{form.imagen_url && <img className="reward-image-preview" src={form.imagen_url} alt="Vista previa del beneficio" />}</div>
        {error && <p className="form-error reward-admin-description" role="alert">{error}</p>}
        <div className="modal-actions reward-admin-description"><button className="button button--quiet" type="button" disabled={saving || uploading} onClick={() => document.getElementById('reward-create-dialog')?.close()}>Cancelar</button><button className="button button--primary" type="submit" disabled={saving || uploading}>{editingReward ? <Check size={16} /> : <Plus size={16} />}{saving ? 'Guardando…' : editingReward ? 'Actualizar beneficio' : 'Guardar beneficio'}</button></div>
      </form>
    </dialog>
    <section className="panel table-panel reward-admin-list">
      <div className="table-toolbar"><div><h2>Beneficios del catálogo</h2><span>{rewards.length} registrados</span></div></div>
      <div className="table-scroll"><table><thead><tr><th>Beneficio</th><th>Tipo</th><th>Costo</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {rewards.map((reward) => <tr key={reward.id}><td><div className="table-person"><div><strong>{reward.nombre}</strong><small>{reward.descripcion || 'Sin descripción'}</small></div></div></td><td>{({ producto: 'Producto', promocion: 'Promoción', descuento: 'Descuento' })[reward.tipo]}</td><td className="table-strong">{Number(reward.puntos).toLocaleString('es-PE')} pts</td><td>{reward.stock === null ? 'Ilimitado' : reward.stock}</td><td><span className={`status status--${reward.activo ? 'activo' : 'inactivo'}`}>{reward.activo ? 'Activo' : 'Inactivo'}</span></td><td><div className="table-filters"><button className="button button--quiet" type="button" onClick={() => openEdit(reward)} aria-label={`Editar ${reward.nombre}`}><Pencil size={14} /> Editar</button><button className="button button--quiet" type="button" onClick={() => onToggle(reward)}>{reward.activo ? 'Desactivar' : 'Activar'}</button><button className="button button--quiet" type="button" onClick={() => removeReward(reward)} aria-label={`Eliminar ${reward.nombre}`}><Trash2 size={14} /> Eliminar</button></div></td></tr>)}
      </tbody></table>{!loading && rewards.length === 0 && <p className="empty-state">Todavía no hay beneficios. Agrega el primero desde el formulario.</p>}</div>
    </section>
  </>
}

function EmployeeModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'editor' })
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Ingresa un nombre y un correo electrónico válido.')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña inicial debe tener al menos 8 caracteres.')
      return
    }
    onSave(form)
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="modal" onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">Administración</span><h2>Invitar empleado</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
    <p className="modal-description">Crea una cuenta de personal con acceso al panel.</p>
    <label className="field-label">Nombre completo<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre y apellido" /></label>
    <label className="field-label">Correo electrónico<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="nombre@icaturismo.com" /></label>
    <label className="field-label">Contraseña inicial<input required minLength="8" type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
    <label className="field-label">Permisos<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="editor">Editor</option><option value="soporte">Soporte</option><option value="registrador">Registrador</option><option value="admin">Administrador</option></select></label>
    {form.role === 'admin' && <div className="admin-warning"><ShieldCheck size={16} /> Tendrá acceso administrativo completo.</div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="modal-actions"><button type="button" className="button button--quiet" onClick={onClose}>Cancelar</button><button className="button button--primary" type="submit"><Plus size={16} /> Crear invitación</button></div>
  </form></div>
}

export default function App({ user }) {
  const [activePage, setActivePage] = useState(user?.rol === 'editor' ? 'destinos' : 'dashboard')
  const [products, setProducts] = useState([])
  const [rewards, setRewards] = useState([])
  const [destinations, setDestinations] = useState([])
  const [navigationTarget, setNavigationTarget] = useState({})
  const [navigationVersion, setNavigationVersion] = useState(0)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [employees, setEmployees] = useState([])
  const [customers, setCustomers] = useState([])
  const [employeeModal, setEmployeeModal] = useState(false)
  const [period, setPeriod] = useState('30')
  const [notice, setNotice] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [dark, setDark] = useState(() => readSaved('icat_admin_theme', true))
  const [summary, setSummary] = useState(null)
  const [reservations, setReservations] = useState([])
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')
  const isAdmin = user?.rol === 'admin'
  const canManageCatalog = isAdmin || user?.rol === 'editor'
  const isEditor = user?.rol === 'editor'
  const visibleNav = navGroups.map((group) => ({ ...group, items: group.items.filter((item) => {
    if (['destinos', 'productos', 'medios'].includes(item.id)) return canManageCatalog
    if (item.id === 'equipo') return isAdmin
    if (item.id === 'recompensas') return canManageCatalog
    return !isEditor
  }) })).filter((group) => group.items.length)
  const currentNav = navGroups.flatMap((group) => group.items).find((item) => item.id === activePage)
  const PageIcon = currentNav?.icon || LayoutDashboard
  const refresh = useCallback(() => setRefreshVersion((value) => value + 1), [])
  const navigate = useCallback((page, target = {}) => { setActivePage(page); setNavigationTarget(target); setNavigationVersion((value) => value + 1); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'instant' }) }, [])
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden) refresh() }, 60000)
    const visible = () => { if (!document.hidden) refresh() }
    document.addEventListener('visibilitychange', visible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
  }, [refresh])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 3600)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    const controller = new AbortController(); let current = true
    setRefreshing(true)
    const actions = [
      ...(!isEditor ? [
        { name: 'Resumen', request: () => loadAdminResource('/summary', { signal: controller.signal }), apply: (result) => setSummary(result.summary) },
        { name: 'Reservas', request: () => loadAdminResource('/reservas', { signal: controller.signal }), apply: (result) => setReservations(result.reservations || []) },
        { name: 'Clientes', request: () => loadAdminResource('/clientes', { signal: controller.signal }), apply: (result) => setCustomers(result.customers || []) },
      ] : []),
      ...(isAdmin ? [{ name: 'Equipo', request: () => loadAdminResource('/empleados', { signal: controller.signal }), apply: (result) => setEmployees(result.employees || []) }] : []),
      ...(canManageCatalog ? [{ name: 'Beneficios', request: () => loadAdminResource('/recompensas', { signal: controller.signal }), apply: (result) => setRewards(result.recompensas || []) }] : []),
      ...(canManageCatalog ? [
        { name: 'Promociones', request: () => loadAdminResource('/promociones', { signal: controller.signal }), apply: (result) => setProducts((result.promotions || []).map((product) => ({ id: product.id, name: product.nombre, description: product.descripcion, category: product.categoria, price: Number(product.precio), active: product.activo }))) },
        { name: 'Destinos', request: () => cmsRequest('/destinos', { signal: controller.signal }), apply: (result) => setDestinations(result.destinos || []) },
      ] : []),
    ]
    Promise.allSettled(actions.map((action) => action.request())).then((results) => {
      if (!current) return
      const failures = []
      results.forEach((result, index) => { if (result.status === 'fulfilled') actions[index].apply(result.value); else if (result.reason?.name !== 'AbortError') failures.push(`${actions[index].name}: ${result.reason?.message || 'no disponible'}`) })
      setDashboardError(failures.join(' · '))
      if (results.some((result) => result.status === 'fulfilled')) setUpdatedAt(Date.now())
      setDashboardLoading(false); setRefreshing(false)
    })
    return () => { current = false; controller.abort() }
  }, [canManageCatalog, isAdmin, isEditor, refreshVersion])

  async function changeCustomerStatus(id, estado_cuenta) {
    try {
      await updateAdminResource(`/clientes/${id}`, { estado_cuenta })
      setCustomers((current) => current.map((customer) => customer.id === id ? { ...customer, estado_cuenta } : customer))
      setNotice('Estado del cliente actualizado.')
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function changeCustomerPoints(id, puntos) {
    try {
      const result = await updateAdminResource(`/clientes/${id}/puntos`, { puntos })
      setCustomers((current) => current.map((customer) => customer.id === id ? { ...customer, puntos: result.customer.puntos } : customer))
      setNotice('Puntos actualizados.')
      return true
    } catch (error) {
      setNotice(error.message)
      return false
    }
  }

  async function changeEmployee(employee, rol, estado_cuenta) {
    try {
      const result = await updateAdminResource(`/empleados/${employee.id}`, { rol, estado_cuenta })
      setEmployees((current) => current.map((item) => item.id === employee.id ? result.employee : item))
      setNotice('Cuenta del equipo actualizada.')
    } catch (error) {
      setNotice(error.message)
    }
  }

  const createReward = useCallback(async (data) => {
    try {
      const result = await updateAdminResource('/recompensas', data, 'POST')
      setRewards((current) => [result.recompensa, ...current])
      setNotice('Beneficio agregado al catálogo de canje.')
      return true
    } catch (error) {
      setNotice(error.message)
      return false
    }
  }, [])

  const updateReward = useCallback(async (id, data) => {
    try {
      const result = await updateAdminResource(`/recompensas/${id}`, data)
      setRewards((current) => current.map((item) => item.id === id ? result.recompensa : item))
      setNotice('Beneficio actualizado.')
      return true
    } catch (error) {
      setNotice(error.message)
      return false
    }
  }, [])

  const deleteReward = useCallback(async (reward) => {
    try {
      await updateAdminResource(`/recompensas/${reward.id}`, {}, 'DELETE')
      setRewards((current) => current.filter((item) => item.id !== reward.id))
      setNotice('Beneficio eliminado del catálogo. El historial de canjes se conserva.')
    } catch (error) {
      setNotice(error.message)
    }
  }, [])

  const uploadRewardImage = useCallback(async (file) => {
    const formData = new FormData()
    formData.append('imagenes', file)
    const result = await cmsRequest('/uploads', { method: 'POST', body: formData })
    if (!Array.isArray(result.urls) || result.urls.length !== 1) throw new Error('La subida no devolvió la imagen.')
    return result.urls[0]
  }, [])

  const toggleReward = useCallback(async (reward) => {
    try {
      const result = await updateAdminResource(`/recompensas/${reward.id}`, { activo: !reward.activo })
      setRewards((current) => current.map((item) => item.id === reward.id ? result.recompensa : item))
      setNotice(result.recompensa.activo ? 'Beneficio activado.' : 'Beneficio desactivado.')
    } catch (error) {
      setNotice(error.message)
    }
  }, [])

  const pageContent = useMemo(() => {
    const changePage = navigate
    if (activePage === 'medios' && canManageCatalog) return <MediaLibrary />
    if (activePage === 'recompensas' && canManageCatalog) return <RewardsPage rewards={rewards} onCreate={createReward} onUpdate={updateReward} onDelete={deleteReward} onToggle={toggleReward} onUpload={uploadRewardImage} loading={dashboardLoading} />
    if (['destinos', 'productos'].includes(activePage) && canManageCatalog) return <CmsPanel key={`${activePage}-${navigationVersion}`} initialQuery={navigationTarget.query || ''} initialDestination={navigationTarget.destino_id || ''} kind={activePage === 'destinos' ? 'destinos' : 'promociones'} onCatalogChange={(rows) => setProducts(rows.map((record) => ({ id: record.id, name: record.nombre, description: record.descripcion, category: record.categoria, price: Number(record.precio), active: record.activo })))} />
    if (activePage === 'pedidos') return <OrdersPage key={`orders-${navigationVersion}`} reservations={reservations} initialTarget={navigationTarget} onRefresh={refresh} onClear={() => navigate('pedidos')} />
    if (activePage === 'clientes') return <CustomersPage key={`customers-${navigationVersion}`} initialQuery={navigationTarget.query || ''} customers={customers} onNavigate={changePage} onStatusChange={changeCustomerStatus} onPointsChange={changeCustomerPoints} canManage={isAdmin} loading={dashboardLoading} />
    if (activePage === 'equipo') return <EmployeesPage employees={employees} onAdd={() => setEmployeeModal(true)} onUpdate={changeEmployee} currentUserId={user?.id} loading={dashboardLoading} />
    if (activePage === 'puntos') return <PointsPage customers={customers} />
    return <AdminDashboard user={user} products={products} onNavigate={changePage} period={period} setPeriod={setPeriod} summary={summary} reservations={reservations} loading={dashboardLoading} error={dashboardError} refreshVersion={refreshVersion} onRefresh={refresh} />
  }, [activePage, canManageCatalog, createReward, customers, dashboardError, dashboardLoading, deleteReward, employees, isAdmin, period, products, rewards, reservations, summary, toggleReward, updateReward, uploadRewardImage, user, navigationTarget, navigationVersion, navigate, refresh, refreshVersion])

  async function saveEmployee(data) {
    try {
      const result = await updateAdminResource('/empleados', { nombre: data.name, email: data.email, password: data.password, rol: data.role }, 'POST')
      setEmployees((current) => [result.employee, ...current])
      setEmployeeModal(false)
      setNotice('Cuenta de personal creada.')
    } catch (error) {
      setNotice(error.message)
    }
  }

  return <div className={`admin-island ${dark ? 'admin-island--dark' : 'admin-island--light'}`} style={{ '--dash-oasis-image': `url("${new URL('../assets/admin/oasis-sunset.jpg', window.location.href).href}")`, '--dash-coast-image': `url("${new URL('../assets/admin/coastal-sunset.jpg', window.location.href).href}")` }}>
    <aside className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`}>
      <a className="sidebar-brand" href="../index.html"><img src="../assets/logoIcaTurismo.svg" alt="" /><span>IcaTurismo<small>ADMINISTRACIÓN</small></span></a>
      <button type="button" className="workspace-switch" onClick={() => navigate(isEditor ? 'destinos' : 'dashboard')}><span className="workspace-avatar"><Compass size={19} /></span><span><strong>IcaTurismo</strong><small>Panel de control</small></span><ChevronRight size={15} /></button>
      <nav className="side-nav" aria-label="Navegación del panel">
        {visibleNav.map((group) => <div className="nav-group" key={group.label}><span className="nav-group__label">{group.label}</span>{group.items.map(({ id, label, icon: Icon, count }) => <button className={`nav-link ${activePage === id ? 'nav-link--active' : ''}`} key={id} onClick={() => navigate(id)}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{count && <span className="nav-count">{count}</span>}</button>)}</div>)}
      </nav>
      <div className="sidebar-bottom">{!isEditor && <div className="sidebar-promo"><Sparkles size={17} /><span><strong>Un programa de puntos</strong><small>Fideliza a tus viajeros.</small></span><button onClick={() => setActivePage('puntos')} aria-label="Ver programa de puntos"><ArrowRight size={16} /></button></div>}<a className="nav-link sidebar-help" href="../index.html" target="_blank" rel="noopener noreferrer"><ExternalLink size={17} /><span>Ver sitio público</span></a><div className="sidebar-user"><Avatar initials={user?.nombre?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'AD'} tone="mint" /><span><strong>{user?.nombre || 'Equipo'}</strong><small>{({ admin: 'Administrador', editor: 'Editor', soporte: 'Soporte', registrador: 'Registrador' })[user?.rol] || 'Equipo'}</small></span><button className="icon-button" title="Cerrar sesión" onClick={() => window.Auth?.logout()}><LogOut size={16} /></button></div></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Cerrar menú" />}
    <main className="admin-content">
      <header className="topbar">
        <div className="topbar-left">
          <button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={19} /></button>
          <span className="breadcrumb"><span>Panel</span><ChevronRight size={14} /><PageIcon size={15} />{currentNav?.label || 'Resumen'}</span>
        </div>
        <AdminHeader user={user} navigation={visibleNav} products={products} reservations={reservations} customers={customers} destinations={destinations} onNavigate={navigate} onRefresh={refresh} busy={refreshing} dark={dark} updatedAt={updatedAt} onTheme={() => { const next = !dark; setDark(next); setNotice(saveSaved('icat_admin_theme', next) ? '' : 'No se pudo guardar el tema en este navegador.') }} />
      </header>
      <div className="page-content" key={`${activePage}-${navigationVersion}`}>{pageContent}</div>
      <footer className="dashboard-footer"><span>© 2026 IcaTurismo · Panel de administración</span><span><span className={`online-dot ${dashboardError ? 'is-error' : ''}`} />{refreshing ? 'Actualizando datos…' : dashboardError ? 'Sincronización parcial' : updatedAt ? `Actualizado ${new Date(updatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })} · cada 60 s` : 'Conectando…'}</span></footer>
    </main>
    {employeeModal && <EmployeeModal onClose={() => setEmployeeModal(false)} onSave={saveEmployee} />}
    {notice && <div className="toast" role="status"><Check size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Cerrar notificación"><X size={15} /></button></div>}
  </div>
}
