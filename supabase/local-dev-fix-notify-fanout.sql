-- Fix for local dev: create the missing notify.fan_out_by_permissions function
-- that the trigger on solicitudes_diseno_servicio expects to exist.
--
-- The real function (defined in negocios_sha/SGestion/supabase/migrations/
-- 20260419120000_notify_schema_rls.sql and 20260415183000_notify_fanout_priority_integer_compat.sql)
-- requires the full authprisma schema. This stub is a no-op that lets the
-- trigger fire without erroring, so the UPDATE to id_estatus = 37 succeeds.
--
-- Application-level notifications (notifySolicitanteOfFinalizacion) handle
-- the actual solicitante notification directly via notify.inbox inserts.
--
-- Run this in your local Supabase SQL Editor (or psql).

-- No-op stub: smallint priority overload (canonical signature)
CREATE OR REPLACE FUNCTION notify.fan_out_by_permissions(
  p_app_slug text,
  p_event_key text,
  p_permission_slugs text[],
  p_title text,
  p_body text,
  p_link_path text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_dedupe_key text DEFAULT NULL,
  p_priority smallint DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- No-op stub for local development.
  -- The real implementation fans out to users via authprisma permission lookups.
  -- Application-level code handles solicitante notifications directly.
  RETURN 0;
END;
$$;

-- No-op stub: integer priority overload (compat layer for triggers that pass integer literals)
CREATE OR REPLACE FUNCTION notify.fan_out_by_permissions(
  p_app_slug text,
  p_event_key text,
  p_permission_slugs text[],
  p_title text,
  p_body text,
  p_link_path text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_dedupe_key text DEFAULT NULL,
  p_priority integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- No-op stub for local development (integer priority compat overload).
  RETURN 0;
END;
$$;

-- Also create the fan_out_to_users stubs (same pattern, may be needed by other triggers)
CREATE OR REPLACE FUNCTION notify.fan_out_to_users(
  p_app_slug text,
  p_event_key text,
  p_recipient_ids_auth uuid[],
  p_title text,
  p_body text,
  p_link_path text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_dedupe_key text DEFAULT NULL,
  p_priority smallint DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION notify.fan_out_to_users(
  p_app_slug text,
  p_event_key text,
  p_recipient_ids_auth uuid[],
  p_title text,
  p_body text,
  p_link_path text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_dedupe_key text DEFAULT NULL,
  p_priority integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN 0;
END;
$$;

-- Also create the event_type needed by notifySolicitanteOfFinalizacion.
-- The app code tries to upsert this, but the service role lacks sequence
-- permissions in local dev, so we create it here instead.
INSERT INTO notify.event_types (app_slug, event_key, default_priority, channel_mask)
VALUES (
  'scapacitacion',
  'diseno_servicio_finalizado',
  2,
  '{"in_app": true, "toast": false}'::jsonb
)
ON CONFLICT (app_slug, event_key) DO UPDATE SET
  default_priority = EXCLUDED.default_priority,
  channel_mask = EXCLUDED.channel_mask;
