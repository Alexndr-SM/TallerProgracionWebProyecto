const { query } = require('../config/database');
const { CmsError, id, slug, destination, endpoint } = require('../utils/cms');

const listDestinations = endpoint(async (_req, res) => {
  const result = await query('SELECT * FROM destinos ORDER BY nombre, id');
  return res.json({ ok: true, destinos: result.rows });
});
const getDestination = endpoint(async (req, res) => {
  const bySlug = req.params.slug !== undefined;
  const value = bySlug ? slug(req.params.slug) : id(req.params.id);
  const result = await query(`SELECT * FROM destinos WHERE ${bySlug ? 'slug' : 'id'} = $1`, [value]);
  if (!result.rowCount) throw new CmsError('No se encontró el destino.', 404);
  return res.json({ ok: true, destino: result.rows[0] });
});
const createDestination = endpoint(async (req, res) => {
  const data = destination(req.body || {});
  const result = await query('INSERT INTO destinos (nombre, slug, imagen_url, descripcion, imagen_fondo_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [data.nombre, data.slug, data.imagen_url, data.descripcion, data.imagen_fondo_url]);
  return res.status(201).json({ ok: true, destino: result.rows[0] });
});
const updateDestination = endpoint(async (req, res) => {
  const destinationId = id(req.params.id);
  const data = destination(req.body || {});
  const result = await query('UPDATE destinos SET nombre = $1, slug = $2, imagen_url = $3, descripcion = $4, imagen_fondo_url = $5 WHERE id = $6 RETURNING *',
    [data.nombre, data.slug, data.imagen_url, data.descripcion, data.imagen_fondo_url, destinationId]);
  if (!result.rowCount) throw new CmsError('No se encontró el destino.', 404);
  return res.json({ ok: true, destino: result.rows[0] });
});
const deleteDestination = endpoint(async (req, res) => {
  const result = await query('DELETE FROM destinos WHERE id = $1 RETURNING id', [id(req.params.id)]);
  if (!result.rowCount) throw new CmsError('No se encontró el destino.', 404);
  return res.status(204).end();
});
module.exports = { listDestinations, getDestination, createDestination, updateDestination, deleteDestination };
