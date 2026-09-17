-- Native tickets: catalog read for all users, ticket intake, planning flag.

create or replace function public.fn_current_usuario_id()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select u.id
  from public.usuarios u
  where u.id_auth = auth.uid()
  limit 1
$$;

alter table public.ted_plan_tareas
  add column if not exists en_planificacion boolean not null default false;

update public.ted_plan_tareas
set en_planificacion = true
where en_planificacion is distinct from true;

alter table public.ted_plan_tickets
  add column if not exists app_id bigint references public.ted_plan_apps(id) on delete set null;

alter table public.ted_plan_tickets
  add column if not exists tarea_id bigint references public.ted_plan_tareas(id) on delete set null;

alter table public.ted_plan_tickets
  add column if not exists asignado_id integer references public.usuarios(id) on delete set null;

alter table public.ted_plan_tickets
  add column if not exists prioridad text not null default 'media';

alter table public.ted_plan_tickets
  drop constraint if exists ted_plan_tickets_prioridad_check;

alter table public.ted_plan_tickets
  add constraint ted_plan_tickets_prioridad_check
  check (prioridad in ('alta', 'media', 'baja', 'otro'));

alter table public.ted_plan_tickets
  add column if not exists respuesta text;

alter table public.ted_plan_tickets
  add column if not exists respondido_por integer references public.usuarios(id) on delete set null;

alter table public.ted_plan_tickets
  add column if not exists respondido_at timestamptz;

alter table public.ted_plan_tickets
  drop constraint if exists ted_plan_tickets_estado_check;

alter table public.ted_plan_tickets
  add constraint ted_plan_tickets_estado_check
  check (
    estado in ('abierto', 'en_curso', 'no_procede', 'cerrado', 'planificado')
  );

create table if not exists public.ted_plan_ticket_colaboradores (
  ticket_id bigint not null references public.ted_plan_tickets(id) on delete cascade,
  usuario_id integer not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ticket_id, usuario_id)
);

create table if not exists public.ted_plan_ticket_eventos (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.ted_plan_tickets(id) on delete cascade,
  estado text,
  nota text,
  created_by integer references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ted_plan_tickets_solicitado_idx
  on public.ted_plan_tickets (solicitado_por);

create index if not exists ted_plan_tickets_app_idx
  on public.ted_plan_tickets (app_id);

create index if not exists ted_plan_tareas_en_plan_idx
  on public.ted_plan_tareas (en_planificacion);

create index if not exists ted_plan_ticket_eventos_ticket_idx
  on public.ted_plan_ticket_eventos (ticket_id, created_at);

drop view if exists public.vw_ted_plan_modulos_resumen;
create view public.vw_ted_plan_modulos_resumen
with (security_invoker = true) as
select
  m.id,
  m.app_id,
  m.nombre,
  m.subtitulo,
  m.trimestre_entrega,
  m.anio,
  m.fecha_objetivo,
  m.salud_override,
  m.archived_at,
  m.created_by,
  m.created_at,
  m.updated_at,
  coalesce(agg.done_count, 0)::integer as done_count,
  coalesce(agg.left_count, 0)::integer as left_count,
  case
    when coalesce(agg.total_count, 0) = 0 then 0
    else round(100.0 * agg.done_count / agg.total_count)::integer
  end as progress,
  public.fn_ted_plan_salud(
    coalesce(agg.done_count, 0)::integer,
    coalesce(agg.left_count, 0)::integer,
    m.trimestre_entrega,
    m.anio,
    m.salud_override
  ) as salud
from public.ted_plan_modulos m
left join (
  select
    t.modulo_id,
    count(*)::integer as total_count,
    count(*) filter (where t.completada)::integer as done_count,
    count(*) filter (where not t.completada)::integer as left_count
  from public.ted_plan_tareas t
  where t.en_planificacion = true
    and coalesce(t.no_solicitada, false) = false
  group by t.modulo_id
) agg on agg.modulo_id = m.id
where m.archived_at is null;

grant select on public.vw_ted_plan_modulos_resumen to authenticated;

alter table public.ted_plan_ticket_colaboradores enable row level security;
alter table public.ted_plan_ticket_eventos enable row level security;

drop policy if exists ted_plan_apps_select_auth on public.ted_plan_apps;
create policy ted_plan_apps_select_auth on public.ted_plan_apps
  for select to authenticated
  using (archived_at is null);

drop policy if exists ted_plan_modulos_select_auth on public.ted_plan_modulos;
create policy ted_plan_modulos_select_auth on public.ted_plan_modulos
  for select to authenticated
  using (archived_at is null);

drop policy if exists ted_plan_modulo_apps_select_auth on public.ted_plan_modulo_apps;
create policy ted_plan_modulo_apps_select_auth on public.ted_plan_modulo_apps
  for select to authenticated
  using (true);

drop policy if exists ted_plan_participantes_select_auth on public.ted_plan_modulo_participantes;
create policy ted_plan_participantes_select_auth on public.ted_plan_modulo_participantes
  for select to authenticated
  using (true);

drop policy if exists ted_plan_tickets_all on public.ted_plan_tickets;
drop policy if exists ted_plan_tickets_select on public.ted_plan_tickets;
drop policy if exists ted_plan_tickets_insert on public.ted_plan_tickets;
drop policy if exists ted_plan_tickets_update on public.ted_plan_tickets;

create policy ted_plan_tickets_select on public.ted_plan_tickets
  for select to authenticated
  using (
    public.fn_is_ted_member()
    or solicitado_por = public.fn_current_usuario_id()
    or asignado_id = public.fn_current_usuario_id()
    or exists (
      select 1
      from public.ted_plan_ticket_colaboradores c
      where c.ticket_id = ted_plan_tickets.id
        and c.usuario_id = public.fn_current_usuario_id()
    )
  );

create policy ted_plan_tickets_insert on public.ted_plan_tickets
  for insert to authenticated
  with check (
    solicitado_por = public.fn_current_usuario_id()
    or public.fn_is_ted_member()
  );

create policy ted_plan_tickets_update on public.ted_plan_tickets
  for update to authenticated
  using (
    public.fn_is_ted_member()
    or solicitado_por = public.fn_current_usuario_id()
    or asignado_id = public.fn_current_usuario_id()
    or exists (
      select 1
      from public.ted_plan_ticket_colaboradores c
      where c.ticket_id = ted_plan_tickets.id
        and c.usuario_id = public.fn_current_usuario_id()
    )
  )
  with check (
    public.fn_is_ted_member()
    or solicitado_por = public.fn_current_usuario_id()
    or asignado_id = public.fn_current_usuario_id()
    or exists (
      select 1
      from public.ted_plan_ticket_colaboradores c
      where c.ticket_id = ted_plan_tickets.id
        and c.usuario_id = public.fn_current_usuario_id()
    )
  );

create policy ted_plan_ticket_colaboradores_select on public.ted_plan_ticket_colaboradores
  for select to authenticated
  using (
    public.fn_is_ted_member()
    or usuario_id = public.fn_current_usuario_id()
    or exists (
      select 1
      from public.ted_plan_tickets t
      where t.id = ticket_id
        and (
          t.solicitado_por = public.fn_current_usuario_id()
          or t.asignado_id = public.fn_current_usuario_id()
        )
    )
  );

create policy ted_plan_ticket_colaboradores_write on public.ted_plan_ticket_colaboradores
  for all to authenticated
  using (
    public.fn_is_ted_member()
    or exists (
      select 1 from public.ted_plan_tickets t
      where t.id = ticket_id
        and t.solicitado_por = public.fn_current_usuario_id()
    )
  )
  with check (
    public.fn_is_ted_member()
    or exists (
      select 1 from public.ted_plan_tickets t
      where t.id = ticket_id
        and t.solicitado_por = public.fn_current_usuario_id()
    )
  );

create policy ted_plan_ticket_eventos_select on public.ted_plan_ticket_eventos
  for select to authenticated
  using (
    public.fn_is_ted_member()
    or exists (
      select 1 from public.ted_plan_tickets t
      where t.id = ticket_id
        and (
          t.solicitado_por = public.fn_current_usuario_id()
          or t.asignado_id = public.fn_current_usuario_id()
        )
    )
  );

create policy ted_plan_ticket_eventos_insert on public.ted_plan_ticket_eventos
  for insert to authenticated
  with check (
    public.fn_is_ted_member()
    or created_by = public.fn_current_usuario_id()
  );

grant select, insert, update, delete on public.ted_plan_ticket_colaboradores to authenticated;
grant select, insert on public.ted_plan_ticket_eventos to authenticated;

notify pgrst, 'reload schema';
