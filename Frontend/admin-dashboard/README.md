# Panel de administración IcaTurismo

El dashboard React se integra como una isla en `../html/admin.html`. La página conserva su validación de sesión y permisos con la API; React solo se monta después de que el servidor confirma el acceso administrativo. Sus estilos y dependencias se compilan en un bundle aislado y no se cargan en las demás páginas del sitio.

## Desarrollo y compilación

Desde esta carpeta:

```sh
pnpm install
pnpm dev
pnpm build
```

Para publicar el sitio estático, compila el dashboard y despliega también `dist/` junto con `Frontend/html/admin.html`. La página administrativa carga `dist/admin-dashboard.js` y `dist/admin-dashboard.css`.

## Datos de demostración

Los productos, empleados y el tema se guardan en el `localStorage` del navegador. Los pedidos, clientes, estadísticas, eventos y puntos usan datos de ejemplo. Crear empleados, asignar permisos y editar el catálogo todavía no actualiza la base de datos ni crea cuentas en la API. La autorización real para entrar al panel permanece en el servidor.
