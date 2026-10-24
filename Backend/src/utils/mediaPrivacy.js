const { query } = require('../config/database');
const { CmsError } = require('./cms');

function decoded(value) {
  try { return decodeURIComponent(String(value || '')).normalize('NFC'); } catch { return ''; }
}
// Incluye carpetas históricas y el asset_folder de cuentas con carpetas dinámicas.
function personalPath(value) {
  return /(^|\/)(perfiles?|profiles?|avatars?|clientes?|customers?|usuarios?|users?|privad[oa]s?|private)(\/|$)/i.test(decoded(value));
}
function canonicalUrl(value) {
  try { const url = new URL(value); return `${url.hostname.toLowerCase()}${decoded(url.pathname)}`; } catch { return ''; }
}
function cloudId(value) {
  try {
    const url = new URL(value);
    const match = decoded(url.pathname).match(/\/image\/upload\/(?:.*\/)?v\d+\/(.+)$/);
    return match ? match[1].replace(/\.[^/.]+$/, '') : '';
  } catch { return ''; }
}
async function privateImages() {
  // Nunca se envían estos datos al navegador. Se revisan de nuevo en cada solicitud.
  const result = await query(`SELECT foto_perfil_public_id, foto_perfil_url FROM usuarios
    WHERE foto_perfil_public_id IS NOT NULL OR foto_perfil_url IS NOT NULL`);
  const ids = new Set(), urls = new Set();
  result.rows.forEach((row) => {
    if (row.foto_perfil_public_id) ids.add(decoded(row.foto_perfil_public_id));
    if (row.foto_perfil_url) {
      urls.add(canonicalUrl(row.foto_perfil_url));
      const id = cloudId(row.foto_perfil_url); if (id) ids.add(id);
    }
  });
  return { ids, urls };
}
function privateUrl(value, blocked) {
  if (!value) return false;
  const path = canonicalUrl(value);
  if (!path || personalPath(path) || blocked.urls.has(path)) return true;
  const id = cloudId(value);
  if (id && blocked.ids.has(id)) return true;
  // Detecta también variantes sin versión y con transformaciones de un ID privado.
  const withoutExtension = path.replace(/\.[^/.]+$/, '');
  return [...blocked.ids].some((item) => withoutExtension.endsWith(`/${item}`));
}
function isEditorial(resource, blocked) {
  return resource.resource_type === 'image' && resource.type === 'upload'
    && typeof resource.public_id === 'string' && resource.public_id.length > 0
    && resource.secure_url?.startsWith('https://')
    && !personalPath(resource.public_id) && !personalPath(resource.asset_folder)
    && !blocked.ids.has(decoded(resource.public_id))
    && !privateUrl(resource.secure_url, blocked)
    && (!resource.access_mode || resource.access_mode === 'public')
    && (!resource.access_control || (Array.isArray(resource.access_control) && resource.access_control.length === 0));
}
async function assertEditorialImages(urls) {
  const blocked = await privateImages();
  if (urls.some((value) => value && privateUrl(value, blocked))) {
    throw new CmsError('Las imágenes asociadas a usuarios no se pueden utilizar en el catálogo.', 400);
  }
}
module.exports = { privateImages, privateUrl, isEditorial, assertEditorialImages };
