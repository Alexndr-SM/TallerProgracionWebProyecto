/* Shared conveniences for reception and support; all actions use their existing permissions. */
(() => {
  const role=document.body.dataset.role, view=document.getElementById('view');
  const actions=document.querySelector('.top-actions');
  actions.insertAdjacentHTML('afterbegin','<label class="team-search"><span class="sr-only">Buscar en esta sección</span><input id="team-search" type="search" placeholder="Buscar en esta sección…"><kbd>Ctrl K</kbd></label>');
  actions.insertAdjacentHTML('beforeend','<button class="icon-btn" id="team-theme" aria-label="Cambiar tema">☼</button><details class="team-activity"><summary aria-label="Actividad y notificaciones"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><i hidden></i></summary><div class="team-activity-panel"><strong>Tu actividad</strong><div id="team-activity-items"></div><small>Información del panel cargado.</small></div></details><a class="team-logo" href="../index.html" target="_blank" rel="noopener" aria-label="Ver IcaTurismo"><img src="../assets/logoIcaTurismo.svg" alt="" width="38" height="38"></a><a class="icon-btn" href="perfil.html" aria-label="Mi perfil">◎</a>');
  const search=document.getElementById('team-search');
  const activity=document.getElementById('team-activity-items');
  let state;
  document.getElementById('team-theme').onclick=()=>{const next=document.documentElement.dataset.teamTheme==='dark'?'light':'dark';document.documentElement.dataset.teamTheme=next;document.documentElement.style.colorScheme=next;try{localStorage.setItem('icat_admin_theme',String(next==='dark'));}catch{/* Optional. */}};
  function filter(){const local=document.getElementById('search');if(local){local.value=search.value;local.dispatchEvent(new Event('input',{bubbles:true}));}else view.querySelectorAll('tbody tr[data-search]').forEach(row=>{row.hidden=!row.dataset.search.includes(search.value.trim().toLocaleLowerCase());});}
  search.addEventListener('input',filter);
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();search.focus();}if(event.key==='Escape'){document.querySelector('.team-activity').open=false;}});
  document.addEventListener('pointerdown',event=>{const details=document.querySelector('.team-activity');if(!details.contains(event.target))details.open=false;});
  function exportRows(){
    const table=view.querySelector('table');
    const rows=table?[...table.rows].filter(row=>!row.hidden).map(row=>[...row.cells].map(cell=>cell.innerText.trim())):[['Caso','Cliente','Asunto','Estado','Prioridad'],...(state?.data.casos||[]).filter(item=>!view.querySelector(`[data-case="${item.id}"]`)?.hidden).map(item=>[item.id,item.cliente,item.asunto,item.estado,item.prioridad])];
    const csv='\ufeff'+rows.map(row=>row.map(value=>'"'+String(value??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');
    const link=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.href=url;link.download=`icaturismo-${role}-${new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'})}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  document.addEventListener('icat:team-rendered',event=>{
    state=event.detail; search.value='';
    const heading=view.querySelector('.page-head');
    if(heading&&!heading.querySelector('.team-export')){const button=document.createElement('button');button.className='btn team-export';button.textContent='Exportar vista CSV ↓';button.onclick=exportRows;heading.append(button);}
    activity.replaceChildren();
    const messages=role==='soporte'?(state.data.casos||[]).filter(item=>item.estado!=='resuelto').slice(0,5).map(item=>({text:`#${item.id} · ${item.asunto}`,action:()=>view.querySelector(`[data-case="${item.id}"]`)?.click()})):[{text:state.data.turno&&!state.data.turno.closed_at?'Tu caja está abierta. Revisa los movimientos al cerrar.':'Tu caja está cerrada. Puedes iniciar un nuevo turno.',action:()=>view.querySelector('[data-action="open-shift"],#sale-form')?.scrollIntoView({behavior:'smooth'})}];
    if(!messages.length){const p=document.createElement('p');p.textContent='Todo al día. No hay casos pendientes.';activity.append(p);}
    messages.forEach(item=>{const button=document.createElement('button');button.textContent=item.text;button.onclick=()=>{item.action();document.querySelector('.team-activity').open=false;};activity.append(button);});
    document.querySelector('.team-activity i').hidden=!messages.length;
  });
  // Fast replies fill the composer; the agent reviews and sends them normally.
  const observer=new MutationObserver(()=>{const form=document.getElementById('reply');if(!form||form.querySelector('.team-replies'))return;const tools=document.createElement('div');tools.className='team-replies';['Hola, gracias por escribirnos. Vamos a ayudarte con tu consulta.','Para revisar tu reserva, compártenos su código y la fecha del tour.'].forEach((text,index)=>{const button=document.createElement('button');button.type='button';button.className='btn small';button.textContent=index?'Solicitar datos de reserva':'Saludo rápido';button.onclick=()=>{const field=form.querySelector('textarea');if(field.disabled)return;field.value=field.value?field.value+'\n'+text:text;field.focus();};tools.append(button);});form.prepend(tools);});
  observer.observe(view,{childList:true,subtree:true});
})();
