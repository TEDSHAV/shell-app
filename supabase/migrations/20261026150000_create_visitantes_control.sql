-- 20261026150000_create_visitantes_control.sql
-- Control y Registro de Visitantes (QR público + Gestión interna para todos los departamentos)
-- Permite el registro de entrada de visitantes vía código QR con aceptación de descargo y firma digital,
-- asignación de responsable interno por visitante, y registro de salida para auditoría.

CREATE TABLE IF NOT EXISTS public.visitantes_config (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE DEFAULT 'default',
  config JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_nombre TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.visitantes_registros (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre_apellido TEXT NOT NULL,
  nacionalidad TEXT NOT NULL DEFAULT 'V' CHECK (nacionalidad IN ('V', 'E', 'P', 'J')),
  cedula TEXT NOT NULL,
  telefono TEXT DEFAULT '',
  empresa_procedencia TEXT,
  motivo_visita TEXT,
  departamento_destino TEXT,
  persona_a_visitar TEXT,
  nro_pase TEXT,
  fecha DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Caracas')::date),
  hora_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
  acepto_descargo BOOLEAN NOT NULL DEFAULT true,
  texto_descargo_aceptado TEXT,
  firma_entrada TEXT,
  responsable_usuario_id BIGINT REFERENCES public.usuarios(id) ON DELETE SET NULL,
  responsable_nombre TEXT,
  responsable_departamento TEXT,
  asignado_por_nombre TEXT,
  asignado_at TIMESTAMPTZ,
  estado TEXT NOT NULL DEFAULT 'en_visita'
    CHECK (estado IN ('en_visita', 'finalizada', 'cancelada')),
  hora_salida TIMESTAMPTZ,
  firma_salida TEXT,
  salida_registrada_por_id BIGINT REFERENCES public.usuarios(id) ON DELETE SET NULL,
  salida_registrada_por_nombre TEXT,
  observaciones TEXT,
  metodo_registro TEXT NOT NULL DEFAULT 'qr'
    CHECK (metodo_registro IN ('qr', 'manual')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitantes_registros_fecha
  ON public.visitantes_registros (fecha DESC, hora_entrada DESC);

CREATE INDEX IF NOT EXISTS idx_visitantes_registros_estado
  ON public.visitantes_registros (estado);

CREATE INDEX IF NOT EXISTS idx_visitantes_registros_cedula
  ON public.visitantes_registros (cedula);

CREATE INDEX IF NOT EXISTS idx_visitantes_registros_responsable
  ON public.visitantes_registros (responsable_usuario_id);

ALTER TABLE public.visitantes_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitantes_registros ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.visitantes_config FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.visitantes_registros FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.visitantes_config TO service_role;
GRANT ALL ON public.visitantes_registros TO service_role;

NOTIFY pgrst, 'reload schema';
