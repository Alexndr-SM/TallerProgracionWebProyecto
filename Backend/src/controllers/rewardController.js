const { randomBytes } = require('node:crypto');
const { pool, query } = require('../config/database');

const REWARD_TYPES = ['producto', 'promocion', 'descuento'];

async function listRewards(req, res) {
  try {
    const [rewards, account, redemptions] = await Promise.all([
      query(`SELECT id, nombre, descripcion, tipo, puntos, imagen_url, stock
             FROM recompensas
             WHERE activo = TRUE AND (stock IS NULL OR stock > 0)
             ORDER BY tipo, puntos, nombre`),
      query('SELECT puntos FROM usuarios WHERE id = $1', [req.user.id]),
      query(`SELECT codigo, recompensa_nombre, puntos, created_at
             FROM canjes WHERE usuario_id = $1
             ORDER BY created_at DESC LIMIT 20`, [req.user.id]),
    ]);
    return res.json({
      ok: true,
      puntos: account.rows[0]?.puntos ?? 0,
      recompensas: rewards.rows,
      canjes: redemptions.rows,
    });
  } catch (error) {
    console.error('listRewards:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo cargar el catálogo de canje.' });
  }
}

async function redeemReward(req, res) {
  const rewardId = Number(req.params.id);
  if (!Number.isInteger(rewardId) || rewardId < 1) {
    return res.status(400).json({ ok: false, message: 'El identificador del beneficio no es válido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rewardResult = await client.query(
      `SELECT id, nombre, puntos, stock FROM recompensas
       WHERE id = $1 AND activo = TRUE FOR UPDATE`,
      [rewardId]
    );
    const reward = rewardResult.rows[0];
    if (!reward || reward.stock === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'Este beneficio ya no está disponible.' });
    }

    const account = await client.query(
      `UPDATE usuarios SET puntos = puntos - $1
       WHERE id = $2 AND rol = 'cliente' AND puntos >= $1
       RETURNING puntos`,
      [reward.puntos, req.user.id]
    );
    if (!account.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, message: 'No tienes suficientes puntos para este beneficio.' });
    }

    if (reward.stock !== null) {
      await client.query('UPDATE recompensas SET stock = stock - 1, updated_at = NOW() WHERE id = $1', [reward.id]);
    }
    const code = `ICA-${randomBytes(6).toString('hex').toUpperCase()}`;
    const redemption = await client.query(
      `INSERT INTO canjes (usuario_id, recompensa_id, recompensa_nombre, puntos, codigo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING codigo, recompensa_nombre, puntos, created_at`,
      [req.user.id, reward.id, reward.nombre, reward.puntos, code]
    );
    await client.query(
      `INSERT INTO puntos_historial (usuario_id, tipo, puntos, descripcion)
       VALUES ($1, 'canjeado', $2, $3)`,
      [req.user.id, reward.puntos, `Canje: ${reward.nombre}`]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      ok: true,
      puntos: account.rows[0].puntos,
      canje: redemption.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('redeemReward:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo completar el canje.' });
  } finally {
    client.release();
  }
}

async function listAdminRewards(_req, res) {
  try {
    const result = await query('SELECT * FROM recompensas ORDER BY created_at DESC, id DESC');
    return res.json({ ok: true, recompensas: result.rows });
  } catch (error) {
    console.error('listAdminRewards:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo cargar el catálogo de beneficios.' });
  }
}

async function createReward(req, res) {
  const body = req.body || {};
  const name = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const description = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
  const type = body.tipo;
  const points = Number(body.puntos);
  const rawStock = body.stock;
  const stock = rawStock === '' || rawStock === null || rawStock === undefined ? null : Number(rawStock);
  const imageUrl = typeof body.imagen_url === 'string' ? body.imagen_url.trim() : '';
  if (!name || name.length > 180 || description.length > 1000) {
    return res.status(400).json({ ok: false, message: 'Ingresa un nombre y una descripción válida para el beneficio.' });
  }
  if (!REWARD_TYPES.includes(type) || !Number.isSafeInteger(points) || points < 1 || points > 10000000) {
    return res.status(400).json({ ok: false, message: 'Selecciona un tipo de beneficio y un costo válido en puntos.' });
  }
  if (stock !== null && (!Number.isSafeInteger(stock) || stock < 0 || stock > 10000000)) {
    return res.status(400).json({ ok: false, message: 'El stock debe ser un entero positivo o dejarse vacío para ilimitado.' });
  }
  if (imageUrl) {
    try {
      if (new URL(imageUrl).protocol !== 'https:') throw new Error('URL inválida');
    } catch {
      return res.status(400).json({ ok: false, message: 'La imagen debe utilizar una URL HTTPS válida.' });
    }
  }

  try {
    const result = await query(
      `INSERT INTO recompensas (nombre, descripcion, tipo, puntos, imagen_url, stock)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, type, points, imageUrl, stock]
    );
    return res.status(201).json({ ok: true, recompensa: result.rows[0] });
  } catch (error) {
    console.error('createReward:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo crear el beneficio.' });
  }
}

async function updateReward(req, res) {
  const rewardId = Number(req.params.id);
  const active = req.body?.activo;
  if (!Number.isInteger(rewardId) || rewardId < 1 || typeof active !== 'boolean') {
    return res.status(400).json({ ok: false, message: 'Indica un beneficio válido y su estado activo o inactivo.' });
  }
  try {
    const result = await query(
      'UPDATE recompensas SET activo = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [active, rewardId]
    );
    if (!result.rowCount) return res.status(404).json({ ok: false, message: 'No se encontró el beneficio.' });
    return res.json({ ok: true, recompensa: result.rows[0] });
  } catch (error) {
    console.error('updateReward:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo actualizar el beneficio.' });
  }
}

module.exports = { listRewards, redeemReward, listAdminRewards, createReward, updateReward };
