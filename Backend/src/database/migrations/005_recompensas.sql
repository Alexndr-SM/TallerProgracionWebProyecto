CREATE TABLE IF NOT EXISTS recompensas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(180) NOT NULL,
  descripcion VARCHAR(1000) NOT NULL DEFAULT '',
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('producto', 'promocion', 'descuento')),
  puntos INTEGER NOT NULL CHECK (puntos > 0),
  imagen_url TEXT NOT NULL DEFAULT '',
  stock INTEGER CHECK (stock IS NULL OR stock >= 0),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canjes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  recompensa_id INTEGER REFERENCES recompensas(id) ON DELETE SET NULL,
  recompensa_nombre VARCHAR(180) NOT NULL,
  puntos INTEGER NOT NULL CHECK (puntos > 0),
  codigo VARCHAR(32) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recompensas_activo
  ON recompensas (activo, tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canjes_usuario
  ON canjes (usuario_id, created_at DESC);
