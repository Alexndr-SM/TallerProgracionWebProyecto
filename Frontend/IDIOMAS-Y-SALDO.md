# Saldo compacto e idiomas públicos

La página de canje utiliza `rewards-wallet.js` y `rewards-wallet.css`. La misma tarjeta se anima desde un espacio reservado en la cabecera hasta la esquina inferior derecha cuando su posición original sale bajo el menú. Muestra únicamente saldo y unidad; al subir recupera su tamaño y posición. El enlace del saldo devuelve a la tarjeta original. La reserva de espacio evita saltos de contenido y la animación respeta movimiento reducido.

La posición compacta se recalcula en scroll/resize con requestAnimationFrame. Se mantiene al menos a 18 px del inicio del footer. Si no queda espacio entre el encabezado y el footer, se oculta y deja de recibir foco. ResizeObserver contempla cambios de tamaño, fuentes, traducción y contenido.

El motor `i18n.js` conserva el texto español de origen mediante WeakMap y actualiza texto y atributos, sin reemplazar la estructura del encabezado, recargar ni ocultar el body. El selector cambia entre ES/EN/FR conservando campos, filtros, parámetros de la URL y desplazamiento. La elección explícita de idioma en la URL también se conserva al navegar. Hay sincronización entre pestañas y al restaurar páginas desde la caché de navegación.

`i18n-public-dict.js` amplía el diccionario para el catálogo, canje, checkout, navegación y sus estados dinámicos. Los nombres, descripciones editoriales, campos escritos y comentarios no se traducen parcialmente por coincidencia con palabras de la interfaz. No hay servicios externos de traducción. Las fechas marcadas con datetime o data-i18n-date se localizan explícitamente en hora de Perú; no se modifica Date.prototype ni window.alert. Las alertas de formularios públicos solicitan su traducción de manera explícita.

Se retiran los scripts de idioma de admin/editor/soporte/registrador y el motor también contiene una exclusión por ruta. Los paneles del equipo permanecen en español independientemente del idioma público. El canje, que no cargaba el motor, ahora recibe los tres scripts en el head. El pie de destinos se actualiza mediante un marcador estable y no mediante una comparación con la palabra traducible «Destinos».

Comprobaciones locales con datos ficticios: tarjeta de 154 × 64 px en escritorio y 140 × 58 px en móvil, límite de 18 px antes del footer, retorno al subir, cambios EN → FR → ES sin perder búsqueda/mensaje ni posición mediante clic real, fechas francesas y conservación de comentarios de prueba. Con preferencia pública FR y query lang=fr, admin conserva lang=es y cero scripts de idioma. Los módulos nuevos pasan Oxlint y los archivos JavaScript modificados pasan verificación de sintaxis. No hay cambios de backend, JWT ni pagos.

Publicar todos los HTML/JS/CSS modificados juntos. No se requieren migraciones ni nuevas dependencias. La prueba de navegador usa un servidor local temporal que se retira antes del commit.
