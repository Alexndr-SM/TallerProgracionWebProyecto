const { pool, query } = require('../config/database');

// Puntos ganados por cada S/ 10 gastados
const PUNTOS_POR_DECENA = 1;

/**
 * Calcula cuántos puntos corresponden a un total en soles
 * Regla: 1 punto por cada S/10 gastados (redondeado hacia abajo)
 */
function calcularPuntos(total) {
  return Math.floor(Number(total) / 10) * PUNTOS_POR_DECENA;
}

/** GET /api/perfil — datos no sensibles del cliente autenticado */
async function getPerfil(req, res) {
  try {
    const result = await query(
      `SELECT id, nombre, email, puntos, foto_perfil_url, created_at, ultimo_acceso
       FROM usuarios WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });
    }
    const u = result.rows[0];
    return res.json({
      ok: true,
      perfil: {
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        puntos: u.puntos,
        foto_perfil_url: u.foto_perfil_url,
        miembro_desde: u.created_at,
        ultimo_acceso: u.ultimo_acceso,
      },
    });
  } catch (err) {
    console.error('getPerfil:', err.message);
    return res.status(500).json({ ok: false, message: 'No se pudo cargar el perfil.' });
  }
}

/** GET /api/perfil/reservas — reservas del cliente autenticado */
async function getMisReservas(req, res) {
  try {
    const result = await query(
      `SELECT r.id, r.fecha_tour, r.asistentes, r.metodo_pago,
              r.estado, r.estado_pago, r.promocion_nombre, r.precio_unitario,
              r.total, r.created_at,
              p.categoria AS promocion_categoria
       FROM reservas r
       LEFT JOIN promociones p ON p.id = r.promocion_id
       WHERE r.usuario_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    return res.json({ ok: true, reservas: result.rows });
  } catch (err) {
    console.error('getMisReservas:', err.message);
    return res.status(500).json({ ok: false, message: 'No se pudieron cargar las reservas.' });
  }
}

/** GET /api/perfil/puntos — historial de puntos del cliente */
async function getMisPuntos(req, res) {
  try {
    const result = await query(
      `SELECT ph.id, ph.tipo, ph.puntos, ph.descripcion, ph.created_at,
              r.promocion_nombre, r.fecha_tour
       FROM puntos_historial ph
       LEFT JOIN reservas r ON r.id = ph.reserva_id
       WHERE ph.usuario_id = $1
       ORDER BY ph.created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    const totalResult = await query(
      'SELECT puntos FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    return res.json({
      ok: true,
      puntos_actuales: totalResult.rows[0]?.puntos ?? 0,
      historial: result.rows,
    });
  } catch (err) {
    console.error('getMisPuntos:', err.message);
    return res.status(500).json({ ok: false, message: 'No se pudo cargar el historial de puntos.' });
  }
}

/** PATCH /api/perfil/reservas/:id/cancelar — cliente cancela su propia reserva */
async function cancelarReserva(req, res) {
  const reservaId = Number(req.params.id);
  if (!Number.isInteger(reservaId) || reservaId < 1) {
    return res.status(400).json({ ok: false, message: 'ID de reserva no válido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que la reserva pertenece al usuario y está en estado cancelable
    const resResult = await client.query(
      `SELECT id, estado, estado_pago, total, promocion_nombre
       FROM reservas
       WHERE id = $1 AND usuario_id = $2
       FOR UPDATE`,
      [reservaId, req.user.id]
    );

    if (!resResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada.' });
    }

    const reserva = resResult.rows[0];

    if (reserva.estado === 'cancelada') {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, message: 'La reserva ya está cancelada.' });
    }

    // Si la reserva ya está pagada, debe solicitar reembolso
    if (reserva.estado_pago === 'pagado') {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, message: 'Esta reserva ya tiene el pago confirmado. Utiliza la opción de Reembolso.' });
    }

    // El cliente solo puede cancelar si está pendiente o confirmada
    if (!['pendiente', 'confirmada'].includes(reserva.estado)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, message: 'Esta reserva no se puede cancelar en su estado actual.' });
    }

    // Calcular puntos a revertir
    const puntosGanados = calcularPuntos(reserva.total);

    // Cancelar la reserva
    await client.query(
      `UPDATE reservas SET estado = 'cancelada' WHERE id = $1`,
      [reservaId]
    );

    // Revertir puntos si se ganaron (sin bajar de 0)
    if (puntosGanados > 0) {
      await client.query(
        `UPDATE usuarios
         SET puntos = GREATEST(0, puntos - $1)
         WHERE id = $2`,
        [puntosGanados, req.user.id]
      );

      await client.query(
        `INSERT INTO puntos_historial (usuario_id, reserva_id, tipo, puntos, descripcion)
         VALUES ($1, $2, 'cancelado', $3, $4)`,
        [
          req.user.id,
          reservaId,
          puntosGanados,
          `Cancelación de reserva: ${reserva.promocion_nombre || 'Tour'}`,
        ]
      );
    }

    // Obtener puntos actualizados
    const puntosResult = await client.query(
      'SELECT puntos FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    await client.query('COMMIT');

    return res.json({
      ok: true,
      message: 'Reserva cancelada correctamente.',
      puntos_revertidos: puntosGanados,
      puntos_actuales: puntosResult.rows[0]?.puntos ?? 0,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('cancelarReserva:', err.message);
    return res.status(500).json({ ok: false, message: 'No se pudo cancelar la reserva.' });
  } finally {
    client.release();
  }
}

/** PATCH /api/perfil/reservas/:id/confirmar-pago — cliente confirma el pago de su reserva */
async function confirmarPagoReserva(req, res) {
  const reservaId = Number(req.params.id);
  if (!Number.isInteger(reservaId) || reservaId < 1) {
    return res.status(400).json({ ok: false, message: 'ID de reserva no válido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resResult = await client.query(
      `SELECT id, estado, estado_pago, total, promocion_nombre
       FROM reservas
       WHERE id = $1 AND usuario_id = $2
       FOR UPDATE`,
      [reservaId, req.user.id]
    );

    if (!resResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada.' });
    }

    const reserva = resResult.rows[0];

    if (reserva.estado === 'cancelada') {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, message: 'No se puede confirmar el pago de una reserva cancelada.' });
    }

    if (reserva.estado_pago === 'pagado') {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, message: 'Esta reserva ya tiene el pago confirmado.' });
    }

    const updated = await client.query(
      `UPDATE reservas
       SET estado_pago = 'pagado',
           estado = 'confirmada'
       WHERE id = $1
       RETURNING id, fecha_tour, asistentes, metodo_pago, estado, promocion_nombre,
                 precio_unitario, total, estado_pago, created_at`,
      [reservaId]
    );

    await client.query('COMMIT');

    return res.json({
      ok: true,
      message: '¡Pago confirmado con éxito! Tu reserva ahora figura como confirmada y pagada.',
      reserva: updated.rows[0],
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('confirmarPagoReserva:', err.message);
    return res.status(500).json({ ok: false, message: 'No se pudo confirmar el pago de la reserva.' });
  } finally {
    client.release();
  }
}

/** PATCH /api/perfil/reservas/:id/reembolsar — cliente solicita reembolso (devuelve el 90% del costo total y descuenta el 90% de los puntos) */
async function reembolsarReserva(req, res) {
  const reservaId = Number(req.params.id);
  if (!Number.isInteger(reservaId) || reservaId < 1) {
    return res.status(400).json({ ok: false, message: 'ID de reserva no válido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resResult = await client.query(
      `SELECT id, estado, estado_pago, total, promocion_nombre
       FROM reservas
       WHERE id = $1 AND usuario_id = $2
       FOR UPDATE`,
      [reservaId, req.user.id]
    );

    if (!resResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada.' });
    }

    const reserva = resResult.rows[0];

    if (reserva.estado_pago === 'reembolsado') {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, message: 'Esta reserva ya tiene un reembolso aplicado.' });
    }

    if (reserva.estado_pago !== 'pagado') {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, message: 'Solo se puede solicitar reembolso de reservas con pago confirmado.' });
    }

    const total = Number(reserva.total);
    const montoReembolso = Math.round(total * 0.90 * 100) / 100;
    const montoRetenido = Math.round((total - montoReembolso) * 100) / 100;

    // Calcular el 90% de los puntos correspondientes a esta reserva para revertirlos
    const puntosTotales = calcularPuntos(total);
    const puntosARevertir = Math.round(puntosTotales * 0.90);

    // Cancelar la reserva y marcar estado_pago como reembolsado
    const updated = await client.query(
      `UPDATE reservas
       SET estado = 'cancelada', estado_pago = 'reembolsado'
       WHERE id = $1
       RETURNING id, fecha_tour, asistentes, metodo_pago, estado, promocion_nombre,
                 precio_unitario, total, estado_pago, created_at`,
      [reservaId]
    );

    // Revertir el 90% de los puntos
    if (puntosARevertir > 0) {
      await client.query(
        `UPDATE usuarios
         SET puntos = GREATEST(0, puntos - $1)
         WHERE id = $2`,
        [puntosARevertir, req.user.id]
      );

      await client.query(
        `INSERT INTO puntos_historial (usuario_id, reserva_id, tipo, puntos, descripcion)
         VALUES ($1, $2, 'cancelado', $3, $4)`,
        [
          req.user.id,
          reservaId,
          puntosARevertir,
          `Reembolso (90%) de reserva: ${reserva.promocion_nombre || 'Tour'}`,
        ]
      );
    }

    const puntosResult = await client.query(
      'SELECT puntos FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    await client.query('COMMIT');

    return res.json({
      ok: true,
      message: `Reembolso procesado con éxito. Se devolverá el 90% (S/ ${montoReembolso.toFixed(2)}) con retención del 10% (S/ ${montoRetenido.toFixed(2)}). Se descontaron ${puntosARevertir} puntos.`,
      monto_reembolsado: montoReembolso,
      monto_retenido: montoRetenido,
      puntos_revertidos: puntosARevertir,
      puntos_actuales: puntosResult.rows[0]?.puntos ?? 0,
      reserva: updated.rows[0],
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('reembolsarReserva:', err.message);
    return res.status(500).json({ ok: false, message: 'No se pudo procesar el reembolso.' });
  } finally {
    client.release();
  }
}

module.exports = {
  getPerfil,
  getMisReservas,
  getMisPuntos,
  cancelarReserva,
  confirmarPagoReserva,
  reembolsarReserva,
  calcularPuntos,
};

