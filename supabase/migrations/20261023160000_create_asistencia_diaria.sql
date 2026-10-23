-- Control de asistencia diaria PRISMA: configuración, destinatarios, registros de acceso y bitácora de envíos.

create table if not exists public.asistencia_config (
  id smallint primary key default 1 check (id = 1),
  activo boolean not null default true,
  hora_corte time not null default '08:30:00',
  timezone text not null default 'America/Caracas',
  omitir_feriados boolean not null default true,
  usuarios_excluidos bigint[] not null default '{}'::bigint[],
  departamentos_excluidos bigint[] not null default '{}'::bigint[],
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.asistencia_config (id, activo, hora_corte, timezone, omitir_feriados)
values (1, true, '08:30:00', 'America/Caracas', true)
on conflict (id) do nothing;

create table if not exists public.asistencia_destinatarios (
  id bigint generated always as identity primary key,
  email text not null,
  nombre text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint asistencia_destinatarios_email_chk
    check (position('@' in email) > 1)
);

create unique index if not exists asistencia_destinatarios_email_uidx
  on public.asistencia_destinatarios (lower(email));

insert into public.asistencia_destinatarios (email, nombre, activo)
values
  ('prisma@ted.shadevenezuela.com.ve', 'Equipo TED', true)
on conflict (lower(email)) do nothing;

create table if not exists public.asistencia_diaria (
  id bigint generated always as identity primary key,
  usuario_id bigint not null references public.usuarios(id) on delete cascade,
  fecha date not null,
  hora_registro timestamptz not null default now(),
  metodo text not null default 'login' check (metodo in ('login', 'sesion', 'manual')),
  created_at timestamptz not null default now(),
  constraint asistencia_diaria_usuario_fecha_uk unique (usuario_id, fecha)
);

create index if not exists asistencia_diaria_fecha_idx
  on public.asistencia_diaria (fecha desc);

create index if not exists asistencia_diaria_usuario_fecha_idx
  on public.asistencia_diaria (usuario_id, fecha desc);

create table if not exists public.asistencia_reportes_log (
  id bigint generated always as identity primary key,
  fecha date not null,
  tipo text not null default 'scheduled' check (tipo in ('scheduled', 'manual')),
  total_esperados integer not null default 0,
  total_presentes integer not null default 0,
  total_tardios integer not null default 0,
  total_ausentes integer not null default 0,
  destinatarios text not null default '',
  status text not null check (status in ('sending', 'sent', 'failed', 'skipped_holiday', 'not_configured')),
  error_message text,
  sent_by uuid,
  sent_at timestamptz not null default now()
);

create index if not exists asistencia_reportes_log_fecha_idx
  on public.asistencia_reportes_log (fecha desc, sent_at desc);

-- Garantiza que el envío automático programado (scheduled) se ejecute como máximo una vez por fecha.
create unique index if not exists asistencia_reportes_log_scheduled_once_uidx
  on public.asistencia_reportes_log (fecha)
  where tipo = 'scheduled' and status in ('sending', 'sent', 'skipped_holiday');

alter table public.asistencia_config enable row level security;
alter table public.asistencia_destinatarios enable row level security;
alter table public.asistencia_diaria enable row level security;
alter table public.asistencia_reportes_log enable row level security;

drop policy if exists asistencia_config_ted on public.asistencia_config;
create policy asistencia_config_ted on public.asistencia_config
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

drop policy if exists asistencia_destinatarios_ted on public.asistencia_destinatarios;
create policy asistencia_destinatarios_ted on public.asistencia_destinatarios
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

drop policy if exists asistencia_diaria_read_own_or_ted on public.asistencia_diaria;
create policy asistencia_diaria_read_own_or_ted on public.asistencia_diaria
  for select to authenticated
  using (
    public.fn_is_ted_member()
    or exists (
      select 1 from public.usuarios u
      where u.id = asistencia_diaria.usuario_id
        and u.id_auth = auth.uid()
    )
  );

drop policy if exists asistencia_diaria_write_ted on public.asistencia_diaria;
create policy asistencia_diaria_write_ted on public.asistencia_diaria
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

drop policy if exists asistencia_reportes_log_ted on public.asistencia_reportes_log;
create policy asistencia_reportes_log_ted on public.asistencia_reportes_log
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

grant select, insert, update, delete on public.asistencia_config to authenticated, service_role;
grant select, insert, update, delete on public.asistencia_destinatarios to authenticated, service_role;
grant select, insert, update, delete on public.asistencia_diaria to authenticated, service_role;
grant select, insert, update, delete on public.asistencia_reportes_log to authenticated, service_role;

do $$
declare
  tbl text;
  seq text;
begin
  foreach tbl in array array['asistencia_destinatarios', 'asistencia_diaria', 'asistencia_reportes_log'] loop
    seq := pg_get_serial_sequence('public.' || tbl, 'id');
    if seq is not null then
      execute format('grant usage, select on sequence %s to authenticated, service_role', seq);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
