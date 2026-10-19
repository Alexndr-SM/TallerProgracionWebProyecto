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
const reservationRoutes = require('./routes/reservation.routes');
const adminRoutes = require('./routes/admin.routes');
const promotionRoutes = require('./routes/promotion.routes');
const perfilRoutes = require('./routes/perfil.routes');
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

app.use('/api/auth', authRoutes);
app.use('/api/comentarios', commentRoutes);
app.use('/api/reservas', reservationRoutes);
app.use('/api/promociones', promotionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/perfil', perfilRoutes);

// Crear tabla usuarios al arrancar (si no existe)
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL,
      email VARCHAR(180) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      rol VARCHAR(20) NOT NULL DEFAULT 'cliente',
      estado_cuenta VARCHAR(20) NOT NULL DEFAULT 'activo',
      puntos INTEGER NOT NULL DEFAULT 0 CHECK (puntos >= 0),
      ultimo_acceso TIMESTAMPTZ,
      foto_perfil_url TEXT,
      foto_perfil_public_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'cliente',
    ADD COLUMN IF NOT EXISTS estado_cuenta VARCHAR(20) NOT NULL DEFAULT 'activo',
    ADD COLUMN IF NOT EXISTS puntos INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ;
  `);
  await pool.query(`
    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT,
      ADD COLUMN IF NOT EXISTS foto_perfil_public_id VARCHAR(255);
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_puntos_check' AND conrelid = 'usuarios'::regclass) THEN
        ALTER TABLE usuarios ADD CONSTRAINT usuarios_puntos_check CHECK (puntos >= 0);
      END IF;
    END $$;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS promociones (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(120) NOT NULL UNIQUE,
      nombre VARCHAR(180) NOT NULL,
      descripcion TEXT NOT NULL DEFAULT '',
      categoria VARCHAR(40) NOT NULL,
      precio NUMERIC(10, 2) NOT NULL CHECK (precio > 0),
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservas (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      nombre VARCHAR(120) NOT NULL,
      email VARCHAR(180) NOT NULL,
      fecha_tour DATE NOT NULL,
      asistentes SMALLINT NOT NULL CHECK (asistentes BETWEEN 1 AND 15),
      metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('tarjeta', 'paypal', 'yape')),
      estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')),
      promocion_id INTEGER REFERENCES promociones(id) ON DELETE SET NULL,
      promocion_nombre VARCHAR(180),
      precio_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
      total NUMERIC(12, 2) NOT NULL DEFAULT 0,
      estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_pago IN ('pendiente', 'pagado', 'reembolsado')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE reservas
      ALTER COLUMN usuario_id DROP NOT NULL;
  `);
  await pool.query(`
    ALTER TABLE reservas
      ADD COLUMN IF NOT EXISTS promocion_id INTEGER REFERENCES promociones(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS promocion_nombre VARCHAR(180),
      ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total NUMERIC(12, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente';
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_reservas_fecha_tour ON reservas (fecha_tour);
    CREATE INDEX IF NOT EXISTS idx_reservas_email ON reservas (email);
    CREATE INDEX IF NOT EXISTS idx_reservas_promocion_id ON reservas (promocion_id);
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
  // Tabla de historial de puntos de fidelización
  await pool.query(`
    CREATE TABLE IF NOT EXISTS puntos_historial (
      id          SERIAL PRIMARY KEY,
      usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      reserva_id  INTEGER REFERENCES reservas(id) ON DELETE SET NULL,
      tipo        VARCHAR(20) NOT NULL CHECK (tipo IN ('ganado', 'cancelado', 'canjeado', 'ajuste')),
      puntos      INTEGER NOT NULL CHECK (puntos > 0),
      descripcion VARCHAR(255) NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_puntos_historial_usuario
    ON puntos_historial (usuario_id, created_at DESC);
  `);
  console.log('Tablas usuarios, promociones, reservas, comentarios y puntos_historial verificadas.');
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
