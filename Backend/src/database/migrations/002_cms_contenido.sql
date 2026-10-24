-- Campos de la plantilla editorial (no modifica autenticación ni reservas).
ALTER TABLE destinos ADD COLUMN IF NOT EXISTS descripcion TEXT NOT NULL DEFAULT '';
ALTER TABLE promociones
  ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(180) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS incluye JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS itinerario TEXT NOT NULL DEFAULT '';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promociones_incluye_array' AND conrelid = 'promociones'::regclass) THEN
    ALTER TABLE promociones ADD CONSTRAINT promociones_incluye_array
      CHECK (jsonb_typeof(incluye) = 'array' AND jsonb_array_length(incluye) <= 20);
  END IF;
END $$;
