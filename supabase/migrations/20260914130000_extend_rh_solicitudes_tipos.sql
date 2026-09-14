-- 20260914130000_extend_rh_solicitudes_tipos.sql
-- Extend rh_solicitudes to support multiple request types beyond user creation:
--   creacion, desactivacion, reactivacion, restablecer_contrasena,
--   cambio_email, cambio_permisos
--
-- Existing rows default to 'creacion' (the only type before this migration).
-- Non-creacion types reference an existing usuario via usuario_id and may
-- carry a valor_nuevo payload (new email, "app_slug:accion", etc.).

-- Add tipo column (defaults to 'creacion' for existing rows)
alter table public.rh_solicitudes
  add column if not exists tipo text not null default 'creacion'
  check (tipo in (
    'creacion',
    'desactivacion',
    'reactivacion',
    'restablecer_contrasena',
    'cambio_email',
    'cambio_permisos'
  ));

-- Add usuario_id (FK to usuarios — set for all types except creacion)
alter table public.rh_solicitudes
  add column if not exists usuario_id bigint references public.usuarios(id);

-- Add valor_nuevo (new email for cambio_email; "app_slug:conceder|revocar"
-- for cambio_permisos; null for types that don't need it)
alter table public.rh_solicitudes
  add column if not exists valor_nuevo text;

-- Indexes for filtering
create index if not exists rh_solicitudes_tipo_idx on public.rh_solicitudes (tipo);
create index if not exists rh_solicitudes_usuario_idx on public.rh_solicitudes (usuario_id);

-- RLS: allow reads for users who can see their own referenced usuario_id
-- (existing read_own policy covers solicitado_por; add usuario_id coverage
--  so a user can track requests that target their own account)
create or replace policy "rh_solicitudes_read_own" on public.rh_solicitudes
  for select to authenticated using (
    solicitado_por = (
      select u.id from public.usuarios u where u.id_auth = auth.uid()
    )
    or usuario_id = (
      select u.id from public.usuarios u where u.id_auth = auth.uid()
    )
  );
