-- 20261023140000_create_encuestas_satisfaccion_clientes.sql
-- Satisfacción de Clientes post-servicio (Calidad, Atención y Soporte, Fidelidad/NPS)
-- Permite a Negocios generar enlaces para clientes y a Calidad/Negocios/TED consultar indicadores.

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
  id_estado INTEGER REFERENCES public.cat_estados(id) ON DELETE SET NULL,
  fecha_servicio DATE,
  cliente_contacto_nombre TEXT,
  cliente_contacto_email TEXT,
  cliente_contacto_telefono TEXT,
  cliente_contacto_cargo TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'respondida', 'expirada', 'cancelada')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_encuestas_sat_cli_token
  ON public.encuestas_satisfaccion_clientes (token);

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

-- Enable RLS
ALTER TABLE public.encuestas_satisfaccion_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas_satisfaccion_clientes ENABLE ROW LEVEL SECURITY;

-- Policies for encuestas_satisfaccion_clientes:
-- Authenticated users (Negocios, Calidad, TED) can read all
CREATE POLICY "encuestas_satisfaccion_clientes_read_auth"
  ON public.encuestas_satisfaccion_clientes FOR SELECT
  TO authenticated USING (true);

-- Authenticated users can insert/update
CREATE POLICY "encuestas_satisfaccion_clientes_write_auth"
  ON public.encuestas_satisfaccion_clientes FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Anonymous users can read survey basic info by token for answering
CREATE POLICY "encuestas_satisfaccion_clientes_read_anon"
  ON public.encuestas_satisfaccion_clientes FOR SELECT
  TO anon USING (estado = 'pendiente');

-- Policies for respuestas_satisfaccion_clientes:
-- Authenticated users can read responses
CREATE POLICY "respuestas_satisfaccion_clientes_read_auth"
  ON public.respuestas_satisfaccion_clientes FOR SELECT
  TO authenticated USING (true);

-- Anonymous and authenticated can insert responses
CREATE POLICY "respuestas_satisfaccion_clientes_insert_anon"
  ON public.respuestas_satisfaccion_clientes FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "respuestas_satisfaccion_clientes_insert_auth"
  ON public.respuestas_satisfaccion_clientes FOR INSERT
  TO authenticated WITH CHECK (true);
