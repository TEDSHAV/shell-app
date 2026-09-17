-- Task progress 0–100. completada stays in sync as avance = 100.

alter table public.ted_plan_tareas
  add column if not exists avance integer;

update public.ted_plan_tareas
set avance = case when completada then 100 else 0 end
where avance is null;

alter table public.ted_plan_tareas
  alter column avance set default 0;

alter table public.ted_plan_tareas
  alter column avance set not null;

alter table public.ted_plan_tareas
  drop constraint if exists ted_plan_tareas_avance_rango;

alter table public.ted_plan_tareas
  add constraint ted_plan_tareas_avance_rango
  check (avance >= 0 and avance <= 100);
