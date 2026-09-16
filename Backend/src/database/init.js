/**
 * Crea la tabla usuarios si no existe.
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function init() {
  try {
    await pool.query(SQL);
    console.log('Tabla "usuarios" lista.');
  } catch (err) {
    console.error('Error creando tabla:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();