# Arte del panel IcaTurismo

Generado con la herramienta integrada `imagegen` en modo de generación de imágenes nuevas. Los fondos se entregan en JPEG optimizado y la palmera en PNG con transparencia real; no requieren Cloudinary ni subidas de clientes.

| Archivo | Uso | Tamaño |
| --- | --- | --- |
| `coastal-sunset.jpg` | Cabecera del resumen | 1400 × 933 px |
| `oasis-sunset.jpg` | Parte inferior de la barra lateral | 560 × 840 px |
| `palm-cutout.png` | Tarjeta «Reservas por método» | 440 × 660 px; canal alfa |

Los originales se redujeron y codificaron con System.Drawing. La tarjeta de métodos utiliza únicamente la palmera; su diminuto destello es un elemento CSS. El contraste, los velos y las variantes claro/oscuro se aplican en `AdminTheme.css`. Las imágenes se sirven como archivos separados para permitir caché y evitar insertarlas en el CSS compilado.

## Prompts finales

### coastal-sunset

Fondo transparente: no.

```text
Use case: photorealistic-natural. Asset type: production background photograph for IcaTurismo's dark administrative dashboard greeting banner. Create a wide cinematic 3:2 photograph of the Peruvian Pacific coast at twilight, a small warm apricot sun low on the horizon, soft copper reflection on quiet dark teal water. Sparse natural palm fronds frame only the upper right edge, the left half is mostly clean deep blue-green sky and shadow for a readable text overlay. Moody almost-black navy and petrol teal, a little soft blue and muted peach color but restrained saturation, realistic sea texture and fine atmospheric haze. Beautiful subtle editorial travel photograph, no graphic user interface, no writing, no people, no buildings, no logos, no watermark. Image only, landscape.
```

### oasis-sunset

Fondo transparente: no.

```text
Use case: photorealistic-natural. Asset type: production decorative background photograph for a narrow sidebar in an Ica tourism dashboard. Create a tranquil editorial photograph of the Huacachina oasis at dusk, silhouettes of a few palms, distant smooth sand dunes, a small apricot sunset behind them and a faint reflection on a quiet lagoon. Dark navy shadows with subtle petrol teal and muted sand/peach hues, modest color richness without high saturation. Composition has generous shadowed sky in upper half, scenery concentrated in lower half so navigation can be overlaid. Portrait 2:3 composition. Natural fine photographic textures, understated premium travel atmosphere, no text, no logo, no people, no buildings, no dashboard UI, no watermark.
```

### palm-cutout

Fondo transparente: sí.

```text
Use case: stylized-concept. Asset type: transparent decorative palm foliage cutout for an elegant dark tourism analytics card. Generate one graceful coconut palm curving gently from the lower right, with finely detailed natural fronds spreading into the upper half. Mostly deep ink navy and petrol teal foliage, restrained seafoam rim lighting and a very tiny warm golden glint on one leaf tip. Fine photorealistic leaf textures, clean silhouette with transparent gaps between fronds. Entire background genuinely transparent, no sky, no sun, no sea, no ground, no frame, no words, no UI, no additional objects, no large glow or lens flare. Palm fully contained within portrait composition, realistic and subdued, not neon, not oversaturated.
```

