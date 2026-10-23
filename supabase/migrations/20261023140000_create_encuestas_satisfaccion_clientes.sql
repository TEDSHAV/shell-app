-- 20261023140000_create_encuestas_satisfaccion_clientes.sql
-- Satisfacción de Clientes post-servicio (Calidad, Atención y Soporte, Fidelidad/NPS)
-- Permite a Negocios generar enlaces para clientes y a Calidad/Negocios/TED consultar indicadores.
-- El flujo público y de gestión se procesa mediante Server Actions (service_role),
-- protegiendo las tablas contra acceso anónimo directo en PostgREST (principio de menor privilegio).

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

-- Note: token UUID UNIQUE creates a unique index in PostgreSQL automatically.
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

-- Revoke all direct permissions from anon (least privilege)
-- Public survey answering is validated and submitted atomically via server actions (service_role).
REVOKE ALL ON public.encuestas_satisfaccion_clientes FROM anon;
REVOKE ALL ON public.respuestas_satisfaccion_clientes FROM anon;

-- Helper to check if authenticated user belongs to allowed staff (Negocios, Calidad, TED, Admin)
CREATE OR REPLACE FUNCTION public.can_manage_satisfaccion_clientes()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    LEFT JOIN public.departamentos d ON d.id = u.departamento
    WHERE u.id_auth = auth.uid()
      AND (
        u.cargo ILIKE '%admin%'
        OR d.nombre ILIKE '%negocios%'
        OR d.nombre ILIKE '%gestion%'
        OR d.nombre ILIKE '%calidad%'
        OR d.nombre ILIKE '%ted%'
        OR d.nombre ILIKE '%administracion%'
      )
  );
$$;

-- RLS policies for encuestas_satisfaccion_clientes
CREATE POLICY "encuestas_sat_cli_select_staff"
  ON public.encuestas_satisfaccion_clientes
  FOR SELECT
  TO authenticated
  USING (public.can_manage_satisfaccion_clientes());

CREATE POLICY "encuestas_sat_cli_insert_staff"
  ON public.encuestas_satisfaccion_clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_satisfaccion_clientes());

CREATE POLICY "encuestas_sat_cli_update_staff"
  ON public.encuestas_satisfaccion_clientes
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_satisfaccion_clientes())
  WITH CHECK (public.can_manage_satisfaccion_clientes());

-- RLS policy for respuestas_satisfaccion_clientes (Staff read-only via PostgREST; insert is server-side only)
CREATE POLICY "respuestas_sat_cli_select_staff"
  ON public.respuestas_satisfaccion_clientes
  FOR SELECT
  TO authenticated
  USING (public.can_manage_satisfaccion_clientes());
