(() => {
  const mount = document.querySelector('[data-widgets]');
  if (!mount) return;
  let signature = '',loading=false;
  const node = (tag, cls, text) => {const el=document.createElement(tag);el.className=cls;if(text)el.textContent=text;return el;};
  async function refresh(){
    if(loading||document.hidden)return;loading=true;
    try{const response=await fetch(`${(window.API_URL||'').replace(/\/$/,'')}/api/equipo/widgets/publicos`,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Widgets no disponibles');const data=await response.json(),next=JSON.stringify(data.widgets);if(next===signature)return;
      const content=document.createDocumentFragment();
      data.widgets.forEach(w=>{
        const card=node('article','site-widget site-widget--'+w.tipo);
        if(w.imagen_url){try{if(new URL(w.imagen_url).protocol==='https:'){const img=node('img','site-widget-image');img.src=w.imagen_url;img.alt='';img.loading='lazy';card.append(img);}}catch{/* URL inválida */}}
        const body=node('div','site-widget-body');body.append(node('span','site-widget-label',w.tipo==='aviso'?'PARA TU PRÓXIMO VIAJE':'DESCUBRE ICATURISMO'),node('h2','',w.titulo),node('p','',w.texto));
        if(w.enlace&&/^\/(?!\/)[a-zA-Z0-9/_#.=?&%-]*$/.test(w.enlace)){const a=node('a','site-widget-link','Descubrir más →');a.href=w.enlace;body.append(a);}card.append(body);content.append(card);
      });mount.replaceChildren(content);signature=next;
    }catch(error){console.warn('Widgets:',error.message);}finally{loading=false;}
  }
  refresh();setInterval(refresh,20000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);window.addEventListener('storage',e=>{if(e.key==='icat_catalog_updated')refresh();});
})();
