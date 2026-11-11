-- Add is_hidden column to solicitudes_diseno_servicio
-- Allows hiding records from production views, metrics, and counts.
-- Toggling is restricted to development server environments.

ALTER TABLE public.solicitudes_diseno_servicio
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.solicitudes_diseno_servicio.is_hidden IS 'Flag to temporarily hide records from production views and metrics';
