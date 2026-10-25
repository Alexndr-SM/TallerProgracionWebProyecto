import { useEffect, useState } from 'react'
import { Activity, ArrowRight, ArrowUpRight, CalendarDays, Check, Compass, CreditCard, Download, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { cmsRequest } from './cmsApi.js'
import { downloadCSV, limaDate, pen, readableDate, trend } from './dashboardUtils.js'

function Metric({ label, value, detail, icon: Icon, tone, onClick }) {
  const Tag = onClick ? 'button' : 'article'
  return <Tag className={`dash-metric dash-metric--${tone || 'cyan'}`} {...(onClick ? { type: 'button', onClick } : {})}>
    <span className="dash-metric-top"><span className="dash-metric-icon"><Icon size={20} /></span><span>{label}</span><ArrowUpRight size={15} className="dash-metric-arrow" /></span>
    <strong>{value}</strong><small>{detail}</small>
  </Tag>
}

function Timeline({ daily, mode }) {
  const [active, setActive] = useState(null), [pinned, setPinned] = useState(null)
  const numeric = daily.map((day) => Number(mode === 'paid' ? day.paid : day.count))
  const max = Math.max(...numeric, 1)
  const points = daily.map((day, index) => ({ ...day, x: index * 720 / Math.max(daily.length - 1, 1), y: 190 - numeric[index] / max * 160 }))
  const selectedIndex = active ?? pinned
  const selected = points[selectedIndex]
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const labelIndices = [...new Set([0, Math.floor(daily.length / 4), Math.floor(daily.length / 2), Math.floor(daily.length * .75), daily.length - 1])]
  return <>
    <div className="dash-timeline" onMouseLeave={() => setActive(null)}>
      <div className="dash-axis-y">{[1, .75, .5, .25, 0].map((part) => <span key={part}>{mode === 'paid' ? new Intl.NumberFormat('es-PE', { notation: 'compact', maximumFractionDigits: 1 }).format(max * part) : Math.ceil(max * part)}</span>)}</div>
      <svg viewBox="-8 0 736 210" preserveAspectRatio="none" className="dash-chart" role="group" aria-label={mode === 'paid' ? 'Ingresos de reservas creadas por día. Usa Tab y Enter para fijar un día.' : 'Reservas por día. Usa Tab y Enter para fijar un día.'}>
        <defs><linearGradient id="dash-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--admin-accent)" stopOpacity=".35" /><stop offset="100%" stopColor="var(--admin-accent)" stopOpacity=".015" /></linearGradient></defs>
        {[30, 70, 110, 150, 190].map((y) => <line key={y} x1="0" x2="720" y1={y} y2={y} className="dash-chart-grid" />)}
        {points.length > 0 && <><path d={`${line} L720 190 L0 190 Z`} fill="url(#dash-area)" /><path d={line} className="dash-chart-line" /></>}
        {selected && <line x1={selected.x} x2={selected.x} y1="20" y2="190" className="dash-chart-guide" />}
        {points.map((point, index) => <g key={point.date} role="button" tabIndex={0} aria-label={`${readableDate(point.date)}: ${point.count} reservas, ${pen(point.paid)} pagados. Fijar día.`} aria-pressed={pinned === index} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} onClick={() => setPinned(pinned === index ? null : index)} onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPinned(pinned === index ? null : index) }
          if (event.key === 'Escape') { setPinned(null); setActive(null) }
          if (event.key === 'ArrowRight') { event.preventDefault(); event.currentTarget.nextElementSibling?.focus() }
          if (event.key === 'ArrowLeft') { event.preventDefault(); if (event.currentTarget.previousElementSibling?.getAttribute('role') === 'button') event.currentTarget.previousElementSibling.focus() }
        }}>
          <rect x={point.x - 360 / Math.max(points.length, 1)} y="10" width={720 / Math.max(points.length, 1)} height="190" fill="transparent" />
          <circle cx={point.x} cy={point.y} r={selectedIndex === index ? 5 : 3} className={`dash-chart-point ${selectedIndex === index ? 'is-active' : ''}`} />
        </g>)}
      </svg>
      {selected && <div className="dash-chart-tooltip" style={{ left: `${Math.max(18, Math.min(82, selected.x / 720 * 100))}%` }}><strong>{readableDate(selected.date)}</strong><span>{selected.count} reservas · {pen(selected.paid)}</span><small>{pinned === selectedIndex ? 'Día fijado · clic para soltar' : 'Clic para fijar el detalle'}</small></div>}
    </div>
    <div className="dash-axis-x">{labelIndices.filter((index) => daily[index]).map((index) => <span key={index}>{readableDate(daily[index].date)}</span>)}</div>
    <p className="dash-chart-hint">{selected ? `${readableDate(selected.date)} · ${selected.count} reservas · ${pen(selected.paid)} de reservas con pago confirmado.` : 'Pasa el mouse o recorre los puntos con Tab. Haz clic para fijar un día.'}</p>
  </>
}

export default function AdminDashboard({ user, summary, reservations, products, onNavigate, period, setPeriod, refreshVersion, loading: shellLoading, error: shellError, onRefresh }) {
  const [analytics, setAnalytics] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [mode, setMode] = useState('count'), [method, setMethod] = useState(null)
  useEffect(() => {
    const controller = new AbortController(); let current = true
    setLoading(true); setError(''); setAnalytics(null); setMethod(null)
    cmsRequest(`/admin/analytics?days=${period}`, { signal: controller.signal })
      .then((data) => { if (current) setAnalytics(data.analytics) })
      .catch((failure) => { if (current && failure.name !== 'AbortError') setError(failure.message) })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false; controller.abort() }
  }, [period, refreshVersion])
  const current = analytics?.current || {}, previous = analytics?.previous || {}
  const count = Number(current.reservations || 0), paid = Number(current.paid_revenue || 0)
  const pending = Number(summary?.reservations?.pendientes || 0)
  const methods = [{ id: 'tarjeta', name: 'Tarjeta', color: 'var(--admin-accent)' }, { id: 'paypal', name: 'PayPal', color: 'var(--admin-blue)' }, { id: 'yape', name: 'Yape / Plin', color: 'var(--admin-rose)' }].map((item) => ({ ...item, count: Number(analytics?.methods.find((row) => row.method === item.id)?.count || 0) }))
  let stop = 0
  const gradient = count ? methods.map((item) => { const start = stop; stop += item.count / count * 100; return `${item.color} ${start}% ${stop}%` }).join(',') : 'var(--admin-border) 0% 100%'
  const chosenMethod = methods.find((item) => item.id === method)
  const statuses = [{ name: 'Confirmadas', value: Number(current.confirmed || 0), state: 'confirmada', color: 'var(--admin-accent)' }, { name: 'Pendientes', value: count - Number(current.confirmed || 0) - Number(current.cancelled || 0), state: 'pendiente', color: 'var(--admin-blue)' }, { name: 'Canceladas', value: Number(current.cancelled || 0), state: 'cancelada', color: 'var(--admin-peach)' }]
  const firstName = user?.nombre?.trim().split(/\s+/)[0] || 'equipo'
  const today = new Date(`${analytics?.to || limaDate()}T12:00:00-05:00`)
  const busy = loading || shellLoading
  function exportDaily() {
    if (!analytics) return
    downloadCSV(`icaturismo-${analytics.from}-${analytics.to}.csv`, [['Fecha (Perú)', 'Reservas creadas', 'Ingresos de esas reservas con pago confirmado (PEN)'], ...analytics.daily.map((row) => [row.date, row.count, row.paid])])
  }
  return <div className="dash-home">
    <section className="dashboard-welcome"><div><p className="eyebrow"><CalendarDays size={15} /> {today.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' })}</p><h1>¡Hola, <span>{firstName}!</span></h1><p>Una nueva mirada a tus viajes, tu equipo y tus resultados.</p><span className="dash-period-label">{analytics ? `${readableDate(analytics.from)} — ${readableDate(analytics.to)}` : `Últimos ${period} días`} · Perú</span></div><div className="dash-welcome-actions"><span className={`dash-connection ${error || shellError ? 'is-error' : ''}`}><i />{busy ? 'Actualizando…' : error || shellError ? 'Revisar conexión' : 'Datos actualizados'}</span><button type="button" className="button button--quiet" onClick={onRefresh} disabled={busy}><RefreshCw size={15} />Actualizar</button></div></section>
    {(error || shellError) && <div className="dash-error" role="alert">{error || shellError}<button type="button" onClick={onRefresh}>Reintentar</button></div>}
    <div className="dash-metrics" aria-busy={busy}>
      <Metric label="Reservas del período" icon={CalendarDays} value={busy ? '—' : count.toLocaleString('es-PE')} detail={loading ? 'Consultando actividad…' : trend(count, previous.reservations)} onClick={() => onNavigate('pedidos')} />
      <Metric label="Por atender" icon={Users} tone="rose" value={shellLoading ? '—' : pending} detail="Reservas pendientes de atención" onClick={() => onNavigate('pedidos', { status: 'pendiente' })} />
      <Metric label="Clientes activos" icon={Activity} value={shellLoading ? '—' : Number(summary?.customers?.activos || 0)} detail={`${Number(summary?.customers?.total || 0)} cuentas registradas`} onClick={() => onNavigate('clientes')} />
      <Metric label="Equipo activo" icon={ShieldCheck} tone="sand" value={shellLoading ? '—' : Number(summary?.employees?.total || 0)} detail="Personal habilitado" onClick={user?.rol === 'admin' ? () => onNavigate('equipo') : undefined} />
      <Metric label="Ingresos del período" icon={CreditCard} tone="blue" value={loading ? '—' : pen(paid)} detail={loading ? 'Consultando ingresos…' : trend(paid, previous.paid_revenue)} onClick={() => onNavigate('pedidos')} />
    </div>
    <div className="dash-primary-grid">
      <section className="panel dash-line-panel"><div className="panel-heading"><div className="dash-panel-title"><span><CalendarDays size={19} /></span><div><h2>El pulso de tus reservas</h2><p>Actividad diaria · hora de Perú</p></div></div><select className="select select--small" value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Período del dashboard"><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option></select></div>
        <div className="dash-chart-toolbar"><div className="dash-chart-total"><strong>{loading ? '—' : mode === 'paid' ? pen(paid) : count}</strong><span>{mode === 'paid' ? 'pagos confirmados de reservas creadas en el período' : 'reservas en el período'}</span></div><div className="dash-segmented" role="group" aria-label="Métrica del gráfico"><button type="button" className={mode === 'count' ? 'is-active' : ''} aria-pressed={mode === 'count'} onClick={() => setMode('count')}>Reservas</button><button type="button" className={mode === 'paid' ? 'is-active' : ''} aria-pressed={mode === 'paid'} onClick={() => setMode('paid')}>Ingresos</button></div></div>
        {loading ? <div className="dash-chart-skeleton" role="status">Cargando el gráfico…</div> : analytics ? <Timeline key={`${period}-${mode}`} daily={analytics.daily} mode={mode} /> : <p className="empty-state">No se pudo cargar la actividad.</p>}
        <div className="dash-chart-footer"><span>Los ingresos corresponden a reservas con pago confirmado; el proyecto utiliza pagos de demostración.</span><button type="button" className="text-link" onClick={exportDaily} disabled={!analytics}><Download size={14} />CSV</button></div>
      </section>
      <section className="panel dash-channel-panel"><img className="dash-card-palm" src="../assets/admin/palm-cutout.png" alt="" aria-hidden="true" /><span className="dash-tiny-glint" aria-hidden="true" /><div className="panel-heading"><div className="dash-panel-title"><span><CreditCard size={19} /></span><div><h2>Reservas por método</h2><p>Forma de pago elegida · {period} días</p></div></div></div>
        <div className="dash-donut-wrap"><div className={`dash-donut ${chosenMethod ? 'is-selected' : ''}`} style={{ background: `conic-gradient(${gradient})` }} role="img" aria-label={methods.map((item) => `${item.name}: ${item.count} reservas`).join(', ')}><div><strong>{loading ? '—' : chosenMethod ? chosenMethod.count : count}</strong><span>{chosenMethod?.name || 'reservas'}</span></div></div></div>
        <div className="dash-method-legend">{methods.map((item) => <button type="button" key={item.id} aria-pressed={method === item.id} className={method === item.id ? 'is-active' : ''} onClick={() => setMethod(method === item.id ? null : item.id)} style={{ '--method-color': item.color }}><i /><span>{item.name}</span><small>{item.count}</small><strong>{count ? Math.round(item.count / count * 100) : 0}%</strong></button>)}</div><p className="dash-card-note">{chosenMethod ? `${chosenMethod.count} reservas eligieron ${chosenMethod.name}. Pulsa de nuevo para ver el total.` : 'Selecciona un método para ver su participación.'}</p>
      </section>
    </div>
    <div className="dash-secondary-grid">
      <section className="panel dash-status-panel"><div className="panel-heading"><div><h2>Cada reserva, en su momento</h2><p>Estados del período seleccionado</p></div><Check size={18} /></div><div className="dash-status-bars">{statuses.map((item) => <button key={item.state} type="button" onClick={() => onNavigate('pedidos', { status: item.state })}><span>{item.name}<strong>{loading ? '—' : item.value}</strong></span><span className="dash-bar-track"><i style={{ width: `${count ? item.value / count * 100 : 0}%`, background: item.color }} /></span></button>)}</div><div className="dash-inline-metrics"><span><strong>{Number(current.travelers || 0)}</strong> viajeros</span><span><strong>{count ? Math.round(Number(current.confirmed || 0) / count * 100) : 0}%</strong> confirmadas</span></div></section>
      <section className="panel dash-destinations-panel"><div className="panel-heading"><div><h2>Destinos que inspiran</h2><p>Más reservados · sin cancelaciones</p></div><Compass size={18} /></div><div className="dash-destination-bars">{analytics?.destinations.map((item, index) => <button type="button" key={item.id || 'archived'} disabled={!item.id || !['admin', 'editor'].includes(user?.rol)} onClick={() => onNavigate('productos', { destino_id: String(item.id) })}><span className="dash-rank">{String(index + 1).padStart(2, '0')}</span><span><span>{item.name}<strong>{item.count}</strong></span><span className="dash-bar-track"><i style={{ width: `${Number(item.count) / Math.max(...analytics.destinations.map((row) => Number(row.count)), 1) * 100}%` }} /></span></span></button>)}{!loading && !analytics?.destinations.length && <p className="empty-state">Tus primeras reservas darán vida a este gráfico.</p>}</div><p className="dash-card-note">{products.filter((item) => item.active).length} promociones publicadas en el catálogo.</p></section>
      <section className="panel dash-pipeline-panel"><span className="dash-panel-kicker">Un vistazo a lo que viene</span><h2>Tu próxima oportunidad</h2><strong className="dash-pipeline-amount">{loading ? '—' : pen(analytics?.pipeline.amount)}</strong><p>{Number(analytics?.pipeline.count || 0)} reservas activas con pago pendiente.</p><button type="button" className="button button--primary" onClick={() => onNavigate('pedidos')} disabled={loading}>Revisar reservas <ArrowRight size={15} /></button><small>Importe pendiente histórico; no representa ingresos cobrados.</small></section>
    </div>
    <div className="dash-bottom-grid"><section className="panel dash-recent-panel"><div className="panel-heading"><div><h2>Las últimas historias</h2><p>Reservas registradas recientemente</p></div><button type="button" className="text-link" onClick={() => onNavigate('pedidos')}>Ver todas <ArrowRight size={14} /></button></div><div className="dash-recent-list">{reservations.slice(0, 5).map((item) => <button type="button" key={item.id} onClick={() => onNavigate('pedidos', { id: item.id })}><span className="dash-person-avatar">{item.nombre?.slice(0, 1) || 'V'}</span><span><strong>{item.nombre}</strong><small>{item.promocion_nombre || 'Experiencia archivada'}</small></span><span className={`status status--${item.estado}`}>{item.estado}</span><b>{pen(item.total)}</b></button>)}{!reservations.length && <p className="empty-state">Todavía no hay reservas registradas.</p>}</div></section>
      <section className="panel dash-upcoming-panel"><div className="panel-heading"><div><h2>Rumbo a nuevas experiencias</h2><p>Próximas salidas reservadas</p></div><CalendarDays size={18} /></div>{analytics?.upcoming.map((item) => <button type="button" className="dash-departure" key={item.id} onClick={() => onNavigate('pedidos', { id: item.id })}><span className="dash-departure-date"><strong>{String(item.fecha_tour).slice(8, 10)}</strong><small>{readableDate(item.fecha_tour).split(' ').slice(1).join(' ')}</small></span><span><strong>{item.promocion_nombre || 'Experiencia archivada'}</strong><small>{item.asistentes} viajeros · {item.nombre}</small></span><ArrowUpRight size={15} /></button>)}{!loading && !analytics?.upcoming.length && <p className="empty-state">No hay salidas próximas por el momento.</p>}</section></div>
  </div>
}
