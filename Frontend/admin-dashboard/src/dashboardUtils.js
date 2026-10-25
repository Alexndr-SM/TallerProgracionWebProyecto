export const limaDate = (value = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
export const pen = (value) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 2 }).format(Number(value || 0))
export const readableDate = (value) => new Date(`${String(value).slice(0, 10)}T12:00:00-05:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', timeZone: 'America/Lima' })
export const normalized = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export function trend(current, previous) {
  if (!Number(previous)) return Number(current) ? 'Nuevo en este período' : 'Sin variación'
  const change = (Number(current) - Number(previous)) / Number(previous) * 100
  return `${change > 0 ? '+' : ''}${change.toLocaleString('es-PE', { maximumFractionDigits: 1 })}% vs. período anterior`
}
export function downloadCSV(filename, rows) {
  const escaped = rows.map((row) => row.map((cell) => {
    let value = String(cell ?? '')
    if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`
    return `"${value.replace(/"/g, '""')}"`
  }).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', escaped], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
