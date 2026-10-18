const { query } = require('../config/database');

async function listActivePromotions(_req, res) {
  try {
    const result = await query(
      `SELECT id, slug, nombre, descripcion, categoria, precio
       FROM promociones WHERE activo = TRUE ORDER BY categoria, nombre`
    );
    return res.json({ ok: true, promotions: result.rows });
  } catch (error) {
    console.error('listActivePromotions:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudieron cargar las promociones.' });
  }
}

module.exports = { listActivePromotions };
