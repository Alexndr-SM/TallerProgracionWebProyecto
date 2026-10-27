// Ejecutar con Playwright disponible en NODE_PATH. Solo usa una BD temporal.
const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const { once } = require('node:events');
const assert = require('node:assert/strict');
const backend = createRequire(path.resolve(__dirname,'../Backend/package.json'));
const express = backend('express'), jwt = backend('jsonwebtoken');
const { PGlite } = backend('@electric-sql/pglite');
const { chromium } = require('playwright');
const root = path.resolve(__dirname,'..');
(async()=>{
  process.env.JWT_SECRET='local-browser-fixture-only';
  const db = new PGlite();
  const query = async(sql,params)=>{const r=params?await db.query(sql,params):(await db.exec(sql)).at(-1);return{rows:r.rows||[],rowCount:r.affectedRows||r.rows?.length||0};};
  const pool={query,connect:async()=>({query,release(){}})};
  const dbPath=backend.resolve('./src/config/database');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query,pool}};
  await db.exec(fs.readFileSync(path.join(root,'Backend/src/database/schema.sql'),'utf8'));
  await backend('./src/database/migrate').migrate(pool);
  await query(`INSERT INTO usuarios(id,nombre,email,password_hash,rol) VALUES
    (101,'Valentina Flores','editor@test.dev','hash','editor'),(102,'Lucía Torres','soporte@test.dev','hash','soporte'),
    (103,'Mateo Salazar','recepcion@test.dev','hash','registrador'),(104,'Andrea Ruiz','cliente@test.dev','hash','cliente')`);
  await query("UPDATE destinos SET imagen_url='https://example.test/place.jpg',descripcion='Un rincón de Ica para conectar con el paisaje y descubrir nuevas historias.'");
  const app=express();app.use(express.json());
  app.use('/api/auth',backend('./src/routes/auth.routes'));
  app.use('/api/equipo',backend('./src/routes/team.routes'));
  app.use('/api/destinos',backend('./src/routes/destination.routes'));
  app.use('/api/promociones',backend('./src/routes/promotion.routes'));
  app.use('/api/admin',backend('./src/routes/admin.routes'));
  app.use(express.static(path.join(root,'Frontend')));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  const out=path.join(root,'.qa');fs.mkdirSync(out,{recursive:true});
  const contexts=[];
  try{
    const make=async(id,role)=>{
      const context=await browser.newContext({viewport:{width:1440,height:1050}});contexts.push(context);
      await context.addInitScript(({base,token,user})=>{window.API_URL=base;localStorage.setItem('icat_token',token);localStorage.setItem('icat_user',JSON.stringify(user));},{base,token:jwt.sign({id},process.env.JWT_SECRET),user:{id,nombre:'Equipo',rol:role}});
      await context.route('https://example.test/**',r=>r.fulfill({status:200,contentType:'image/jpeg',body:fs.readFileSync(path.join(root,'Frontend/assets/imagenplaya.jpg'))}));
      const page=await context.newPage();page.on('pageerror',error=>{throw error;});return page;
    };
    const editor=await make(101,'editor');await editor.goto(base+'/html/editor.html');await editor.getByRole('heading',{name:/Historias que inspiran/}).waitFor();
    await editor.screenshot({path:path.join(out,'editor.png'),fullPage:true});
    await editor.locator('#nav').getByRole('button',{name:'Destinos',exact:true}).click();await editor.getByRole('button',{name:'Nuevo destino',exact:true}).click();
    await editor.locator('[name=nombre]').fill('Laguna de prueba');await editor.locator('[name=descripcion]').fill('Destino creado desde el panel HTML.');await editor.locator('[name=imagen_url]').fill('https://example.test/laguna.jpg');await editor.getByRole('button',{name:'Guardar cambios',exact:true}).click();await editor.getByRole('heading',{name:'Laguna de prueba',exact:true}).waitFor();
    await editor.locator('#nav').getByRole('button',{name:'Widgets de la web'}).click();await editor.getByRole('button',{name:'Nuevo widget',exact:true}).click();await editor.locator('[name=titulo]').fill('Descubre un nuevo amanecer');await editor.locator('[name=texto]').fill('Experiencias que conectan con Ica.');await editor.getByRole('button',{name:'Guardar cambios',exact:true}).click();await editor.getByRole('heading',{name:'Descubre un nuevo amanecer'}).waitFor();
    const client=await make(104,'cliente');await client.goto(base+'/html/atencion.html');await client.locator('#new-case').waitFor();await client.locator('[name=asunto]').fill('Necesito cambiar mi horario');await client.locator('#new-case [name=contenido]').fill('Mi reserva es para mañana. ¿Podrían ayudarme?');await client.locator('#new-case button').click();await client.locator('#client-messages').getByText('Mi reserva es para mañana. ¿Podrían ayudarme?').waitFor();
    const support=await make(102,'soporte');await support.goto(base+'/html/soporte.html');await support.getByRole('button',{name:/Necesito cambiar mi horario/}).click();await support.locator('#reply textarea').fill('Estamos revisando la disponibilidad para ayudarte.');await support.locator('#reply button').click();await support.locator('#messages').getByText('Estamos revisando la disponibilidad para ayudarte.').waitFor();
    await support.locator('#reply input[type=checkbox]').check();await support.locator('#reply textarea').fill('Nota privada de coordinación');await support.locator('#reply button').click();await support.getByText('Nota privada de coordinación').waitFor();
    await support.screenshot({path:path.join(out,'soporte.png'),fullPage:true});
    await client.reload();await client.locator('[data-case]').click();await client.locator('#client-messages').getByText('Estamos revisando la disponibilidad para ayudarte.').waitFor();assert.equal(await client.getByText('Nota privada de coordinación').count(),0);
    const reception=await make(103,'registrador');await reception.goto(base+'/html/registrador.html');await reception.getByRole('button',{name:'Abrir mi caja',exact:true}).click();await reception.locator('[name=fondo_inicial]').fill('100');await reception.getByRole('button',{name:'Abrir caja',exact:true}).click();await reception.locator('#sale-form').waitFor();
    await reception.getByRole('button',{name:'Nuevo cliente',exact:true}).click();await reception.locator('[name=nombre]').fill('Camila Mendoza');await reception.locator('[name=documento]').fill('87654321');await reception.getByRole('button',{name:'Registrar cliente',exact:true}).click();await reception.locator('#sale-form').waitFor();
    await reception.locator('#sale-form [name=cliente_id]').selectOption({index:1});await reception.locator('#sale-form [name=promocion_id]').selectOption({index:1});await reception.locator('#sale-form [name=recibido]').fill('500');await reception.screenshot({path:path.join(out,'recepcion.png'),fullPage:true});await reception.getByRole('button',{name:/Registrar cobro/}).click();await reception.getByRole('heading',{name:'Constancia de atención'}).waitFor();await reception.locator('#dialog').getByRole('button',{name:'Cerrar',exact:true}).last().click();await reception.getByRole('button',{name:'Realizar cierre de caja'}).click();await reception.locator('[name=efectivo_contado]').fill('220');await reception.getByRole('button',{name:'Cerrar y guardar turno'}).click();await reception.getByRole('button',{name:'Abrir mi caja',exact:true}).waitFor();
    for(const [page,name] of [[editor,'editor'],[support,'soporte'],[reception,'recepcion']]){
      await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);await page.locator('#menu').click();assert.equal(await page.locator('#sidebar').evaluate(el=>el.inert),false);await page.locator('#close-menu').click();await page.waitForTimeout(350);assert.equal(await page.locator('#sidebar').evaluate(el=>el.inert),true);await page.screenshot({path:path.join(out,name+'-movil.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name}: horizontal overflow`);
    }
    // Un editor no accede al panel de recepción aunque escriba la URL.
    await editor.goto(base+'/html/registrador.html');await editor.waitForURL('**/editor.html');
    console.log('OK: paneles de escritorio/móvil, CRUD, soporte privado, registro, cobro, constancia, cierre y redirección por rol.');
  }finally{await Promise.all(contexts.map(c=>c.close()));await browser.close();await new Promise(r=>server.close(r));await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
