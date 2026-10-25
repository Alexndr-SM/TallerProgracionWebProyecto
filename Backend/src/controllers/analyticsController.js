const { query } = require('../config/database');
const { CmsError, endpoint } = require('../utils/cms');

const getAnalytics = endpoint(async (req, res) => {
  const days = req.query.days === undefined ? 30 : Number(req.query.days);
  if (typeof req.query.days === 'object' || ![7, 30, 90].includes(days)) throw new CmsError('El periodo debe ser de 7, 30 o 90 días.');
  res.set('Cache-Control', 'no-store');
  // Fechas de negocio en Perú; agregados sobre toda la BD, no sobre la tabla limitada a 500 filas.
  const bounds = (await query(`SELECT (NOW() AT TIME ZONE 'America/Lima')::date::text AS today,
    ((NOW() AT TIME ZONE 'America/Lima')::date - ($1::int - 1))::text AS start`, [days])).rows[0];
  const values = [bounds.today, days];
  const [metrics, daily, methods, destinations, pipeline, upcoming] = await Promise.all([
    query(`WITH windowed AS (SELECT *, (created_at AT TIME ZONE 'America/Lima')::date AS day FROM reservas)
      SELECT CASE WHEN day >= $1::date - ($2::int - 1) THEN 'current' ELSE 'previous' END AS period,
        COUNT(*)::int AS reservations, COUNT(*) FILTER (WHERE estado = 'confirmada')::int AS confirmed,
        COUNT(*) FILTER (WHERE estado = 'cancelada')::int AS cancelled,
        COALESCE(SUM(asistentes) FILTER (WHERE estado <> 'cancelada'),0)::int AS travelers,
        COALESCE(SUM(total) FILTER (WHERE estado_pago = 'pagado'),0)::numeric AS paid_revenue
      FROM windowed WHERE day BETWEEN $1::date - ($2::int * 2 - 1) AND $1::date GROUP BY 1`, values),
    query(`WITH dates AS (SELECT generate_series($1::date - ($2::int - 1), $1::date, '1 day'::interval)::date AS day)
      SELECT dates.day::text AS date, COUNT(r.id)::int AS count,
        COALESCE(SUM(r.total) FILTER (WHERE r.estado_pago = 'pagado'),0)::numeric AS paid
      FROM dates LEFT JOIN reservas r ON (r.created_at AT TIME ZONE 'America/Lima')::date = dates.day
      GROUP BY dates.day ORDER BY dates.day`, values),
    query(`SELECT metodo_pago AS method, COUNT(*)::int AS count FROM reservas
      WHERE (created_at AT TIME ZONE 'America/Lima')::date BETWEEN $1::date - ($2::int - 1) AND $1::date
      GROUP BY metodo_pago ORDER BY metodo_pago`, values),
    query(`SELECT d.id, COALESCE(d.nombre,'Experiencias archivadas') AS name, COUNT(r.id)::int AS count,
        COALESCE(SUM(r.total) FILTER (WHERE r.estado_pago = 'pagado'),0)::numeric AS paid
      FROM reservas r LEFT JOIN promociones p ON p.id=r.promocion_id LEFT JOIN destinos d ON d.id=p.destino_id
      WHERE (r.created_at AT TIME ZONE 'America/Lima')::date BETWEEN $1::date - ($2::int - 1) AND $1::date
        AND r.estado <> 'cancelada' GROUP BY d.id,d.nombre ORDER BY count DESC,name LIMIT 5`, values),
    query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(total),0)::numeric AS amount FROM reservas
      WHERE estado_pago='pendiente' AND estado <> 'cancelada'`),
    query(`SELECT id,nombre,promocion_nombre,fecha_tour::text,asistentes,estado FROM reservas
      WHERE fecha_tour >= $1::date AND estado <> 'cancelada' ORDER BY fecha_tour,id LIMIT 5`, [bounds.today]),
  ]);
  const empty = { reservations: 0, confirmed: 0, cancelled: 0, travelers: 0, paid_revenue: '0' };
  return res.json({ ok: true, analytics: {
    days, timezone: 'America/Lima', from: bounds.start, to: bounds.today,
    current: metrics.rows.find((row) => row.period === 'current') || empty,
    previous: metrics.rows.find((row) => row.period === 'previous') || empty,
    daily: daily.rows, methods: methods.rows, destinations: destinations.rows,
    pipeline: pipeline.rows[0], upcoming: upcoming.rows,
  } });
});
module.exports = { getAnalytics };
