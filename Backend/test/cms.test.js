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
    // El arranque crea primero usuarios; las migraciones del equipo la referencian.
    await db.exec('CREATE TABLE usuarios (id SERIAL PRIMARY KEY)');
    await migrate(pool);
    await migrate(pool);
    assert.equal((await db.query('SELECT count(*)::int AS total FROM cms_migrations')).rows[0].total, 6);
    assert.equal((await db.query('SELECT * FROM promociones')).rows.length, 0);
    assert.deepEqual((await db.query('SELECT nombre FROM recompensas ORDER BY nombre')).rows.map((row) => row.nombre), ['Sombrero ICATURISMO', 'Sombrilla ICATURISMO']);
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
    await db.query(
      "INSERT INTO usuarios (id, nombre, email, password_hash, puntos) VALUES (2, 'Cliente de prueba', 'cliente@test.invalid', 'test-hash', 500)"
    );
  }
  const users = {
    1: { id: 1, rol: 'admin', estado_cuenta: 'activo' },
    2: { id: 2, rol: 'cliente', estado_cuenta: 'activo' },
    3: { id: 3, rol: 'editor', estado_cuenta: 'activo' },
    4: { id: 4, rol: 'admin', estado_cuenta: 'inactivo' },
    5: { id: 5, rol: 'soporte', estado_cuenta: 'activo' },
    6: { id: 6, rol: 'registrador', estado_cuenta: 'activo' },
  };
  const databasePath = require.resolve('../src/config/database');
  require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: {
    pool,
    query: async (sql, params) => sql.includes('SELECT id, email, nombre, rol, estado_cuenta FROM usuarios WHERE id = $1')
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
  app.use('/api/canjeos', require('../src/routes/reward.routes'));
  app.use('/api/perfil', require('../src/routes/perfil.routes'));
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
  await t.test('administra beneficios y canjea puntos de forma protegida', sqlOptions, async () => {
    assert.equal((await request('/api/canjeos')).status, 401);
    assert.equal((await request('/api/admin/recompensas', 'GET', undefined, 2)).status, 403);
    assert.equal((await request('/api/admin/recompensas', 'POST', {}, 3)).status, 403);
    assert.equal((await request('/api/admin/recompensas', 'POST', undefined, 1)).status, 400);
    const catalog = await request('/api/canjeos', 'GET', undefined, 2);
    assert.equal(catalog.status, 200);
    assert.equal(catalog.data.puntos, 500);
    const profilePoints = await request('/api/perfil/puntos', 'GET', undefined, 2);
    assert.equal(profilePoints.status, 200);
    assert.equal(profilePoints.data.puntos_actuales, 500);
    assert.equal((await request('/api/admin/recompensas', 'POST', { nombre: 'Premio', tipo: 'invalido', puntos: 20 }, 1)).status, 400);

    const created = await request('/api/admin/recompensas', 'POST', {
      nombre: 'Descuento de prueba', descripcion: 'Beneficio para clientes.', tipo: 'descuento', puntos: 300, stock: 1,
    }, 1);
    assert.equal(created.status, 201);
    const rewardId = created.data.recompensa.id;
    assert.equal((await request('/api/admin/recompensas', 'GET', undefined, 1)).data.recompensas.length, 3);
    const redeemed = await request(`/api/canjeos/${rewardId}/canjear`, 'POST', {}, 2);
    assert.equal(redeemed.status, 201);
    assert.equal(redeemed.data.puntos, 200);
    assert.match(redeemed.data.canje.codigo, /^ICA-[A-F0-9]{12}$/);
    const updatedCatalog = await request('/api/canjeos', 'GET', undefined, 2);
    assert.equal(updatedCatalog.data.puntos, 200);
    assert.deepEqual(updatedCatalog.data.recompensas.map((item) => item.nombre).sort(), ['Sombrero ICATURISMO', 'Sombrilla ICATURISMO']);
    assert.equal(updatedCatalog.data.canjes.length, 1);
    const history = await db.query("SELECT tipo, puntos FROM puntos_historial WHERE usuario_id = 2 AND tipo = 'canjeado'");
    assert.equal(history.rows[0].tipo, 'canjeado');
    assert.equal(history.rows[0].puntos, 300);
    assert.equal((await request(`/api/canjeos/${rewardId}/canjear`, 'POST', {}, 2)).status, 404);
    const product = await request('/api/admin/recompensas', 'POST', {
      nombre: 'Producto de prueba', tipo: 'producto', puntos: 100, stock: 1,
    }, 1);
    assert.equal(product.status, 201);
    const productRedemption = await request(`/api/canjeos/${product.data.recompensa.id}/canjear`, 'POST', {}, 2);
    assert.equal(productRedemption.status, 201);
    assert.equal(productRedemption.data.puntos, 100);
    assert.match(productRedemption.data.canje.codigo, /^ICA-[A-F0-9]{12}$/);
    const savedProductRedemption = await db.query(
      'SELECT codigo, recompensa_nombre, puntos FROM canjes WHERE usuario_id = $1 AND codigo = $2',
      [2, productRedemption.data.canje.codigo]
    );
    assert.deepEqual(savedProductRedemption.rows[0], {
      codigo: productRedemption.data.canje.codigo,
      recompensa_nombre: 'Producto de prueba',
      puntos: 100,
    });
    const catalogAfterProductRedemption = await request('/api/canjeos', 'GET', undefined, 2);
    assert.equal(catalogAfterProductRedemption.data.recompensas.some((item) => item.id === product.data.recompensa.id), false);
    assert.equal(catalogAfterProductRedemption.data.canjes.length, 2);
    assert.equal(catalogAfterProductRedemption.data.canjes[0].codigo, productRedemption.data.canje.codigo);
    const expensive = await request('/api/admin/recompensas', 'POST', {
      nombre: 'Beneficio costoso', tipo: 'producto', puntos: 250,
    }, 1);
    assert.equal(expensive.status, 201);
    assert.equal((await request(`/api/canjeos/${expensive.data.recompensa.id}/canjear`, 'POST', {}, 2)).status, 409);
    assert.equal((await request('/api/canjeos', 'GET', undefined, 2)).data.puntos, 100);
    assert.equal((await request(`/api/admin/recompensas/${rewardId}`, 'PATCH', { activo: false }, 1)).status, 200);
  });
  await t.test('las escrituras del CMS solo aceptan admin y editor', async () => {
    const endpoints = [
      ['/api/destinos', 'POST'], ['/api/destinos/1', 'PUT'], ['/api/destinos/1', 'DELETE'],
      ['/api/promociones', 'POST'], ['/api/promociones/1', 'PUT'], ['/api/promociones/1', 'DELETE'],
      ['/api/admin/promociones', 'POST'], ['/api/admin/promociones/1', 'PATCH'], ['/api/uploads', 'POST'],
    ];
    for (const [url, method] of endpoints) {
      assert.equal((await request(url, method, {})).status, 401, `${method} ${url}`);
      for (const user of [2, 5, 6]) assert.equal((await request(url, method, {}, user)).status, 403);
    }
    assert.equal((await request('/api/destinos', 'POST', {}, 4)).status, 401);
    assert.equal(uploadCount, 0);
  });
  await t.test('sube varias imágenes y mantiene el orden', async () => {
    const result = await request('/api/uploads', 'POST', form(3), 3);
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
  const destinationBody = { nombre: 'Selva', imagen_url: 'https://example.com/selva.jpg', descripcion: 'Un destino para descubrir.', imagen_fondo_url: 'https://example.com/fondo-selva.jpg' };
  let promotionBody;
  await t.test('CRUD de destinos, slugs únicos y lecturas públicas', sqlOptions, async () => {
    const created = await request('/api/destinos', 'POST', destinationBody, 3);
    assert.equal(created.status, 201);
    destinationId = created.data.destino.id;
    assert.equal(created.data.destino.slug, 'selva');
    assert.equal(created.data.destino.descripcion, destinationBody.descripcion);
    assert.equal(created.data.destino.imagen_fondo_url, destinationBody.imagen_fondo_url);
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
      imagen_principal_url: 'https://example.com/main.png', galeria_urls: ['https://example.com/gallery.png'],
      ubicacion: 'Iquitos', incluye: ['Guía', 'Transporte'], itinerario: 'Día 1: recorrido.', imagen_fondo_url: 'https://example.com/fondo-tour.jpg' };
    const result = await request('/api/promociones', 'POST', promotionBody, 3);
    assert.equal(result.status, 201);
    promotionId = result.data.promotion.id;
    assert.deepEqual(result.data.promotion.galeria_urls, promotionBody.galeria_urls);
    assert.equal(result.data.promotion.nombre, promotionBody.titulo);
    assert.deepEqual(result.data.promotion.incluye, promotionBody.incluye);
    assert.equal(result.data.promotion.ubicacion, 'Iquitos');
    assert.equal(result.data.promotion.itinerario, 'Día 1: recorrido.');
    assert.equal(result.data.promotion.imagen_fondo_url, promotionBody.imagen_fondo_url);
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
    for (const imagen_fondo_url of ['javascript:alert(1)', 'http://example.com/fondo.jpg', 'https://u:p@example.com/a.jpg']) {
      assert.equal((await request('/api/promociones', 'POST', { ...promotionBody, imagen_fondo_url }, 1)).status, 400);
      assert.equal((await request('/api/destinos', 'POST', { ...destinationBody, imagen_fondo_url }, 1)).status, 400);
    }
    assert.equal((await request('/api/promociones', 'POST', { ...promotionBody, destino_id: 999999 }, 1)).status, 404);
  });
  await t.test('edita contenido y mantiene las inactivas solo en el catálogo administrativo', sqlOptions, async () => {
    const updated = await request(`/api/promociones/${promotionId}`, 'PUT', { ...promotionBody, titulo: 'Selva renovada', activo: false }, 3);
    assert.equal(updated.status, 200);
    assert.equal(updated.data.promotion.nombre, 'Selva renovada');
    assert.equal(updated.data.promotion.imagen_fondo_url, promotionBody.imagen_fondo_url);
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
    assert.equal((await request(`/api/promociones/${promotionId}`, 'DELETE', undefined, 3)).status, 204);
    const row = (await pool.query('SELECT * FROM reservas WHERE id=$1', [reservation.rows[0].id])).rows[0];
    assert.equal(row.promocion_id, null);
    assert.equal(row.promocion_nombre, 'Aventura Selva');
    assert.equal(Number(row.total), 180.50);
    assert.equal((await request(`/api/destinos/${destinationId}`, 'DELETE', undefined, 3)).status, 204);
    assert.equal((await request(`/api/destinos/${destinationId}`)).status, 404);
    assert.equal((await request(`/api/promociones/${promotionId}`, 'DELETE', undefined, 1)).status, 404);
    await migrate(pool);
    assert.equal((await request('/api/destinos/slug/selva')).status, 404);
  });
});
