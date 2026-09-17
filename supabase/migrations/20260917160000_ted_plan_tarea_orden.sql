-- List order for tasks without dates. Dates stay optional.

alter table public.ted_plan_tareas
  add column if not exists orden integer;

update public.ted_plan_tareas
set orden = id
where orden is null;

alter table public.ted_plan_tareas
  alter column orden set default 0;

alter table public.ted_plan_tareas
  alter column orden set not null;

notify pgrst, 'reload schema';
