-- Add persisted revision + fecha_revision columns to requisiciones.
--
-- The PDF header (CÓDIGO RG-ADM-003 block) used to derive REVISIÓN / FECHA
-- dynamically from procesada_at against a hardcoded 2026-08-20 cutover.
-- This migration locks the values per row based on created_at (when the req
-- was actually placed) so the printed revision never changes retroactively.
--
-- Cutover rule:
--   created_at <  2026-08-20T00:00:00Z  -> revision '00', fecha '12/06/2026'
--   created_at >= 2026-08-20T00:00:00Z  -> revision '01', fecha '20/08/2026'
--   created_at IS NULL                  -> revision '01', fecha '20/08/2026' (safe default)

ALTER TABLE requisiciones
  ADD COLUMN IF NOT EXISTS revision text NOT NULL DEFAULT '01';

ALTER TABLE requisiciones
  ADD COLUMN IF NOT EXISTS fecha_revision text NOT NULL DEFAULT '20/08/2026';

-- One-time backfill based on created_at (NOT procesada_at).
-- Rows placed before the 2026-08-20 cutover keep rev.00 / 12/06/2026.
UPDATE requisiciones
  SET revision = '00', fecha_revision = '12/06/2026'
  WHERE created_at IS NOT NULL
    AND created_at < '2026-08-20T00:00:00.000Z'::timestamptz
    AND deleted_at IS NULL;

-- Rows placed on/after the cutover (or with NULL created_at) get rev.01.
UPDATE requisiciones
  SET revision = '01', fecha_revision = '20/08/2026'
  WHERE (created_at IS NULL OR created_at >= '2026-08-20T00:00:00.000Z'::timestamptz)
    AND deleted_at IS NULL;
