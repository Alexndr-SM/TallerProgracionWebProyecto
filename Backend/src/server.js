/**
 * Servidor API IcaTurismo
 * Variables que debe definir Render (Environment Variables):
 *   DATABASE_URL  → Internal Database URL de PostgreSQL
 *   JWT_SECRET    → clave secreta larga
 *   CORS_ORIGIN   → URL de tu frontend (ej. https://tu-sitio.onrender.com)
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *                 → credenciales de Cloudinary (o CLOUDINARY_URL)
 *   NODE_ENV      → production
 *   PORT          → lo asigna Render solo; no hace falta ponerlo
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const commentRoutes = require('./routes/comment.routes');
const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CORS: permite el frontend ---
const allowed = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // Permite tools sin origin (Postman) y orígenes configurados
    if (!origin || allowed.includes('*') || allowed.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error('CORS bloqueado para: ' + origin));
  },
  credentials: true,
}));

app.use(express.json());

// Salud del servidor (para Render)
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch {
    res.status(500).json({ ok: false, db: 'error' });
  }
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);
app.use('/api/comentarios', commentRoutes);

// Crear tabla usuarios al arrancar (si no existe)
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL,
      email VARCHAR(180) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      rol VARCHAR(20) NOT NULL DEFAULT 'cliente',
      foto_perfil_url TEXT,
      foto_perfil_public_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'cliente';
  `);
  await pool.query(`
    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT,
      ADD COLUMN IF NOT EXISTS foto_perfil_public_id VARCHAR(255);
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comentarios (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      contenido VARCHAR(1000) NOT NULL,
      calificacion SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_comentarios_created_at
    ON comentarios (created_at DESC);
  `);
  console.log('Tablas usuarios y comentarios verificadas.');
}

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error('Falta JWT_SECRET en las variables de entorno.');
    process.exit(1);
  }

  try {
    await ensureTable();
  } catch (err) {
    console.error('No se pudo preparar la BD:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`API escuchando en puerto ${PORT}`);
  });
}

start();