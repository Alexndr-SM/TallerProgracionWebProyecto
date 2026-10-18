# Panel de administración IcaTurismo

El dashboard React se integra como una isla en `../html/admin.html`. La página conserva su validación de sesión y permisos con la API; React solo se monta después de que el servidor confirma el acceso administrativo. Sus estilos y dependencias se compilan en un bundle aislado y no se cargan en las demás páginas del sitio.

## Desarrollo y compilación

Desde esta carpeta:

```sh
pnpm install
pnpm dev
pnpm build
```

## Despliegue en Render

El bundle `dist/` está ignorado por Git: Render tiene que generarlo durante el deploy. En el Static Site existente, configura:

- **Root Directory:** vacío (raíz del repositorio).
- **Build Command:** `pnpm --dir Frontend/admin-dashboard install --frozen-lockfile && pnpm --dir Frontend/admin-dashboard build`
- **Publish Directory:** `Frontend`

Así Vite genera `Frontend/admin-dashboard/dist/`, las mismas rutas que carga `Frontend/html/admin.html`. No configures `Frontend/html` como directorio de publicación: las rutas relativas de páginas y recursos están planteadas desde `Frontend`.

Para desarrollo local, desde esta carpeta ejecuta `pnpm install` y luego `pnpm dev`. También puedes verificar el bundle de producción con `pnpm build`.

## Datos y permisos

El panel consulta PostgreSQL mediante la API: muestra reservas y clientes reales, mantiene las promociones del catálogo y permite a los administradores registrar empleados. Al iniciar la API se agregan las columnas/tablas que faltan y se inicializan las promociones que ya aparecen en las páginas de categorías; las modificaciones posteriores del catálogo se conservan.

| Rol | Acceso |
| --- | --- |
| `admin` | Resumen, reservas, clientes, promociones y equipo |
| `registrador` | Resumen, reservas (incluidas reservas presenciales) y consulta de clientes |
| `soporte` | Resumen, consulta de reservas y clientes |
| `editor` | Alta, edición y desactivación de promociones |

El estado activo/inactivo se valida en el servidor en cada solicitud autenticada. Para las reservas se guarda una copia del nombre y del precio unitario de la promoción, de modo que cambios futuros no alteren el historial. Los formularios de pago todavía no se conectan a una pasarela: las reservas muestran el pago como pendiente y la página no solicita ni almacena datos de tarjetas.

El tema se conserva en `localStorage`; los datos operativos ya no se guardan allí.
