/**
 * Conexión a PostgreSQL
 * Lee DATABASE_URL desde:
 *  - archivo .env en local (dotenv)
 *  - Environment Variables de Render en producción
 */
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: Falta la variable DATABASE_URL');
  console.error('Local: créala en backend/.env');
  console.error('Render: Environment → Add variable → DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  // En Render/Postgres cloud suele hacer falta SSL
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('Error inesperado en PostgreSQL:', err.message);
});

/** Ejecuta una consulta SQL */
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };