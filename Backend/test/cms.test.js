const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { Writable } = require('node:stream');
const express = require('express');
const jwt = require('jsonwebtoken');
const validation = require('../src/utils/cms');
const { migrate } = require('../src/database/migrate');

// SQL opcional: npm install --no-save --package-lock=false @electric-sql/pglite@0.3.14
// Cada instancia es efímera y nunca conecta con la base del proyecto.
let PGlite;
try { ({ PGlite } = require('@electric-sql/pglite')); } catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}
const sqlOptions = { skip: PGlite ? false : 'Instala PGlite para verificar SQL y CRUD con PostgreSQL en memoria.' };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1kAAAAASUVORK5CYII=', 'base64');
function adapter(db) {
  const query = async (sql, params) => {
    const result = params ? await db.query(sql, params) : (await db.exec(sql)).at(-1);
    return { rows: result.rows || [], rowCount: result.affectedRows || result.rows?.length || 0 };
  };
  return { query, connect: async () => ({ query, release() {} }) };
}

test('validación del CMS', async (t) => {
  await t.test('normaliza slugs, IDs y URLs HTTPS', () => {
    assert.equal(validation.slug(undefined, 'Aventura en Ica: día 2'), 'aventura-en-ica-dia-2');
    assert.equal(validation.id('12'), 12);
    assert.equal(validation.imageUrl('https://example.com/a.jpg', 'imagen'), 'https://example.com/a.jpg');
    for (const value of [-1, 0, 1.2, true, '1e3', '2147483648']) assert.throws(() => validation.id(value));
    for (const url of ['javascript:alert(1)', 'http://example.com/a.jpg', 'https://a:b@example.com/a.jpg']) {
      assert.throws(() => validation.imageUrl(url, 'imagen'));
    }
  });
  await t.test('rechaza entradas incompletas y galerías inválidas', () => {
    assert.throws(() => validation.destination({ nombre: 'Selva' }));
    assert.throws(() => validation.promotion({}));
    assert.throws(() => validation.slug('😀'));
  });
});

test('migraciones PostgreSQL en una base nueva', sqlOptions, async () => {
  const db = new PGlite();
  try {
    const pool = adapter(db);
    await migrate(pool);
    await migrate(pool);
    assert.equal((await db.query('SELECT count(*)::int AS total FROM cms_migrations')).rows[0].total, 1);
    assert.equal((await db.query('SELECT * FROM promociones')).rows.length, 0);
    await db.query("INSERT INTO destinos (nombre,slug) VALUES ('Temporal','temporal')");
    await db.query("DELETE FROM destinos WHERE slug='temporal'");
    await migrate(pool);
    assert.equal((await db.query('SELECT * FROM destinos')).rows.length, 0);
  } finally { await db.close(); }
});

test('HTTP, permisos y compatibilidad del CMS', async (t) => {
  process.env.JWT_SECRET = 'cms-test-only-secret';
  const db = PGlite ? new PGlite() : null;
  const pool = db ? adapter(db) : { query: async () => { throw new Error('SQL no habilitado'); } };
  if (db) {
    await db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));
    await migrate(pool);
  }
  const users = {
    1: { id: 1, rol: 'admin', estado_cuenta: 'activo' },
    2: { id: 2, rol: 'cliente', estado_cuenta: 'activo' },
    3: { id: 3, rol: 'editor', estado_cuenta: 'activo' },
    4: { id: 4, rol: 'admin', estado_cuenta: 'inactivo' },
  };
  const databasePath = require.resolve('../src/config/database');
  require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: {
    pool,
    query: async (sql, params) => sql.includes('FROM usuarios WHERE id = $1')
      ? { rows: users[params[0]] ? [users[params[0]]] : [], rowCount: users[params[0]] ? 1 : 0 }
      : pool.query(sql, params),
  } };
  let uploadCount = 0;
  let failAt = 0;
  let configured = true;
  const destroyed = [];
  const cloudinaryPath = require.resolve('../src/config/cloudinary');
  require.cache[cloudinaryPath] = { id: cloudinaryPath, filename: cloudinaryPath, loaded: true, exports: {
    configureCloudinary() { if (!configured) throw new Error('Sin configuración'); },
    cloudinary: { uploader: {
      upload_stream(_options, callback) {
        const index = ++uploadCount;
        return new Writable({ write(_chunk, _encoding, done) { done(); }, final(done) {
          if (index === failAt) callback(new Error('Proveedor no disponible'));
          else callback(null, { secure_url: `https://example.com/${index}.png`, public_id: `cms/${index}` });
          done();
        } });
      },
      async destroy(publicId) { destroyed.push(publicId); return { result: 'ok' }; },
    } },
  } };
  const app = express();
  app.use(express.json());
  app.use('/api/destinos', require('../src/routes/destination.routes'));
  app.use('/api/promociones', require('../src/routes/promotion.routes'));
  app.use('/api/admin', require('../src/routes/admin.routes'));
  app.use('/api/uploads', require('../src/routes/upload.routes'));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (db) await db.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const tokens = Object.fromEntries(Object.keys(users).map((key) => [key, jwt.sign({ id: Number(key) }, process.env.JWT_SECRET)]));
  async function request(url, method = 'GET', body, user) {
    const headers = user ? { Authorization: `Bearer ${tokens[user]}` } : {};
    const isForm = body instanceof FormData;
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${base}${url}`, { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }
  function form(count = 1, field = 'imagenes', mime = 'image/png', bytes = png) {
    const data = new FormData();
    for (let i = 0; i < count; i++) data.append(field, new Blob([bytes], { type: mime }), `image-${i}.png`);
    return data;
  }
  await t.test('todas las escrituras exigen sesión y rol admin', async () => {
    const endpoints = [
      ['/api/destinos', 'POST'], ['/api/destinos/1', 'PUT'], ['/api/destinos/1', 'DELETE'],
      ['/api/promociones', 'POST'], ['/api/promociones/1', 'PUT'], ['/api/promociones/1', 'DELETE'],
      ['/api/admin/promociones', 'POST'], ['/api/admin/promociones/1', 'PATCH'], ['/api/uploads', 'POST'],
    ];
    for (const [url, method] of endpoints) {
      assert.equal((await request(url, method, {})).status, 401, `${method} ${url}`);
      for (const user of [2, 3]) assert.equal((await request(url, method, {}, user)).status, 403);
    }
    assert.equal((await request('/api/destinos', 'POST', {}, 4)).status, 401);
    assert.equal(uploadCount, 0);
  });
  await t.test('sube varias imágenes y mantiene el orden', async () => {
    const result = await request('/api/uploads', 'POST', form(3), 1);
    assert.equal(result.status, 201);
    assert.deepEqual(result.data.urls, ['https://example.com/1.png', 'https://example.com/2.png', 'https://example.com/3.png']);
  });
  await t.test('acepta exactamente diez imágenes', async () => {
    const result = await request('/api/uploads', 'POST', form(10), 1);
    assert.equal(result.status, 201);
    assert.equal(result.data.urls.length, 10);
  });
  await t.test('rechaza exceso, campos incorrectos, archivos falsos y tipos no admitidos', async () => {
    for (const body of [form(11), form(1, 'otro'), form(1, 'imagenes', 'text/plain'),
      form(1, 'imagenes', 'image/png', Buffer.from('imagen falsa')), form(0)]) {
      assert.equal((await request('/api/uploads', 'POST', body, 1)).status, 400);
    }
  });
  await t.test('rechaza archivos de más de 5 MB', async () => {
    assert.equal((await request('/api/uploads', 'POST', form(1, 'imagenes', 'image/png', Buffer.alloc(5 * 1024 * 1024 + 1)), 1)).status, 413);
  });
  await t.test('maneja configuración ausente y limpia las subidas parciales', async () => {
    configured = false;
    assert.equal((await request('/api/uploads', 'POST', form(), 1)).status, 503);
    configured = true;
    const firstIndex = uploadCount + 1;
    failAt = uploadCount + 2;
    assert.equal((await request('/api/uploads', 'POST', form(3), 1)).status, 502);
    assert.deepEqual(destroyed, [`cms/${firstIndex}`]);
    failAt = 0;
  });
  await t.test('migra el catálogo anterior sin perder datos', sqlOptions, async () => {
    const result = await request('/api/promociones');
    assert.equal(result.status, 200);
    assert.equal(result.data.promotions.length, 9);
    const row = result.data.promotions.find((item) => item.slug === 'buggy-y-sandboard');
    assert.equal(row.titulo, 'Buggy y sandboard');
    assert.equal(row.nombre, row.titulo);
    assert.equal(row.destino_slug, 'dunas');
    assert.equal(Number(row.precio), 90);
  });
  let destinationId;
  let promotionId;
  const destinationBody = { nombre: 'Selva', imagen_url: 'https://example.com/selva.jpg' };
  let promotionBody;
  await t.test('CRUD de destinos, slugs únicos y lecturas públicas', sqlOptions, async () => {
    const created = await request('/api/destinos', 'POST', destinationBody, 1);
    assert.equal(created.status, 201);
    destinationId = created.data.destino.id;
    assert.equal(created.data.destino.slug, 'selva');
    assert.equal((await request('/api/destinos', 'POST', destinationBody, 1)).status, 409);
    assert.equal((await request(`/api/destinos/${destinationId}`)).data.destino.nombre, 'Selva');
    assert.equal((await request('/api/destinos/slug/selva')).status, 200);
    assert.equal((await request(`/api/destinos/${destinationId}`, 'PUT', { ...destinationBody, nombre: 'Selva peruana', slug: 'selva' }, 1)).status, 200);
    assert.equal((await request('/api/destinos/999999', 'PUT', destinationBody, 1)).status, 404);
    assert.equal((await request('/api/destinos/no-es-id')).status, 400);
  });
  await t.test('crea promociones relacionadas y filtra por destino', sqlOptions, async () => {
    promotionBody = { destino_id: destinationId, titulo: 'Aventura Selva', descripcion_corta: 'Una aventura única',
      descripcion_larga: 'Día 1: recorrido. Día 2: regreso.', precio: '180.50', duracion: '2 días',
      imagen_principal_url: 'https://example.com/main.png', galeria_urls: ['https://example.com/gallery.png'] };
    const result = await request('/api/promociones', 'POST', promotionBody, 1);
    assert.equal(result.status, 201);
    promotionId = result.data.promotion.id;
    assert.deepEqual(result.data.promotion.galeria_urls, promotionBody.galeria_urls);
    assert.equal(result.data.promotion.nombre, promotionBody.titulo);
    assert.equal((await request('/api/promociones?destino_slug=selva')).data.promotions.length, 1);
    assert.equal((await request(`/api/promociones?destino_id=${destinationId}`)).data.promotions.length, 1);
    assert.equal((await request('/api/promociones/slug/aventura-selva')).status, 200);
    assert.equal((await request('/api/promociones', 'POST', promotionBody, 1)).status, 409);
    assert.equal((await request(`/api/destinos/${destinationId}`, 'DELETE', undefined, 1)).status, 409);
  });
  await t.test('rechaza precios, galerías, destinos y campos inválidos', sqlOptions, async () => {
    for (const precio of [true, '', '-1', '1.234', '100000000', null, '1e2']) {
      assert.equal((await request('/api/promociones', 'POST', { ...promotionBody, precio }, 1)).status, 400);
    }
    for (const galeria_urls of [{}, [null], Array(11).fill('https://example.com/a.png')]) {
      assert.equal((await request('/api/promociones', 'POST', { ...promotionBody, galeria_urls }, 1)).status, 400);
    }
    assert.equal((await request('/api/promociones', 'POST', { ...promotionBody, destino_id: 999999 }, 1)).status, 404);
  });
  await t.test('edita contenido y mantiene las inactivas solo en el catálogo administrativo', sqlOptions, async () => {
    const updated = await request(`/api/promociones/${promotionId}`, 'PUT', { ...promotionBody, titulo: 'Selva renovada', activo: false }, 1);
    assert.equal(updated.status, 200);
    assert.equal(updated.data.promotion.nombre, 'Selva renovada');
    assert.equal((await request(`/api/promociones/${promotionId}`)).status, 404);
    assert.equal((await request('/api/promociones?destino_slug=selva')).data.promotions.length, 0);
    const admin = await request('/api/admin/promociones', 'GET', undefined, 1);
    assert.equal(admin.status, 200);
    assert.ok(admin.data.promotions.some((item) => item.id === promotionId && item.activo === false));
  });
  await t.test('formularios antiguos siguen creando y editando promociones', sqlOptions, async () => {
    const payload = { nombre: 'Tour legado', descripcion: 'Texto legado', categoria: 'Cultura', precio: 80 };
    const created = await request('/api/admin/promociones', 'POST', payload, 1);
    assert.equal(created.status, 201);
    const legacyId = created.data.promotion.id;
    const updated = await request(`/api/admin/promociones/${legacyId}`, 'PATCH', { ...payload, nombre: 'Legado editado', activo: true }, 1);
    assert.equal(updated.status, 200);
    const item = (await request(`/api/promociones/${legacyId}`)).data.promotion;
    assert.equal(item.titulo, 'Legado editado');
    assert.equal(item.descripcion_larga, 'Texto legado');
    assert.equal(item.destino_slug, 'cultura');
  });
  await t.test('elimina promociones conservando el histórico de reservas', sqlOptions, async () => {
    const reservation = await pool.query(`INSERT INTO reservas
      (nombre,email,fecha_tour,asistentes,metodo_pago,promocion_id,promocion_nombre,precio_unitario,total)
      VALUES ('Cliente','cliente@example.com','2030-01-01',1,'yape',$1,'Aventura Selva',180.50,180.50) RETURNING id`, [promotionId]);
    assert.equal((await request(`/api/promociones/${promotionId}`, 'DELETE', undefined, 1)).status, 204);
    const row = (await pool.query('SELECT * FROM reservas WHERE id=$1', [reservation.rows[0].id])).rows[0];
    assert.equal(row.promocion_id, null);
    assert.equal(row.promocion_nombre, 'Aventura Selva');
    assert.equal(Number(row.total), 180.50);
    assert.equal((await request(`/api/destinos/${destinationId}`, 'DELETE', undefined, 1)).status, 204);
    assert.equal((await request(`/api/destinos/${destinationId}`)).status, 404);
    assert.equal((await request(`/api/promociones/${promotionId}`, 'DELETE', undefined, 1)).status, 404);
    await migrate(pool);
    assert.equal((await request('/api/destinos/slug/selva')).status, 404);
  });
});
