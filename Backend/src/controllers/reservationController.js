const { query } = require('../config/database');

async function createReservation(req, res) {
  const fechaTour = typeof req.body.fecha_tour === 'string' ? req.body.fecha_tour : '';
  const asistentes = Number(req.body.asistentes);
  const metodoPago = req.body.metodo_pago;
  const promocionId = Number(req.body.promocion_id);
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fechaTour)
    && !Number.isNaN(Date.parse(`${fechaTour}T00:00:00Z`))
    && new Date(`${fechaTour}T00:00:00Z`).toISOString().slice(0, 10) === fechaTour;

  if (!fechaValida || fechaTour < new Date().toISOString().slice(0, 10)) {
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

  try {
    const account = await query(
      'SELECT id, nombre, email FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (!account.rows.length) {
      return res.status(401).json({ ok: false, message: 'La cuenta ya no está registrada. Inicia sesión nuevamente.' });
    }

    const user = account.rows[0];
    const promotionResult = await query(
      'SELECT id, nombre, precio FROM promociones WHERE id = $1 AND activo = TRUE',
      [promocionId]
    );
    if (!promotionResult.rowCount) {
      return res.status(400).json({ ok: false, message: 'La promoción ya no está disponible. Actualiza la página y selecciona otra.' });
    }
    const promotion = promotionResult.rows[0];
    const unitPrice = Math.round(Number(promotion.precio) * 100) / 100;
    const total = (Math.round(unitPrice * 100) * asistentes) / 100;
    const reservation = await query(
      `INSERT INTO reservas
         (usuario_id, nombre, email, fecha_tour, asistentes, metodo_pago, promocion_id,
          promocion_nombre, precio_unitario, total, estado_pago)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendiente')
       RETURNING id, fecha_tour, asistentes, metodo_pago, estado, promocion_nombre,
                 precio_unitario, total, estado_pago, created_at`,
      [user.id, user.nombre, user.email, fechaTour, asistentes, metodoPago, promotion.id,
        promotion.nombre, unitPrice, total]
    );

    return res.status(201).json({ ok: true, reserva: reservation.rows[0] });
  } catch (error) {
    console.error('createReservation:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo registrar la reserva.' });
  }
}

module.exports = { createReservation };