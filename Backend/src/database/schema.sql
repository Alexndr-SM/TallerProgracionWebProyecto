
-- Tabla de usuarios (login y registro)
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120)  NOT NULL,
  email         VARCHAR(180)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  rol           VARCHAR(20)   NOT NULL DEFAULT 'cliente',
  foto_perfil_url TEXT,
  foto_perfil_public_id VARCHAR(255),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Compatibilidad con instalaciones existentes
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'cliente';
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_perfil_public_id VARCHAR(255);

-- El email no se puede repetir
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email
  ON usuarios (email);

-- Comentarios (documentación en la BD)
COMMENT ON TABLE  usuarios IS 'Usuarios registrados para iniciar sesión';
COMMENT ON COLUMN usuarios.password_hash IS 'Hash bcrypt; nunca guardar la contraseña en texto plano';
COMMENT ON COLUMN usuarios.rol IS 'Rol del usuario para control de acceso: admin o cliente';
COMMENT ON COLUMN usuarios.foto_perfil_url IS 'URL segura de la foto de perfil alojada en Cloudinary';
COMMENT ON COLUMN usuarios.foto_perfil_public_id IS 'Identificador de la foto de perfil para reemplazarla en Cloudinary';

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