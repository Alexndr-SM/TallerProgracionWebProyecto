# Limpieza y actualización de Contacto

Se revisaron las referencias del código, HTML, CSS, configuración y documentación antes de retirar recursos. Se conserva `pnpm-lock.yaml` y la configuración de pnpm del proyecto.

## Recursos retirados

- Ejemplos del dashboard sin referencias: `src/assets/hero.png`, `logo-ica.webp`, `react.svg`, `vite.svg` y `public/icons.svg`, dentro de `Frontend/admin-dashboard/`.
- Componente sin consumidores: `Frontend/admin-dashboard/src/components/ui/button.jsx`.
- Metadatos de instalación que no deben versionarse: los tres archivos rastreados de `node_modules/` y el `package-lock.json` de la raíz.
- Código inalcanzable del catálogo anterior en `App.jsx`: `ProductsPage`, `ProductModal`, su estado y los controladores `saveProduct`/`toggleProduct`. Destinos y Promociones siguen utilizando `CmsPanel` y sus rutas actuales.

Son diez archivos retirados del repositorio (82 221 bytes), más el código antiguo del catálogo. `.gitignore` evita volver a incorporar instalaciones, compilaciones y el lock de npm de la raíz. Las instalaciones locales se conservan para desarrollar y compilar.

Se conservaron las páginas y hojas de estilos antiguas de promociones porque aún reciben enlaces. También se conservaron el favicon utilizado por el servidor Vite, `src/lib/utils.js` referenciado en la configuración de shadcn, migraciones, pruebas, imágenes del CMS y las rutas existentes.

## Contacto y navegación

Contacto utiliza el encabezado y pie compartidos de `cms-public.js`; el menú Destinos lee la API igual que Inicio. Los tres elementos superiores comparten fuente, altura y alineación. La página presenta tarjetas de información, formulario, mapa y botones de Facebook, Instagram, YouTube y WhatsApp con los enlaces ya configurados. El relleno y los tooltips funcionan también al enfocar con teclado; los estilos están limitados a Contacto y contemplan movimiento reducido. El diseño de botones se inspira en el ejemplo aportado de Uiverse.io por wilsondesouza.

El formulario prepara un correo para `info@icaturismo.dev` y ofrece copiar el mensaje. Informa que el envío se confirma en la aplicación de correo; no muestra una entrega ficticia ni requiere un servicio nuevo. Si el navegador no permite copiar, muestra el texto seleccionable para hacerlo manualmente.

## Estrellas

Inicio y Comentarios comparten estrellas grises vacías y doradas seleccionadas. El hover previsualiza la puntuación; salir del control restaura la selección. Flechas derecha/arriba aumentan, izquierda/abajo disminuyen y Home/End seleccionan 1/5. Se conserva el campo `calificacion` y su validación nativa; el envío autenticado y la foto de perfil mantienen su flujo actual. El texto de ayuda anuncia la selección y se reinicia tras publicar. Inspiración visual: ejemplo de Uiverse.io por PriyanshuGupta28.

## Publicación

Publicar el frontend completo y recompilar el dashboard con `pnpm --dir Frontend/admin-dashboard build`. Este cambio no modifica autenticación, esquema ni rutas del backend.
