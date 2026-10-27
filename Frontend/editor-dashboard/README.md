# Panel de Edición · IcaTurismo

Aplicación **separada** del panel de administración.

## Arranque

```bash
cd Frontend/editor-dashboard
npm install
npm run dev
```

Abre **http://localhost:5174**

## Requisitos

- Backend en marcha (`Backend` → `npm run dev`, normalmente puerto 3000)
- Usuario con rol `editor` o `admin`
- Variable opcional: `VITE_API_URL=http://localhost:3000` (o la URL de tu API)

## Qué incluye

- Login propio
- Biblioteca multimedia
- Gestión de páginas y rutas
- Editor de bloques de contenido
