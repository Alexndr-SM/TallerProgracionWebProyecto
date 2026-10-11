
-- Tabla de usuarios (login y registro)
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120)  NOT NULL,
  email         VARCHAR(180)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  rol           VARCHAR(20)   NOT NULL DEFAULT 'cliente',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Compatibilidad con instalaciones existentes
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'cliente';

-- El email no se puede repetir
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email
  ON usuarios (email);

-- Comentarios (documentación en la BD)
COMMENT ON TABLE  usuarios IS 'Usuarios registrados para iniciar sesión';
COMMENT ON COLUMN usuarios.password_hash IS 'Hash bcrypt; nunca guardar la contraseña en texto plano';
COMMENT ON COLUMN usuarios.rol IS 'Rol del usuario para control de acceso: admin o cliente';