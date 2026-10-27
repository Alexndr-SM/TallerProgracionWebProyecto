const { pool, query } = require('../config/database');
const { CmsError, endpoint, id, text, imageUrl } = require('../utils/cms');
const { assertEditorialImages } = require('../utils/mediaPrivacy');

// Todas las escrituras con varios registros usan una única conexión/transacción.
async function transaction(work) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
function money(value, field = 'Importe') {
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(String(value))) throw new CmsError(`${field}: usa un importe válido con hasta dos decimales.`);
  return Math.round(Number(value) * 100);
}
function tourDate(value) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T12:00:00Z`)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) !== value || value < today) throw new CmsError('Elige una fecha válida a partir de hoy.');
  return value;
}
const widgetData = (body) => {
  if (!['banner','tarjeta','aviso'].includes(body.tipo) || !Number.isInteger(Number(body.orden)) || Number(body.orden) < 0 || Number(body.orden) > 999 || typeof body.activo !== 'boolean') throw new CmsError('Revisa el tipo, el orden y la visibilidad del widget.');
  const enlace = text(body.enlace || '', 'enlace', 500, false);
  // Los widgets solo enlazan páginas locales. Nunca ejecutan HTML o JavaScript.
  if (enlace && (!/^\/(?!\/)[a-zA-Z0-9/_#.=?&%-]*$/.test(enlace))) throw new CmsError('Usa una ruta interna, por ejemplo /html/contacto.html.');
  return [text(body.titulo,'título',180),text(body.texto || '', 'texto',1000,false),body.imagen_url ? imageUrl(body.imagen_url,'imagen') : '',enlace,body.tipo,Number(body.orden),body.activo];
};
const widgets = endpoint(async (_req,res) => res.json({ok:true, widgets:(await query('SELECT * FROM widgets ORDER BY orden,id')).rows}));
const publicWidgets = endpoint(async (_req,res) => res.json({ok:true, widgets:(await query('SELECT * FROM widgets WHERE activo=TRUE ORDER BY orden,id')).rows}));
const saveWidget = endpoint(async (req,res) => {
  const values = widgetData(req.body);
  await assertEditorialImages([values[2]].filter(Boolean));
  const result = req.params.id
    ? await query('UPDATE widgets SET titulo=$1,texto=$2,imagen_url=$3,enlace=$4,tipo=$5,orden=$6,activo=$7,updated_at=NOW() WHERE id=$8 RETURNING *',[...values,id(req.params.id)])
    : await query('INSERT INTO widgets(titulo,texto,imagen_url,enlace,tipo,orden,activo) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',values);
  if (!result.rowCount) throw new CmsError('Widget no encontrado.',404);
  res.status(req.params.id ? 200 : 201).json({ok:true,widget:result.rows[0]});
});
const deleteWidget = endpoint(async (req,res) => {
  if (!(await query('DELETE FROM widgets WHERE id=$1 RETURNING id',[id(req.params.id)])).rowCount) throw new CmsError('Widget no encontrado.',404);
  res.status(204).end();
});

function staff(req) { return ['admin','soporte'].includes(req.user.rol); }
async function caseAccess(req, db = {query}, lock = false) {
  const result = await db.query(`SELECT * FROM soporte_casos WHERE id=$1 ${lock ? 'FOR UPDATE' : ''}`,[id(req.params.id)]);
  const item = result.rows[0];
  if (!item || (!staff(req) && item.cliente_id !== req.user.id)) throw new CmsError('Caso no encontrado.',404);
  return item;
}
const cases = endpoint(async (req,res) => {
  const result = await query(`SELECT c.*,u.nombre AS cliente,u.email,a.nombre AS agente,
    (SELECT contenido FROM soporte_mensajes m WHERE m.caso_id=c.id AND m.interno=FALSE ORDER BY m.id DESC LIMIT 1) AS ultimo_mensaje
    FROM soporte_casos c JOIN usuarios u ON u.id=c.cliente_id LEFT JOIN usuarios a ON a.id=c.agente_id
    ${staff(req) ? '' : 'WHERE c.cliente_id=$1'} ORDER BY c.updated_at DESC LIMIT 200`,staff(req) ? [] : [req.user.id]);
  res.json({ok:true,casos:result.rows});
});
const createCase = endpoint(async (req,res) => {
  const subject = text(req.body.asunto,'asunto',180), content = text(req.body.contenido,'mensaje',4000);
  const priority = req.body.prioridad || 'alta';
  if (!['normal','alta','urgente'].includes(priority)) throw new CmsError('Prioridad inválida.');
  const item = await transaction(async (db) => {
    // Evita una cola ilimitada de casos abiertos por cliente.
    await db.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[req.user.id]);
    const count = await db.query("SELECT COUNT(*)::int AS total FROM soporte_casos WHERE cliente_id=$1 AND estado<>'resuelto'",[req.user.id]);
    if (count.rows[0].total >= 5) throw new CmsError('Ya tienes cinco casos abiertos. Continúa en uno de ellos.',409);
    const created = await db.query('INSERT INTO soporte_casos(cliente_id,asunto,prioridad) VALUES($1,$2,$3) RETURNING *',[req.user.id,subject,priority]);
    await db.query('INSERT INTO soporte_mensajes(caso_id,autor_id,contenido) VALUES($1,$2,$3)',[created.rows[0].id,req.user.id,content]);
    return created.rows[0];
  });
  res.status(201).json({ok:true,caso:item});
});
const caseDetail = endpoint(async (req,res) => {
  const item = await caseAccess(req);
  const messages = await query(`SELECT m.*,u.nombre AS autor,u.rol FROM soporte_mensajes m JOIN usuarios u ON u.id=m.autor_id WHERE m.caso_id=$1 ${staff(req) ? '' : 'AND m.interno=FALSE'} ORDER BY m.id`,[item.id]);
  res.json({ok:true,caso:item,mensajes:messages.rows});
});
const message = endpoint(async (req,res) => {
  const content = text(req.body.contenido,'mensaje',4000);
  if (req.body.interno !== undefined && typeof req.body.interno !== 'boolean') throw new CmsError('La visibilidad no es válida.');
  if (req.body.interno && !staff(req)) throw new CmsError('Solo soporte puede añadir notas internas.',403);
  const item = await transaction(async (db) => {
    const current = await caseAccess(req,db,true);
    if (current.estado === 'resuelto') throw new CmsError('El caso está resuelto. Solicita su reapertura a soporte o abre otro caso.',409);
    const result = await db.query('INSERT INTO soporte_mensajes(caso_id,autor_id,contenido,interno) VALUES($1,$2,$3,$4) RETURNING *',[current.id,req.user.id,content,Boolean(req.body.interno)]);
    await db.query('UPDATE soporte_casos SET updated_at=NOW() WHERE id=$1',[current.id]);
    return result.rows[0];
  });
  res.status(201).json({ok:true,mensaje:item});
});
const updateCase = endpoint(async (req,res) => {
  const {estado,prioridad} = req.body;
  if (!['abierto','en_atencion','resuelto'].includes(estado) || !['normal','alta','urgente'].includes(prioridad)) throw new CmsError('Estado o prioridad inválidos.');
  const result = await query('UPDATE soporte_casos SET estado=$1,prioridad=$2,agente_id=$3,updated_at=NOW() WHERE id=$4 RETURNING *',[estado,prioridad,req.user.id,id(req.params.id)]);
  if (!result.rowCount) throw new CmsError('Caso no encontrado.',404);
  res.json({ok:true,caso:result.rows[0]});
});

const customers = endpoint(async (_req,res) => res.json({ok:true,clientes:(await query('SELECT * FROM clientes_presenciales ORDER BY id DESC LIMIT 500')).rows}));
const createCustomer = endpoint(async (req,res) => {
  const name = text(req.body.nombre,'nombre',120), document = text(req.body.documento,'documento',20);
  const phone = text(req.body.telefono || '', 'teléfono',20,false), email = text(req.body.email || '', 'correo',180,false).toLowerCase();
  if (!/^[a-zA-Z0-9-]{6,20}$/.test(document) || (phone && !/^[+\d ()-]{6,20}$/.test(phone)) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new CmsError('Revisa el documento, teléfono y correo.');
  try {
    const result = await query('INSERT INTO clientes_presenciales(nombre,documento,telefono,email,registrado_por) VALUES($1,$2,$3,$4,$5) RETURNING *',[name,document.toUpperCase(),phone,email,req.user.id]);
    res.status(201).json({ok:true,cliente:result.rows[0]});
  } catch(error) { if (error.code === '23505') throw new CmsError('El documento ya está registrado. Selecciona al cliente existente.',409); throw error; }
});
async function shiftSummary(shiftId,db = {query}) {
  return (await db.query(`SELECT COUNT(*)::int AS operaciones,COALESCE(SUM(total),0) AS total,
    COALESCE(SUM(total) FILTER(WHERE metodo='efectivo'),0) AS efectivo,
    COALESCE(SUM(total) FILTER(WHERE metodo<>'efectivo'),0) AS digital FROM caja_ventas WHERE turno_id=$1`,[shiftId])).rows[0];
}
const shift = endpoint(async (req,res) => {
  const current = (await query('SELECT * FROM caja_turnos WHERE empleado_id=$1 ORDER BY id DESC LIMIT 1',[req.user.id])).rows[0] || null;
  res.json({ok:true,turno:current,resumen:current ? await shiftSummary(current.id) : null,
    ventas:current ? (await query(`SELECT v.*,c.nombre AS cliente,c.documento FROM caja_ventas v JOIN clientes_presenciales c ON c.id=v.cliente_id WHERE turno_id=$1 ORDER BY v.id DESC LIMIT 100`,[current.id])).rows : []});
});
const openShift = endpoint(async (req,res) => {
  const amount = money(req.body.fondo_inicial,'Fondo inicial') / 100;
  try { const result = await query('INSERT INTO caja_turnos(empleado_id,fondo_inicial) VALUES($1,$2) RETURNING *',[req.user.id,amount]); res.status(201).json({ok:true,turno:result.rows[0]}); }
  catch(error) { if (error.code === '23505') throw new CmsError('Ya tienes una caja abierta.',409); throw error; }
});
const closeShift = endpoint(async (req,res) => {
  const counted = money(req.body.efectivo_contado,'Efectivo contado') / 100;
  const note = text(req.body.observacion || '', 'observación',1000,false);
  const current = await transaction(async (db) => {
    const item = (await db.query('SELECT * FROM caja_turnos WHERE id=$1 AND empleado_id=$2 AND closed_at IS NULL FOR UPDATE',[id(req.params.id),req.user.id])).rows[0];
    if (!item) throw new CmsError('No tienes ese turno abierto.',409);
    const summary = await shiftSummary(item.id,db);
    const expected = (money(item.fondo_inicial) + money(summary.efectivo)) / 100;
    return (await db.query('UPDATE caja_turnos SET efectivo_contado=$1,efectivo_esperado=$2,observacion=$3,closed_at=NOW() WHERE id=$4 RETURNING *',[counted,expected,note,item.id])).rows[0];
  });
  res.json({ok:true,turno:current});
});
const sell = endpoint(async (req,res) => {
  const {operacion,metodo} = req.body;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operacion || '') || !['efectivo','yape','tarjeta','transferencia'].includes(metodo)) throw new CmsError('Operación o método de pago inválido.');
  const customerId = id(req.body.cliente_id), promotionId = id(req.body.promocion_id), attendees = Number(req.body.asistentes);
  if (!Number.isInteger(attendees) || attendees < 1 || attendees > 15) throw new CmsError('El número de viajeros debe estar entre 1 y 15.');
  const date = tourDate(req.body.fecha_tour), reference = text(req.body.referencia || '', 'referencia',120,false);
  if (metodo !== 'efectivo' && !reference) throw new CmsError('Ingresa la referencia del pago verificado.');
  const result = await transaction(async (db) => {
    const current = (await db.query('SELECT * FROM caja_turnos WHERE empleado_id=$1 AND closed_at IS NULL FOR UPDATE',[req.user.id])).rows[0];
    if (!current) throw new CmsError('Abre tu caja antes de registrar una venta.',409);
    const previous = (await db.query('SELECT * FROM caja_ventas WHERE operacion=$1',[operacion])).rows[0];
    if (previous) {
      if (previous.turno_id !== current.id) throw new CmsError('Esa operación ya pertenece a otro turno.',409);
      return previous;
    }
    if (!(await db.query('SELECT id FROM clientes_presenciales WHERE id=$1',[customerId])).rowCount) throw new CmsError('Cliente no encontrado.',404);
    const offer = (await db.query('SELECT * FROM promociones WHERE id=$1 AND activo=TRUE FOR SHARE',[promotionId])).rows[0];
    if (!offer) throw new CmsError('La promoción ya no está disponible.',409);
    const unit = money(offer.precio), total = unit * attendees;
    const received = metodo === 'efectivo' ? money(req.body.recibido,'Efectivo recibido') : total;
    if (received < total) throw new CmsError('El efectivo recibido no cubre el total.');
    return (await db.query(`INSERT INTO caja_ventas(operacion,turno_id,cliente_id,promocion_id,promocion_nombre,fecha_tour,asistentes,precio_unitario,total,metodo,recibido,referencia)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[operacion,current.id,customerId,offer.id,offer.nombre,date,attendees,unit/100,total/100,metodo,received/100,reference])).rows[0];
  });
  res.status(201).json({ok:true,venta:result});
});
module.exports = {widgets,publicWidgets,saveWidget,deleteWidget,cases,createCase,caseDetail,message,updateCase,customers,createCustomer,shift,openShift,closeShift,sell};
