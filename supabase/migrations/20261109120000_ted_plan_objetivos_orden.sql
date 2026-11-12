-- Orden cronológico de objetivos del plan del mes (independiente de fechas).

alter table public.ted_plan_objetivos
  add column if not exists orden integer;

update public.ted_plan_objetivos o
set orden = ranked.n
from (
  select
    id,
    row_number() over (
      partition by date_trunc('month', fecha_inicio)::date
      order by fecha_inicio, id
    ) as n
  from public.ted_plan_objetivos
) ranked
where o.id = ranked.id
  and o.orden is null;

alter table public.ted_plan_objetivos
  alter column orden set default 1;

alter table public.ted_plan_objetivos
  alter column orden set not null;

create index if not exists ted_plan_objetivos_mes_orden_idx
  on public.ted_plan_objetivos (fecha_inicio, orden, id);
