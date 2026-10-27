# Paneles de IcaTurismo

Los tres paneles nuevos utilizan HTML, CSS y JavaScript nativo. No requieren React, Vite ni una compilación del frontend. El panel editor React conservado en `Frontend/editor-dashboard` permanece disponible en el proyecto; los accesos del sitio ahora abren el nuevo panel HTML.

| Rol de la cuenta | Página | Funciones |
| --- | --- | --- |
| `editor` | `/html/editor.html` | CRUD de destinos, promociones y precios; portadas, fondos, galerías; biblioteca Cloudinary; widgets del inicio. |
| `soporte` | `/html/soporte.html` | Casos escalados, historial, respuestas al viajero, notas internas, prioridad, asignación a quien atiende, resolución y reapertura. |
| `registrador` | `/html/registrador.html` | Clientes presenciales con documento único; apertura de turno, cobros, efectivo recibido, vuelto, constancias imprimibles y cierre con diferencia de caja. |

El administrador puede abrir cualquiera de los paneles. Los empleados se crean desde el panel administrativo existente, sección Equipo, con el rol correspondiente. El registro público siempre crea clientes; no permite elegir roles del equipo. No se crean cuentas predeterminadas ni se cambian contraseñas existentes.

## Puesta en marcha

1. En `Backend`, instalar dependencias con `pnpm install` (o `npm install`). Para ejecutar pruebas, incluir las dependencias de desarrollo.
2. Configurar `Backend/.env` con la conexión PostgreSQL y `JWT_SECRET` existentes. Para subir imágenes se requieren las credenciales Cloudinary del proyecto. `CORS_ORIGIN` debe permitir el origen del frontend.
3. Arrancar con `pnpm start` o `npm start`. El arranque prepara las tablas base y ejecuta automáticamente la migración nueva `004_paneles_equipo.sql`. En una instalación ya inicializada también se puede aplicar con `npm run db:migrate`.
4. Servir la carpeta `Frontend` como sitio estático. En localhost, `js/config.js` usa la API `http://localhost:3000`; en producción conserva la URL Render existente. Se puede ajustar allí la URL del backend.
5. Iniciar sesión normalmente. Cada empleado se dirige a su panel. El menú de cuenta también enlaza directamente al panel de su rol.

Para publicar, desplegar tanto `Backend` como `Frontend`; el backend remoto anterior no contiene las rutas nuevas. La migración agrega tablas sin borrar datos previos. No se ha ejecutado contra la base de producción desde este trabajo.

## Contenido y widgets

Las imágenes usan `/api/uploads` y la biblioteca existente. No se aceptan fotos privadas de perfiles como contenido editorial. El editor admite destinos con descripción, portada y fondo; promociones con precio, duración, ubicación, textos, itinerario, elementos incluidos y hasta diez imágenes en la galería.

Los widgets son banners, tarjetas y avisos estructurados; no ejecutan código HTML ni JavaScript. Se pueden crear, ordenar, ocultar y eliminar. Los visibles aparecen en el inicio, que los consulta cada veinte segundos y al recuperar el foco. Sus enlaces admiten rutas internas como `/html/contacto.html`.

## Atención humana

El enlace **Atención humana**, junto al chatbot de la web, abre `/html/atencion.html`. Un cliente autenticado abre un caso con asunto, prioridad y descripción, puede pegar el fragmento relevante de su conversación y consultar las respuestas. Cada cliente solo puede ver sus casos. El historial se actualiza cada diez segundos sin borrar los mensajes que se están redactando. Solo soporte y administración pueden leer notas internas.

El chatbot de Chatbase se conserva. No se importa su historial privado automáticamente: eso requiere credenciales y una integración de Chatbase. Este canal registra conversaciones propias en PostgreSQL y no simula respuestas, envío de correos ni atención automática.

## Caja presencial

Cada usuario de recepción tiene un único turno abierto. Los clientes presenciales se guardan aparte de las cuentas de inicio de sesión y no necesitan correo ni contraseña. El precio y total del cobro se calculan en el servidor desde la promoción activa. Los importes se calculan en céntimos. Las escrituras usan transacciones, bloqueo del turno y un identificador único de operación para evitar duplicados al reintentar un cobro.

Efectivo registra importe recibido y vuelto. Yape, tarjeta y transferencia requieren una referencia de pago que el empleado haya comprobado; no se procesan cargos mediante una pasarela. El cierre guarda fondo, efectivo esperado, conteo y observaciones; las ventas digitales no incrementan el efectivo esperado.

Las ventas presenciales quedan en `caja_ventas`, vinculadas al cliente, empleado mediante su turno y promoción, con nombre/precio históricos. Son un registro de caja independiente de las reservas online de `reservas`. Las constancias impresas son internas; la facturación tributaria y una pasarela bancaria requieren sus respectivas integraciones.

## Verificación

Desde `Backend`: `npm test`. La batería incluye PostgreSQL temporal con PGlite; no modifica una base real. Comprueba migraciones repetibles, CRUD, privacidad, permisos por rol, fechas, importes, cobros duplicados y cierre de caja, además de las pruebas existentes del proyecto.

`scripts/verify-panels.cjs` verifica recorridos en Chrome mediante Playwright y una base temporal: edición, widgets, casos, notas privadas, clientes, cobro, constancia, cierre, redirección por rol y ausencia de desbordamiento horizontal a 390 px. Requiere Playwright accesible desde Node y Chrome instalado (o `CHROME_PATH`). Guarda capturas en `.qa/`, ignorada por Git. No accede a datos ni credenciales de producción.
