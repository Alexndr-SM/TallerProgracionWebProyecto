
-- Tabla de usuarios (login y registro)
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120)  NOT NULL,
  email         VARCHAR(180)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  rol           VARCHAR(20)   NOT NULL DEFAULT 'cliente',
  estado_cuenta VARCHAR(20)  NOT NULL DEFAULT 'activo',
  puntos        INTEGER      NOT NULL DEFAULT 0 CHECK (puntos >= 0),
  ultimo_acceso TIMESTAMPTZ,
  foto_perfil_url TEXT,
  foto_perfil_public_id VARCHAR(255),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Compatibilidad con instalaciones existentes
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'cliente';
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS estado_cuenta VARCHAR(20) NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS puntos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ;
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_perfil_public_id VARCHAR(255);

-- El email no se puede repetir
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email
  ON usuarios (email);

-- Comentarios (documentación en la BD)
COMMENT ON TABLE  usuarios IS 'Usuarios registrados para iniciar sesión';
COMMENT ON COLUMN usuarios.password_hash IS 'Hash bcrypt; nunca guardar la contraseña en texto plano';
COMMENT ON COLUMN usuarios.rol IS 'Rol de acceso: admin, registrador, soporte, editor o cliente';
COMMENT ON COLUMN usuarios.estado_cuenta IS 'Estado de acceso de la cuenta: activo o inactivo';
COMMENT ON COLUMN usuarios.puntos IS 'Saldo de puntos de fidelización del cliente';
UPDATE usuarios SET rol = 'cliente'
WHERE rol NOT IN ('admin', 'registrador', 'soporte', 'editor', 'cliente');
UPDATE usuarios SET estado_cuenta = 'activo'
WHERE estado_cuenta NOT IN ('activo', 'inactivo');
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_estado
  ON usuarios (rol, estado_cuenta);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_rol_check' AND conrelid = 'usuarios'::regclass) THEN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
      CHECK (rol IN ('admin', 'registrador', 'soporte', 'editor', 'cliente'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_estado_cuenta_check' AND conrelid = 'usuarios'::regclass) THEN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_estado_cuenta_check
      CHECK (estado_cuenta IN ('activo', 'inactivo'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_puntos_check' AND conrelid = 'usuarios'::regclass) THEN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_puntos_check CHECK (puntos >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS promociones (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  nombre      VARCHAR(180) NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  categoria   VARCHAR(40) NOT NULL,
  precio      NUMERIC(10, 2) NOT NULL CHECK (precio > 0),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservas (
  id              SERIAL PRIMARY KEY,
  usuario_id      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre          VARCHAR(120) NOT NULL,
  email           VARCHAR(180) NOT NULL,
  fecha_tour      DATE NOT NULL,
  asistentes      SMALLINT NOT NULL CHECK (asistentes BETWEEN 1 AND 15),
  metodo_pago     VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('tarjeta', 'paypal', 'yape')),
  estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')),
  promocion_id    INTEGER REFERENCES promociones(id) ON DELETE SET NULL,
  promocion_nombre VARCHAR(180),
  precio_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  estado_pago     VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                  CHECK (estado_pago IN ('pendiente', 'pagado', 'reembolsado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reservas
  ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_usuario_id_fkey;
ALTER TABLE reservas
  ADD CONSTRAINT reservas_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS promocion_id INTEGER REFERENCES promociones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promocion_nombre VARCHAR(180),
  ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente';
ALTER TABLE reservas ALTER COLUMN total TYPE NUMERIC(12, 2);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_estado_pago_check' AND conrelid = 'reservas'::regclass) THEN
    ALTER TABLE reservas ADD CONSTRAINT reservas_estado_pago_check
      CHECK (estado_pago IN ('pendiente', 'pagado', 'reembolsado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservas_fecha_tour ON reservas (fecha_tour);
CREATE INDEX IF NOT EXISTS idx_reservas_email ON reservas (email);
CREATE INDEX IF NOT EXISTS idx_reservas_promocion_id ON reservas (promocion_id);
INSERT INTO promociones (slug, nombre, categoria, precio) VALUES
  ('islas-ballestas-costa-paracas', 'Islas Ballestas y costa de Paracas', 'Naturaleza', 85),
  ('ruta-reserva-playa-roja', 'Ruta de la Reserva y Playa Roja', 'Naturaleza', 120),
  ('playa-la-mina-lagunillas', 'Playa La Mina y Lagunillas', 'Naturaleza', 95),
  ('buggy-y-sandboard', 'Buggy y sandboard', 'Aventura', 90),
  ('atardecer-en-las-dunas', 'Atardecer en las dunas', 'Aventura', 75),
  ('desierto-extremo', 'Desierto extremo', 'Aventura', 130),
  ('ruta-bodegas-y-pisco', 'Ruta de bodegas y pisco', 'Cultura', 95),
  ('museos-culturas-ancestrales', 'Museos y culturas ancestrales', 'Cultura', 60),
  ('nazca-legado-milenario', 'Nazca y su legado milenario', 'Cultura', 150)
ON CONFLICT (slug) DO NOTHING;
COMMENT ON COLUMN usuarios.foto_perfil_url IS 'URL segura de la foto de perfil alojada en Cloudinary';
COMMENT ON COLUMN usuarios.foto_perfil_public_id IS 'Identificador de la foto de perfil para reemplazarla en Cloudinary';

COMMENT ON TABLE reservas IS 'Reservas en línea y presenciales con precio y estado de pago históricos';

-- Opiniones publicadas por usuarios autenticados
CREATE TABLE IF NOT EXISTS comentarios (
  id            SERIAL PRIMARY KEY,
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  contenido     VARCHAR(1000) NOT NULL,
  calificacion  SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comentarios_created_at
  ON comentarios (created_at DESC);

COMMENT ON TABLE comentarios IS 'Opiniones públicas asociadas a usuarios registrados';

-- Sistema de fidelización: historial de movimientos de puntos
CREATE TABLE IF NOT EXISTS puntos_historial (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  reserva_id  INTEGER REFERENCES reservas(id) ON DELETE SET NULL,
  tipo        VARCHAR(20) NOT NULL
              CHECK (tipo IN ('ganado', 'cancelado', 'canjeado', 'ajuste')),
  puntos      INTEGER NOT NULL CHECK (puntos > 0),
  descripcion VARCHAR(255) NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_puntos_historial_usuario
  ON puntos_historial (usuario_id, created_at DESC);

COMMENT ON TABLE puntos_historial IS 'Registro de cada movimiento de puntos de fidelización por cliente';
COMMENT ON COLUMN puntos_historial.tipo IS 'ganado=reserva confirmada, cancelado=reserva cancelada, canjeado=redención, ajuste=corrección manual';