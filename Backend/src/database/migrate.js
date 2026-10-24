const fs = require('node:fs');
const path = require('node:path');

async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(71202401)');
    await client.query(`CREATE TABLE IF NOT EXISTS cms_migrations (
      nombre TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const directory = path.join(__dirname, 'migrations');
    for (const filename of fs.readdirSync(directory).filter((name) => name.endsWith('.sql')).sort()) {
      const applied = await client.query('SELECT 1 FROM cms_migrations WHERE nombre = $1', [filename]);
      if (applied.rowCount) continue;
      await client.query(fs.readFileSync(path.join(directory, filename), 'utf8'));
      await client.query('INSERT INTO cms_migrations (nombre) VALUES ($1)', [filename]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

if (require.main === module) {
  require('dotenv').config();
  const { pool } = require('../config/database');
  migrate(pool).then(() => console.log('Migraciones CMS aplicadas.'))
    .catch((error) => { console.error('Migración CMS:', error.message); process.exitCode = 1; })
    .finally(() => pool.end());
}
module.exports = { migrate };
