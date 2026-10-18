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

const seedProducts = [
  { id: 'P-1042', name: 'Aventura en las dunas', category: 'Aventura', price: 145, stock: 28, sold: 86, status: 'Activo', color: 'sand' },
  { id: 'P-1038', name: 'Ruta de bodegas de Ica', category: 'Cultura', price: 95, stock: 34, sold: 72, status: 'Activo', color: 'wine' },
  { id: 'P-1024', name: 'Islas Ballestas + Paracas', category: 'Naturaleza', price: 180, stock: 19, sold: 64, status: 'Activo', color: 'sea' },
  { id: 'P-1019', name: 'Museo Regional de Ica', category: 'Cultura', price: 38, stock: 42, sold: 51, status: 'Activo', color: 'clay' },
  { id: 'P-1008', name: 'Sandboard al atardecer', category: 'Aventura', price: 120, stock: 6, sold: 43, status: 'Poco stock', color: 'sunset' },
]

const seedEmployees = [
  { id: 'EMP-01', name: 'Mariana Torres', email: 'mariana@icaturismo.com', role: 'Administrador', status: 'Activo', initials: 'MT', tone: 'mint' },
  { id: 'EMP-02', name: 'Diego Ramírez', email: 'diego@icaturismo.com', role: 'Editor', status: 'Activo', initials: 'DR', tone: 'peach' },
  { id: 'EMP-03', name: 'Lucía Salas', email: 'lucia@icaturismo.com', role: 'Soporte', status: 'Activo', initials: 'LS', tone: 'lilac' },
]

const customers = [
  { name: 'Camila Mendoza', email: 'camila.m@email.com', since: '18 oct, 2026', orders: 8, points: 1240, initials: 'CM', tone: 'mint' },
  { name: 'Andrés Flores', email: 'andres.f@email.com', since: '17 oct, 2026', orders: 5, points: 860, initials: 'AF', tone: 'peach' },
  { name: 'Valeria Rojas', email: 'valeria.r@email.com', since: '16 oct, 2026', orders: 12, points: 2100, initials: 'VR', tone: 'lilac' },
  { name: 'Mateo Castillo', email: 'mateo.c@email.com', since: '15 oct, 2026', orders: 3, points: 420, initials: 'MC', tone: 'blue' },
  { name: 'Sofía Herrera', email: 'sofia.h@email.com', since: '14 oct, 2026', orders: 6, points: 980, initials: 'SH', tone: 'rose' },
]

const navGroups = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
      { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag, count: '12' },
      { id: 'clientes', label: 'Clientes', icon: Users },
      { id: 'productos', label: 'Productos', icon: Package },
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
  const bestSellers = [...products].sort((a, b) => b.sold - a.sold).slice(0, 3)
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
            {bestSellers.map((product, index) => <div className="best-item" key={product.id}><span className={`product-thumb product-thumb--${product.color}`}><Compass size={18} /></span><div className="best-item__name"><strong>{product.name}</strong><span>{product.sold} reservas</span></div><span className="best-item__rank"><Star size={13} fill="currentColor" /> #{index + 1}</span></div>)}
          </div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--lower">
        <section className="panel renewals-panel">
          <div className="panel-heading"><div><h2>Próximos eventos</h2><p>Salidas y experiencias programadas</p></div><button className="text-link" onClick={() => onNavigate('pedidos')}>Calendario <ArrowRight size={15} /></button></div>
          <div className="event-row"><span className="event-date"><b>19</b><small>OCT</small></span><div><strong>Atardecer en Huacachina</strong><span>12 viajeros · 4:30 p. m.</span></div><span className="event-status">Mañana</span></div>
          <div className="event-row"><span className="event-date"><b>21</b><small>OCT</small></span><div><strong>Ruta de bodegas tradicionales</strong><span>8 viajeros · 9:00 a. m.</span></div><span className="event-status event-status--muted">En 3 días</span></div>
          <div className="event-row"><span className="event-date"><b>23</b><small>OCT</small></span><div><strong>Paracas y las Islas Ballestas</strong><span>16 viajeros · 7:00 a. m.</span></div><span className="event-status event-status--muted">En 5 días</span></div>
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

function ProductsPage({ products, onAdd, onEdit, onDelete }) {
  const [query, setQuery] = useState('')
  const filtered = products.filter((product) => `${product.name} ${product.category} ${product.id}`.toLowerCase().includes(query.toLowerCase()))
  return <>
    <SectionHeading eyebrow="Catálogo" title="Productos y experiencias" description="Administra tus experiencias, precios y disponibilidad." action={<button className="button button--primary" onClick={() => onAdd()}><Plus size={16} /> Nuevo producto</button>} />
    <div className="catalog-summary">
      <div><span>Productos activos</span><strong>{products.length}</strong></div><div><span>Reservas este mes</span><strong>316</strong></div><div><span>Stock por revisar</span><strong>{products.filter((product) => product.stock < 10).length}</strong></div>
    </div>
    <section className="panel table-panel">
      <div className="table-toolbar"><div><h2>Todos los productos</h2><span>{filtered.length} experiencias</span></div><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto..." /></label></div>
      <div className="table-scroll"><table><thead><tr><th>Experiencia</th><th>Categoría</th><th>Precio</th><th>Reservas</th><th>Disponibilidad</th><th>Estado</th><th /></tr></thead><tbody>
        {filtered.map((product) => <tr key={product.id}><td><div className="table-product"><span className={`product-thumb product-thumb--${product.color}`}><Compass size={17} /></span><div><strong>{product.name}</strong><small>{product.id}</small></div></div></td><td>{product.category}</td><td className="table-strong">{money(product.price)}</td><td>{product.sold}</td><td><div className="stock-cell"><span>{product.stock} cupos</span><span className="stock-track"><i style={{ width: `${Math.min(product.stock * 2, 100)}%` }} /></span></div></td><td><span className={`status ${product.status === 'Activo' ? 'status--confirmado' : 'status--pendiente'}`}>{product.status}</span></td><td><div className="row-actions"><button className="icon-button" onClick={() => onEdit(product)} aria-label={`Editar ${product.name}`}><Settings size={15} /></button><button className="icon-button icon-button--danger" onClick={() => onDelete(product.id)} aria-label={`Eliminar ${product.name}`}><X size={15} /></button></div></td></tr>)}
      </tbody></table>{filtered.length === 0 && <p className="empty-state">No encontramos productos con esa búsqueda.</p>}</div>
    </section>
  </>
}

function EmployeesPage({ employees, onAdd, onRoleChange }) {
  return <>
    <SectionHeading eyebrow="Administración" title="Equipo y permisos" description="Invita a tu equipo y define qué puede hacer cada persona." action={<button className="button button--primary" onClick={onAdd}><Plus size={16} /> Nuevo empleado</button>} />
    <div className="permission-notice"><ShieldCheck size={18} /><p><strong>Administración segura.</strong> El acceso real se valida en el servidor. Estas invitaciones y permisos son una vista previa local hasta conectar la gestión de usuarios.</p></div>
    <div className="catalog-summary"><div><span>Miembros del equipo</span><strong>{employees.length}</strong></div><div><span>Administradores</span><strong>{employees.filter((employee) => employee.role === 'Administrador').length}</strong></div><div><span>Invitaciones pendientes</span><strong>{employees.filter((employee) => employee.status === 'Invitación').length}</strong></div></div>
    <section className="panel table-panel">
      <div className="table-toolbar"><div><h2>Mi equipo</h2><span>Miembros y nivel de acceso</span></div><span className="secure-label"><ShieldCheck size={15} /> Acceso protegido</span></div>
      <div className="table-scroll"><table><thead><tr><th>Empleado</th><th>Permiso</th><th>Estado</th><th>Última actividad</th><th /></tr></thead><tbody>
        {employees.map((employee) => <tr key={employee.id}><td><div className="table-person"><Avatar initials={employee.initials} tone={employee.tone} /><div><strong>{employee.name}</strong><small>{employee.email}</small></div></div></td><td><select className="role-select" value={employee.role} onChange={(event) => onRoleChange(employee.id, event.target.value)} aria-label={`Permiso para ${employee.name}`}><option>Administrador</option><option>Editor</option><option>Soporte</option></select></td><td><span className={`status ${employee.status === 'Activo' ? 'status--confirmado' : 'status--pendiente'}`}>{employee.status}</span></td><td className="muted-cell">Hoy, 9:24 a. m.</td><td><button className="icon-button" aria-label={`Más opciones para ${employee.name}`}><Ellipsis size={17} /></button></td></tr>)}
      </tbody></table></div>
    </section>
  </>
}

function CustomersPage({ onNavigate }) {
  return <>
    <SectionHeading eyebrow="Comunidad" title="Clientes" description="Conoce a las personas que viajan con nosotros." action={<button className="button button--quiet" onClick={() => onNavigate('puntos')}><Sparkles size={16} /> Programa de puntos</button>} />
    <div className="catalog-summary"><div><span>Clientes totales</span><strong>1,284</strong></div><div><span>Nuevos este mes</span><strong>86</strong></div><div><span>Clientes frecuentes</span><strong>312</strong></div></div>
    <section className="panel table-panel"><div className="table-toolbar"><div><h2>Clientes recientes</h2><span>Últimas personas en unirse</span></div><label className="search-box"><Search size={16} /><input placeholder="Buscar cliente..." /></label></div><div className="table-scroll"><table><thead><tr><th>Cliente</th><th>Se unió</th><th>Pedidos</th><th>Puntos acumulados</th><th>Actividad</th></tr></thead><tbody>
      {customers.map((customer) => <tr key={customer.email}><td><div className="table-person"><Avatar initials={customer.initials} tone={customer.tone} /><div><strong>{customer.name}</strong><small>{customer.email}</small></div></div></td><td>{customer.since}</td><td>{customer.orders} pedidos</td><td className="table-strong">{customer.points.toLocaleString('es-PE')} pts</td><td><span className="activity-label"><span /> Activo</span></td></tr>)}
    </tbody></table></div></section>
    <div className="coming-note"><Sparkles size={18} /><div><strong>Fidelización en camino</strong><span>Pronto podrás recompensar las compras y reservas de tus clientes con puntos.</span></div><button className="text-link" onClick={() => onNavigate('puntos')}>Ver detalles <ArrowRight size={15} /></button></div>
  </>
}

function OrdersPage({ reservations }) {
  const [query, setQuery] = useState('')
  const filtered = reservations.filter((reservation) => `${reservation.id} ${reservation.nombre} ${reservation.email} ${reservation.promocion_nombre || ''}`.toLowerCase().includes(query.toLowerCase()))
  return <>
    <SectionHeading eyebrow="Actividad" title="Reservas" description="Consulta las reservas registradas y su estado." action={<button className="button button--quiet" onClick={() => window.location.reload()}><Download size={16} /> Actualizar</button>} />
    <div className="catalog-summary"><div><span>Reservas registradas</span><strong>{reservations.length}</strong></div><div><span>Por atender</span><strong>{reservations.filter((reservation) => reservation.estado === 'pendiente').length}</strong></div><div><span>Ingresos pagados</span><strong>{money(reservations.filter((reservation) => reservation.estado_pago === 'pagado').reduce((sum, reservation) => sum + Number(reservation.total || 0), 0))}</strong></div></div>
    <section className="panel table-panel"><div className="table-toolbar"><div><h2>Reservas recientes</h2><span>{filtered.length} registros</span></div><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar reserva o cliente..." /></label></div><div className="table-scroll"><table><thead><tr><th>Reserva</th><th>Cliente</th><th>Experiencia</th><th>Fecha del tour</th><th>Total</th><th>Estado</th><th>Pago</th></tr></thead><tbody>{filtered.map((reservation) => <tr key={reservation.id}><td className="table-strong">#{reservation.id}</td><td><div className="table-person"><strong>{reservation.nombre}</strong><small>{reservation.email}</small></div></td><td>{reservation.promocion_nombre || 'Reserva de tour'}</td><td>{new Date(`${reservation.fecha_tour}T00:00:00`).toLocaleDateString('es-PE')}</td><td className="table-strong">{money(reservation.total)}</td><td><span className={`status status--${reservation.estado}`}>{reservation.estado}</span></td><td><span className={`status status--${reservation.estado_pago}`}>{reservation.estado_pago}</span></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="empty-state">No hay reservas que coincidan.</p>}</div></section>
  </>
}

function PointsPage() {
  return <>
    <SectionHeading eyebrow="Fidelización" title="Puntos y beneficios" description="Una nueva forma de agradecer cada viaje. Estamos preparando esta experiencia." />
    <section className="points-hero panel"><div className="points-hero__content"><span className="points-chip"><Sparkles size={14} /> PRÓXIMAMENTE</span><h2>Cada aventura<br />merece una recompensa.</h2><p>Un programa de puntos para que tus clientes sumen en cada compra y los canjeen por nuevas experiencias en Ica.</p><div className="points-steps"><span><b>01</b> Compra una experiencia</span><span><b>02</b> Acumula puntos</span><span><b>03</b> Canjea un viaje</span></div></div><div className="points-card"><span className="points-card__brand"><Compass size={18} /> ICA CLUB</span><Sparkles className="points-card__sparkle" size={27} /><strong>1,240</strong><span>puntos disponibles</span><div className="points-progress"><i /></div><small>Te faltan 260 pts para tu recompensa</small></div></section>
    <div className="catalog-summary points-stats"><div><span>Clientes que participarían</span><strong>1,284</strong></div><div><span>Puntos estimados en circulación</span><strong>248 mil</strong></div><div><span>Recompensa más popular</span><strong className="stat-text">Tour a Huacachina</strong></div></div>
    <section className="panel points-note"><div className="points-note__icon"><CircleHelp size={18} /></div><div><h2>¿Qué sigue?</h2><p>Esta pantalla es una propuesta visual. La asignación y el canje de puntos requerirán definir reglas de negocio y conectarse a la base de datos en una siguiente etapa.</p></div></section>
  </>
}

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(product || { name: '', category: 'Aventura', price: '', stock: '', sold: 0, status: 'Activo', color: 'sand' })
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  function submit(event) {
    event.preventDefault()
    if (!form.name.trim() || Number(form.price) <= 0 || Number(form.stock) < 0) return
    onSave({ ...form, id: product?.id || `P-${Date.now().toString().slice(-5)}`, price: Number(form.price), stock: Number(form.stock), sold: Number(form.sold) || 0 })
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="modal" onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">{product ? 'Catálogo' : 'Nueva experiencia'}</span><h2>{product ? 'Editar producto' : 'Agregar producto'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
    <label className="field-label">Nombre de la experiencia<input required autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ej. Tour al oasis de Huacachina" /></label>
    <div className="form-grid"><label className="field-label">Categoría<select value={form.category} onChange={(event) => update('category', event.target.value)}><option>Aventura</option><option>Cultura</option><option>Naturaleza</option><option>Gastronomía</option></select></label><label className="field-label">Precio (S/)<input required min="1" type="number" step="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} placeholder="120.00" /></label><label className="field-label">Cupos disponibles<input required min="0" type="number" value={form.stock} onChange={(event) => update('stock', event.target.value)} placeholder="20" /></label><label className="field-label">Estado<select value={form.status} onChange={(event) => update('status', event.target.value)}><option>Activo</option><option>Poco stock</option></select></label></div>
    <div className="modal-actions"><button type="button" className="button button--quiet" onClick={onClose}>Cancelar</button><button className="button button--primary" type="submit"><Check size={16} /> {product ? 'Guardar cambios' : 'Crear producto'}</button></div>
  </form></div>
}

function EmployeeModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'Editor' })
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Ingresa un nombre y un correo electrónico válido.')
      return
    }
    onSave(form)
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="modal" onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">Administración</span><h2>Invitar empleado</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
    <p className="modal-description">Crea una invitación de demostración y asigna su nivel de acceso.</p>
    <label className="field-label">Nombre completo<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre y apellido" /></label>
    <label className="field-label">Correo electrónico<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="nombre@icaturismo.com" /></label>
    <label className="field-label">Permisos<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option>Editor</option><option>Soporte</option><option>Administrador</option></select></label>
    {form.role === 'Administrador' && <div className="admin-warning"><ShieldCheck size={16} /> Tendrá acceso administrativo completo (solo vista previa local).</div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="modal-actions"><button type="button" className="button button--quiet" onClick={onClose}>Cancelar</button><button className="button button--primary" type="submit"><Plus size={16} /> Crear invitación</button></div>
  </form></div>
}

export default function App({ user }) {
  const [activePage, setActivePage] = useState('dashboard')
  const [products, setProducts] = useState(() => readSaved('icat_admin_products', seedProducts))
  const [employees, setEmployees] = useState(() => readSaved('icat_admin_employees', seedEmployees))
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
  const currentNav = navGroups.flatMap((group) => group.items).find((item) => item.id === activePage)
  const PageIcon = currentNav?.icon || LayoutDashboard

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 3600)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    let current = true
    Promise.all([loadAdminResource('/summary'), loadAdminResource('/reservas')])
      .then(([summaryResult, reservationResult]) => {
        if (!current) return
        setSummary(summaryResult.summary)
        setReservations(reservationResult.reservations || [])
        setDashboardError('')
      })
      .catch((error) => {
        if (current) setDashboardError(error.message || 'No se pudieron cargar las métricas.')
      })
      .finally(() => {
        if (current) setDashboardLoading(false)
      })
    return () => { current = false }
  }, [])

  const pageContent = useMemo(() => {
    const changePage = (page) => { setActivePage(page); setMobileNav(false) }
    if (activePage === 'productos') return <ProductsPage products={products} onAdd={() => setProductModal({ mode: 'add' })} onEdit={(product) => setProductModal({ mode: 'edit', product })} onDelete={(id) => { const updated = products.filter((item) => item.id !== id); setProducts(updated); setNotice(saveSaved('icat_admin_products', updated) ? 'Producto eliminado de la vista previa.' : 'No se pudo guardar el catálogo en este navegador.') }} />
    if (activePage === 'pedidos') return <OrdersPage reservations={reservations} />
    if (activePage === 'clientes') return <CustomersPage onNavigate={changePage} />
    if (activePage === 'equipo') return <EmployeesPage employees={employees} onAdd={() => setEmployeeModal(true)} onRoleChange={(id, role) => { const updated = employees.map((employee) => employee.id === id ? { ...employee, role } : employee); setEmployees(updated); setNotice(saveSaved('icat_admin_employees', updated) ? 'Permiso actualizado en esta vista previa.' : 'No se pudo guardar el equipo en este navegador.') }} />
    if (activePage === 'puntos') return <PointsPage />
    return <DashboardHome user={user} products={products} onNavigate={changePage} period={period} setPeriod={setPeriod} summary={summary} reservations={reservations} loading={dashboardLoading} error={dashboardError} />
  }, [activePage, dashboardError, dashboardLoading, employees, period, products, reservations, summary, user])

  function saveProduct(product) {
    const updated = productModal.mode === 'edit' ? products.map((item) => item.id === product.id ? product : item) : [product, ...products]
    setProducts(updated)
    setProductModal(null)
    const message = productModal.mode === 'edit' ? 'Producto actualizado.' : 'Producto agregado al catálogo.'
    setNotice(saveSaved('icat_admin_products', updated) ? message : 'No se pudo guardar el catálogo en este navegador.')
  }

  function saveEmployee(data) {
    const nameParts = data.name.trim().split(/\s+/)
    const initials = nameParts.length > 1 ? `${nameParts[0][0]}${nameParts.at(-1)[0]}` : nameParts[0].slice(0, 2)
    const updated = [{ id: `EMP-${Date.now().toString().slice(-4)}`, name: data.name.trim(), email: data.email.trim(), role: data.role, status: 'Invitación', initials: initials.toUpperCase(), tone: 'blue' }, ...employees]
    setEmployees(updated)
    setEmployeeModal(false)
    setNotice(saveSaved('icat_admin_employees', updated) ? 'Invitación de demostración creada. Aún no se envió ningún correo.' : 'No se pudo guardar el equipo en este navegador.')
  }

  return <div className={`admin-island ${dark ? 'admin-island--dark' : 'admin-island--light'}`}>
    <aside className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`}>
      <a className="sidebar-brand" href="../index.html"><img src="../assets/logoIcaTurismo.png" alt="" /><span>IcaTurismo<small>ADMINISTRACIÓN</small></span></a>
      <div className="workspace-switch"><span className="workspace-avatar">I</span><span><strong>IcaTurismo</strong><small>Panel de control</small></span><ChevronDown size={15} /></div>
      <nav className="side-nav" aria-label="Navegación del panel">
        {navGroups.map((group) => <div className="nav-group" key={group.label}><span className="nav-group__label">{group.label}</span>{group.items.map(({ id, label, icon: Icon, count }) => <button className={`nav-link ${activePage === id ? 'nav-link--active' : ''}`} key={id} onClick={() => { setActivePage(id); setMobileNav(false) }}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{count && <span className="nav-count">{count}</span>}</button>)}</div>)}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-promo"><Sparkles size={17} /><span><strong>Un programa de puntos</strong><small>Fideliza a tus viajeros.</small></span><button onClick={() => setActivePage('puntos')} aria-label="Ver programa de puntos"><ArrowRight size={16} /></button></div><button className="nav-link sidebar-help"><CircleHelp size={17} /><span>Centro de ayuda</span></button><div className="sidebar-user"><Avatar initials={user?.nombre?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'AD'} tone="mint" /><span><strong>{user?.nombre || 'Administrador'}</strong><small>Administrador</small></span><button className="icon-button" title="Cerrar sesión" onClick={() => window.Auth?.logout()}><LogOut size={16} /></button></div></div>
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
