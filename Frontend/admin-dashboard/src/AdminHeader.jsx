import { useEffect, useId, useRef, useState } from 'react'
import { ArrowUpRight, Bell, CheckCheck, Compass, LogOut, Moon, RefreshCw, Search, Sun, X } from 'lucide-react'
import { normalized, pen, readableDate } from './dashboardUtils.js'

export default function AdminHeader({ user, navigation, products, reservations, customers, destinations, onNavigate, onRefresh, busy, dark, onTheme, updatedAt }) {
  const [query, setQuery] = useState(''), [notificationsOpen, setNotificationsOpen] = useState(false), [profileOpen, setProfileOpen] = useState(false)
  const search = useRef(null), searchInput = useRef(null), popover = useRef(null)
  const searchId = useId()
  const readKey = `icat_admin_read_${user?.id || 'team'}`
  const [seen, setSeen] = useState(() => { try { const value = JSON.parse(localStorage.getItem(readKey) || '[]'); return Array.isArray(value) ? value.slice(-200) : [] } catch { return [] } })
  const pages = navigation.flatMap((group) => group.items).map((item) => ({ key: `page-${item.id}`, label: item.label, detail: 'Sección del panel', page: item.id, target: {} }))
  const allowedPages = new Set(pages.map((page) => page.page))
  const records = [
    ...products.map((item) => ({ key: `product-${item.id}`, label: item.name, detail: `Promoción · ${pen(item.price)}`, page: 'productos', target: { query: item.name } })),
    ...destinations.map((item) => ({ key: `destination-${item.id}`, label: item.nombre, detail: 'Destino', page: 'destinos', target: { query: item.nombre } })),
    ...customers.map((item) => ({ key: `customer-${item.id}`, label: item.nombre, detail: item.email, page: 'clientes', target: { query: item.email } })),
    ...reservations.map((item) => ({ key: `reservation-${item.id}`, label: `Reserva #${item.id} · ${item.nombre}`, detail: item.promocion_nombre || 'Experiencia archivada', page: 'pedidos', target: { id: item.id } })),
  ].filter((item) => allowedPages.has(item.page))
  const results = query.trim() ? [...pages, ...records].filter((item) => normalized(`${item.label} ${item.detail}`).includes(normalized(query.trim()))).slice(0, 15) : pages
  const notifications = reservations.filter((item) => item.estado === 'pendiente').slice(0, 8).map((item) => ({ key: `pending-${item.id}-${item.estado}`, reservation: item, label: `Reserva #${item.id} por atender`, detail: `${item.nombre} · ${item.promocion_nombre || 'Experiencia archivada'}` }))
  const unread = notifications.filter((item) => !seen.includes(item.key)).length
  function remember(keys) { const next = [...new Set([...seen, ...keys])].slice(-200); setSeen(next); try { localStorage.setItem(readKey, JSON.stringify(next)) } catch { /* La lectura se conserva en esta sesión. */ } }
  function openSearch() { setQuery(''); setNotificationsOpen(false); setProfileOpen(false); if (!search.current.open) search.current.showModal(); searchInput.current?.focus() }
  function choose(item) { search.current.close(); onNavigate(item.page, item.target) }
  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch() }
      if (event.key === 'Escape') { setNotificationsOpen(false); setProfileOpen(false) }
    }
    const outside = (event) => { if (!popover.current?.contains(event.target)) { setNotificationsOpen(false); setProfileOpen(false) } }
    document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', outside)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', outside) }
    // El atajo abre el diálogo actual sin consultar datos nuevos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <div className="topbar-actions dash-header-actions" ref={popover}>
    <button type="button" className="global-search dash-search-trigger" onClick={openSearch} aria-label="Buscar en el panel (Ctrl K)"><Search size={16} /><span>Buscar en el panel…</span><kbd>⌘ K</kbd></button>
    <button type="button" className="icon-button" aria-label="Actualizar datos del panel" title={updatedAt ? `Actualizado a las ${new Date(updatedAt).toLocaleTimeString('es-PE', { timeZone: 'America/Lima' })}` : 'Actualizar datos'} disabled={busy} onClick={onRefresh}><RefreshCw size={17} className={busy ? 'dash-spin' : ''} /></button>
    <button type="button" className="icon-button theme-button" onClick={onTheme} aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
    <button type="button" className="icon-button notification-button" aria-label={`Notificaciones${unread ? `: ${unread} sin leer` : ''}`} aria-expanded={notificationsOpen} aria-controls={`${searchId}-notifications`} onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false) }}><Bell size={18} />{unread > 0 && <i />}</button>
    <a className="dash-topbar-logo" href="../index.html" target="_blank" rel="noopener noreferrer" aria-label="Abrir el sitio de IcaTurismo" title="IcaTurismo"><img src="../assets/logoIcaTurismo.svg" alt="" /></a>
    <button type="button" className="dash-profile-trigger" aria-label="Abrir menú del equipo" aria-expanded={profileOpen} onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false) }}>{user?.nombre?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || 'IT'}</button>
    {notificationsOpen && <section className="dash-header-popover dash-notifications" id={`${searchId}-notifications`} aria-label="Centro de notificaciones"><div className="dash-popover-heading"><div><strong>Tu centro de actividad</strong><small>{unread} avisos sin leer</small></div><button type="button" className="icon-button" onClick={() => setNotificationsOpen(false)} aria-label="Cerrar notificaciones"><X size={16} /></button></div><button type="button" className="dash-mark-read" onClick={() => remember(notifications.map((item) => item.key))} disabled={!unread}><CheckCheck size={15} />Marcar todas como leídas</button>{notifications.map((item) => <button type="button" key={item.key} className={`dash-notification-item ${seen.includes(item.key) ? 'is-read' : ''}`} onClick={() => { remember([item.key]); setNotificationsOpen(false); onNavigate('pedidos', { id: item.reservation.id }) }}><span /><span><strong>{item.label}</strong><small>{item.detail}</small><small>Salida: {readableDate(item.reservation.fecha_tour)}</small></span><ArrowUpRight size={15} /></button>)}{!notifications.length && <p className="dash-popover-empty">Todo al día. No hay reservas pendientes entre los registros recientes.</p>}<p className="dash-popover-footnote">Avisos de las reservas recientes cargadas. Se actualizan con el panel cada 60 segundos.</p></section>}
    {profileOpen && <section className="dash-header-popover dash-profile-popover" aria-label="Opciones del equipo"><div className="dash-popover-heading"><div><strong>{user?.nombre || 'Equipo'}</strong><small>{({ admin: 'Administrador', registrador: 'Registrador', soporte: 'Soporte', editor: 'Editor' })[user?.rol]}</small></div><button type="button" className="icon-button" onClick={() => setProfileOpen(false)} aria-label="Cerrar opciones del equipo"><X size={15} /></button></div><a href="perfil.html">Mi perfil <ArrowUpRight size={14} /></a><a href="../index.html" target="_blank" rel="noopener noreferrer">Visitar el sitio <Compass size={14} /></a><button type="button" onClick={() => window.Auth?.logout()}>Cerrar sesión <LogOut size={14} /></button></section>}
    <dialog ref={search} className="dash-search-dialog" aria-labelledby={searchId} onClick={(event) => { if (event.target === search.current) search.current.close() }}><div className="dash-search-dialog-heading"><Search size={20} /><label id={searchId} className="dash-sr-only" htmlFor={`${searchId}-input`}>Buscar secciones, clientes, destinos o reservas</label><input ref={searchInput} id={`${searchId}-input`} placeholder="¿Qué necesitas encontrar?" value={query} autoComplete="off" onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) { event.preventDefault(); choose(results[0]) } }} /><button type="button" className="icon-button" onClick={() => search.current.close()} aria-label="Cerrar búsqueda"><X size={19} /></button></div><div className="dash-search-results" aria-label="Resultados de búsqueda">{results.map((item) => <button type="button" key={item.key} onClick={() => choose(item)}><span className="dash-search-result-icon"><Search size={15} /></span><span><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowUpRight size={15} /></button>)}{!results.length && <p className="dash-popover-empty">No hay coincidencias. Prueba otro nombre o código.</p>}</div><p className="dash-search-hint">Búsqueda en las secciones y datos cargados de tu sesión · Enter abre el primer resultado · Esc cierra.</p></dialog>
  </div>
}
