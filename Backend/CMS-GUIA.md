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

Ambas acciones seleccionan la promoción en el formulario existente de `compras.html`. **Comprar experiencia** utiliza el modo de solicitud de compra. El sistema registra la reserva con pago pendiente; no se añadió una pasarela ni se procesa un cargo bancario. Para cobrar en línea se requiere integrar un proveedor de pagos en una tarea aparte.

## Despliegue

Backend (desde `Backend/`):

```sh
npm install
npm run db:migrate
npm start
```

La migración nueva `src/database/migrations/002_cms_contenido.sql` agrega `destinos.descripcion`, `promociones.ubicacion`, `promociones.incluye` e `itinerario`. La API también ejecuta migraciones pendientes al arrancar. No se vuelve a modificar la migración 001 ya aplicada.

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
