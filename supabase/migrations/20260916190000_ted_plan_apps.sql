-- Apps as the top planning container; modules belong to an app.

create table if not exists public.ted_plan_apps (
  id bigint generated always as identity primary key,
  slug text not null unique,
  nombre text not null,
  subtitulo text,
  origen text not null default 'custom'
    check (origen in ('shell', 'custom')),
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

create index if not exists ted_plan_apps_archived_idx
  on public.ted_plan_apps (archived_at);

drop trigger if exists ted_plan_apps_set_updated_at on public.ted_plan_apps;
create trigger ted_plan_apps_set_updated_at
  before update on public.ted_plan_apps
  for each row execute function public.set_updated_at();

alter table public.ted_plan_modulos
  add column if not exists app_id bigint references public.ted_plan_apps(id);

insert into public.ted_plan_apps (slug, nombre, subtitulo, origen)
values ('negocios', 'Negocios', 'Gestión comercial y operativa', 'shell')
on conflict (slug) do nothing;

update public.ted_plan_modulos
set app_id = (select id from public.ted_plan_apps where slug = 'negocios' limit 1)
where app_id is null;

create index if not exists ted_plan_modulos_app_idx
  on public.ted_plan_modulos (app_id);

alter table public.ted_plan_apps enable row level security;

drop policy if exists ted_plan_apps_all on public.ted_plan_apps;
create policy ted_plan_apps_all on public.ted_plan_apps
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

grant select, insert, update, delete on public.ted_plan_apps to authenticated;

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
  group by t.modulo_id
) agg on agg.modulo_id = m.id
where m.archived_at is null;
