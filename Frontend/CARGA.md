# Pantalla de carga de IcaTurismo

`css/page-loader.css` y `js/page-loader.js` se cargan después de `theme.js` en las páginas públicas y en `html/admin.html`. La ilustración de dunas, sol, oasis y palmera es SVG propio; no descarga fotografías ni añade paquetes.

- La bienvenida aparece en la primera visita de cada pestaña y al recargar. La navegación pública dentro de la misma sesión permanece directa. Si el navegador bloquea sessionStorage, la pantalla sigue funcionando sin guardar esa preferencia.
- Entrar al panel siempre muestra su variante «Detrás de cada experiencia». Respeta `icat_admin_theme`; la bienvenida usa el tema público existente. Los enlaces al panel mantienen su navegación nativa, incluidos clic modificado, nueva pestaña y descargas.
- El sitio espera al DOM y a la imagen destacada cuando existe. En páginas CMS espera a que desaparezca el estado `aria-busy` de su contenido. No espera al chatbot, a todas las fotografías ni a servicios externos secundarios.
- En el panel se refleja el texto del estado de conexión existente. `admin:mounted` ahora se emite desde un efecto de React después de montar su contenido, en lugar de inmediatamente después de solicitar el render. No cambia la validación de sesión, permisos ni JWT. Los datos del dashboard conservan sus propios indicadores de carga.
- La salida tiene un fundido de 320 ms y una presentación mínima de 450 ms. No muestra porcentajes ficticios. Un fallo que habilite «Reintentar conexión» también cierra la pantalla.
- «Continuar sin esperar» y Escape permiten salir inmediatamente. Límites absolutos: 8 segundos en el sitio y 12 segundos en el panel. Se muestra entonces la página y sus estados originales; no se cancela ninguna solicitud ni se omiten permisos.
- Se restauran el desplazamiento, el foco y el estado inert anterior al cerrar. Volver mediante la caché de navegación (`pageshow.persisted`) elimina cualquier transición pendiente. Si falta CSS o JavaScript, la página sigue siendo utilizable.
- `prefers-reduced-motion: reduce` desactiva todas las animaciones y la demora mínima. El estado de carga se anuncia mediante `role="status"`; los adornos quedan fuera del árbol accesible.

Para desplegar, publicar los HTML, CSS y JS actualizados y reconstruir el panel con `npm run build --prefix Frontend/admin-dashboard` (o el comando equivalente de pnpm). La carpeta `dist` sigue siendo un artefacto generado, no se añade al repositorio.

Validar primera entrada/recarga, navegación pública posterior, enlace al panel, cierre al montar React, fallo/espera de API, Escape/botón, atrás/adelante, temas claro/oscuro y anchuras móviles. Las comprobaciones locales usan datos ficticios y no requieren cambiar la autenticación de producción.
