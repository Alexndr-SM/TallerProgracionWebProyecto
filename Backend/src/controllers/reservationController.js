const { pool, query } = require('../config/database');
const { calcularPuntos } = require('./perfilController');

async function createReservation(req, res) {
  const fechaTour = typeof req.body.fecha_tour === 'string' ? req.body.fecha_tour : '';
  const asistentes = Number(req.body.asistentes);
  const metodoPago = req.body.metodo_pago;
  const promocionId = Number(req.body.promocion_id);
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fechaTour)
    && !Number.isNaN(Date.parse(`${fechaTour}T00:00:00Z`))
    && new Date(`${fechaTour}T00:00:00Z`).toISOString().slice(0, 10) === fechaTour;

  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (!fechaValida || fechaTour < hoy) {
    return res.status(400).json({ ok: false, message: 'Selecciona una fecha válida a partir de hoy.' });
  }
  if (!Number.isInteger(asistentes) || asistentes < 1 || asistentes > 15) {
    return res.status(400).json({ ok: false, message: 'El número de asistentes debe estar entre 1 y 15.' });
  }
  if (!['tarjeta', 'paypal', 'yape'].includes(metodoPago)) {
    return res.status(400).json({ ok: false, message: 'Selecciona un método de pago válido.' });
  }
  if (!Number.isInteger(promocionId) || promocionId < 1) {
    return res.status(400).json({ ok: false, message: 'Selecciona una promoción disponible.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const account = await client.query(
      'SELECT id, nombre, email FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (!account.rows.length) {
      await client.query('ROLLBACK');
      return res.status(401).json({ ok: false, message: 'La cuenta ya no está registrada. Inicia sesión nuevamente.' });
    }

    const user = account.rows[0];
    const promotionResult = await client.query(
      'SELECT id, nombre, precio FROM promociones WHERE id = $1 AND activo = TRUE',
      [promocionId]
    );
    if (!promotionResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, message: 'La promoción ya no está disponible. Actualiza la página y selecciona otra.' });
    }
    const promotion = promotionResult.rows[0];
    const unitPrice = Math.round(Number(promotion.precio) * 100) / 100;
    const total = (Math.round(unitPrice * 100) * asistentes) / 100;

    const reservation = await client.query(
      `INSERT INTO reservas
         (usuario_id, nombre, email, fecha_tour, asistentes, metodo_pago, promocion_id,
          promocion_nombre, precio_unitario, total, estado_pago)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendiente')
       RETURNING id, promocion_id, fecha_tour, asistentes, metodo_pago, estado, promocion_nombre,
                 precio_unitario, total, estado_pago, created_at`,
      [user.id, user.nombre, user.email, fechaTour, asistentes, metodoPago, promotion.id,
        promotion.nombre, unitPrice, total]
    );

    const reserva = reservation.rows[0];

    // Asignar puntos de fidelización: 1 punto por cada S/10 gastados
    const puntosGanados = calcularPuntos(total);
    if (puntosGanados > 0) {
      await client.query(
        'UPDATE usuarios SET puntos = puntos + $1 WHERE id = $2',
        [puntosGanados, user.id]
      );
      await client.query(
        `INSERT INTO puntos_historial (usuario_id, reserva_id, tipo, puntos, descripcion)
         VALUES ($1, $2, 'ganado', $3, $4)`,
        [user.id, reserva.id, puntosGanados, `Reserva: ${promotion.nombre}`]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      ok: true,
      reserva,
      puntos_ganados: puntosGanados,
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('createReservation:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo registrar la reserva.' });
  } finally {
    client.release();
  }
}

module.exports = { createReservation };
