# IcaTurismo · Astro + idiomas (es / en / fr)

## Cómo probarlo
```bash
cd Frontend/web
npm install
npm run dev          # http://localhost:4321  -> redirige a /es/, /en/ o /fr/
```
Build de producción: `npm run build` (genera `dist/`).

## Cómo funcionan los idiomas
1. **Home (Astro)**: `/es/`, `/en/`, `/fr/`. Textos en `src/lib/home.ts` y `src/lib/i18n.ts`.
2. **Todas las demás páginas** (`public/html/**`: playas, dunas, cultura, promociones, contacto,
   login, registro, perfil, compras, comentarios): las traduce `public/js/i18n.js` en el navegador
   usando el diccionario `public/js/i18n-dict.js`.
   - Idioma = el que elegiste en la home (se guarda en `localStorage` como `icat_lang`).
   - También traduce lo que escriben los scripts: mensajes de `alert()`, errores del backend,
     tarjetas de reservas, modales, fechas, etc.
3. El selector de idioma (bandera) funciona en la home y en las páginas que cargan `Script.js`.

## Agregar o corregir una traducción
Abre `public/js/i18n-dict.js` y añade una entrada (la clave es el texto EXACTO en español):
```js
"Texto en español": ["English text", "Texte français"],
```
Si el texto tiene partes variables (nombres, números), usa un patrón en `ICAT_PATTERNS`
(ver ejemplos al final del mismo archivo).
Para ocultar algo de la traducción: `data-no-i18n` o `translate="no"` en el elemento.

## Lo que NO se traduce (viene de la base de datos)
Nombres y descripciones de promociones del backend, comentarios de usuarios y el panel admin.
Para traducirlos habría que guardar los textos en varios idiomas en la base de datos.

## Estructura
- `public/` → tus `css/`, `js/`, `assets/` y `html/` originales.
- `src/layouts/BaseLayout.astro` → head, header y footer idénticos a tu index.html.
- `src/pages/[lang]/index.astro` → home (una plantilla para los 3 idiomas).
- `src/components/LanguageSwitcher.astro` → selector con tu diseño `.language-picker`.

## Cambios en archivos originales (dentro de public/)
- `js/Script.js`: el selector de idioma ahora cambia el idioma de verdad (banderas locales).
- `js/auth.js` y `html/*.html`: enlaces a `index.html` → `/`; se carga `i18n-dict.js` e `i18n.js`.
