const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { once } = require('node:events');
const express = require('express'), jwt = require('jsonwebtoken');
const { migrate } = require('../src/database/migrate');
let PGlite;
try { ({ PGlite } = require('@electric-sql/pglite')); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }

test('analítica del panel: datos completos, fechas de Perú y permisos', { skip: PGlite ? false : 'Instala PGlite para verificar los agregados SQL.' }, async (t) => {
  process.env.JWT_SECRET = 'analytics-test-only-secret';
  const db = new PGlite();
  const query = async (sql, params) => { const result = params ? await db.query(sql, params) : (await db.exec(sql)).at(-1); return { rows: result.rows || [], rowCount: result.affectedRows || result.rows?.length || 0 }; };
  const pool = { query, connect: async () => ({ query, release() {} }) };
  const database = require.resolve('../src/config/database');
  require.cache[database] = { id: database, filename: database, loaded: true, exports: { pool, query } };
  await db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8')); await migrate(pool);
  await query("INSERT INTO usuarios(id,nombre,email,password_hash,rol) VALUES (1,'Admin','a@example.test','test','admin'),(2,'Cliente','c@example.test','test','cliente'),(3,'Editor','e@example.test','test','editor'),(4,'Soporte','s@example.test','test','soporte'),(5,'Registrador','r@example.test','test','registrador')");
  const app = express(); app.use(express.json()); app.use('/api/admin', require('../src/routes/admin.routes'));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await db.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(search = '', user = 1) { const response = await fetch(`${base}/api/admin/analytics${search}`, { headers: user ? { Authorization: `Bearer ${jwt.sign({ id: user }, process.env.JWT_SECRET)}` } : {} }); return { status: response.status, data: await response.json(), cache: response.headers.get('cache-control') }; }
  await t.test('solo los roles operativos acceden al histórico', async () => {
    assert.equal((await request('', null)).status, 401);
    for (const user of [2, 3]) assert.equal((await request('', user)).status, 403);
    for (const user of [1, 4, 5]) assert.equal((await request('', user)).status, 200);
    for (const value of ['0','-1','365','abc','30%20OR%201=1']) assert.equal((await request(`?days=${value}`)).status, 400);
    assert.equal((await request('?days[]=30')).status, 400);
  });
  await t.test('un período vacío no fabrica datos ni variaciones', async () => {
    const result = await request('?days=7'); assert.equal(result.cache, 'no-store');
    assert.equal(result.data.analytics.daily.length, 7); assert.equal(result.data.analytics.current.reservations, 0);
    assert.ok(result.data.analytics.daily.every((day) => day.count === 0 && Number(day.paid) === 0));
    assert.equal(result.data.analytics.pipeline.count, 0);
  });
  const promotion = (await query('SELECT id,destino_id FROM promociones ORDER BY id LIMIT 1')).rows[0];
  const day = (await query("SELECT (NOW() AT TIME ZONE 'America/Lima')::date::text AS date")).rows[0].date;
  await query(`INSERT INTO reservas(nombre,email,fecha_tour,asistentes,metodo_pago,promocion_id,promocion_nombre,precio_unitario,total,estado,estado_pago,created_at)
    SELECT 'Viajero','qa@example.test',$1::date+1,2,'tarjeta',$2,'Tour',50,100,'confirmada','pagado',
      ($1::date + time '10:00') AT TIME ZONE 'America/Lima' FROM generate_series(1,620)`, [day,promotion.id]);
  await query(`INSERT INTO reservas(nombre,email,fecha_tour,asistentes,metodo_pago,promocion_id,promocion_nombre,precio_unitario,total,estado,estado_pago,created_at)
    VALUES ('Previo','p@example.test',$1::date,1,'paypal',$2,'Tour',50,50,'confirmada','pagado',(($1::date-31)+time '12:00') AT TIME ZONE 'America/Lima'),
      ('Pendiente','d@example.test',$1::date+2,1,'yape',$2,'Tour',80,80,'pendiente','pendiente',($1::date + time '08:00') AT TIME ZONE 'America/Lima'),
      ('Cancelada','x@example.test',$1::date+2,1,'paypal',$2,'Tour',60,60,'cancelada','pendiente',($1::date + time '09:00') AT TIME ZONE 'America/Lima'),
      ('Límite Perú','l@example.test',$1::date-1,1,'tarjeta',$2,'Tour',20,20,'confirmada','pagado',($1::date + time '02:00') AT TIME ZONE 'UTC')`, [day,promotion.id]);
  await t.test('incluye más de 500 reservas y compara ventanas completas de 30 días', async () => {
    const { analytics } = (await request('?days=30')).data;
    assert.equal(analytics.current.reservations, 623); assert.equal(analytics.previous.reservations, 1);
    assert.equal(Number(analytics.current.paid_revenue), 62020); assert.equal(Number(analytics.previous.paid_revenue), 50);
    assert.equal(analytics.current.cancelled, 1); assert.equal(analytics.current.travelers, 1242);
    assert.equal(analytics.methods.reduce((total,item) => total + item.count,0), 623);
    assert.equal(analytics.destinations[0].count, 622);
    assert.equal(analytics.pipeline.count, 1); assert.equal(Number(analytics.pipeline.amount), 80);
    assert.equal(analytics.daily.length, 30); assert.equal(analytics.timezone, 'America/Lima'); assert.equal(analytics.to, day);
    assert.ok(analytics.upcoming.length <= 5); assert.ok(analytics.upcoming.every((row) => row.estado !== 'cancelada'));
  });
  await t.test('un registro a las 02:00 UTC pertenece al día anterior en Perú', async () => {
    const { analytics } = (await request('?days=7')).data;
    assert.equal(analytics.daily.at(-1).count, 622); assert.equal(analytics.daily.at(-2).count, 1);
    assert.equal(Number(analytics.daily.at(-2).paid), 20);
  });
});
