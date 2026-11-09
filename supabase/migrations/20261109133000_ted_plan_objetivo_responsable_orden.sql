-- Orden de objetivos por persona asignada (independiente del orden general).

alter table public.ted_plan_objetivo_responsables
  add column if not exists orden integer;

update public.ted_plan_objetivo_responsables r
set orden = ranked.n
from (
  select
    r2.objetivo_id,
    r2.usuario_id,
    row_number() over (
      partition by r2.usuario_id
      order by coalesce(o.orden, 0), o.id
    ) as n
  from public.ted_plan_objetivo_responsables r2
  join public.ted_plan_objetivos o on o.id = r2.objetivo_id
) ranked
where r.objetivo_id = ranked.objetivo_id
  and r.usuario_id = ranked.usuario_id
  and r.orden is null;

alter table public.ted_plan_objetivo_responsables
  alter column orden set default 1;

alter table public.ted_plan_objetivo_responsables
  alter column orden set not null;

create index if not exists ted_plan_objetivo_responsables_user_orden_idx
  on public.ted_plan_objetivo_responsables (usuario_id, orden);
