import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Compass,
  CreditCard,
  Download,
  Ellipsis,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react'
import './App.css'
import CmsPanel from './CmsPanel.jsx'

const navGroups = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
      { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag },
      { id: 'clientes', label: 'Clientes', icon: Users },
      { id: 'destinos', label: 'Destinos', icon: Compass },
      { id: 'productos', label: 'Promociones', icon: Package },
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

async function loadAdminResource(path) {
  const base = (window.API_URL || '').replace(/\/$/, '')
  const response = await fetch(`${base}/api/admin${path}`, {
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

function reservationSeries(reservations, period) {
  const days = Number(period)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const counts = Array(days).fill(0)
  reservations.forEach((reservation) => {
    const createdAt = new Date(reservation.created_at)
    const dayIndex = Math.floor((today.getTime() - Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), createdAt.getUTCDate())) / 86400000)
    if (dayIndex >= 0 && dayIndex < days) counts[days - dayIndex - 1] += 1
  })

  const max = Math.max(...counts, 1)
  const points = counts.map((count, index) => ({
    x: (index / Math.max(days - 1, 1)) * 720,
    y: 190 - (count / max) * 150,
  }))
  const line = points.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${line} L720 192 L0 192 Z`
  const labelIndices = [0, Math.floor((days - 1) / 4), Math.floor((days - 1) / 2), Math.floor(((days - 1) * 3) / 4), days - 1]
  const labels = [...new Set(labelIndices)].map((index) => {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - (days - index - 1))
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', timeZone: 'UTC' })
  })
  return { counts, line, area, labels, max }
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

function DashboardHome({ user, products, onNavigate, period, setPeriod, summary, reservations, loading, error }) {
  const firstName = user?.nombre?.split(' ')[0] || 'Admin'
  const productsWithReservations = products.map((product) => ({
    ...product,
    reservationsCount: reservations.filter((reservation) => Number(reservation.promocion_id) === Number(product.id)).length,
  }))
  const bestSellers = [...productsWithReservations].sort((a, b) => b.reservationsCount - a.reservationsCount).slice(0, 3)
  const today = new Date().toISOString().slice(0, 10)
  const upcomingReservations = reservations
    .filter((reservation) => String(reservation.fecha_tour).slice(0, 10) >= today && reservation.estado !== 'cancelada')
    .sort((a, b) => String(a.fecha_tour).localeCompare(String(b.fecha_tour)))
    .slice(0, 3)
  const methodLabels = { tarjeta: 'Tarjeta', paypal: 'PayPal', yape: 'Yape / Plin' }
  const series = reservationSeries(reservations, period)
  const methodCounts = ['tarjeta', 'paypal', 'yape'].map((method) => ({
    method,
    count: reservations.filter((reservation) => reservation.metodo_pago === method).length,
  }))
  const methodTotal = methodCounts.reduce((total, item) => total + item.count, 0)
  let methodStop = 0
  const methodGradient = methodTotal ? methodCounts.map(({ count }, index) => {
    const start = methodStop
    methodStop += methodTotal ? (count / methodTotal) * 100 : 0
    const color = ['var(--admin-accent-bright)', 'var(--admin-blue)', 'var(--admin-peach)'][index]
    return `${color} ${start}% ${methodStop}%`
  }).join(', ') : 'var(--admin-border) 0% 100%'
  const donutBackground = `conic-gradient(${methodGradient})`
  const recentReservations = reservations.slice(0, 3).map((reservation) => ({
    id: `#${reservation.id}`,
    customer: reservation.nombre,
    item: reservation.promocion_nombre || 'Reserva de tour',
    date: new Date(reservation.created_at).toLocaleDateString('es-PE'),
    total: reservation.total,
    status: ({ pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' })[reservation.estado] || reservation.estado,
    statusClass: reservation.estado,
    initials: reservation.nombre.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
    tone: 'mint',
  }))
  return (
    <>
      <SectionHeading
        eyebrow={new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        title={`¡Hola, ${firstName}!`}
        description={error || 'Actividad real registrada en la base de datos.'}
        action={<span className="data-live"><i /> Datos en vivo</span>}
      />

      <div className="stat-grid">
        <article className="stat-card stat-card--highlight">
          <div className="stat-card__top"><span>Reservas</span><span className="stat-icon"><ShoppingBag size={17} /></span></div>
          <strong>{loading ? '—' : Number(summary?.reservations?.total || 0).toLocaleString('es-PE')}</strong>
          <div className="stat-card__bottom">Total registrado</div>
        </article>
        <article className="stat-card">
          <div className="stat-card__top"><span>Por atender</span><span className="stat-icon"><Activity size={17} /></span></div>
          <strong>{loading ? '—' : Number(summary?.reservations?.pendientes || 0).toLocaleString('es-PE')}</strong>
          <div className="stat-card__bottom">Requieren atención</div>
        </article>
        <article className="stat-card">
          <div className="stat-card__top"><span>Clientes activos</span><span className="stat-icon"><Users size={17} /></span></div>
          <strong>{loading ? '—' : Number(summary?.customers?.activos || 0).toLocaleString('es-PE')}</strong>
          <div className="stat-card__bottom">Cuentas habilitadas</div>
        </article>
        <article className="stat-card">
          <div className="stat-card__top"><span>Equipo activo</span><span className="stat-icon"><ShieldCheck size={17} /></span></div>
          <strong>{loading ? '—' : Number(summary?.employees?.total || 0).toLocaleString('es-PE')}</strong>
          <div className="stat-card__bottom">Cuentas de personal</div>
        </article>
        <article className="stat-card">
          <div className="stat-card__top"><span>Ingresos pagados</span><span className="stat-icon"><CreditCard size={17} /></span></div>
          <strong>{loading ? '—' : money(summary?.paid_sales || 0)}</strong>
          <div className="stat-card__bottom">Solo pagos confirmados</div>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="panel sales-panel">
          <div className="panel-heading">
            <div><h2>Reservas en el periodo</h2><p>Solicitudes registradas por día</p></div>
            <select className="select select--small" value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Periodo de ventas">
              <option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option>
            </select>
          </div>
          <div className="chart-summary"><strong>{series.counts.reduce((sum, count) => sum + count, 0).toLocaleString('es-PE')}</strong><span>reservas</span></div>
          <div className="chart-wrap">
            <div className="chart-y-labels"><span>{series.max}</span><span>{Math.ceil(series.max * .75)}</span><span>{Math.ceil(series.max * .5)}</span><span>{Math.ceil(series.max * .25)}</span><span>0</span></div>
            <svg className="sales-chart" viewBox="0 0 720 210" preserveAspectRatio="none" role="img" aria-label={`Gráfico de reservas durante los últimos ${period} días`}>
              <defs><linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--admin-accent-bright)" stopOpacity=".24" /><stop offset="100%" stopColor="var(--admin-accent-bright)" stopOpacity="0" /></linearGradient></defs>
              {[20, 63, 106, 149, 192].map((y) => <line key={y} x1="0" x2="720" y1={y} y2={y} className="chart-gridline" />)}
              <path className="chart-area" d={series.area} />
              <path className="chart-line" d={series.line} />
            </svg>
          </div>
          <div className="chart-x-labels">{series.labels.map((label) => <span key={label}>{label}</span>)}</div>
        </section>
        <section className="panel channel-panel">
          <div className="panel-heading"><div><h2>Reservas por método</h2><p>Distribución de pagos seleccionados</p></div></div>
          <div className="donut-wrap"><div className="donut" role="img" aria-label={`Reservas por método de pago: ${methodTotal} en total`} style={{ background: donutBackground }}><div><strong>{methodTotal.toLocaleString('es-PE')}</strong><span>reservas</span></div></div></div>
          <div className="legend">
            {methodCounts.map(({ method, count }, index) => <span key={method}><i className={`legend-dot legend-dot--${['mint', 'blue', 'peach'][index]}`} />{methodLabels[method]} <b>{methodTotal ? Math.round((count / methodTotal) * 100) : 0}%</b></span>)}
          </div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--lower">
        <section className="panel orders-panel">
          <div className="panel-heading"><div><h2>Pedidos recientes</h2><p>Las últimas reservas de tus clientes</p></div><button className="text-link" onClick={() => onNavigate('pedidos')}>Ver todos <ArrowRight size={15} /></button></div>
          <OrderList items={recentReservations} compact />
        </section>
        <section className="panel best-panel">
          <div className="panel-heading"><div><h2>Productos estrella</h2><p>Los favoritos de este mes</p></div><button className="text-link" onClick={() => onNavigate('productos')}>Ver catálogo <ArrowRight size={15} /></button></div>
          <div className="best-list">
            {bestSellers.map((product, index) => <div className="best-item" key={product.id}><span className="product-thumb product-thumb--sea"><Compass size={18} /></span><div className="best-item__name"><strong>{product.name}</strong><span>{product.reservationsCount} reservas</span></div><span className="best-item__rank"><Star size={13} fill="currentColor" /> #{index + 1}</span></div>)}
            {bestSellers.length === 0 && <p className="empty-state">No hay productos registrados.</p>}
          </div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--lower">
        <section className="panel renewals-panel">
          <div className="panel-heading"><div><h2>Próximos eventos</h2><p>Salidas y experiencias programadas</p></div><button className="text-link" onClick={() => onNavigate('pedidos')}>Calendario <ArrowRight size={15} /></button></div>
          {upcomingReservations.map((reservation) => <div className="event-row" key={reservation.id}><span className="event-date"><b>{String(reservation.fecha_tour).slice(8, 10)}</b><small>{new Date(`${String(reservation.fecha_tour).slice(0, 10)}T00:00:00`).toLocaleDateString('es-PE', { month: 'short' }).toUpperCase()}</small></span><div><strong>{reservation.promocion_nombre || 'Reserva de tour'}</strong><span>{reservation.asistentes} viajeros · {reservation.nombre}</span></div><span className="event-status">{new Date(`${String(reservation.fecha_tour).slice(0, 10)}T00:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}</span></div>)}
          {upcomingReservations.length === 0 && <p className="empty-state">No hay próximas salidas reservadas.</p>}
        </section>
        <section className="panel loyalty-preview">
          <div className="loyalty-preview__icon"><Sparkles size={20} /></div>
          <p className="eyebrow">Muy pronto</p><h2>Un viaje, más recompensas</h2>
          <p>Estamos preparando un programa de puntos para agradecer cada aventura que tus clientes vivan con IcaTurismo.</p>
          <button className="text-link" onClick={() => onNavigate('puntos')}>Explorar beneficios <ArrowRight size={15} /></button>
          <span className="loyalty-orbit loyalty-orbit--one" /><span className="loyalty-orbit loyalty-orbit--two" />
        </section>
      </div>
    </>
  )
}

function OrderList({ items, compact = false }) {
  if (!items.length) return <p className="empty-state">Todavía no hay reservas registradas.</p>
  return <div className={`order-list ${compact ? 'order-list--compact' : ''}`}>
    {items.map((order) => <div className="order-row" key={order.id}><Avatar initials={order.initials} tone={order.tone} /><div className="order-person"><strong>{order.customer}</strong><span>{order.item}</span></div><span className="order-date">{order.date}</span><span className={`status status--${order.statusClass || order.status.toLowerCase()}`}>{order.status}</span><strong className="order-total">{money(order.total)}</strong></div>)}
  </div>
}

function ProductsPage({ products, reservations, onAdd, onEdit, onToggle }) {
  const [query, setQuery] = useState('')
  const [availability, setAvailability] = useState('todos')
  const filtered = products.filter((product) => {
    const matchesQuery = `${product.name} ${product.category} ${product.id}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesQuery && (availability === 'todos' || (availability === 'activos' ? product.active : !product.active))
  })
  const reservationCount = (productId) => reservations.filter((reservation) => Number(reservation.promocion_id) === Number(productId)).length
  return <>
    <SectionHeading eyebrow="Catálogo" title="Productos y experiencias" description="Administra tus experiencias, precios y disponibilidad." action={<button className="button button--primary" onClick={() => onAdd()}><Plus size={16} /> Nuevo producto</button>} />
    <div className="catalog-summary">
      <div><span>Productos registrados</span><strong>{products.length}</strong></div><div><span>Productos activos</span><strong>{products.filter((product) => product.active).length}</strong></div><div><span>Reservas asociadas</span><strong>{reservations.length}</strong></div>
    </div>
    <section className="panel table-panel">
      <div className="table-toolbar"><div><h2>Experiencias y paquetes</h2><span>{filtered.length} de {products.length} experiencias</span></div><div className="table-filters"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar destino o paquete..." /></label><select className="select select--small" value={availability} onChange={(event) => setAvailability(event.target.value)} aria-label="Filtrar experiencias por disponibilidad"><option value="todos">Todos</option><option value="activos">Disponibles</option><option value="inactivos">No disponibles</option></select></div></div>
      <div className="table-scroll"><table><thead><tr><th>Experiencia</th><th>Categoría</th><th>Precio</th><th>Reservas</th><th>Estado</th><th /></tr></thead><tbody>
        {filtered.map((product) => <tr key={product.id}><td><div className="table-product"><span className="product-thumb product-thumb--sea"><Compass size={17} /></span><div><strong>{product.name}</strong><small>{product.description || `Producto #${product.id}`}</small></div></div></td><td>{product.category}</td><td className="table-strong">{money(product.price)}</td><td>{reservationCount(product.id)}</td><td><span className={`status ${product.active ? 'status--confirmado' : 'status--inactivo'}`}>{product.active ? 'Activo' : 'Inactivo'}</span></td><td><div className="row-actions"><button className="icon-button" onClick={() => onEdit(product)} aria-label={`Editar ${product.name}`}><Settings size={15} /></button><button className="icon-button" onClick={() => onToggle(product)} aria-label={`${product.active ? 'Desactivar' : 'Activar'} ${product.name}`} title={product.active ? 'Desactivar' : 'Activar'}>{product.active ? <X size={15} /> : <Check size={15} />}</button></div></td></tr>)}
      </tbody></table>{filtered.length === 0 && <p className="empty-state">{query ? 'No encontramos productos con esa búsqueda.' : 'Todavía no hay productos registrados.'}</p>}</div>
    </section>
  </>
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
  useEffect(() => setPoints(String(customer.puntos || 0)), [customer.puntos])
  return <form className="customer-points-control" onSubmit={(event) => { event.preventDefault(); onSave(customer.id, Number(points)) }}>
    <input aria-label={`Puntos de ${customer.nombre}`} type="number" min="0" step="1" value={points} onChange={(event) => setPoints(event.target.value)} />
    <button className="icon-button" type="submit" aria-label={`Guardar puntos de ${customer.nombre}`}><Check size={15} /></button>
  </form>
}

function CustomersPage({ customers, onNavigate, onStatusChange, onPointsChange, canManage, loading }) {
  const [search, setSearch] = useState('')
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

function OrdersPage({ reservations }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('todas')
  const [departure, setDeparture] = useState('todas')
  const today = new Date().toISOString().slice(0, 10)
  const filtered = reservations.filter((reservation) => {
    const searchable = `${reservation.id} ${reservation.nombre} ${reservation.email} ${reservation.promocion_nombre || ''}`.toLowerCase()
    const tourDate = String(reservation.fecha_tour).slice(0, 10)
    return searchable.includes(query.trim().toLowerCase())
      && (status === 'todas' || reservation.estado === status)
      && (departure === 'todas' || (departure === 'proximas' ? tourDate >= today : tourDate < today))
  })
  return <>
    <SectionHeading eyebrow="Actividad" title="Reservas" description="Consulta las reservas registradas y su estado." action={<button className="button button--quiet" onClick={() => window.location.reload()}><Download size={16} /> Actualizar</button>} />
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

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(product || { name: '', description: '', category: 'Aventura', price: '' })
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  function submit(event) {
    event.preventDefault()
    if (!form.name.trim() || Number(form.price) <= 0) return
    onSave({ ...form, id: product?.id, name: form.name.trim(), description: form.description.trim(), price: Number(form.price) })
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="modal" onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">{product ? 'Catálogo' : 'Nueva experiencia'}</span><h2>{product ? 'Editar producto' : 'Agregar producto'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
    <label className="field-label">Nombre de la experiencia<input required autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ej. Tour al oasis de Huacachina" /></label>
    <label className="field-label">Descripción<textarea rows="3" maxLength="2000" value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Describe la experiencia" /></label>
    <div className="form-grid"><label className="field-label">Categoría<select value={form.category} onChange={(event) => update('category', event.target.value)}><option>Aventura</option><option>Cultura</option><option>Naturaleza</option><option>Gastronomía</option></select></label><label className="field-label">Precio (S/)<input required min="0.01" max="99999999.99" type="number" step="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} placeholder="120.00" /></label></div>
    <div className="modal-actions"><button type="button" className="button button--quiet" onClick={onClose}>Cancelar</button><button className="button button--primary" type="submit"><Check size={16} /> {product ? 'Guardar cambios' : 'Crear producto'}</button></div>
  </form></div>
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
  const [employees, setEmployees] = useState([])
  const [customers, setCustomers] = useState([])
  const [productModal, setProductModal] = useState(null)
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
    if (['destinos', 'productos'].includes(item.id)) return canManageCatalog
    if (item.id === 'equipo') return isAdmin
    return !isEditor
  }) })).filter((group) => group.items.length)
  const currentNav = navGroups.flatMap((group) => group.items).find((item) => item.id === activePage)
  const PageIcon = currentNav?.icon || LayoutDashboard

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 3600)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    let current = true
    Promise.all([
      isEditor ? Promise.resolve({ summary: null }) : loadAdminResource('/summary'),
      isEditor ? Promise.resolve({ reservations: [] }) : loadAdminResource('/reservas'),
      isEditor ? Promise.resolve({ customers: [] }) : loadAdminResource('/clientes'),
      isAdmin ? loadAdminResource('/empleados') : Promise.resolve({ employees: [] }),
      canManageCatalog ? loadAdminResource('/promociones') : Promise.resolve({ promotions: [] }),
    ])
      .then(([summaryResult, reservationResult, customerResult, employeeResult, productResult]) => {
        if (!current) return
        setSummary(summaryResult.summary)
        setReservations(reservationResult.reservations || [])
        setCustomers(customerResult.customers || [])
        setEmployees(employeeResult.employees || [])
        setProducts((productResult.promotions || []).map((product) => ({
          id: product.id,
          name: product.nombre,
          description: product.descripcion,
          category: product.categoria,
          price: Number(product.precio),
          active: product.activo,
        })))
        setDashboardError('')
      })
      .catch((error) => {
        if (current) setDashboardError(error.message || 'No se pudieron cargar las métricas.')
      })
      .finally(() => {
        if (current) setDashboardLoading(false)
      })
    return () => { current = false }
  }, [canManageCatalog, isAdmin, isEditor])

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
    } catch (error) {
      setNotice(error.message)
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

  async function toggleProduct(product) {
    try {
      const result = await updateAdminResource(`/promociones/${product.id}`, {
        nombre: product.name,
        descripcion: product.description || '',
        categoria: product.category,
        precio: product.price,
        activo: !product.active,
      })
      const updated = { ...product, active: result.promotion.activo }
      setProducts((current) => current.map((item) => item.id === product.id ? updated : item))
      setNotice(updated.active ? 'Producto activado.' : 'Producto desactivado.')
    } catch (error) {
      setNotice(error.message)
    }
  }

  const pageContent = useMemo(() => {
    const changePage = (page) => { setActivePage(page); setMobileNav(false) }
    if (['destinos', 'productos'].includes(activePage) && canManageCatalog) return <CmsPanel key={activePage} kind={activePage === 'destinos' ? 'destinos' : 'promociones'} onCatalogChange={(rows) => setProducts(rows.map((record) => ({ id: record.id, name: record.nombre, description: record.descripcion, category: record.categoria, price: Number(record.precio), active: record.activo })))} />
    if (activePage === 'pedidos') return <OrdersPage reservations={reservations} />
    if (activePage === 'clientes') return <CustomersPage customers={customers} onNavigate={changePage} onStatusChange={changeCustomerStatus} onPointsChange={changeCustomerPoints} canManage={isAdmin} loading={dashboardLoading} />
    if (activePage === 'equipo') return <EmployeesPage employees={employees} onAdd={() => setEmployeeModal(true)} onUpdate={changeEmployee} currentUserId={user?.id} loading={dashboardLoading} />
    if (activePage === 'puntos') return <PointsPage customers={customers} />
    return <DashboardHome user={user} products={products} onNavigate={changePage} period={period} setPeriod={setPeriod} summary={summary} reservations={reservations} loading={dashboardLoading} error={dashboardError} />
  }, [activePage, canManageCatalog, customers, dashboardError, dashboardLoading, employees, isAdmin, period, products, reservations, summary, user])

  async function saveProduct(product) {
    try {
      const editing = Boolean(product.id)
      const result = await updateAdminResource(editing ? `/promociones/${product.id}` : '/promociones', {
        nombre: product.name,
        descripcion: product.description,
        categoria: product.category,
        precio: product.price,
        activo: product.active ?? true,
      }, editing ? 'PATCH' : 'POST')
      const record = result.promotion
      const saved = { id: record.id, name: record.nombre, description: record.descripcion, category: record.categoria, price: Number(record.precio), active: record.activo }
      setProducts((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current])
      setProductModal(null)
      setNotice(editing ? 'Producto actualizado.' : 'Producto creado.')
    } catch (error) {
      setNotice(error.message)
    }
  }

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

  return <div className={`admin-island ${dark ? 'admin-island--dark' : 'admin-island--light'}`}>
    <aside className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`}>
      <a className="sidebar-brand" href="../index.html"><img src="../assets/logoIcaTurismo.png" alt="" /><span>IcaTurismo<small>ADMINISTRACIÓN</small></span></a>
      <div className="workspace-switch"><span className="workspace-avatar">I</span><span><strong>IcaTurismo</strong><small>Panel de control</small></span><ChevronDown size={15} /></div>
      <nav className="side-nav" aria-label="Navegación del panel">
        {visibleNav.map((group) => <div className="nav-group" key={group.label}><span className="nav-group__label">{group.label}</span>{group.items.map(({ id, label, icon: Icon, count }) => <button className={`nav-link ${activePage === id ? 'nav-link--active' : ''}`} key={id} onClick={() => { setActivePage(id); setMobileNav(false) }}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{count && <span className="nav-count">{count}</span>}</button>)}</div>)}
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
        <div className="topbar-actions">
          <label className="global-search"><Search size={16} /><input placeholder="Buscar..." aria-label="Buscar" /><kbd>⌘ K</kbd></label>
          <button
            className="icon-button theme-button"
            onClick={() => {
              const next = !dark
              setDark(next)
              setNotice(saveSaved('icat_admin_theme', next) ? '' : 'No se pudo guardar el tema en este navegador.')
            }}
            aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {dark ? <Sparkles size={17} /> : <Activity size={17} />}
          </button>
          <button className="icon-button notification-button" aria-label="Notificaciones"><Bell size={17} /><i /></button>
          <span className="topbar-divider" />
          <Avatar initials={user?.nombre?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'AD'} tone="mint" />
        </div>
      </header>
      <div className="page-content" key={activePage}>{pageContent}</div>
      <footer className="dashboard-footer"><span>© 2026 IcaTurismo · Panel de administración</span><span><span className="online-dot" /> Todos los sistemas operativos</span></footer>
    </main>
    {productModal && <ProductModal product={productModal.product} onClose={() => setProductModal(null)} onSave={saveProduct} />}
    {employeeModal && <EmployeeModal onClose={() => setEmployeeModal(false)} onSave={saveEmployee} />}
    {notice && <div className="toast" role="status"><Check size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Cerrar notificación"><X size={15} /></button></div>}
  </div>
}
