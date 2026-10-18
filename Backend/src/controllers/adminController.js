const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/database');

const STAFF_ROLES = ['admin', 'registrador', 'soporte', 'editor'];
const RESERVATION_STATES = ['pendiente', 'confirmada', 'cancelada'];
const PROMOTION_CATEGORIES = ['Aventura', 'Cultura', 'Naturaleza', 'Gastronomía'];

async function getSummary(_req, res) {
  try {
    const [reservations, customers, employees, sales] = await Promise.all([
      query('SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE estado = $1)::int AS pendientes FROM reservas', ['pendiente']),
      query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE estado_cuenta = 'activo')::int AS activos FROM usuarios WHERE rol = 'cliente'"),
      query("SELECT COUNT(*)::int AS total FROM usuarios WHERE rol <> 'cliente' AND estado_cuenta = 'activo'"),
      query("SELECT COALESCE(SUM(total) FILTER (WHERE estado_pago = 'pagado'), 0)::numeric AS total FROM reservas"),
    ]);
    return res.json({
      ok: true,
      summary: {
        reservations: reservations.rows[0],
        customers: customers.rows[0],
        employees: employees.rows[0],
        paid_sales: sales.rows[0].total,
      },
    });
  } catch (error) {
    console.error('getSummary:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo cargar el resumen.' });
  }
}

async function listReservations(_req, res) {
  try {
    const result = await query(
      `SELECT id, nombre, email, fecha_tour, asistentes, metodo_pago, estado,
              promocion_id, promocion_nombre, precio_unitario, total, estado_pago, created_at
       FROM reservas ORDER BY created_at DESC LIMIT 500`
    );
    return res.json({ ok: true, reservations: result.rows });
  } catch (error) {
    console.error('listReservations:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudieron cargar las reservas.' });
  }
}

async function updateReservation(req, res) {
  const id = Number(req.params.id);
  const state = req.body.estado;
  if (!Number.isInteger(id) || id < 1 || !RESERVATION_STATES.includes(state)) {
    return res.status(400).json({ ok: false, message: 'El identificador o estado de reserva no es válido.' });
  }
  try {
    const result = await query(
      'UPDATE reservas SET estado = $1 WHERE id = $2 RETURNING id, estado',
      [state, id]
    );
    if (!result.rowCount) return res.status(404).json({ ok: false, message: 'No se encontró la reserva.' });
    return res.json({ ok: true, reservation: result.rows[0] });
  } catch (error) {
    console.error('updateReservation:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo actualizar la reserva.' });
  }
}

async function createLocalReservation(req, res) {
  const name = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const dateTour = typeof req.body.fecha_tour === 'string' ? req.body.fecha_tour : '';
  const attendees = Number(req.body.asistentes);
  const method = req.body.metodo_pago;
  const promotionId = Number(req.body.promocion_id);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(dateTour)
    && !Number.isNaN(Date.parse(`${dateTour}T00:00:00Z`))
    && new Date(`${dateTour}T00:00:00Z`).toISOString().slice(0, 10) === dateTour;
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
    return res.status(400).json({ ok: false, message: 'Ingresa el nombre y el correo del cliente.' });
  }
  if (!validDate || dateTour < new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({ ok: false, message: 'Selecciona una fecha válida a partir de hoy.' });
  }
  if (!Number.isInteger(attendees) || attendees < 1 || attendees > 15 || !['tarjeta', 'paypal', 'yape'].includes(method) || !Number.isInteger(promotionId) || promotionId < 1) {
    return res.status(400).json({ ok: false, message: 'Revisa la promoción, los asistentes y el método de pago.' });
  }
  try {
    const promotionResult = await query(
      'SELECT id, nombre, precio FROM promociones WHERE id = $1 AND activo = TRUE',
      [promotionId]
    );
    if (!promotionResult.rowCount) {
      return res.status(400).json({ ok: false, message: 'La promoción ya no está disponible.' });
    }
    const promotion = promotionResult.rows[0];
    const unitPrice = Math.round(Number(promotion.precio) * 100) / 100;
    const total = (Math.round(unitPrice * 100) * attendees) / 100;
    const result = await query(
      `INSERT INTO reservas
         (usuario_id, nombre, email, fecha_tour, asistentes, metodo_pago, promocion_id,
          promocion_nombre, precio_unitario, total, estado_pago)
       VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendiente')
       RETURNING id, fecha_tour, asistentes, metodo_pago, estado, promocion_nombre,
                 precio_unitario, total, estado_pago, created_at`,
      [name, email, dateTour, attendees, method, promotion.id, promotion.nombre, unitPrice, total]
    );
    return res.status(201).json({ ok: true, reservation: result.rows[0] });
  } catch (error) {
    console.error('createLocalReservation:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo registrar la reserva presencial.' });
  }
}

async function listCustomers(_req, res) {
  try {
    const result = await query(
      `SELECT u.id, u.nombre, u.email, u.estado_cuenta, u.puntos, u.created_at, u.ultimo_acceso,
              COUNT(r.id)::int AS reservas
       FROM usuarios u LEFT JOIN reservas r ON r.usuario_id = u.id
       WHERE u.rol = 'cliente'
       GROUP BY u.id
       ORDER BY u.created_at DESC LIMIT 500`
    );
    return res.json({ ok: true, customers: result.rows });
  } catch (error) {
    console.error('listCustomers:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudieron cargar los clientes.' });
  }
}

async function updateCustomerStatus(req, res) {
  const id = Number(req.params.id);
  const state = req.body.estado_cuenta;
  if (!Number.isInteger(id) || id < 1 || !['activo', 'inactivo'].includes(state)) {
    return res.status(400).json({ ok: false, message: 'El identificador o estado de cuenta no es válido.' });
  }
  try {
    const result = await query(
      "UPDATE usuarios SET estado_cuenta = $1 WHERE id = $2 AND rol = 'cliente' RETURNING id, estado_cuenta",
      [state, id]
    );
    if (!result.rowCount) return res.status(404).json({ ok: false, message: 'No se encontró el cliente.' });
    return res.json({ ok: true, customer: result.rows[0] });
  } catch (error) {
    console.error('updateCustomerStatus:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo cambiar el estado del cliente.' });
  }
}

async function updateCustomerPoints(req, res) {
  const id = Number(req.params.id);
  const points = Number(req.body.puntos);
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(points) || points < 0 || points > 2147483647) {
    return res.status(400).json({ ok: false, message: 'El cliente o los puntos no son válidos.' });
  }
  try {
    const result = await query(
      "UPDATE usuarios SET puntos = $1 WHERE id = $2 AND rol = 'cliente' RETURNING id, puntos",
      [points, id]
    );
    if (!result.rowCount) return res.status(404).json({ ok: false, message: 'No se encontró el cliente.' });
    return res.json({ ok: true, customer: result.rows[0] });
  } catch (error) {
    console.error('updateCustomerPoints:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudieron actualizar los puntos.' });
  }
}

async function listEmployees(_req, res) {
  try {
    const result = await query(
      `SELECT id, nombre, email, rol, estado_cuenta, created_at, ultimo_acceso
       FROM usuarios WHERE rol <> 'cliente' ORDER BY created_at DESC`
    );
    return res.json({ ok: true, employees: result.rows });
  } catch (error) {
    console.error('listEmployees:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo cargar el equipo.' });
  }
}

async function createEmployee(req, res) {
  const name = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const role = req.body.rol;
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
    return res.status(400).json({ ok: false, message: 'Ingresa un nombre y correo válidos.' });
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ ok: false, message: 'La contraseña inicial debe tener entre 8 caracteres y 72 bytes.' });
  }
  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({ ok: false, message: 'Selecciona un rol de empleado válido.' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, estado_cuenta)
       VALUES ($1, $2, $3, $4, 'activo')
       RETURNING id, nombre, email, rol, estado_cuenta, created_at, ultimo_acceso`,
      [name, email, hash, role]
    );
    return res.status(201).json({ ok: true, employee: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ ok: false, message: 'Ese correo ya está registrado.' });
    }
    console.error('createEmployee:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo registrar al empleado.' });
  }
}

async function updateEmployee(req, res) {
  const id = Number(req.params.id);
  const role = req.body.rol;
  const state = req.body.estado_cuenta;
  if (!Number.isInteger(id) || id < 1 || !STAFF_ROLES.includes(role) || !['activo', 'inactivo'].includes(state)) {
    return res.status(400).json({ ok: false, message: 'El empleado, rol o estado no es válido.' });
  }
  if (id === Number(req.user.id) && (state === 'inactivo' || role !== 'admin')) {
    return res.status(400).json({ ok: false, message: 'No puedes desactivar ni quitarte el rol de administrador a ti mismo.' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('LOCK TABLE usuarios IN SHARE ROW EXCLUSIVE MODE');
    const current = await client.query(
      'SELECT id, rol, estado_cuenta FROM usuarios WHERE id = $1 AND rol <> $2 FOR UPDATE',
      [id, 'cliente']
    );
    if (!current.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'No se encontró al empleado.' });
    }
    const employee = current.rows[0];
    if (employee.rol === 'admin' && employee.estado_cuenta === 'activo' && (role !== 'admin' || state !== 'activo')) {
      const admins = await client.query(
        "SELECT COUNT(*)::int AS total FROM usuarios WHERE rol = 'admin' AND estado_cuenta = 'activo' AND id <> $1",
        [id]
      );
      if (admins.rows[0].total === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ ok: false, message: 'Debe quedar al menos un administrador activo.' });
      }
    }
    const result = await client.query(
      `UPDATE usuarios SET rol = $1, estado_cuenta = $2
       WHERE id = $3 RETURNING id, nombre, email, rol, estado_cuenta, created_at, ultimo_acceso`,
      [role, state, id]
    );
    await client.query('COMMIT');
    return res.json({ ok: true, employee: result.rows[0] });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('updateEmployee rollback:', rollbackError.message);
      }
    }
    console.error('updateEmployee:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo actualizar al empleado.' });
  } finally {
    client?.release();
  }
}

async function listPromotions(_req, res) {
  try {
    const result = await query(
      'SELECT id, slug, nombre, descripcion, categoria, precio, activo, created_at FROM promociones ORDER BY nombre'
    );
    return res.json({ ok: true, promotions: result.rows });
  } catch (error) {
    console.error('listPromotions:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo cargar el catálogo.' });
  }
}

function slugify(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

async function createPromotion(req, res) {
  const name = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
  const description = typeof req.body.descripcion === 'string' ? req.body.descripcion.trim() : '';
  const category = typeof req.body.categoria === 'string' ? req.body.categoria.trim() : '';
  const price = Math.round(Number(req.body.precio) * 100) / 100;
  const slug = slugify(name);
  if (!name || name.length > 180 || !slug || description.length > 2000 || !PROMOTION_CATEGORIES.includes(category) || !Number.isFinite(price) || price < 0.01 || price > 99999999.99) {
    return res.status(400).json({ ok: false, message: 'Completa nombre, categoría y un precio mayor que cero.' });
  }
  try {
    const result = await query(
      `INSERT INTO promociones (slug, nombre, descripcion, categoria, precio)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, slug, nombre, descripcion, categoria, precio, activo`,
      [slug, name, description, category, price]
    );
    return res.status(201).json({ ok: true, promotion: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ ok: false, message: 'Ya existe una promoción con ese nombre.' });
    }
    console.error('createPromotion:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo crear la promoción.' });
  }
}

async function updatePromotion(req, res) {
  const id = Number(req.params.id);
  const name = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
  const description = typeof req.body.descripcion === 'string' ? req.body.descripcion.trim() : '';
  const category = typeof req.body.categoria === 'string' ? req.body.categoria.trim() : '';
  const price = Math.round(Number(req.body.precio) * 100) / 100;
  const active = req.body.activo;
  const slug = slugify(name);
  if (!Number.isInteger(id) || id < 1 || !name || name.length > 180 || !slug || description.length > 2000 || !PROMOTION_CATEGORIES.includes(category) || !Number.isFinite(price) || price < 0.01 || price > 99999999.99 || typeof active !== 'boolean') {
    return res.status(400).json({ ok: false, message: 'Los datos de la promoción no son válidos.' });
  }
  try {
    const result = await query(
      `UPDATE promociones SET slug = $1, nombre = $2, descripcion = $3,
              categoria = $4, precio = $5, activo = $6, updated_at = NOW()
       WHERE id = $7 RETURNING id, slug, nombre, descripcion, categoria, precio, activo`,
      [slug, name, description, category, price, active, id]
    );
    if (!result.rowCount) return res.status(404).json({ ok: false, message: 'No se encontró la promoción.' });
    return res.json({ ok: true, promotion: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ ok: false, message: 'Ya existe una promoción con ese nombre.' });
    }
    console.error('updatePromotion:', error.message);
    return res.status(500).json({ ok: false, message: 'No se pudo actualizar la promoción.' });
  }
}

module.exports = {
  getSummary,
  listReservations,
  createLocalReservation,
  updateReservation,
  listCustomers,
  updateCustomerStatus,
  updateCustomerPoints,
  listEmployees,
  createEmployee,
  updateEmployee,
  listPromotions,
  createPromotion,
  updatePromotion,
};
