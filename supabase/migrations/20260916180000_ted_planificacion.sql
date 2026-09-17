-- TED planning: modules, tasks, participants, ticket stub.
-- Access: TED department members (same rule as isTedMember).

create or replace function public.fn_is_ted_member()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    join public.departamentos d on d.id = u.departamento
    where u.id_auth = auth.uid()
      and lower(trim(d.nombre)) = 'ted'
  );
$$;

create or replace function public.fn_ted_plan_trimestre_num(p_trimestre text)
returns integer
language sql
immutable
as $$
  select case p_trimestre
    when 'T1' then 1
    when 'T2' then 2
    when 'T3' then 3
    when 'T4' then 4
    else null
  end;
$$;

create or replace function public.fn_ted_plan_salud(
  p_done integer,
  p_left integer,
  p_trimestre text,
  p_anio integer,
  p_override text
)
returns text
language plpgsql
immutable
as $$
declare
  v_now timestamp;
  v_year integer;
  v_q integer;
  v_mod_q integer;
begin
  if p_override is not null then
    return p_override;
  end if;

  if coalesce(p_done, 0) = 0 and coalesce(p_left, 0) = 0 then
    return 'Planificado';
  end if;

  if coalesce(p_left, 0) = 0 and coalesce(p_done, 0) > 0 then
    return 'Completado';
  end if;

  v_now := timezone('America/Caracas', now());
  v_year := extract(year from v_now)::integer;
  v_q := ((extract(month from v_now)::integer - 1) / 3) + 1;
  v_mod_q := public.fn_ted_plan_trimestre_num(p_trimestre);

  if p_anio is not null and v_mod_q is not null and (
    p_anio < v_year
    or (p_anio = v_year and v_mod_q < v_q)
  ) then
    return 'En Riesgo';
  end if;

  return 'En Marcha';
end;
$$;

create table public.ted_plan_modulos (
  id bigint generated always as identity primary key,
  nombre text not null,
  subtitulo text,
  trimestre_entrega text not null default 'T1'
    check (trimestre_entrega in ('T1', 'T2', 'T3', 'T4')),
  anio integer not null default extract(year from timezone('America/Caracas', now()))::integer,
  fecha_objetivo date,
  salud_override text
    check (
      salud_override is null
      or salud_override in ('Planificado', 'En Marcha', 'En Riesgo', 'Completado')
    ),
  archived_at timestamptz,
  created_by integer references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ted_plan_modulo_participantes (
  modulo_id bigint not null references public.ted_plan_modulos(id) on delete cascade,
  usuario_id integer not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (modulo_id, usuario_id)
);

create table public.ted_plan_tickets (
  id bigint generated always as identity primary key,
  titulo text not null,
  descripcion text,
  solicitado_por integer references public.usuarios(id),
  modulo_id bigint references public.ted_plan_modulos(id) on delete set null,
  estado text not null default 'abierto'
    check (estado in ('abierto', 'planificado', 'cerrado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ted_plan_tareas (
  id bigint generated always as identity primary key,
  modulo_id bigint not null references public.ted_plan_modulos(id) on delete cascade,
  titulo text not null,
  origen text not null default 'PLAN'
    check (origen in ('PLAN', 'TICKET', 'GERENCIA', 'USUARIO')),
  completada boolean not null default false,
  completada_at timestamptz,
  completada_by integer references public.usuarios(id),
  entregable_tipo text not null default 'ninguno'
    check (entregable_tipo in ('ninguno', 'vista', 'version', 'comentario')),
  entregable_ruta text,
  entregable_unidad text,
  entregable_version text,
  entregable_comentario text,
  ticket_id bigint references public.ted_plan_tickets(id) on delete set null,
  created_by integer references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ted_plan_tareas_modulo_idx on public.ted_plan_tareas (modulo_id);
create index ted_plan_tareas_origen_idx on public.ted_plan_tareas (origen);
create index ted_plan_tareas_completada_idx on public.ted_plan_tareas (completada);
create index ted_plan_tickets_estado_idx on public.ted_plan_tickets (estado);
create index ted_plan_modulos_archived_idx on public.ted_plan_modulos (archived_at);

create trigger ted_plan_modulos_set_updated_at
  before update on public.ted_plan_modulos
  for each row execute function public.set_updated_at();

create trigger ted_plan_tareas_set_updated_at
  before update on public.ted_plan_tareas
  for each row execute function public.set_updated_at();

create trigger ted_plan_tickets_set_updated_at
  before update on public.ted_plan_tickets
  for each row execute function public.set_updated_at();

create view public.vw_ted_plan_modulos_resumen
with (security_invoker = true) as
select
  m.id,
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
  group by t.modulo_id
) agg on agg.modulo_id = m.id
where m.archived_at is null;

alter table public.ted_plan_modulos enable row level security;
alter table public.ted_plan_modulo_participantes enable row level security;
alter table public.ted_plan_tareas enable row level security;
alter table public.ted_plan_tickets enable row level security;

create policy ted_plan_modulos_all on public.ted_plan_modulos
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

create policy ted_plan_participantes_all on public.ted_plan_modulo_participantes
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

create policy ted_plan_tareas_all on public.ted_plan_tareas
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

create policy ted_plan_tickets_all on public.ted_plan_tickets
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

grant select, insert, update, delete on public.ted_plan_modulos to authenticated;
grant select, insert, update, delete on public.ted_plan_modulo_participantes to authenticated;
grant select, insert, update, delete on public.ted_plan_tareas to authenticated;
grant select, insert, update, delete on public.ted_plan_tickets to authenticated;
grant select on public.vw_ted_plan_modulos_resumen to authenticated;
