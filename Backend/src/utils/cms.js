class CmsError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
function id(value, field = 'id') {
  if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > 2147483647) {
    throw new CmsError(`${field} debe ser un entero positivo válido.`);
  }
  return Number(value);
}
function text(value, field, max, required = true) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
    throw new CmsError(`${field} debe ser texto${required ? ' no vacío' : ''} de hasta ${max} caracteres.`);
  }
  return value.trim();
}
function slug(value, fallback) {
  const raw = value === undefined ? fallback : value;
  const normalized = text(raw, 'slug', 180).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120).replace(/-$/, '');
  if (!normalized) throw new CmsError('El slug debe contener letras o números.');
  return normalized;
}
function imageUrl(value, field) {
  const url = text(value, field, 2048);
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error();
  } catch { throw new CmsError(`${field} debe ser una URL HTTPS válida.`); }
  return url;
}
function destination(body) {
  const nombre = text(body.nombre, 'nombre', 180);
  return { nombre, slug: slug(body.slug, nombre), imagen_url: imageUrl(body.imagen_url, 'imagen_url'),
    descripcion: text(body.descripcion ?? '', 'descripcion', 2000, false),
    imagen_fondo_url: body.imagen_fondo_url ? imageUrl(body.imagen_fondo_url, 'imagen_fondo_url') : '' };
}
function promotion(body) {
  const titulo = text(body.titulo, 'titulo', 180);
  const rawPrice = body.precio;
  if (!['string', 'number'].includes(typeof rawPrice) || !/^\d{1,8}(\.\d{1,2})?$/.test(String(rawPrice)) || Number(rawPrice) <= 0) {
    throw new CmsError('precio debe estar entre 0.01 y 99999999.99, con máximo dos decimales.');
  }
  const gallery = body.galeria_urls === undefined ? [] : body.galeria_urls;
  if (!Array.isArray(gallery) || gallery.length > 10) throw new CmsError('galeria_urls debe ser un array de hasta 10 imágenes.');
  if (body.activo !== undefined && typeof body.activo !== 'boolean') throw new CmsError('activo debe ser booleano.');
  const includes = body.incluye === undefined ? [] : body.incluye;
  if (!Array.isArray(includes) || includes.length > 20) throw new CmsError('incluye debe ser un array de hasta 20 elementos.');
  return {
    destino_id: id(body.destino_id, 'destino_id'), titulo, slug: slug(body.slug, titulo),
    descripcion_corta: text(body.descripcion_corta, 'descripcion_corta', 500),
    descripcion_larga: text(body.descripcion_larga, 'descripcion_larga', 50000),
    precio: String(rawPrice), duracion: text(body.duracion, 'duracion', 120),
    imagen_principal_url: imageUrl(body.imagen_principal_url, 'imagen_principal_url'),
    galeria_urls: gallery.map((url) => imageUrl(url, 'galeria_urls')),
    activo: body.activo === undefined ? true : body.activo,
    ubicacion: text(body.ubicacion ?? '', 'ubicacion', 180, false),
    incluye: includes.map((item) => text(item, 'incluye', 250)),
    itinerario: text(body.itinerario ?? '', 'itinerario', 10000, false),
    imagen_fondo_url: body.imagen_fondo_url ? imageUrl(body.imagen_fondo_url, 'imagen_fondo_url') : '',
  };
}
function handleError(res, error) {
  if (error instanceof CmsError) return res.status(error.status).json({ ok: false, message: error.message });
  if (error.code === '23505') return res.status(409).json({ ok: false, message: 'Ya existe un registro con ese slug.' });
  if (error.code === '23503') return res.status(409).json({ ok: false, message: 'El destino no existe o tiene promociones asociadas.' });
  console.error('CMS:', error.message);
  return res.status(500).json({ ok: false, message: 'No se pudo completar la operación.' });
}
const endpoint = (handler) => async (req, res) => {
  try { return await handler(req, res); } catch (error) { return handleError(res, error); }
};
module.exports = { CmsError, id, text, slug, imageUrl, destination, promotion, endpoint };
