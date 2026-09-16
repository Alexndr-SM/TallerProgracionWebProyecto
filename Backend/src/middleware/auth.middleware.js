const jwt = require('jsonwebtoken');

/**
 * Verifica el header: Authorization: Bearer <token>
 * Si es válido, deja los datos del usuario en req.user
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, message: 'No autorizado. Inicia sesión.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      email: payload.email,
      nombre: payload.nombre,
    };
    next();
  } catch {
    return res.status(401).json({ ok: false, message: 'Sesión inválida o expirada.' });
  }
}

module.exports = { requireAuth };