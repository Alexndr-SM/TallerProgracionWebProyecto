# IcaTurismo · Fase 1: API del CMS

Esta fase implementa PostgreSQL, Express y Cloudinary. El panel React y las páginas públicas se implementan en las fases siguientes. No se modifican el middleware JWT, el login, el registro ni las contraseñas.

## Archivos

Crear:

- `src/database/migrations/001_cms.sql`: tablas, ampliación de promociones, migración del catálogo y compatibilidad con reservas/formularios existentes.
- `src/database/migrate.js`: migraciones transaccionales, registro de ejecuciones y bloqueo entre instancias.
- `src/utils/cms.js`: validación y respuestas de error.
- `src/controllers/destinationController.js` y `src/routes/destination.routes.js`: CRUD de destinos.
- `src/controllers/uploadController.js`, `src/middleware/cmsUpload.middleware.js` y `src/routes/upload.routes.js`: subida múltiple.
- `test/cms.test.js`: pruebas de validación, permisos, CRUD y cargas.

Modificar:

- `src/controllers/promotionController.js` y `src/routes/promotion.routes.js`: CRUD, detalle y filtros.
- `src/routes/admin.routes.js`: listado completo para el admin y restricción de escrituras anteriores a `requireAdmin`.
- `src/server.js`: registrar rutas y ejecutar migraciones antes de escuchar conexiones.
- `src/database/init.js`: ejecutar la migración después del bootstrap anterior.
- `package.json`: comandos de migración, inicialización y pruebas.

## Preparación

Desde `Backend/`:

```sh
npm install
npm run db:migrate
npm test
npm start
```

Para una instalación nueva también se puede ejecutar `npm run db:init` para crear las tablas heredadas; `npm start` mantiene su bootstrap existente y aplica después las migraciones CMS automáticamente. `schema.sql` sigue siendo el bootstrap heredado: si lo ejecutas manualmente, ejecuta después `npm run db:migrate`.

Se utilizan las variables existentes: `DATABASE_URL` (o `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`), `JWT_SECRET`, `CORS_ORIGIN` y las tres variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (o `CLOUDINARY_URL`). Las credenciales de Cloudinary solo pertenecen al backend.

La migración conserva IDs, precios, estado y reservas. Crea destinos para las categorías existentes: Naturaleza → Playas, Aventura → Dunas, Cultura → Cultura, Gastronomía → Gastronomía. Las imágenes y duraciones antiguas quedan vacías hasta completarlas en el CMS; no se inventan URLs. `nombre`/`descripcion` se sincronizan con `titulo`/`descripcion_larga`, y se conserva `categoria` para los consumidores anteriores. La FK de reservas mantiene el histórico con `ON DELETE SET NULL`.

## Rutas

| Método | Ruta | Acceso | Resultado |
| --- | --- | --- | --- |
| GET | `/api/destinos` | Público | `{ok, destinos: [...]}` |
| GET | `/api/destinos/:id` | Público | `{ok, destino: {...}}` |
| GET | `/api/destinos/slug/:slug` | Público | Detalle por slug |
| POST | `/api/destinos` | Admin | Crear, 201 |
| PUT | `/api/destinos/:id` | Admin | Reemplazar campos editables |
| DELETE | `/api/destinos/:id` | Admin | Eliminar, 204 |
| GET | `/api/promociones` | Público | `{ok, promotions: [...]}`, solo activas |
| GET | `/api/promociones?destino_slug=selva` | Público | Filtrar por destino; también acepta `destino_id` |
| GET | `/api/promociones/:id` | Público | `{ok, promotion: {...}}`, solo activa |
| GET | `/api/promociones/slug/:slug` | Público | Detalle por slug, solo activa |
| GET | `/api/admin/promociones` | Admin/editor | Catálogo completo, incluidas inactivas |
| POST | `/api/promociones` | Admin | Crear, 201 |
| PUT | `/api/promociones/:id` | Admin | Reemplazar campos editables |
| DELETE | `/api/promociones/:id` | Admin | Eliminar, 204 |
| POST | `/api/uploads` | Admin | Subir de 1 a 10 imágenes, 201 |

Las escrituras requieren `Authorization: Bearer <JWT existente>`. Se ejecuta `requireAuth` seguido de `requireAdmin`, antes de procesar archivos. Las antiguas escrituras `/api/admin/promociones` (POST/PATCH) también requieren admin; editor conserva lectura.

Los slugs se normalizan a minúsculas, sin tildes y con guiones; se generan desde el nombre/título si se omiten. Un slug duplicado devuelve 409. Los IDs y tipos inválidos devuelven 400 y un recurso inexistente 404. Un destino con promociones devuelve 409 al eliminarlo; hay que mover o eliminar primero sus promociones.

## Crear un destino

`POST /api/destinos`, JSON:

```json
{
  "nombre": "Selva",
  "slug": "selva",
  "imagen_url": "https://res.cloudinary.com/mi-cloud/image/upload/selva.jpg"
}
```

`PUT` recibe los mismos campos; omitir el slug lo regenera desde el nombre. Las URLs de imagen deben usar HTTPS.

## Subir imagen principal y galería

El campo multipart debe llamarse exactamente `imagenes`, repetido por archivo:

```js
const form = new FormData();
form.append('imagenes', principalFile);
galeriaFiles.forEach(file => form.append('imagenes', file));
const response = await fetch(`${API_URL}/api/uploads`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const result = await response.json();
if (!response.ok) throw new Error(result.message);
const [imagen_principal_url, ...galeria_urls] = result.urls;
```

No establecer `Content-Type` manualmente: el navegador añade el boundary. El endpoint devuelve `{ "ok": true, "urls": ["https://..."] }` en el mismo orden de entrada. Para una principal más 10 imágenes de galería, usar dos peticiones (cada petición admite máximo 10 archivos).

Multer usa `upload.array('imagenes', 10)`, memoria y límite de 5 MB por archivo. Se aceptan JPEG, PNG y WebP, comprobando MIME y firma antes de enviar a Cloudinary; Cloudinary valida el contenido al decodificarlo. Un archivo demasiado grande devuelve 413, formatos/campos/cantidad incorrectos 400, configuración ausente 503 y fallo del proveedor 502. Si una subida falla a mitad, se intenta eliminar lo ya subido en esa petición. Al eliminar registros no se eliminan automáticamente las imágenes de Cloudinary: pueden estar compartidas.

## Crear una promoción

`POST /api/promociones`, JSON (sustituir `destino_id` por el ID real):

```json
{
  "destino_id": 1,
  "titulo": "Aventura en la selva",
  "slug": "aventura-selva",
  "descripcion_corta": "Explora paisajes únicos con guía local.",
  "descripcion_larga": "Incluye transporte y guía. Itinerario: salida, recorrido y regreso.",
  "precio": "180.00",
  "duracion": "2 días / 1 noche",
  "imagen_principal_url": "https://res.cloudinary.com/mi-cloud/image/upload/principal.jpg",
  "galeria_urls": ["https://res.cloudinary.com/mi-cloud/image/upload/galeria-1.jpg"],
  "activo": true
}
```

`PUT` recibe todos los campos editables; `galeria_urls` omitido equivale a `[]` y `activo` omitido equivale a `true`. `precio` acepta número o cadena decimal positiva con máximo dos decimales. La galería almacena hasta 10 URLs en JSONB. `descripcion_larga` es texto plano y admite el itinerario; el frontend deberá renderizarlo con `textContent`, sin inyectarlo como HTML.

## Verificación

`npm test` comprueba validación, permisos y cargas HTTP con el middleware JWT original y Cloudinary simulado. Para ejecutar también todas las pruebas de migración y CRUD SQL, instalar temporalmente PGlite:

```sh
npm install --no-save --package-lock=false @electric-sql/pglite@0.3.14
npm test
```

PGlite ejecuta PostgreSQL en memoria, sin conectar con las credenciales del proyecto. Sin esta dependencia opcional, las pruebas SQL aparecen como omitidas. No se añaden dependencias al backend de producción. La subida real a Cloudinary debe verificarse con las credenciales del despliegue; las pruebas no consumen cuota del servicio.

Referencias de implementación: [Multer](https://expressjs.com/en/resources/middleware/multer/), [Cloudinary Node.js](https://cloudinary.com/documentation/node_image_and_video_upload), [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html).
