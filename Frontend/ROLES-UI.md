# Espacios del equipo, canjes y navegación

La implementación parte de `main` actualizado con `git pull --ff-only origin main` (base `2f2a843cc0d19ba90106093f9f1f58fd710cb13f`). La carpeta original era una descarga sin `.git`; la copia de trabajo está en `_work/roles-interface`.

## Roles

- **Editor:** `editor.html` monta el mismo dashboard React del administrador y utiliza `CmsPanel`, `ImagePicker` y `MediaBrowser`. Tiene un resumen editorial, accesos para crear destinos/promociones, revisión de promociones ocultas, biblioteca multimedia, catálogo de canje y gestión de widgets del inicio. Crear, editar, borrar, seleccionar varias imágenes, reutilizar portadas y fondos usan las rutas existentes del CMS. Los nuevos widgets también pueden elegir imágenes de la biblioteca.
- **Registrador:** conserva el registro presencial, apertura/cierre de caja, cobros, vuelto y constancias del módulo nativo. Añade diseño y paletas similares al panel React, búsqueda de la vista, actividad de caja, exportación CSV de los registros visibles y acceso al perfil.
- **Soporte:** conserva conversaciones, asignación, prioridad, estado y notas internas. Añade búsqueda, actividad pendiente, exportación de los casos visibles y respuestas rápidas que solo rellenan el borrador. El envío continúa siendo una acción explícita. La actualización de mensajes conserva el texto que se está escribiendo.

Los permisos y el JWT se siguen validando por las rutas del backend. El editor comparte la interfaz del administrador para sus herramientas editoriales; las opciones del equipo siguen correspondiendo a las capacidades que ya tiene cada rol. No hay cambios de autenticación ni de esquema.

## Canje de puntos

La página presenta una tarjeta de saldo, próximos beneficios, contador de beneficios alcanzables, búsqueda, filtro por tipo, orden por puntos y filtro por saldo disponible. Las tarjetas indican stock y puntos faltantes. Un diálogo muestra saldo anterior, costo y saldo restante antes de confirmar. El historial permite copiar códigos y muestra fechas en hora de Perú.

El botón de confirmación queda bloqueado durante el POST. La API existente sigue calculando el saldo y validando el stock. Tras un fallo se vuelve a consultar el catálogo; si no puede verificarse su estado, se bloquean los canjes hasta actualizar. Se conservan los estados de visitante y las restricciones para cuentas del equipo. No se añade ninguna pasarela de pago.

## Menú y parpadeo

Las ocho páginas públicas con `cms-public.js` contienen el mismo encabezado en su HTML inicial y cargan sus estilos desde el head. `public-shell.js` prepara la presentación de la cuenta antes del primer pintado; no decide permisos. La cuenta y el selector de idiomas reservan su espacio. El CMS actualiza únicamente las entradas del desplegable y deja intactos el encabezado y el menú principal. Se elimina la inserción repetida/tardía de la hoja de estilos del CMS.

El desplegable ocupa el ancho de su contenido (mínimo 150 px) con enlaces de 34 px y relleno de 6 px. Con tres destinos mide 150 × 116 px en escritorio. Mantiene apertura por hover, clic, teclado, Escape y uso móvil. El fondo utiliza las mismas variables y transparencias que el encabezado.

## Comprobaciones y despliegue

Se compila el dashboard con `npm run build --prefix Frontend/admin-dashboard` y se publican todos los HTML/CSS/JS cambiados; `dist` sigue siendo un artefacto generado. La compilación pasa. Los scripts nuevos y el módulo editorial pasan Oxlint. Los avisos de efectos y fecha que ya existían en App/CmsPanel no forman parte de esta renovación.

Revisión local con API ficticia: crear promoción usando una imagen de biblioteca para la galería, abrir el formulario de widgets, buscar beneficios, filtrar por saldo, confirmar un canje de 250 puntos (850 → 600), copiar el código, calcular total/vuelto en recepción, exportar CSV y abrir/cerrar el menú de soporte en móvil. No se enviaron mensajes reales ni se usaron cuentas o datos de clientes.

Se comprobó que Inicio, Contacto, Destino y Canje mantienen el encabezado con 105 px de alto, el mismo origen horizontal del menú y una sola hoja CMS en 1440 px. Las vistas móviles revisadas no tienen desbordamiento horizontal. El servidor de pruebas y sus fixtures se retiran antes del commit.
