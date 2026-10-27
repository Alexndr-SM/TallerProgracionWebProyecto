const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const express = require('express');
const jwt = require('jsonwebtoken');
const { PGlite } = require('@electric-sql/pglite');
const { migrate } = require('../src/database/migrate');

test('paneles: permisos, privacidad de soporte y caja transaccional', async t => {
  process.env.JWT_SECRET = 'team-tests-only-secret';
  const db = new PGlite();
  const query = async (sql, params) => {
    const result = params ? await db.query(sql, params) : (await db.exec(sql)).at(-1);
    return { rows: result.rows || [], rowCount: result.affectedRows || result.rows?.length || 0 };
  };
  const pool = { query, connect: async () => ({query,release(){}}) };
  const databasePath = require.resolve('../src/config/database');
  require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: {query,pool} };
  await db.exec(fs.readFileSync(path.join(__dirname,'../src/database/schema.sql'),'utf8'));
  await migrate(pool); await migrate(pool);
  await query(`INSERT INTO usuarios(id,nombre,email,password_hash,rol) VALUES
    (101,'Editor','ed@test.dev','hash','editor'),(102,'Soporte','so@test.dev','hash','soporte'),
    (103,'Recepción','re@test.dev','hash','registrador'),(104,'Cliente','cl@test.dev','hash','cliente'),
    (105,'Otro cliente','cl2@test.dev','hash','cliente'),(106,'Admin','ad@test.dev','hash','admin'),
    (107,'Otra caja','re2@test.dev','hash','registrador')`);
  const app = express();app.use(express.json());
  app.use('/api/equipo',require('../src/routes/team.routes'));
  app.use('/api/promociones',require('../src/routes/promotion.routes'));
  const server = app.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close();});
  const base=`http://127.0.0.1:${server.address().port}/api`;
  async function req(route,method='GET',body,user=104){
    const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:`Bearer ${jwt.sign({id:user},process.env.JWT_SECRET)}`}:{})},body:body?JSON.stringify(body):undefined});
    return {status:response.status,data:response.status===204?null:await response.json()};
  }
  await t.test('los permisos se exigen en el servidor para los tres roles',async()=>{
    assert.equal((await req('/equipo/caja','GET',null,null)).status,401);
    for(const user of [101,102,104])assert.equal((await req('/equipo/caja','GET',null,user)).status,403);
    for(const user of [102,103,104])assert.equal((await req('/equipo/widgets','GET',null,user)).status,403);
    for(const user of [101,103])assert.equal((await req('/equipo/soporte','GET',null,user)).status,403);
    for(const user of [102,103,104])assert.equal((await req('/promociones','POST',{},user)).status,403);
  });
  await t.test('CRUD de widgets y publicación sin enlaces ejecutables',async()=>{
    const payload={titulo:'Temporada de Ica',texto:'Viaja con nosotros',tipo:'aviso',orden:1,activo:false};
    assert.equal((await req('/equipo/widgets','POST',{...payload,enlace:'javascript:alert(1)'},101)).status,400);
    assert.equal((await req('/equipo/widgets','POST',{...payload,enlace:'//evil.test'},101)).status,400);
    let result=await req('/equipo/widgets','POST',payload,101);assert.equal(result.status,201);const id=result.data.widget.id;
    assert.equal((await req('/equipo/widgets/publicos','GET',null,null)).data.widgets.length,0);
    assert.equal((await req(`/equipo/widgets/${id}`,'PUT',{...payload,activo:true,enlace:'/html/contacto.html'},101)).status,200);
    assert.equal((await req('/equipo/widgets/publicos','GET',null,null)).data.widgets.length,1);
    assert.equal((await req(`/equipo/widgets/${id}`,'DELETE',null,101)).status,204);
  });
  let caseId;
  await t.test('caso escalado: historial propio, notas privadas y respuesta humana',async()=>{
    const result=await req('/equipo/soporte','POST',{asunto:'Problema en el tour',contenido:'Necesito hablar con alguien',prioridad:'urgente'});
    assert.equal(result.status,201);caseId=result.data.caso.id;
    assert.equal((await req(`/equipo/soporte/${caseId}`,'GET',null,105)).status,404);
    assert.equal((await req('/equipo/soporte','GET',null,105)).data.casos.length,0);
    assert.equal((await req(`/equipo/soporte/${caseId}/mensajes`,'POST',{contenido:'Ocultar',interno:true})).status,403);
    assert.equal((await req(`/equipo/soporte/${caseId}/mensajes`,'POST',{contenido:'Escalar al encargado',interno:true},102)).status,201);
    assert.equal((await req(`/equipo/soporte/${caseId}/mensajes`,'POST',{contenido:'Estamos revisando tu caso'},102)).status,201);
    assert.equal((await req(`/equipo/soporte/${caseId}`)).data.mensajes.length,2);
    assert.equal((await req(`/equipo/soporte/${caseId}`,'GET',null,102)).data.mensajes.length,3);
    assert.equal((await req(`/equipo/soporte/${caseId}`,'PATCH',{estado:'resuelto',prioridad:'alta'},104)).status,403);
    assert.equal((await req(`/equipo/soporte/${caseId}`,'PATCH',{estado:'resuelto',prioridad:'alta'},102)).status,200);
    assert.equal((await req(`/equipo/soporte/${caseId}/mensajes`,'POST',{contenido:'Otro mensaje'})).status,409);
    assert.equal((await req(`/equipo/soporte/${caseId}`,'PATCH',{estado:'en_atencion',prioridad:'normal'},102)).data.caso.agente_id,102);
    assert.equal((await req(`/equipo/soporte/${caseId}/mensajes`,'POST',{contenido:'Gracias'})).status,201);
  });
  let customerId,shiftId;
  const offer=(await query('SELECT * FROM promociones WHERE activo=TRUE ORDER BY id LIMIT 1')).rows[0];
  await t.test('cliente presencial con documento único y apertura de caja',async()=>{
    const payload={nombre:'Viajero presencial',documento:'12345678',telefono:'999123456'};
    const result=await req('/equipo/clientes','POST',payload,103);assert.equal(result.status,201);customerId=result.data.cliente.id;
    assert.equal((await req('/equipo/clientes','POST',payload,103)).status,409);
    assert.equal((await req('/equipo/caja','POST',{fondo_inicial:'100.001'},103)).status,400);
    const shift=await req('/equipo/caja','POST',{fondo_inicial:'100.00'},103);assert.equal(shift.status,201);shiftId=shift.data.turno.id;
    assert.equal((await req('/equipo/caja','POST',{fondo_inicial:0},103)).status,409);
  });
  let sale;
  await t.test('precio del servidor, validación de efectivo e idempotencia del cobro',async()=>{
    sale={operacion:randomUUID(),cliente_id:customerId,promocion_id:offer.id,asistentes:2,fecha_tour:'2099-01-01',metodo:'efectivo',recibido:Number(offer.precio)*2+20,total:0.01};
    assert.equal((await req('/equipo/ventas','POST',{...sale,fecha_tour:'2020-01-01'},103)).status,400);
    assert.equal((await req('/equipo/ventas','POST',{...sale,fecha_tour:'2099-02-30'},103)).status,400);
    assert.equal((await req('/equipo/ventas','POST',{...sale,recibido:0},103)).status,400);
    assert.equal((await req('/equipo/ventas','POST',{...sale,asistentes:16},103)).status,400);
    const first=await req('/equipo/ventas','POST',sale,103);assert.equal(first.status,201);assert.equal(Number(first.data.venta.total),Number(offer.precio)*2);
    const second=await req('/equipo/ventas','POST',sale,103);assert.equal(second.data.venta.id,first.data.venta.id);
    assert.equal((await query('SELECT COUNT(*)::int AS n FROM caja_ventas')).rows[0].n,1);
  });
  await t.test('pagos digitales, cierre, aislamiento de caja y bloqueo de ventas cerradas',async()=>{
    const digital={...sale,operacion:randomUUID(),metodo:'yape'};
    assert.equal((await req('/equipo/ventas','POST',digital,103)).status,400);
    assert.equal((await req('/equipo/ventas','POST',{...digital,referencia:'YAPE-001'},103)).status,201);
    const current=(await req('/equipo/caja','GET',null,103)).data;
    assert.equal(current.resumen.operaciones,2);assert.equal(Number(current.resumen.efectivo),Number(offer.precio)*2);
    assert.equal((await req(`/equipo/caja/${shiftId}/cierre`,'POST',{efectivo_contado:100},107)).status,409);
    const expected=100+Number(offer.precio)*2;
    const closed=await req(`/equipo/caja/${shiftId}/cierre`,'POST',{efectivo_contado:expected,observacion:'Cuadre correcto'},103);
    assert.equal(closed.status,200);assert.equal(Number(closed.data.turno.efectivo_esperado),expected);
    assert.equal((await req('/equipo/ventas','POST',{...sale,operacion:randomUUID()},103)).status,409);
    assert.equal((await req('/equipo/caja','GET',null,107)).data.turno,null);
  });
});
