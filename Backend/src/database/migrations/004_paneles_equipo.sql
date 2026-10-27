-- Operaciones del equipo; no cambia los roles ni las reservas existentes.
CREATE TABLE widgets (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(180) NOT NULL,
  texto VARCHAR(1000) NOT NULL DEFAULT '',
  imagen_url TEXT NOT NULL DEFAULT '',
  enlace VARCHAR(500) NOT NULL DEFAULT '',
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('banner','tarjeta','aviso')),
  orden INTEGER NOT NULL DEFAULT 0 CHECK (orden BETWEEN 0 AND 999),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE soporte_casos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES usuarios(id),
  asunto VARCHAR(180) NOT NULL,
  prioridad VARCHAR(20) NOT NULL DEFAULT 'alta' CHECK (prioridad IN ('normal','alta','urgente')),
  estado VARCHAR(20) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','en_atencion','resuelto')),
  agente_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE soporte_mensajes (
  id SERIAL PRIMARY KEY,
  caso_id INTEGER NOT NULL REFERENCES soporte_casos(id) ON DELETE CASCADE,
  autor_id INTEGER NOT NULL REFERENCES usuarios(id),
  contenido VARCHAR(4000) NOT NULL,
  interno BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX soporte_mensajes_caso ON soporte_mensajes(caso_id,id);
CREATE INDEX soporte_casos_cliente ON soporte_casos(cliente_id,updated_at DESC);
CREATE TABLE clientes_presenciales (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  documento VARCHAR(20) NOT NULL UNIQUE,
  telefono VARCHAR(20) NOT NULL DEFAULT '',
  email VARCHAR(180) NOT NULL DEFAULT '',
  registrado_por INTEGER NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE caja_turnos (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES usuarios(id),
  fondo_inicial NUMERIC(12,2) NOT NULL CHECK (fondo_inicial >= 0),
  efectivo_contado NUMERIC(12,2),
  efectivo_esperado NUMERIC(12,2),
  observacion VARCHAR(1000) NOT NULL DEFAULT '',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX caja_un_turno_abierto ON caja_turnos(empleado_id) WHERE closed_at IS NULL;
CREATE TABLE caja_ventas (
  id SERIAL PRIMARY KEY,
  operacion UUID NOT NULL UNIQUE,
  turno_id INTEGER NOT NULL REFERENCES caja_turnos(id),
  cliente_id INTEGER NOT NULL REFERENCES clientes_presenciales(id),
  promocion_id INTEGER REFERENCES promociones(id) ON DELETE SET NULL,
  promocion_nombre VARCHAR(180) NOT NULL,
  fecha_tour DATE NOT NULL,
  asistentes SMALLINT NOT NULL CHECK (asistentes BETWEEN 1 AND 15),
  precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario > 0),
  total NUMERIC(12,2) NOT NULL CHECK (total > 0),
  metodo VARCHAR(20) NOT NULL CHECK (metodo IN ('efectivo','yape','tarjeta','transferencia')),
  recibido NUMERIC(12,2) NOT NULL CHECK (recibido >= total),
  referencia VARCHAR(120) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX caja_ventas_turno ON caja_ventas(turno_id,id DESC);
