/**
 * Conexión a PostgreSQL usando variables de Render:
 * DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE
 */
const { Pool } = require('pg');
require('dotenv').config();

const host = (process.env.DB_HOST || '').trim();
const port = (process.env.DB_PORT || '5432').trim();
const user = (process.env.DB_USER || '').trim();
const password = (process.env.DB_PASSWORD || '').trim();
const database = (process.env.DB_DATABASE || '').trim();

if (!host || !user || !password || !database) {
  console.error('Faltan variables de BD. Se necesitan:');
  console.error('DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE');
  process.exit(1);
}

const pool = new Pool({
  host,
  port: Number(port),
  user,
  password,
  database,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('Error PostgreSQL:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };