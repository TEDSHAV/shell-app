-- Add selected_sesiones JSONB column to requisiciones.
--
-- Stores the multi-session selection for Capacitación Externa requisiciones as
-- an array of {id_osi, id_sesion, nro_sesion} objects. Drives the auto-mark of
-- the requisicion_enviada_admin planificacion step on the selected sessions.
-- The first entry is the primary session (also stored in id_sesion for backward
-- compat). NULL for internas and legacy records (which only have id_sesion).

ALTER TABLE requisiciones
  ADD COLUMN IF NOT EXISTS selected_sesiones JSONB NULL;

COMMENT ON COLUMN requisiciones.selected_sesiones IS
  'Array of {id_osi, id_sesion, nro_sesion} objects for Capacitación Externa multi-session selection. Drives the auto-mark of the requisicion_enviada_admin planificacion step. The first entry is the primary session (also stored in id_sesion for backward compat). NULL for internas and legacy records.';
