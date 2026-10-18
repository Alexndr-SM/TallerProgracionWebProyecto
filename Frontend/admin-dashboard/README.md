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

## Datos de demostración

Los productos, empleados y el tema se guardan en el `localStorage` del navegador. Los pedidos, clientes, estadísticas, eventos y puntos usan datos de ejemplo. Crear empleados, asignar permisos y editar el catálogo todavía no actualiza la base de datos ni crea cuentas en la API. La autorización real para entrar al panel permanece en el servidor.
