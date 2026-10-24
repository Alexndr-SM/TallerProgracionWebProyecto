-- Fondos independientes de la portada. Vacío conserva el fondo de respaldo.
ALTER TABLE destinos ADD COLUMN IF NOT EXISTS imagen_fondo_url TEXT NOT NULL DEFAULT '';
ALTER TABLE promociones ADD COLUMN IF NOT EXISTS imagen_fondo_url TEXT NOT NULL DEFAULT '';
