/**
 * Crea las tablas de usuarios y comentarios si no existen.
 * Uso local:  pnpm run db:init
 * En Render puedes ejecutarla una vez por consola o al arrancar el server.
 */
require('dotenv').config();
const { pool } = require('../config/database');

const SQL = `
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
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'cliente',
  ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_perfil_public_id VARCHAR(255);
CREATE TABLE IF NOT EXISTS comentarios (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  contenido VARCHAR(1000) NOT NULL,
  calificacion SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comentarios_created_at
  ON comentarios (created_at DESC);
CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  fecha_tour DATE NOT NULL,
  asistentes SMALLINT NOT NULL CHECK (asistentes BETWEEN 1 AND 15),
  metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('tarjeta', 'paypal', 'yape')),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha_tour ON reservas (fecha_tour);
CREATE INDEX IF NOT EXISTS idx_reservas_email ON reservas (email);
`;

async function init() {
  try {
    await pool.query(SQL);
    console.log('Tablas "usuarios", "reservas" y "comentarios" listas.');
  } catch (err) {
    console.error('Error creando tabla:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();