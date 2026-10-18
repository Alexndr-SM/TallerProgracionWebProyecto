/**
 * Conexión PostgreSQL mediante DATABASE_URL o DB_HOST, DB_PORT,
 * DB_USER, DB_PASSWORD y DB_DATABASE.
 */
const { Pool } = require('pg');
require('dotenv').config();

const host = (process.env.DB_HOST || '').trim();
const port = (process.env.DB_PORT || '5432').trim();
const user = (process.env.DB_USER || '').trim();
const password = (process.env.DB_PASSWORD || '').trim();
const database = (process.env.DB_DATABASE || '').trim();
const connectionString = (process.env.DATABASE_URL || '').trim();

if (!connectionString && (!host || !user || !password || !database)) {
  console.error('Faltan variables de BD. Se necesitan:');
  console.error('DATABASE_URL o DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_DATABASE');
  process.exit(1);
}

const pool = new Pool({
  ...(connectionString
    ? { connectionString }
    : { host, port: Number(port), user, password, database }),
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