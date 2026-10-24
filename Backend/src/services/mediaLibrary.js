const { cloudinary, configureCloudinary } = require('../config/cloudinary');
const { privateImages, isEditorial } = require('../utils/mediaPrivacy');
const { CmsError } = require('../utils/cms');

const PAGE_SIZE = 24;
const pages = new Map();
let generation = 0;
function invalidateMediaCache() { generation++; pages.clear(); }
async function page(cursor) {
  const key = cursor || '';
  const hit = pages.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;
  const currentGeneration = generation;
  const promise = cloudinary.api.resources({ resource_type: 'image', type: 'upload', max_results: PAGE_SIZE,
    direction: 'desc', ...(cursor ? { next_cursor: cursor } : {}),
    fields: 'asset_id,public_id,display_name,secure_url,width,height,format,bytes,created_at,type,resource_type,asset_folder,access_mode,access_control',
    timeout: 20000,
  });
  if (pages.size >= 32) pages.delete(pages.keys().next().value);
  pages.set(key, { promise, expires: Date.now() + 30000 });
  try { return await promise; }
  catch (error) { if (currentGeneration === generation) pages.delete(key); throw error; }
}
async function listMedia(cursor) {
  try { configureCloudinary(); }
  catch { throw new CmsError('La biblioteca requiere configurar Cloudinary en el servidor.', 503); }
  // Si falla la consulta de privacidad no se entrega ninguna imagen.
  const blocked = await privateImages();
  let result;
  try { result = await page(cursor); }
  catch (error) {
    console.error('Biblioteca Cloudinary:', error.http_code || 'error');
    throw new CmsError(error.http_code === 420 || error.http_code === 429
      ? 'Cloudinary alcanzó su límite temporal. Vuelve a intentarlo más tarde.'
      : 'No se pudo consultar la biblioteca de imágenes. Inténtalo nuevamente.', error.http_code === 420 || error.http_code === 429 ? 429 : 502);
  }
  if (!Array.isArray(result.resources) || (cursor && result.next_cursor === cursor)) throw new CmsError('Cloudinary devolvió una página inválida.', 502);
  const images = result.resources.filter((resource) => isEditorial(resource, blocked)).map((resource) => ({
    id: resource.asset_id || resource.public_id,
    public_id: resource.public_id,
    nombre: resource.display_name || resource.public_id.split('/').at(-1),
    url: resource.secure_url,
    thumbnail_url: cloudinary.url(resource.public_id, { secure: true, resource_type: 'image', type: 'upload',
      width: 420, height: 280, crop: 'fill', quality: 'auto', fetch_format: 'auto', format: resource.format }),
    width: resource.width, height: resource.height, format: resource.format, bytes: resource.bytes, created_at: resource.created_at,
  }));
  return { images, next_cursor: result.next_cursor || null };
}
module.exports = { listMedia, invalidateMediaCache };
