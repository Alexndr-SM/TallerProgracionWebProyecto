const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * Verifica el header: Authorization: Bearer <token>
 * Si es válido, deja los datos del usuario en req.user
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, message: 'No autorizado. Inicia sesión.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ ok: false, message: 'Sesión inválida o expirada.' });
  }

  try {
    const result = await query(
      'SELECT id, email, nombre, rol, estado_cuenta FROM usuarios WHERE id = $1',
      [payload.id]
    );
    const user = result.rows[0];
    if (!user || user.estado_cuenta !== 'activo') {
      return res.status(401).json({ ok: false, message: 'La cuenta está inactiva o ya no existe.' });
    }
    req.user = user;
    return next();
  } catch (error) {
    console.error('requireAuth:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo validar la sesión.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.rol === 'admin') {
    return next();
  }

  return res.status(403).json({
    ok: false,
    message: 'Acceso denegado. Se requieren permisos de administrador.',
  });
}

function requireRole(...roles) {
  return function roleMiddleware(req, res, next) {
    if (req.user && roles.includes(req.user.rol)) {
      return next();
    }
    return res.status(403).json({
      ok: false,
      message: 'Acceso denegado. Tu rol no tiene permiso para esta acción.',
    });
  };
}

module.exports = { requireAuth, requireAdmin, requireRole };