const { query } = require('../config/database');

async function createReservation(req, res) {
  const fechaTour = typeof req.body.fecha_tour === 'string' ? req.body.fecha_tour : '';
  const asistentes = Number(req.body.asistentes);
  const metodoPago = req.body.metodo_pago;
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

  try {
    const account = await query(
      'SELECT id, nombre, email FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (!account.rows.length) {
      return res.status(401).json({ ok: false, message: 'La cuenta ya no está registrada. Inicia sesión nuevamente.' });
    }

    const user = account.rows[0];
    const reservation = await query(
      `INSERT INTO reservas (usuario_id, nombre, email, fecha_tour, asistentes, metodo_pago)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, fecha_tour, asistentes, metodo_pago, estado, created_at`,
      [user.id, user.nombre, user.email, fechaTour, asistentes, metodoPago]
    );

    return res.status(201).json({ ok: true, reserva: reservation.rows[0] });
  } catch (error) {
    console.error('createReservation:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo registrar la reserva.' });
  }
}

module.exports = { createReservation };