import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import App from './App.jsx'

const container = document.querySelector('[data-admin-dashboard]')

if (container) {
  let root

  function mountDashboard(user) {
    if (root) return
    root = createRoot(container)
    root.render(
      <StrictMode>
        <App user={user} />
      </StrictMode>,
    )
  }

  function mountFromPage() {
    if (container.dataset.adminAuthorized !== 'true') return
    try {
      mountDashboard(JSON.parse(container.dataset.adminUser || 'null'))
    } catch (error) {
      console.error('No se pudo leer el usuario administrador.', error)
    }
  }

  container.addEventListener('admin:authorized', mountFromPage)
  mountFromPage()
}
