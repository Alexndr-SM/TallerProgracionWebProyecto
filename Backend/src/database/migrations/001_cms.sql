-- Fase 1. migrate.js ejecuta este archivo dentro de una transacción.
-- Conserva ids, campos heredados y referencias de reservas.
CREATE TABLE IF NOT EXISTS destinos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(180) NOT NULL CHECK (length(trim(nombre)) > 0),
  slug VARCHAR(120) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  imagen_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promociones (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  nombre VARCHAR(180) NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  categoria VARCHAR(40) NOT NULL,
  precio NUMERIC(10,2) NOT NULL CHECK (precio > 0),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE promociones
  ADD COLUMN IF NOT EXISTS destino_id INTEGER REFERENCES destinos(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS titulo VARCHAR(180),
  ADD COLUMN IF NOT EXISTS descripcion_corta VARCHAR(500) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS descripcion_larga TEXT,
  ADD COLUMN IF NOT EXISTS duracion VARCHAR(120) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS imagen_principal_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS galeria_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Las categorías anteriores se vinculan a los destinos públicos existentes.
INSERT INTO destinos (nombre, slug)
SELECT DISTINCT
  CASE categoria WHEN 'Naturaleza' THEN 'Playas' WHEN 'Aventura' THEN 'Dunas'
    WHEN 'Cultura' THEN 'Cultura' WHEN 'Gastronomía' THEN 'Gastronomía' ELSE 'Otros' END,
  CASE categoria WHEN 'Naturaleza' THEN 'playas' WHEN 'Aventura' THEN 'dunas'
    WHEN 'Cultura' THEN 'cultura' WHEN 'Gastronomía' THEN 'gastronomia' ELSE 'otros' END
FROM promociones ON CONFLICT (slug) DO NOTHING;
UPDATE promociones p SET destino_id = d.id FROM destinos d
WHERE p.destino_id IS NULL AND d.slug = CASE p.categoria
  WHEN 'Naturaleza' THEN 'playas' WHEN 'Aventura' THEN 'dunas' WHEN 'Cultura' THEN 'cultura'
  WHEN 'Gastronomía' THEN 'gastronomia' ELSE 'otros' END;
UPDATE promociones SET titulo = nombre WHERE titulo IS NULL;
UPDATE promociones SET descripcion_larga = descripcion WHERE descripcion_larga IS NULL;
UPDATE promociones SET descripcion_corta = left(descripcion, 500)
WHERE descripcion_corta = '' AND descripcion <> '';
ALTER TABLE promociones
  ALTER COLUMN destino_id SET NOT NULL,
  ALTER COLUMN titulo SET NOT NULL,
  ALTER COLUMN descripcion_larga SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promociones_galeria_array' AND conrelid = 'promociones'::regclass) THEN
    ALTER TABLE promociones ADD CONSTRAINT promociones_galeria_array
      CHECK (jsonb_typeof(galeria_urls) = 'array' AND jsonb_array_length(galeria_urls) <= 10);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_promociones_destino_id ON promociones(destino_id);

-- Compatibilidad con los formularios anteriores durante la transición al CMS.
CREATE OR REPLACE FUNCTION cms_sync_promocion() RETURNS TRIGGER AS $$
DECLARE legacy_slug TEXT; legacy_nombre TEXT;
BEGIN
  IF NEW.destino_id IS NULL THEN
    legacy_slug := CASE NEW.categoria WHEN 'Naturaleza' THEN 'playas'
      WHEN 'Aventura' THEN 'dunas' WHEN 'Cultura' THEN 'cultura'
      WHEN 'Gastronomía' THEN 'gastronomia' ELSE 'otros' END;
    legacy_nombre := CASE NEW.categoria WHEN 'Naturaleza' THEN 'Playas'
      WHEN 'Aventura' THEN 'Dunas' WHEN 'Cultura' THEN 'Cultura'
      WHEN 'Gastronomía' THEN 'Gastronomía' ELSE 'Otros' END;
    INSERT INTO destinos (nombre, slug) VALUES (legacy_nombre, legacy_slug)
      ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO NEW.destino_id FROM destinos WHERE slug = legacy_slug;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.titulo := COALESCE(NEW.titulo, NEW.nombre);
    NEW.nombre := NEW.titulo;
    NEW.descripcion_larga := COALESCE(NEW.descripcion_larga, NEW.descripcion, '');
    NEW.descripcion := NEW.descripcion_larga;
  ELSE
    IF NEW.titulo IS DISTINCT FROM OLD.titulo THEN NEW.nombre := NEW.titulo;
    ELSIF NEW.nombre IS DISTINCT FROM OLD.nombre THEN NEW.titulo := NEW.nombre;
    END IF;
    IF NEW.descripcion_larga IS DISTINCT FROM OLD.descripcion_larga THEN NEW.descripcion := NEW.descripcion_larga;
    ELSIF NEW.descripcion IS DISTINCT FROM OLD.descripcion THEN NEW.descripcion_larga := NEW.descripcion;
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS cms_sync_promocion ON promociones;
CREATE TRIGGER cms_sync_promocion BEFORE INSERT OR UPDATE ON promociones
FOR EACH ROW EXECUTE FUNCTION cms_sync_promocion();
