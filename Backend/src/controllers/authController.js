const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = '7d'; // el login se mantiene 7 días

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, nombre: user.nombre },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/** POST /api/auth/register */
async function register(req, res) {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ ok: false, message: 'Faltan nombre, email o contraseña.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const exists = await query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ ok: false, message: 'Ese correo ya está registrado.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO usuarios (nombre, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, email, created_at`,
      [nombre.trim(), email.toLowerCase().trim(), password_hash]
    );

    const user = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({
      ok: true,
      message: 'Cuenta creada correctamente.',
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email },
    });
  } catch (err) {
    console.error('register:', err);
    return res.status(500).json({ ok: false, message: 'Error en el servidor.' });
  }
}

/** POST /api/auth/login */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'Email y contraseña son obligatorios.' });
    }

    const result = await query(
      'SELECT id, nombre, email, password_hash FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, message: 'Correo o contraseña incorrectos.' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ ok: false, message: 'Correo o contraseña incorrectos.' });
    }

    const token = signToken(user);

    return res.json({
      ok: true,
      message: 'Inicio de sesión correcto.',
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email },
    });
  } catch (err) {
    console.error('login:', err);
    return res.status(500).json({ ok: false, message: 'Error en el servidor.' });
  }
}

/** GET /api/auth/me  (requiere token) */
async function me(req, res) {
  return res.json({ ok: true, user: req.user });
}

module.exports = { register, login, me };