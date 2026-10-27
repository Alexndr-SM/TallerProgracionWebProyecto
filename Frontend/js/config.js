/**
 * URL de la API
 * Local:  http://localhost:3000
 * Render: https://TU-API.onrender.com
 *
 * Secretos (DATABASE_URL, JWT_SECRET) NO van aquí.
 * Van en Render → Environment Variables y en Backend/.env
 */
window.API_URL = window.API_URL || (['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3000'
  : 'https://icatursmo-api.onrender.com');
