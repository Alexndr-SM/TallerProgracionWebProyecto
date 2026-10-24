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

test('biblioteca paginada: permisos, privacidad y reutilización', { skip: PGlite ? false : 'Instala PGlite para comprobar la privacidad con PostgreSQL efímero.' }, async (t) => {
  process.env.JWT_SECRET = 'media-test-only-secret';
  const db = new PGlite(); let privacyUnavailable = false, configured = true, providerError = false, calls = [];
  const query = async (sql, params) => {
    if (privacyUnavailable && sql.includes('SELECT foto_perfil_public_id, foto_perfil_url')) throw new Error('Consulta de privacidad no disponible');
    const result = params ? await db.query(sql, params) : (await db.exec(sql)).at(-1);
    return { rows: result.rows || [], rowCount: result.affectedRows || result.rows?.length || 0 };
  };
  const pool = { query, connect: async () => ({ query, release() {} }) };
  const database = require.resolve('../src/config/database');
  require.cache[database] = { id: database, filename: database, loaded: true, exports: { pool, query } };
  await db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8')); await migrate(pool);
  await query("INSERT INTO usuarios(id,nombre,email,password_hash,rol,foto_perfil_public_id,foto_perfil_url) VALUES (1,'Admin','a@example.test','test','admin',NULL,NULL),(2,'Editor','e@example.test','test','editor',NULL,NULL),(3,'Cliente','c@example.test','test','cliente','archivo-fuera-de-perfiles','https://res.cloudinary.com/demo/image/upload/v1/archivo-fuera-de-perfiles.jpg'),(4,'Soporte','s@example.test','test','soporte',NULL,NULL),(5,'Registrador','r@example.test','test','registrador',NULL,'https://res.cloudinary.com/demo/image/upload/v1/foto-solo-url.jpg')");
  const asset = (id, extra = {}) => ({ asset_id: `asset-${id}`, public_id: id, display_name: id, secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${id}.jpg`, resource_type: 'image', type: 'upload', width: 1600, height: 1000, format: 'jpg', bytes: 120000, ...extra });
  const source = [asset('icaturismo/cms/huacachina'), asset('imagen-anterior-en-raiz'),
    asset('icaturismo/perfiles/99-antigua'), asset('id-opaco', { asset_folder: 'icaturismo/perfiles' }),
    asset('archivo-fuera-de-perfiles'), asset('foto-solo-url'), asset('privada', { type: 'authenticated' }),
    asset('restringida', { access_control: [{ access_type: 'token' }] }), asset('no-publica', { access_mode: 'authenticated' }),
    asset('video', { resource_type: 'video' }), asset('clientes/documento'),
    asset('icaturismo%2Fperfiles%2Fcodificada')];
  const cloudinary = require.resolve('../src/config/cloudinary');
  require.cache[cloudinary] = { id: cloudinary, filename: cloudinary, loaded: true, exports: {
    configureCloudinary() { if (!configured) throw new Error('Sin configuración'); },
    cloudinary: { api: { async resources(options) {
      calls.push(options);
      if (providerError) throw { http_code: 429 };
      if (options.next_cursor === 'pagina-2') return { resources: [asset('icaturismo/cms/paracas')], next_cursor: null };
      if (options.next_cursor === 'vacia') return { resources: [], next_cursor: 'pagina-2' };
      return { resources: source, next_cursor: 'pagina-2' };
    } }, url(id) { return `https://res.cloudinary.com/demo/image/upload/c_fill,w_420,h_280,q_auto,f_auto/${id}.jpg`; } },
  } };
  const { invalidateMediaCache } = require('../src/services/mediaLibrary');
  const app = express(); app.use(express.json());
  app.use('/api/admin', require('../src/routes/admin.routes'));
  app.use('/api/destinos', require('../src/routes/destination.routes'));
  app.use('/api/promociones', require('../src/routes/promotion.routes'));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await db.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(route, user = 2, method = 'GET', body) {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign({ id: user }, process.env.JWT_SECRET)}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, cache: response.headers.get('cache-control'), data: await response.json() };
  }
  await t.test('solo admin/editor consultan y los roles denegados no llegan a Cloudinary', async () => {
    assert.equal((await request('/api/admin/medios', null)).status, 401);
    for (const user of [3, 4, 5]) assert.equal((await request('/api/admin/medios', user)).status, 403);
    assert.equal(calls.length, 0);
  });
  await t.test('oculta perfiles, carpetas dinámicas, URLs asociadas y recursos restringidos', async () => {
    const result = await request('/api/admin/medios');
    assert.equal(result.status, 200); assert.equal(result.cache, 'no-store');
    assert.deepEqual(result.data.images.map((image) => image.public_id), ['icaturismo/cms/huacachina', 'imagen-anterior-en-raiz']);
    assert.equal(result.data.next_cursor, 'pagina-2'); assert.match(result.data.images[0].thumbnail_url, /w_420,h_280,q_auto,f_auto/);
    assert.equal(JSON.stringify(result.data).includes('archivo-fuera-de-perfiles'), false);
    assert.equal(JSON.stringify(result.data).includes('foto-solo-url'), false);
    assert.equal(calls[0].max_results, 24); assert.equal(calls[0].type, 'upload'); assert.equal(calls[0].resource_type, 'image');
    assert.equal('asset_folder' in result.data.images[0], false);
  });
  await t.test('paginación acotada y caché de Cloudinary sin almacenar el filtro de privacidad', async () => {
    assert.equal((await request('/api/admin/medios', 1)).status, 200); assert.equal(calls.length, 1);
    await query("UPDATE usuarios SET foto_perfil_public_id='imagen-anterior-en-raiz' WHERE id=1");
    const filtered = await request('/api/admin/medios'); assert.equal(filtered.data.images.length, 1); assert.equal(calls.length, 1);
    await query('UPDATE usuarios SET foto_perfil_public_id=NULL WHERE id=1');
    const next = await request('/api/admin/medios?cursor=pagina-2'); assert.equal(next.data.images[0].public_id, 'icaturismo/cms/paracas'); assert.equal(next.data.next_cursor, null);
    assert.equal(calls.at(-1).next_cursor, 'pagina-2');
    const empty = await request('/api/admin/medios?cursor=vacia'); assert.equal(empty.data.images.length, 0); assert.equal(empty.data.next_cursor, 'pagina-2');
    for (const cursor of ['cursor%5B%5D=x', 'cursor=', `cursor=${'x'.repeat(1025)}`]) assert.equal((await request(`/api/admin/medios?${cursor}`)).status, 400);
  });
  await t.test('si falla la privacidad no se entrega la página aunque esté en caché', async () => {
    privacyUnavailable = true;
    const result = await request('/api/admin/medios'); assert.equal(result.status, 500); assert.equal(result.data.images, undefined);
    privacyUnavailable = false;
    configured = false; assert.equal((await request('/api/admin/medios')).status, 503); configured = true;
    invalidateMediaCache(); providerError = true; assert.equal((await request('/api/admin/medios')).status, 429); providerError = false;
    assert.equal((await request('/api/admin/medios')).status, 200);
  });
  await t.test('reutiliza imágenes por URL y bloquea perfiles también al guardar destinos/promociones', async () => {
    const image = 'https://res.cloudinary.com/demo/image/upload/v1/icaturismo/cms/huacachina.jpg';
    const privateUrls = ['https://res.cloudinary.com/demo/image/upload/v1/archivo-fuera-de-perfiles.jpg', 'https://res.cloudinary.com/demo/image/upload/c_fill,w_100/v2/archivo-fuera-de-perfiles.webp', 'https://res.cloudinary.com/demo/image/upload/icaturismo/perfiles/99.jpg', 'https://res.cloudinary.com/demo/image/upload/v3/foto-solo-url.png'];
    const body = { nombre: 'Destino multimedia', imagen_url: image, imagen_fondo_url: image };
    for (const url of privateUrls) assert.equal((await request('/api/destinos', 2, 'POST', { ...body, imagen_url: url })).status, 400);
    const destination = await request('/api/destinos', 2, 'POST', body); assert.equal(destination.status, 201);
    const promotion = { destino_id: destination.data.destino.id, titulo: 'Fotos reutilizadas', descripcion_corta: 'Descubre Ica', descripcion_larga: 'Una experiencia inolvidable', precio: 99, duracion: '3 horas', imagen_principal_url: image, imagen_fondo_url: image, galeria_urls: [image] };
    const before = calls.length;
    const created = await request('/api/promociones', 2, 'POST', promotion); assert.equal(created.status, 201);
    assert.deepEqual(created.data.promotion.galeria_urls, [image]); assert.equal(calls.length, before);
    for (const field of ['imagen_principal_url', 'imagen_fondo_url', 'galeria_urls']) {
      assert.equal((await request(`/api/promociones/${created.data.promotion.id}`, 2, 'PUT', { ...promotion, [field]: field === 'galeria_urls' ? [privateUrls[0]] : privateUrls[0] })).status, 400);
    }
    assert.equal((await request(`/api/destinos/${destination.data.destino.id}`, 2, 'PUT', { ...body, imagen_fondo_url: privateUrls[0] })).status, 400);
  });
});
