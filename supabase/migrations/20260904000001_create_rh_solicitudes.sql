-- 20260904000001_create_rh_solicitudes.sql
-- Create the rh_solicitudes table for new-user creation requests.
--
-- Workflow: pendiente → en_proceso → completada/rechazada
-- Access: Administracion dept members + admin/superadmin + TED can create and manage

create table public.rh_solicitudes (
  id              bigint generated always as identity primary key,
  -- Requested user info
  nombre_apellido text not null,
  cedula          text,
  cargo           text,
  departamento    bigint references public.departamentos(id),
  telefono        text,
  -- Email + signature requests (checkboxes)
  solicitar_email        boolean not null default false,
  solicitar_firma_email  boolean not null default false,
  -- Workflow
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente', 'en_proceso', 'completada', 'rechazada')),
  notas           text,
  -- Metadata
  solicitado_por  bigint references public.usuarios(id),
  procesado_por   bigint references public.usuarios(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on public.rh_solicitudes (estado);
create index on public.rh_solicitudes (created_at desc);

-- RLS policies
alter table public.rh_solicitudes enable row level security;

-- Read: own requests
create policy "rh_solicitudes_read_own" on public.rh_solicitudes
  for select to authenticated using (solicitado_por = (
    select u.id from public.usuarios u where u.id_auth = auth.uid()
  ));

-- Read: admin dept members can read all
create policy "rh_solicitudes_read_admin" on public.rh_solicitudes
  for select to authenticated using (
    exists (
      select 1 from public.usuarios u
      join public.departamentos d on d.id = u.departamento
      where u.id_auth = auth.uid()
        and (d.nombre ilike '%administracion%' or d.nombre ilike '%admin%')
    )
  );

-- Insert: any authenticated user (app-level gating restricts to admin dept + admins)
create policy "rh_solicitudes_insert" on public.rh_solicitudes
  for insert to authenticated with check (true);

-- Update: admin dept members only
create policy "rh_solicitudes_update_admin" on public.rh_solicitudes
  for update to authenticated using (
    exists (
      select 1 from public.usuarios u
      join public.departamentos d on d.id = u.departamento
      where u.id_auth = auth.uid()
        and (d.nombre ilike '%administracion%' or d.nombre ilike '%admin%')
    )
  );
