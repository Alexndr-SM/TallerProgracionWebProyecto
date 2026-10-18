import { useEffect, useState } from 'react'
import {
  Activity,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react'
import logoUrl from './assets/logo-ica.webp?no-inline'
import './App.css'

const roleLabels = {
  admin: 'Administrador',
  registrador: 'Registrador',
  soporte: 'Soporte',
  editor: 'Editor',
}

const rolePages = {
  admin: ['dashboard', 'pedidos', 'clientes', 'productos', 'equipo'],
  registrador: ['dashboard', 'pedidos', 'clientes'],
  soporte: ['dashboard', 'pedidos', 'clientes'],
  editor: ['productos'],
}
const today = new Date().toISOString().slice(0, 10)

const navigation = [
  { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
  { id: 'pedidos', label: 'Reservas', icon: ShoppingBag },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'productos', label: 'Promociones', icon: Package },
  { id: 'equipo', label: 'Equipo', icon: ShieldCheck },
]

const api = async (path, options = {}) => {
  const base = (window.API_URL || '').replace(/\/$/, '')
  if (!base) throw new Error('No se configuró la dirección de la API.')
  const response = await fetch(`${base}/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${window.Auth?.getToken() || ''}`,
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.ok) {
    if (response.status === 401) window.Auth?.logout()
    throw new Error(data.message || 'La solicitud no se pudo completar.')
  }
  return data
}

const money = (value) => new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
}).format(Number(value) || 0)

const date = (value) => {
  if (!value) return 'Sin actividad'
  const normalized = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00`
    : value
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(normalized))
}

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'IT'

function readTheme() {
  try {
    return localStorage.getItem('icat_admin_theme') !== 'false'
  } catch (error) {
    console.error('No se pudo leer el tema del panel.', error)
    return true
  }
}

function LoadingState({ loading, error, onRetry }) {
  if (loading) return <p className="empty-state" role="status">Cargando información desde la base de datos...</p>
  if (error) return <div className="permission-notice" role="alert"><p>{error}</p><button className="button button--quiet" onClick={onRetry}>Reintentar</button></div>
  return null
}

function Heading({ title, description, action }) {
  return <div className="section-heading"><div><p className="eyebrow">IcaTurismo · Administración</p><h1>{title}</h1><p className="section-description">{description}</p></div>{action}</div>
}

function SummaryPage({ summary, onNavigate }) {
  const values = [
    ['Reservas', summary?.reservations?.total, ShoppingBag],
    ['Por atender', summary?.reservations?.pendientes, Activity],
    ['Clientes activos', summary?.customers?.activos, Users],
    ['Ingresos pagados', money(summary?.paid_sales), Package],
  ]
  return <>
    <Heading title="Resumen" description="Actividad real registrada en la base de datos." />
    <div className="stat-grid">
      {values.map(([label, value, Icon]) => <article className="stat-card" key={label}><div className="stat-card__top"><span>{label}</span><span className="stat-icon"><Icon size={17} /></span></div><strong>{value ?? '—'}</strong></article>)}
    </div>
    <section className="panel dashboard-shortcuts">
      <h2>Accesos rápidos</h2>
      <div className="shortcut-actions">
        <button className="button button--quiet" onClick={() => onNavigate('pedidos')}>Ver reservas</button>
        <button className="button button--quiet" onClick={() => onNavigate('clientes')}>Gestionar clientes</button>
        <button className="button button--quiet" onClick={() => onNavigate('productos')}>Administrar promociones</button>
      </div>
      <p>Las reservas que aún no tienen integración con una pasarela aparecen con el pago pendiente. No se consideran ingresos pagados.</p>
    </section>
  </>
}

function OrdersPage({ reservations, promotions, canCreate, onStatusChange, onCreate }) {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', fecha_tour: '', asistentes: 1, metodo_pago: 'tarjeta', promocion_id: '' })
  const [formError, setFormError] = useState('')
  const visible = reservations.filter((item) => `${item.id} ${item.nombre} ${item.email} ${item.promocion_nombre || ''}`.toLowerCase().includes(search.toLowerCase()))
  async function submit(event) {
    event.preventDefault()
    setFormError('')
    try {
      await onCreate({ ...form, asistentes: Number(form.asistentes), promocion_id: Number(form.promocion_id) })
      setShowCreate(false)
      setForm({ nombre: '', email: '', fecha_tour: '', asistentes: 1, metodo_pago: 'tarjeta', promocion_id: '' })
    } catch (submitError) {
      setFormError(submitError.message)
    }
  }
  return <>
    <Heading title="Reservas y pedidos" description="Reservas por promoción, total y estado del pago." action={canCreate && <button className="button button--primary" onClick={() => setShowCreate((open) => !open)}><Plus size={16} /> Reserva presencial</button>} />
    {showCreate && <form className="panel local-reservation-form" onSubmit={submit}>
      <h2>Registrar reserva en el local</h2>
      <p>El total se calcula con el precio vigente y el pago queda pendiente de verificación.</p>
      <div className="local-reservation-fields">
        <label className="field-label">Nombre del cliente<input required maxLength="120" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></label>
        <label className="field-label">Correo<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label className="field-label">Promoción<select required value={form.promocion_id} onChange={(event) => setForm({ ...form, promocion_id: event.target.value })}><option value="">Selecciona</option>{promotions.map((item) => <option key={item.id} value={item.id}>{item.nombre} · {money(item.precio)}</option>)}</select></label>
        <label className="field-label">Fecha del tour<input required type="date" min={today} value={form.fecha_tour} onChange={(event) => setForm({ ...form, fecha_tour: event.target.value })} /></label>
        <label className="field-label">Asistentes<input required min="1" max="15" type="number" value={form.asistentes} onChange={(event) => setForm({ ...form, asistentes: event.target.value })} /></label>
        <label className="field-label">Método de pago<select value={form.metodo_pago} onChange={(event) => setForm({ ...form, metodo_pago: event.target.value })}><option value="tarjeta">Tarjeta</option><option value="paypal">PayPal</option><option value="yape">Yape / Plin</option></select></label>
      </div>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="modal-actions"><button className="button button--quiet" type="button" onClick={() => setShowCreate(false)}>Cancelar</button><button className="button button--primary" type="submit">Guardar reserva</button></div>
    </form>}
    <section className="panel table-panel">
      <div className="table-toolbar"><div><h2>Reservas</h2><span>{visible.length} registros</span></div><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar reserva, cliente o promoción" /></label></div>
      <div className="table-scroll"><table><thead><tr><th>N.º</th><th>Cliente</th><th>Promoción</th><th>Fecha del tour</th><th>Personas</th><th>Total</th><th>Pago</th><th>Reserva</th></tr></thead><tbody>
        {visible.map((item) => <tr key={item.id}><td className="table-strong">#{item.id}</td><td><div className="table-person"><span className="avatar">{initials(item.nombre)}</span><div><strong>{item.nombre}</strong><small>{item.email}</small></div></div></td><td>{item.promocion_nombre || 'Sin promoción asignada'}</td><td>{date(item.fecha_tour)}</td><td>{item.asistentes}</td><td className="table-strong">{money(item.total)}</td><td><span className={`status status--${item.estado_pago}`}>{item.estado_pago}</span></td><td><select className="role-select" aria-label={`Estado de reserva ${item.id}`} value={item.estado} onChange={(event) => onStatusChange(item.id, event.target.value)}><option value="pendiente">Pendiente</option><option value="confirmada">Confirmada</option><option value="cancelada">Cancelada</option></select></td></tr>)}
      </tbody></table>{visible.length === 0 && <p className="empty-state">No hay reservas que coincidan.</p>}</div>
    </section>
  </>
}

function CustomersPage({ customers, canEdit, onStatusChange }) {
  const [search, setSearch] = useState('')
  const visible = customers.filter((customer) => `${customer.nombre} ${customer.email}`.toLowerCase().includes(search.toLowerCase()))
  const activeCount = customers.filter((customer) => customer.estado_cuenta === 'activo').length
  return <>
    <Heading title="Clientes" description="Cuentas de clientes y su actividad de reservas." />
    <div className="catalog-summary"><div><span>Clientes</span><strong>{customers.length}</strong></div><div><span>Activos</span><strong>{activeCount}</strong></div><div><span>Inactivos</span><strong>{customers.length - activeCount}</strong></div></div>
    <section className="panel table-panel">
      <div className="table-toolbar"><div><h2>Clientes registrados</h2><span>Estado de cuenta y reservas asociadas</span></div><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente" /></label></div>
      <div className="table-scroll"><table><thead><tr><th>Cliente</th><th>Registro</th><th>Reservas</th><th>Último acceso</th><th>Estado</th>{canEdit && <th>Acción</th>}</tr></thead><tbody>
        {visible.map((customer) => <tr key={customer.id}><td><div className="table-person"><span className="avatar">{initials(customer.nombre)}</span><div><strong>{customer.nombre}</strong><small>{customer.email}</small></div></div></td><td>{date(customer.created_at)}</td><td>{customer.reservas}</td><td>{date(customer.ultimo_acceso)}</td><td><span className={`status status--${customer.estado_cuenta}`}>{customer.estado_cuenta}</span></td>{canEdit && <td><button className="button button--quiet" onClick={() => onStatusChange(customer.id, customer.estado_cuenta === 'activo' ? 'inactivo' : 'activo')}>{customer.estado_cuenta === 'activo' ? 'Desactivar' : 'Activar'}</button></td>}</tr>)}
      </tbody></table>{visible.length === 0 && <p className="empty-state">No hay clientes que coincidan.</p>}</div>
    </section>
  </>
}

function PromotionModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: item?.nombre || '',
    descripcion: item?.descripcion || '',
    categoria: item?.categoria || 'Aventura',
    precio: item?.precio || '',
    activo: item?.activo ?? true,
  })
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    try {
      await onSave({ ...form, precio: Number(form.precio) }, item?.id)
      onClose()
    } catch (saveError) {
      setError(saveError.message)
    }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="modal" onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">Catálogo conectado</span><h2>{item ? 'Editar promoción' : 'Nueva promoción'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
    <p className="modal-description">Las promociones activas aparecerán en la página de reserva. El precio es por persona.</p>
    <label className="field-label">Nombre<input required maxLength="180" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></label>
    <label className="field-label">Descripción<textarea maxLength="2000" rows="3" value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} /></label>
    <div className="form-grid"><label className="field-label">Categoría<select value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })}><option>Aventura</option><option>Cultura</option><option>Naturaleza</option><option>Gastronomía</option></select></label><label className="field-label">Precio por persona (S/)<input required min="0.01" step="0.01" type="number" value={form.precio} onChange={(event) => setForm({ ...form, precio: event.target.value })} /></label></div>
    {item && <label className="field-label">Estado<select value={String(form.activo)} onChange={(event) => setForm({ ...form, activo: event.target.value === 'true' })}><option value="true">Activa</option><option value="false">Inactiva</option></select></label>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="modal-actions"><button className="button button--quiet" type="button" onClick={onClose}>Cancelar</button><button className="button button--primary" type="submit">Guardar promoción</button></div>
  </form></div>
}

function PromotionsPage({ promotions, onSave, onAdd }) {
  const [search, setSearch] = useState('')
  const visible = promotions.filter((item) => `${item.nombre} ${item.categoria}`.toLowerCase().includes(search.toLowerCase()))
  return <>
    <Heading title="Promociones" description="Administra el catálogo, los precios y la publicación en la web." action={<button className="button button--primary" onClick={onAdd}><Plus size={16} /> Nueva promoción</button>} />
    <div className="permission-notice"><Package size={17} /><p>Al desactivar una promoción deja de ofrecerse en las reservas nuevas. El historial de reservas conserva su nombre y precio originales.</p></div>
    <section className="panel table-panel">
      <div className="table-toolbar"><div><h2>Catálogo de experiencias</h2><span>{promotions.filter((item) => item.activo).length} activas · {promotions.length} total</span></div><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar promoción" /></label></div>
      <div className="table-scroll"><table><thead><tr><th>Promoción</th><th>Categoría</th><th>Precio por persona</th><th>Estado en la web</th><th /></tr></thead><tbody>
        {visible.map((item) => <tr key={item.id}><td><div className="table-product"><div><strong>{item.nombre}</strong><small>{item.descripcion || item.slug}</small></div></div></td><td>{item.categoria}</td><td className="table-strong">{money(item.precio)}</td><td><span className={`status status--${item.activo ? 'activo' : 'inactivo'}`}>{item.activo ? 'Activa' : 'Inactiva'}</span></td><td><button className="button button--quiet" onClick={() => onSave(item, true)}>Editar</button></td></tr>)}
      </tbody></table>{visible.length === 0 && <p className="empty-state">No hay promociones que coincidan.</p>}</div>
    </section>
  </>
}

function EmployeeModal({ onClose, onSave }) {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'registrador' })
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    try {
      await onSave(form)
      onClose()
    } catch (saveError) {
      setError(saveError.message)
    }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="modal" onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">Administración</span><h2>Registrar empleado</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
    <p className="modal-description">La cuenta se guarda en PostgreSQL. Comparte la contraseña inicial de forma segura con el empleado.</p>
    <label className="field-label">Nombre completo<input required maxLength="120" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></label>
    <label className="field-label">Correo<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
    <label className="field-label">Contraseña inicial<input required minLength="8" type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
    <label className="field-label">Rol<select value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value })}><option value="registrador">Registrador</option><option value="soporte">Soporte</option><option value="editor">Editor</option><option value="admin">Administrador</option></select></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="modal-actions"><button className="button button--quiet" type="button" onClick={onClose}>Cancelar</button><button className="button button--primary" type="submit">Crear cuenta</button></div>
  </form></div>
}

function EmployeesPage({ employees, onAdd, onUpdate }) {
  return <>
    <Heading title="Equipo y permisos" description="Cuentas de empleados, rol asignado y acceso al panel." action={<button className="button button--primary" onClick={onAdd}><Plus size={16} /> Registrar empleado</button>} />
    <div className="permission-notice"><ShieldCheck size={17} /><p>El rol y el estado se verifican en la API en cada solicitud. Al desactivar una cuenta, sus sesiones dejan de funcionar inmediatamente.</p></div>
    <section className="panel table-panel"><div className="table-toolbar"><div><h2>Empleados</h2><span>{employees.length} cuentas de personal</span></div></div>
      <div className="table-scroll"><table><thead><tr><th>Empleado</th><th>Rol</th><th>Estado de acceso</th><th>Último acceso</th></tr></thead><tbody>
        {employees.map((employee) => <tr key={employee.id}><td><div className="table-person"><span className="avatar">{initials(employee.nombre)}</span><div><strong>{employee.nombre}</strong><small>{employee.email}</small></div></div></td><td><select className="role-select" value={employee.rol} onChange={(event) => onUpdate(employee, { rol: event.target.value })}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td><select className="role-select" value={employee.estado_cuenta} onChange={(event) => onUpdate(employee, { estado_cuenta: event.target.value })}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></td><td>{date(employee.ultimo_acceso)}</td></tr>)}
      </tbody></table>{employees.length === 0 && <p className="empty-state">Todavía no hay empleados registrados.</p>}</div>
    </section>
  </>
}

export default function App({ user }) {
  const [dark, setDark] = useState(readTheme)
  const [activePage, setActivePage] = useState(user?.rol === 'editor' ? 'productos' : 'dashboard')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [promotionModal, setPromotionModal] = useState(null)
  const [employeeModal, setEmployeeModal] = useState(false)
  const role = user?.rol
  const pages = rolePages[role] || rolePages.soporte
  const availableNavigation = navigation.filter((item) => pages.includes(item.id))
  const visiblePage = pages.includes(activePage) ? activePage : pages[0]
  const currentPage = availableNavigation.find((item) => item.id === visiblePage) || availableNavigation[0]

  useEffect(() => {
    let cancelled = false
    async function loadPage() {
      setLoading(true)
      setError('')
      setData(null)
      try {
        const endpoints = {
          dashboard: '/admin/summary',
          pedidos: '/admin/reservas',
          clientes: '/admin/clientes',
          productos: '/admin/promociones',
          equipo: '/admin/empleados',
        }
        let result = await api(endpoints[visiblePage])
        if (visiblePage === 'pedidos') {
          const promotions = await api('/promociones')
          result = { ...result, promotions: promotions.promotions }
        }
        if (!cancelled) setData(result)
      } catch (loadError) {
        if (!cancelled) setError(loadError.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadPage()
    return () => { cancelled = true }
  }, [visiblePage, reloadKey])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 4000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  function reload() {
    setReloadKey((key) => key + 1)
  }

  function toggleTheme() {
    const next = !dark
    setDark(next)
    try {
      localStorage.setItem('icat_admin_theme', String(next))
    } catch (storageError) {
      console.error('No se pudo guardar el tema del panel.', storageError)
      setNotice('No se pudo guardar la preferencia de tema.')
    }
  }

  async function updateReservation(id, estado) {
    try {
      await api(`/admin/reservas/${id}`, { method: 'PATCH', body: JSON.stringify({ estado }) })
      setNotice('Estado de reserva actualizado.')
      reload()
    } catch (actionError) {
      setNotice(actionError.message)
    }
  }

  async function createLocalReservation(form) {
    await api('/admin/reservas', { method: 'POST', body: JSON.stringify(form) })
    setNotice('Reserva presencial registrada con pago pendiente.')
    reload()
  }

  async function updateCustomer(id, estado_cuenta) {
    try {
      await api(`/admin/clientes/${id}`, { method: 'PATCH', body: JSON.stringify({ estado_cuenta }) })
      setNotice(`Cuenta del cliente ${estado_cuenta}.`)
      reload()
    } catch (actionError) {
      setNotice(actionError.message)
    }
  }

  async function savePromotion(form, id) {
    await api(id ? `/admin/promociones/${id}` : '/admin/promociones', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(form),
    })
    setNotice(id ? 'Promoción actualizada.' : 'Promoción agregada al catálogo.')
    reload()
  }

  async function createEmployee(form) {
    await api('/admin/empleados', { method: 'POST', body: JSON.stringify(form) })
    setNotice('Empleado registrado y activo.')
    reload()
  }

  async function updateEmployee(employee, changes) {
    try {
      const update = {
        rol: changes.rol || employee.rol,
        estado_cuenta: changes.estado_cuenta || employee.estado_cuenta,
      }
      await api(`/admin/empleados/${employee.id}`, { method: 'PATCH', body: JSON.stringify(update) })
      setNotice('Permisos del empleado actualizados.')
      reload()
    } catch (actionError) {
      setNotice(actionError.message)
      reload()
    }
  }

  let content = null
  if (visiblePage === 'dashboard') content = <SummaryPage summary={data?.summary} onNavigate={setActivePage} />
  if (visiblePage === 'pedidos') content = <OrdersPage reservations={data?.reservations || []} promotions={data?.promotions || []} canCreate={role === 'admin' || role === 'registrador'} onStatusChange={updateReservation} onCreate={createLocalReservation} />
  if (visiblePage === 'clientes') content = <CustomersPage customers={data?.customers || []} canEdit={role === 'admin'} onStatusChange={updateCustomer} />
  if (visiblePage === 'productos') content = <PromotionsPage promotions={data?.promotions || []} onAdd={() => setPromotionModal({ mode: 'add' })} onSave={(item) => setPromotionModal({ mode: 'edit', item })} />
  if (visiblePage === 'equipo') content = <EmployeesPage employees={data?.employees || []} onAdd={() => setEmployeeModal(true)} onUpdate={updateEmployee} />

  return <div className={`admin-island ${dark ? 'admin-island--dark' : 'admin-island--light'}`}>
    <aside className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`}>
      <a className="sidebar-brand" href="../index.html"><img src={logoUrl} alt="" /><span>IcaTurismo<small>ADMINISTRACIÓN</small></span></a>
      <div className="workspace-switch"><span className="workspace-avatar">I</span><span><strong>IcaTurismo</strong><small>Panel de control</small></span></div>
      <nav className="side-nav" aria-label="Navegación del panel">{availableNavigation.map(({ id, label, icon: Icon }) => <button className={`nav-link ${visiblePage === id ? 'nav-link--active' : ''}`} key={id} onClick={() => { setActivePage(id); setMobileNav(false) }}><Icon size={17} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-user"><span className="avatar">{initials(user?.nombre)}</span><span><strong>{user?.nombre}</strong><small>{roleLabels[role] || 'Personal'}</small></span><button className="icon-button" title="Cerrar sesión" onClick={() => window.Auth?.logout()}><LogOut size={16} /></button></div></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Cerrar menú" />}
    <main className="admin-content">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={19} /></button><span className="breadcrumb"><span>Panel</span><span>/</span>{currentPage?.label}</span></div><div className="topbar-actions"><button className="button button--quiet theme-button" onClick={toggleTheme}>{dark ? 'Modo claro' : 'Modo oscuro'}</button><span className="topbar-divider" /><span className="avatar">{initials(user?.nombre)}</span></div></header>
      <div className="page-content" key={visiblePage}><LoadingState loading={loading} error={error} onRetry={reload} />{!loading && !error && content}</div>
      <footer className="dashboard-footer"><span>© 2026 IcaTurismo · Panel de administración</span><span>Sesión de {roleLabels[role] || 'personal'}</span></footer>
    </main>
    {promotionModal && <PromotionModal item={promotionModal.item} onClose={() => setPromotionModal(null)} onSave={savePromotion} />}
    {employeeModal && <EmployeeModal onClose={() => setEmployeeModal(false)} onSave={createEmployee} />}
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Cerrar notificación"><X size={15} /></button></div>}
  </div>
}
