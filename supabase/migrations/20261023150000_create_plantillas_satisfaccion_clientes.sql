-- 20261023150000_create_plantillas_satisfaccion_clientes.sql
-- Plantilla configurable para encuestas de satisfacción de clientes y mensajes de WhatsApp
-- Permite a Calidad/Negocios/TED personalizar las preguntas y el mensaje de WhatsApp.
-- Acceso exclusivo mediante Server Actions con service_role.

CREATE TABLE IF NOT EXISTS public.plantillas_satisfaccion_clientes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE DEFAULT 'default',
  config JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plantillas_satisfaccion_clientes ENABLE ROW LEVEL SECURITY;

-- Revoke direct access from PUBLIC, anon, and authenticated (least-privilege).
REVOKE ALL ON public.plantillas_satisfaccion_clientes FROM PUBLIC, anon, authenticated;
