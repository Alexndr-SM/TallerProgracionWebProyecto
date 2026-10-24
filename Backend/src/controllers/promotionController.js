const { query } = require('../config/database');

const { CmsError, id, slug, promotion, endpoint } = require('../utils/cms');
const selection = `SELECT p.*, d.nombre AS destino_nombre, d.slug AS destino_slug
  FROM promociones p JOIN destinos d ON d.id = p.destino_id`;

const listActivePromotions = endpoint(async (req, res) => {
  const filters = ['p.activo = TRUE'];
  const values = [];
  if (req.query.destino_id !== undefined) {
    values.push(id(req.query.destino_id, 'destino_id'));
    filters.push(`p.destino_id = $${values.length}`);
  }
  if (req.query.destino_slug !== undefined) {
    values.push(slug(req.query.destino_slug));
    filters.push(`d.slug = $${values.length}`);
  }
  const result = await query(`${selection} WHERE ${filters.join(' AND ')} ORDER BY p.categoria, p.nombre`, values);
  return res.json({ ok: true, promotions: result.rows });
});
const listAdminPromotions = endpoint(async (_req, res) => {
  const result = await query(`${selection} ORDER BY p.created_at DESC, p.id DESC`);
  return res.json({ ok: true, promotions: result.rows });
});
const getPromotion = endpoint(async (req, res) => {
  const bySlug = req.params.slug !== undefined;
  const value = bySlug ? slug(req.params.slug) : id(req.params.id);
  const result = await query(`${selection} WHERE p.${bySlug ? 'slug' : 'id'} = $1 AND p.activo = TRUE`, [value]);
  if (!result.rowCount) throw new CmsError('No se encontró la promoción.', 404);
  return res.json({ ok: true, promotion: result.rows[0] });
});
async function categoryForDestination(destinationId) {
  const result = await query('SELECT id, slug, nombre FROM destinos WHERE id = $1', [destinationId]);
  if (!result.rowCount) throw new CmsError('No se encontró el destino.', 404);
  const destination = result.rows[0];
  return ({ playas: 'Naturaleza', dunas: 'Aventura', cultura: 'Cultura', gastronomia: 'Gastronomía' })[destination.slug]
    || destination.nombre.slice(0, 40);
}
const createPromotion = endpoint(async (req, res) => {
  const data = promotion(req.body || {});
  const category = await categoryForDestination(data.destino_id);
  const result = await query(`INSERT INTO promociones
    (destino_id, titulo, slug, descripcion_corta, descripcion_larga, precio, duracion,
     imagen_principal_url, galeria_urls, activo, nombre, descripcion, categoria)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$2,$5,$11) RETURNING *`,
  [data.destino_id, data.titulo, data.slug, data.descripcion_corta, data.descripcion_larga,
    data.precio, data.duracion, data.imagen_principal_url, JSON.stringify(data.galeria_urls), data.activo, category]);
  return res.status(201).json({ ok: true, promotion: result.rows[0] });
});
const updatePromotion = endpoint(async (req, res) => {
  const promotionId = id(req.params.id);
  const data = promotion(req.body || {});
  const category = await categoryForDestination(data.destino_id);
  const result = await query(`UPDATE promociones SET
    destino_id=$1, titulo=$2, slug=$3, descripcion_corta=$4, descripcion_larga=$5,
    precio=$6, duracion=$7, imagen_principal_url=$8, galeria_urls=$9::jsonb,
    activo=$10, nombre=$2, descripcion=$5, categoria=$11, updated_at=NOW()
    WHERE id=$12 RETURNING *`,
  [data.destino_id, data.titulo, data.slug, data.descripcion_corta, data.descripcion_larga,
    data.precio, data.duracion, data.imagen_principal_url, JSON.stringify(data.galeria_urls), data.activo, category, promotionId]);
  if (!result.rowCount) throw new CmsError('No se encontró la promoción.', 404);
  return res.json({ ok: true, promotion: result.rows[0] });
});
const deletePromotion = endpoint(async (req, res) => {
  const result = await query('DELETE FROM promociones WHERE id = $1 RETURNING id', [id(req.params.id)]);
  if (!result.rowCount) throw new CmsError('No se encontró la promoción.', 404);
  // La FK existente usa SET NULL; las reservas conservan nombre y precios históricos.
  return res.status(204).end();
});
module.exports = { listActivePromotions, listAdminPromotions, getPromotion, createPromotion, updatePromotion, deletePromotion };
