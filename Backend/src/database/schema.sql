-- =========================================================
-- IcaTurismo — esquema para login / registro
-- Base de datos: PostgreSQL (Render)
-- =========================================================

-- Tabla de usuarios (login y registro)
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120)  NOT NULL,
  email         VARCHAR(180)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- El email no se puede repetir
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email
  ON usuarios (email);

-- Comentarios (documentación en la BD)
COMMENT ON TABLE  usuarios IS 'Usuarios registrados para iniciar sesión';
COMMENT ON COLUMN usuarios.password_hash IS 'Hash bcrypt; nunca guardar la contraseña en texto plano';