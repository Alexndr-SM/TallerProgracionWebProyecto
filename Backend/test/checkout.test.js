const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const express = require('express');
const jwt = require('jsonwebtoken');
const { migrate } = require('../src/database/migrate');
let PGlite;
try { ({ PGlite } = require('@electric-sql/pglite')); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }

test('carrito: reserva, pago ficticio, cancelación y propiedad de los datos', { skip: PGlite ? false : 'Instala PGlite para comprobar el carrito con PostgreSQL efímero.' }, async (t) => {
  process.env.JWT_SECRET = 'checkout-test-only-secret';
  const db = new PGlite();
  const query = async (sql, params) => {
    const result = params ? await db.query(sql, params) : (await db.exec(sql)).at(-1);
    return { rows: result.rows || [], rowCount: result.affectedRows || result.rows?.length || 0 };
  };
  const pool = { query, connect: async () => ({ query, release() {} }) };
  const databasePath = require.resolve('../src/config/database');
  require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: { query, pool } };
  await db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));
  await migrate(pool);
  await query("INSERT INTO usuarios(id,nombre,email,password_hash) VALUES (1,'Viajero','viajero@example.test','test-only'),(2,'Otro','otro@example.test','test-only')");
  const promotion = (await query('SELECT id,precio FROM promociones WHERE activo=TRUE ORDER BY id LIMIT 1')).rows[0];
  const app = express(); app.use(express.json());
  app.use('/api/reservas', require('../src/routes/reservation.routes'));
  app.use('/api/perfil', require('../src/routes/perfil.routes'));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await db.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(route, method = 'GET', body, user = 1) {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign({ id: user }, process.env.JWT_SECRET)}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json() };
  }
  const payload = { promocion_id: promotion.id, asistentes: 2, fecha_tour: '2099-01-15', metodo_pago: 'yape', total: 0.01 };
  let reservation;
  await t.test('el servidor calcula el total y devuelve el ID de la promoción', async () => {
    assert.equal((await request('/api/reservas', 'POST', payload, null)).status, 401);
    assert.equal((await request('/api/reservas', 'POST', { ...payload, fecha_tour: '2020-01-01' })).status, 400);
    assert.equal((await request('/api/reservas', 'POST', { ...payload, asistentes: 16 })).status, 400);
    const result = await request('/api/reservas', 'POST', payload);
    assert.equal(result.status, 201); reservation = result.data.reserva;
    assert.equal(reservation.promocion_id, promotion.id);
    assert.equal(Number(reservation.total), Number(promotion.precio) * 2);
    assert.equal(reservation.estado_pago, 'pendiente');
  });
  await t.test('solo el propietario puede consultar, pagar o cancelar su reserva', async () => {
    assert.equal((await request('/api/perfil/reservas', 'GET', undefined, 2)).data.reservas.length, 0);
    for (const action of ['confirmar-pago', 'cancelar']) assert.equal((await request(`/api/perfil/reservas/${reservation.id}/${action}`, 'PATCH', undefined, 2)).status, 404);
    const list = (await request('/api/perfil/reservas')).data.reservas;
    assert.equal(list[0].id, reservation.id); assert.equal(list[0].promocion_id, promotion.id);
  });
  await t.test('el pago ficticio persiste y rechaza una segunda confirmación', async () => {
    const result = await request(`/api/perfil/reservas/${reservation.id}/confirmar-pago`, 'PATCH');
    assert.equal(result.status, 200); assert.equal(result.data.simulado, true);
    assert.equal(result.data.reserva.estado_pago, 'pagado'); assert.equal(result.data.reserva.estado, 'confirmada');
    assert.equal(result.data.reserva.promocion_id, promotion.id);
    assert.equal((await request(`/api/perfil/reservas/${reservation.id}/confirmar-pago`, 'PATCH')).status, 400);
    assert.equal((await request(`/api/perfil/reservas/${reservation.id}/cancelar`, 'PATCH')).status, 400);
    assert.equal((await request('/api/perfil/reservas')).data.reservas[0].estado_pago, 'pagado');
  });
  await t.test('una reserva pendiente se puede cancelar y ya no permite pago', async () => {
    const pending = (await request('/api/reservas', 'POST', { ...payload, metodo_pago: 'paypal' })).data.reserva;
    assert.equal((await request(`/api/perfil/reservas/${pending.id}/cancelar`, 'PATCH')).status, 200);
    assert.equal((await request(`/api/perfil/reservas/${pending.id}/confirmar-pago`, 'PATCH')).status, 400);
    assert.equal((await request(`/api/perfil/reservas/${pending.id}/cancelar`, 'PATCH')).status, 400);
    assert.equal((await request('/api/perfil/reservas')).data.reservas.find((row) => row.id === pending.id).estado, 'cancelada');
  });
});
