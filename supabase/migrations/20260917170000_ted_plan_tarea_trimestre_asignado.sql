-- Optional quarter when no dates, plus task assignee.

alter table public.ted_plan_tareas
  add column if not exists trimestre text;

alter table public.ted_plan_tareas
  drop constraint if exists ted_plan_tareas_trimestre_check;

alter table public.ted_plan_tareas
  add constraint ted_plan_tareas_trimestre_check
  check (
    trimestre is null
    or trimestre in ('T1', 'T2', 'T3', 'T4')
  );

alter table public.ted_plan_tareas
  add column if not exists asignado_id integer;

notify pgrst, 'reload schema';
