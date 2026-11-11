-- 20261023140000_create_encuestas_satisfaccion_clientes.sql
-- Satisfacción de Clientes post-servicio (Calidad, Atención y Soporte, Fidelidad/NPS)
-- Permite a Negocios generar enlaces para clientes y a Calidad/Negocios/TED consultar indicadores.
-- El flujo público y de gestión se procesa exclusivamente mediante Server Actions (service_role).
-- Las tablas tienen RLS habilitado y sin políticas para anon/authenticated/PUBLIC,
-- denegando cualquier acceso directo vía PostgREST (principio de menor privilegio).

CREATE TABLE IF NOT EXISTS public.encuestas_satisfaccion_clientes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  id_osi INTEGER REFERENCES public.ejecucion_osi(id) ON DELETE CASCADE,
  nro_osi TEXT NOT NULL DEFAULT 'S/N',
  id_empresa INTEGER,
  nombre_empresa TEXT NOT NULL,
  servicio TEXT NOT NULL,
  tipo_servicio TEXT,
  ejecutivo_negocios TEXT,
  id_ciudad INTEGER REFERENCES public.cat_ciudades(id) ON DELETE SET NULL,
  id_estado INTEGER REFERENCES public.cat_estados_venezuela(id) ON DELETE SET NULL,
  fecha_servicio DATE,
  cliente_contacto_nombre TEXT,
  cliente_contacto_email TEXT,
  cliente_contacto_telefono TEXT,
  cliente_contacto_cargo TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'respondida', 'expirada', 'cancelada')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ
);

-- Note: token UUID UNIQUE automatically creates a unique index in PostgreSQL.
CREATE INDEX IF NOT EXISTS idx_encuestas_sat_cli_osi
  ON public.encuestas_satisfaccion_clientes (id_osi);

CREATE INDEX IF NOT EXISTS idx_encuestas_sat_cli_estado
  ON public.encuestas_satisfaccion_clientes (estado);

CREATE INDEX IF NOT EXISTS idx_encuestas_sat_cli_empresa
  ON public.encuestas_satisfaccion_clientes (id_empresa);

CREATE INDEX IF NOT EXISTS idx_encuestas_sat_cli_created_at
  ON public.encuestas_satisfaccion_clientes (created_at DESC);

-- Respuestas enviadas por los clientes con las 3 preguntas oficiales
CREATE TABLE IF NOT EXISTS public.respuestas_satisfaccion_clientes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  encuesta_id BIGINT NOT NULL REFERENCES public.encuestas_satisfaccion_clientes(id) ON DELETE CASCADE UNIQUE,
  -- 1. Calidad del Producto o Servicio (1 al 5)
  calidad_servicio SMALLINT NOT NULL CHECK (calidad_servicio BETWEEN 1 AND 5),
  -- 2. Atención y Soporte al Cliente (1 al 5)
  atencion_soporte SMALLINT NOT NULL CHECK (atencion_soporte BETWEEN 1 AND 5),
  -- 3. Fidelidad (0 al 10)
  fidelidad_nps SMALLINT NOT NULL CHECK (fidelidad_nps BETWEEN 0 AND 10),
  comentarios TEXT,
  respondente_nombre TEXT,
  respondente_cargo TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_respuestas_sat_cli_encuesta
  ON public.respuestas_satisfaccion_clientes (encuesta_id);

CREATE INDEX IF NOT EXISTS idx_respuestas_sat_cli_submitted
  ON public.respuestas_satisfaccion_clientes (submitted_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.encuestas_satisfaccion_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas_satisfaccion_clientes ENABLE ROW LEVEL SECURITY;

-- Deny direct access to PUBLIC, anon, and authenticated (Server Actions with service_role only).
-- This enforces least-privilege: neither anonymous visitors nor authenticated clients can query or
-- modify these tables via PostgREST. All operations are mediated and validated by Next.js Server Actions.
REVOKE ALL ON public.encuestas_satisfaccion_clientes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.respuestas_satisfaccion_clientes FROM PUBLIC, anon, authenticated;
