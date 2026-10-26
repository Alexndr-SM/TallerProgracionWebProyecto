# IcaTurismo: publicar contenido desde el panel

## Qué se puede administrar

Administradores y editores pueden crear, consultar, editar y eliminar destinos y promociones, subir portadas y galerías, ordenar las fotografías y ocultar promociones. Otros roles no pueden modificar el catálogo. El middleware JWT, login y registro existentes se conservan.

1. Entra al **Panel del equipo** con una cuenta de rol `admin` o `editor`.
2. Abre **Destinos → Nuevo destino**. Escribe el nombre y descripción, y sube una portada. La dirección se genera automáticamente si dejas el slug vacío.
3. Pulsa **Crear y publicar**. Aparecerá en Inicio, el desplegable de destinos y el pie de página.
4. Abre **Promociones → Nueva promoción**. Selecciona el destino, añade descripción, precio, duración, ubicación, qué incluye e itinerario. Sube la imagen principal y hasta diez fotografías de galería.
5. Ordena las fotografías con las flechas y guarda. **Ver página** abre el resultado público.
6. Utiliza **Editar** para cambiar el contenido. Desmarca **Publicar promoción** para ocultarla sin eliminarla. El botón de papelera permite eliminarla con confirmación.

Un destino con promociones no se puede eliminar: mueve sus promociones a otro destino o elimínalas primero. Al eliminar una promoción, las reservas mantienen su nombre y precios históricos. Los archivos de Cloudinary no se borran automáticamente, ya que pueden estar compartidos.

## Plantillas y actualización

- `Frontend/html/destino.html?slug=selva`: portada, descripción y tarjetas de promociones con mini carruseles.
- `Frontend/html/promocion.html?slug=aventura-selva`: información a la izquierda, portada a la derecha, precio, reserva/compra, galería panorámica con máscara degradada, ampliación de imágenes e itinerario.
- Encabezado, cuenta, navegación, temas claro/oscuro y pie compartidos.
- Las tarjetas y enlaces del catálogo se construyen desde la API; no se crean archivos HTML por registro.
- Se consulta sin caché al abrir la página y al volver a una pestaña. Las pestañas ya abiertas se actualizan cada 20 segundos mientras son visibles; los cambios del editor en el mismo navegador también se anuncian entre pestañas. Si el contenido no cambió, se conserva el desplazamiento del carrusel.
- Las animaciones respetan la preferencia de movimiento reducido. Los carruseles admiten deslizamiento, botones y teclas de dirección; la imagen ampliada se cierra con Escape.

Los enlaces antiguos del menú y del pie apuntan al catálogo dinámico. Las tarjetas de las categorías antiguas ahora enlazan al detalle dinámico. Los archivos históricos siguen disponibles para conservar sus direcciones existentes.

## Reservas y compra

Ambas acciones seleccionan la promoción en `compras.html`. El carrito muestra fotografía, fecha, viajeros, método elegido y total; el servidor vuelve a calcular el precio al guardar. Las reservas recientes se consultan desde la API y permiten retomar una reserva, **Simular pago** o **Cancelar reserva** sin salir de la página. La última reserva consultada se recuerda por usuario en la pestaña y se vuelve a consultar al recargar.

**Todos los pagos son ficticios.** Se reutiliza el endpoint de demostración `PATCH /api/perfil/reservas/:id/confirmar-pago`, que cambia los estados a `confirmada` / `pagado` y responde `simulado: true`. No hay pasarela, cobros ni captura de datos de tarjeta. Cancelar una reserva pendiente utiliza el endpoint existente del perfil, conserva el historial y revierte los puntos según las reglas existentes. Una reserva pagada no se puede cancelar desde este carrito; el flujo de reembolso del perfil sigue disponible. Las fechas del formulario y la validación del backend utilizan `America/Lima`.

## Biblioteca multimedia

En **Principal → Biblioteca multimedia**, debajo de Promociones, el equipo puede consultar el material gráfico público de Cloudinary, abrir una vista previa, copiar su dirección y subir imágenes nuevas. Está disponible únicamente para `admin` y `editor`.

El endpoint protegido **GET /api/admin/medios?cursor=…** consulta bloques de 24 recursos. No descarga toda la biblioteca: el siguiente bloque se solicita al llegar al final de la lista, con un botón «Cargar más imágenes» como alternativa. Las miniaturas se entregan a 420 × 280 con calidad/formato automáticos y `loading="lazy"`. La búsqueda actúa únicamente sobre las imágenes ya cargadas, para evitar barrer toda la cuenta con cada búsqueda.

En los campos **Portada del destino**, **Imagen principal**, **Galería de la promoción** e **Imagen de fondo** aparece **Elegir de la biblioteca**. Selecciona una imagen para portada/fondo, o hasta diez para la galería, y pulsa **Usar imagen seleccionada / Usar selección**. Se guardan las URLs existentes, conservando la posibilidad de reordenar y quitar imágenes; no se sube otra copia. También puedes seguir subiendo material nuevo desde esos campos.

Privacidad: se excluyen recursos privados/autenticados, archivos con control de acceso, carpetas de perfiles/clientes (incluido `asset_folder` en cuentas con carpetas dinámicas) e imágenes cuyo ID o URL esté asociado a cualquier usuario en PostgreSQL. El filtro se aplica en el servidor y vuelve a consultar las asociaciones en cada solicitud, aunque exista una página de Cloudinary en caché. Si no se puede comprobar la privacidad, no se entrega la lista. El CRUD de destinos y promociones también rechaza URLs de perfiles, incluidas variantes transformadas, aunque se envíen manualmente. La biblioteca no devuelve cuentas, fotos ni metadatos privados de clientes.

Las páginas brutas de Cloudinary se mantienen hasta 30 segundos en una caché acotada del servidor para reducir solicitudes simultáneas; una subida correcta invalida esa caché. No se borra ni mueve material existente, ni se cambia su visibilidad en Cloudinary. Esta función no requiere migraciones ni nuevas credenciales: usa la configuración Cloudinary ya existente del backend y su Admin API. Si esa API no está configurada, autorizada o alcanza su cuota, la interfaz muestra un error recuperable.

Referencias de implementación: [paginación de Admin API](https://cloudinary.com/documentation/admin_api#get_resources) y [optimización de imágenes](https://cloudinary.com/documentation/image_optimization).

## Fondos, paleta y carruseles

En **Destinos → Editar** y **Promociones → Editar** aparece **Imagen de fondo de la página (opcional)**. Se puede subir con Cloudinary, previsualizarla, cambiarla, quitarla o pegar una URL HTTPS. Es independiente de la portada, la imagen principal y la galería. Una promoción sin fondo propio hereda el del destino; si tampoco existe, se utiliza su imagen principal. Un destino sin fondo propio utiliza su portada.

Las plantillas comparten con Inicio los tokens de `style.css`: texto, velos, cristal, menú, encabezado, pie y sus variantes claro/oscuro. El encabezado conserva su degradado transparente y `backdrop-filter: blur(10px)`. No se crean paletas independientes para el CMS.

Las galerías y mini carruseles son automáticos y circulares. Las flechas están superpuestas a los extremos, fuera de la máscara de degradado. Hay contador, pausa/reanudación, teclado, desplazamiento táctil y ampliación de imágenes. La reproducción se detiene al pasar el puntero, mantener el foco, interactuar por tacto, abrir la imagen ampliada, ocultar la pestaña o salir del área visible. Con movimiento reducido comienza pausada. Las copias visuales del bucle quedan fuera de la navegación de teclado y del árbol accesible.

Después de **Sigue descubriendo** se muestran hasta cuatro promociones aleatorias publicadas, sin repetir la promoción actual. En los destinos se priorizan las promociones de otros destinos. Si hay menos contenido disponible, se muestra únicamente el existente.

## Resumen administrativo y herramientas del panel

El resumen tiene temas oscuro y claro, arte tropical local, tarjetas navegables, gráficos interactivos y períodos de 7, 30 o 90 días. El gráfico diario alterna reservas/ingresos, permite fijar un día con clic o teclado y exporta un CSV. La distribución por método permite seleccionar una categoría. También aparecen estados, viajeros, destinos más reservados, importe pendiente y próximas salidas.

**GET /api/admin/analytics?days=30** está protegido para `admin`, `registrador` y `soporte`, igual que el resumen existente. `editor` conserva su panel de contenido y no puede consultar esta analítica. La consulta agrega todas las reservas en PostgreSQL, independientemente del límite de los listados recientes. Rellena días sin actividad con cero, compara períodos de igual duración y calcula los límites en `America/Lima`. No requiere una migración nueva.

Los ingresos del período son la suma de reservas **creadas en ese período** que actualmente tienen pago confirmado; no representan la fecha en que se realizó cada pago. El importe pendiente es histórico y excluye cancelaciones. Los pagos siguen siendo de demostración. No se inventan porcentajes de crecimiento cuando el período anterior es cero.

La búsqueda (Ctrl/Cmd + K) abre secciones y encuentra promociones, destinos, clientes o reservas entre los registros cargados y permitidos por el rol. Los avisos muestran hasta ocho reservas pendientes recientes, permiten abrir su registro exacto y guardar su lectura por usuario en este navegador. No son notificaciones push. El panel consulta de nuevo cada 60 segundos mientras está visible, al volver a la pestaña y al pulsar Actualizar; muestra la hora de sincronización o un error recuperable. El listado de pedidos también exporta sus filas filtradas a CSV, con protección frente a fórmulas en texto.

Los nuevos componentes son `AdminDashboard.jsx`, `AdminHeader.jsx`, `dashboardUtils.js` y `AdminTheme.css`. El arte y los prompts de generación están en `Frontend/assets/admin/README.md`. No se modificó el flujo de autenticación JWT.

En el sitio público, Destinos se despliega al pasar un puntero de precisión. Conserva clic, tacto y teclado; Escape y clic fuera lo cierran. No muestra flecha y comparte exactamente el degradado y el difuminado del encabezado.

## Despliegue

Backend (desde `Backend/`):

```sh
npm install
npm run db:migrate
npm start
```

La migración `002_cms_contenido.sql` agrega las descripciones y el contenido editorial. La nueva `003_cms_fondos.sql` agrega `imagen_fondo_url` a destinos y promociones sin cambiar los datos existentes. La API también ejecuta migraciones pendientes al arrancar. No se vuelven a modificar las migraciones ya aplicadas.

Frontend: conserva la compilación aislada de React en Render:

```sh
pnpm --dir Frontend/admin-dashboard install --frozen-lockfile
pnpm --dir Frontend/admin-dashboard build
```

Publica la carpeta **Frontend**. No publiques solo `html/` ni solo `admin-dashboard/dist/`. El bundle generado queda ignorado por Git, de acuerdo con la configuración anterior del proyecto.

Configura `Frontend/js/config.js` para apuntar a la API y `CORS_ORIGIN` del backend para permitir el dominio del frontend. Cloudinary utiliza las mismas variables de entorno existentes; no se agregan credenciales al navegador.

Las portadas e imágenes de las promociones heredadas pueden estar vacías. El sitio utiliza imágenes locales de respaldo hasta que el editor complete las portadas. No se cambian automáticamente las imágenes o textos de tus registros reales.

## Archivos principales

- Backend: migración 002, validación `utils/cms.js`, controladores de destinos/promociones y rutas de catálogo/subida para los roles `admin` y `editor`.
- Editor React: `Frontend/admin-dashboard/src/CmsPanel.jsx`, `CmsPanel.css` e integración en `App.jsx`.
- Sitio público: `Frontend/js/cms-public.js`, `Frontend/css/cms-public.css`, `Frontend/html/destino.html` y `promocion.html`; carga compartida en las páginas existentes con menú.
- Integración con reservas: `Frontend/js/metodoPago.js`; enlaces del catálogo anterior: `promociones-dinamicas.js`.

## Verificación

```sh
cd Backend
npm install --no-save --package-lock=false @electric-sql/pglite@0.3.14
npm test
```

Las pruebas SQL utilizan PostgreSQL efímero en memoria y las de imágenes simulan Cloudinary. No usan la base de producción. El frontend se verifica con `npm run build` dentro de `Frontend/admin-dashboard` y con pruebas del navegador en escritorio y móvil. La conexión real a Cloudinary debe comprobarse con las credenciales del despliegue.

## Galería panorámica de promociones

La sección «Imagina estar aquí» utiliza un panorama circular 3D adaptado a JavaScript Vanilla del CircularCarousel compartido por el cliente (React Bits). La cabecera y los controles tienen texto centrado; las fotos conservan su color y heredan los velos y colores claro/oscuro del sitio. Se carga únicamente en `promocion.html`, sin añadir React ni dependencias shadcn al sitio público.

Cada promoción usa su imagen principal y `galeria_urls`, sin repetir URLs en el conjunto editorial. Para crear o cambiar el carrusel basta con editar esas imágenes en el panel; no hay campos, migraciones ni subidas nuevas. Las copias necesarias para el anillo son visuales, no recursos nuevos de Cloudinary, y no se anuncian repetidamente a lectores de pantalla. Una sola imagen se muestra estática y puede ampliarse.

El panorama tiene introducción de giro, desplazamiento continuo circular, profundidad y curvatura por segmentos; permite arrastrar con ratón o tacto, usar las flechas laterales, Home/End y abrir la imagen centrada con Enter o «Ampliar imagen». Pulsar otra foto la centra. La rueda vertical conserva el desplazamiento de la página; el gesto horizontal controla la galería. Las flechas quedan sobre los extremos desvanecidos, fuera de la máscara. El botón de pausa y el contador permanecen centrados.

La reproducción se pausa al pasar el mouse, enfocar la galería, abrir una foto, ocultar la pestaña o salir del área visible. Con movimiento reducido comienza pausada, no tiene introducción ni paralaje y la navegación manual es inmediata. Se liberan observadores, eventos, animaciones y temporizadores al actualizar el catálogo. Los mini carruseles de tarjetas de destinos y recomendaciones conservan su comportamiento previo.

Archivos: `Frontend/js/circular-carousel.js`, `Frontend/css/circular-carousel.css`, integración en `cms-public.js` y `html/promocion.html`. El aviso de autor y la licencia de React Bits están en `Frontend/licenses/react-bits.md`. Solo hay que publicar estos archivos con el frontend; este cambio no requiere recompilar el panel.
