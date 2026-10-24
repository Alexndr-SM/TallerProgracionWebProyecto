export async function cmsRequest(path, options = {}) {
  const form = options.body instanceof FormData
  const response = await fetch(`${(window.API_URL || '').replace(/\/$/, '')}/api${path}`, {
    ...options, cache: 'no-store',
    headers: { ...(!form && options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${window.Auth?.getToken() || ''}`, ...options.headers },
    body: options.body === undefined ? undefined : form ? options.body : JSON.stringify(options.body),
  })
  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.ok) throw new Error(data.message || 'No se pudo completar la operación. Vuelve a intentarlo.')
  return data
}
