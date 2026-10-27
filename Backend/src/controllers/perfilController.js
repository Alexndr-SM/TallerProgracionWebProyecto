const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/database');
const { cloudinary, configureCloudinary } = require('../config/cloudinary');

// Puntos ganados por cada S/ 10 gastados
const PUNTOS_POR_DECENA = 1;

/**
 * Calcula cuántos puntos corresponden a un total en soles
 * Regla: 1 punto por cada S/10 gastados (redondeado hacia abajo)
 */
function calcularPuntos(total) {
  return Math.floor(Number(total) / 10) * PUNTOS_POR_DECENA;
}

/** GET /api/perfil — datos del cliente autenticado */
async function getPerfil(req, res) {
  try {
    const result = await query(
      `SELECT id, nombre, email, telefono, dni, puntos, foto_perfil_url, created_at, ultimo_acceso
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
        telefono: u.telefono || '',
        dni: u.dni || '',
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
      `SELECT r.id, r.promocion_id, r.fecha_tour, r.asistentes, r.metodo_pago,
              r.estado, r.estado_pago, r.promocion_nombre, r.precio_unitario,
              r.total, r.puntos_usados, r.created_at,
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
      `SELECT id, estado, estado_pago, total, puntos_usados, promocion_nombre
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
    const puntosDevueltos = Number(reserva.puntos_usados) || 0;
    if (puntosDevueltos > 0) {
      await client.query('UPDATE usuarios SET puntos = puntos + $1 WHERE id = $2', [puntosDevueltos, req.user.id]);
      await client.query(
        `INSERT INTO puntos_historial (usuario_id, reserva_id, tipo, puntos, descripcion)
         VALUES ($1, $2, 'ajuste', $3, $4)`,
        [req.user.id, reservaId, puntosDevueltos, `Devolución de puntos por cancelación: ${reserva.promocion_nombre || 'Tour'}`]
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
      puntos_devueltos: puntosDevueltos,
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

/** PATCH /api/perfil/reservas/:id/confirmar-pago — simulación sin pasarela ni cobros reales. */
async function confirmarPagoReserva(req, res) {
  const reservaId = Number(req.params.id);
  if (!Number.isInteger(reservaId) || reservaId < 1) {
    return res.status(400).json({ ok: false, message: 'ID de reserva no válido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resResult = await client.query(
      `SELECT id, estado, estado_pago, total, puntos_usados, promocion_nombre
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
       RETURNING id, promocion_id, fecha_tour, asistentes, metodo_pago, estado, promocion_nombre,
                 precio_unitario, total, estado_pago, created_at`,
      [reservaId]
    );

    await client.query('COMMIT');

    return res.json({
      ok: true,
      message: 'Pago simulado completado. Tu reserva figura como confirmada y pagada en esta demostración. No se realizó ningún cobro.',
      simulado: true,
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
      `SELECT id, estado, estado_pago, total, puntos_usados, promocion_nombre
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
                 precio_unitario, total, puntos_usados, estado_pago, created_at`,
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
    const puntosDevueltos = Math.round((Number(reserva.puntos_usados) || 0) * 0.90);
    if (puntosDevueltos > 0) {
      await client.query('UPDATE usuarios SET puntos = puntos + $1 WHERE id = $2', [puntosDevueltos, req.user.id]);
      await client.query(
        `INSERT INTO puntos_historial (usuario_id, reserva_id, tipo, puntos, descripcion)
         VALUES ($1, $2, 'ajuste', $3, $4)`,
        [req.user.id, reservaId, puntosDevueltos, `Devolución de puntos por reembolso: ${reserva.promocion_nombre || 'Tour'}`]
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
      puntos_devueltos: puntosDevueltos,
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

/** PATCH /api/perfil — actualiza nombre, telefono y dni */
async function actualizarPerfil(req, res) {
  const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
  const telefono = typeof req.body.telefono === 'string' ? req.body.telefono.trim() : null;
  const dni = typeof req.body.dni === 'string' ? req.body.dni.trim() : null;

  if (!nombre || nombre.length < 2 || nombre.length > 120) {
    return res.status(400).json({ ok: false, message: 'El nombre debe tener entre 2 y 120 caracteres.' });
  }

  if (telefono && (telefono.length < 6 || telefono.length > 20)) {
    return res.status(400).json({ ok: false, message: 'El teléfono debe tener entre 6 y 20 caracteres.' });
  }

  if (dni && (dni.length < 6 || dni.length > 20)) {
    return res.status(400).json({ ok: false, message: 'El DNI o documento debe tener entre 6 y 20 caracteres.' });
  }

  try {
    const result = await query(
      `UPDATE usuarios
       SET nombre = $1,
           telefono = $2,
           dni = $3
       WHERE id = $4
       RETURNING id, nombre, email, telefono, dni, puntos, foto_perfil_url, created_at, ultimo_acceso`,
      [nombre, telefono || null, dni || null, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });
    }

    const u = result.rows[0];
    return res.json({
      ok: true,
      message: 'Perfil actualizado correctamente.',
      perfil: {
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        telefono: u.telefono || '',
        dni: u.dni || '',
        puntos: u.puntos,
        foto_perfil_url: u.foto_perfil_url,
        miembro_desde: u.created_at,
        ultimo_acceso: u.ultimo_acceso,
      },
    });
  } catch (err) {
    console.error('actualizarPerfil:', err.message);
    return res.status(500).json({ ok: false, message: 'No se pudo actualizar el perfil.' });
  }
}

/** POST /api/perfil/foto — cambia la foto de perfil del cliente autenticado */
async function actualizarFotoPerfil(req, res) {
  if (!req.file) {
    return res.status(400).json({ ok: false, message: 'Selecciona una imagen para tu foto de perfil.' });
  }

  let uploadedImage;
  let client;
  let transactionStarted = false;
  try {
    configureCloudinary();
    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    const userResult = await client.query(
      'SELECT foto_perfil_public_id FROM usuarios WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );
    if (!userResult.rows.length) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });
    }

    uploadedImage = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: 'icaturismo/perfiles',
        public_id: `${req.user.id}-${randomUUID()}`,
        resource_type: 'image',
      }, (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary no devolvió los datos de la imagen.'));
        return resolve(result);
      });
      stream.end(req.file.buffer);
    });

    await client.query(
      'UPDATE usuarios SET foto_perfil_url = $1, foto_perfil_public_id = $2 WHERE id = $3',
      [uploadedImage.secure_url, uploadedImage.public_id, req.user.id]
    );
    await client.query('COMMIT');
    transactionStarted = false;

    const previousPublicId = userResult.rows[0].foto_perfil_public_id;
    if (previousPublicId && previousPublicId !== uploadedImage.public_id) {
      try {
        await cloudinary.uploader.destroy(previousPublicId, { resource_type: 'image' });
      } catch (cleanupError) {
        console.error('No se pudo eliminar la foto de perfil anterior:', cleanupError.message);
      }
    }

    return res.json({
      ok: true,
      message: 'Foto de perfil actualizada correctamente.',
      foto_perfil_url: uploadedImage.secure_url,
    });
  } catch (err) {
    if (transactionStarted && client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('actualizarFotoPerfil rollback:', rollbackError.message);
      }
    }
    if (uploadedImage) {
      try {
        await cloudinary.uploader.destroy(uploadedImage.public_id, { resource_type: 'image' });
      } catch (cleanupError) {
        console.error('No se pudo limpiar la foto de perfil nueva:', cleanupError.message);
      }
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('actualizarFotoPerfil:', errorMessage);
    const cloudinaryNotConfigured = errorMessage.startsWith('Configura CLOUDINARY_')
      || errorMessage.startsWith('CLOUDINARY_URL');
    return res.status(cloudinaryNotConfigured ? 503 : 500).json({
      ok: false,
      message: cloudinaryNotConfigured
        ? 'La subida de fotos no está configurada en el servidor.'
        : 'No se pudo actualizar la foto de perfil.',
    });
  } finally {
    if (client) client.release();
  }
}

/** PATCH /api/perfil/password — cambia la contraseña verificando la actual */
async function cambiarPassword(req, res) {
  const passActual = typeof req.body.password_actual === 'string' ? req.body.password_actual : '';
  const passNueva = typeof req.body.password_nueva === 'string' ? req.body.password_nueva : '';
  const passConfirmar = typeof req.body.password_confirmar === 'string' ? req.body.password_confirmar : '';

  if (!passActual || !passNueva || !passConfirmar) {
    return res.status(400).json({ ok: false, message: 'Todos los campos de contraseña son obligatorios.' });
  }

  if (passNueva.length < 8) {
    return res.status(400).json({ ok: false, message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
  }

  if (passNueva !== passConfirmar) {
    return res.status(400).json({ ok: false, message: 'La nueva contraseña y su confirmación no coinciden.' });
  }

  if (passActual === passNueva) {
    return res.status(400).json({ ok: false, message: 'La nueva contraseña no puede ser idéntica a la actual.' });
  }

  try {
    const userResult = await query(
      'SELECT id, password_hash FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });
    }

    const user = userResult.rows[0];
    const passwordValida = await bcrypt.compare(passActual, user.password_hash);
    if (!passwordValida) {
      return res.status(400).json({ ok: false, message: 'La contraseña actual es incorrecta.' });
    }

    const nuevoHash = await bcrypt.hash(passNueva, 10);
    await query(
      'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
      [nuevoHash, req.user.id]
    );

    return res.json({
      ok: true,
      message: '¡Contraseña actualizada con éxito!',
    });
  } catch (err) {
    console.error('cambiarPassword:', err.message);
    return res.status(500).json({ ok: false, message: 'No se pudo actualizar la contraseña.' });
  }
}

module.exports = {
  getPerfil,
  getMisReservas,
  getMisPuntos,
  cancelarReserva,
  confirmarPagoReserva,
  reembolsarReserva,
  actualizarPerfil,
  actualizarFotoPerfil,
  cambiarPassword,
  calcularPuntos,
};
