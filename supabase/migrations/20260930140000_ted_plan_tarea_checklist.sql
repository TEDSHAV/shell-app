-- Checklist items on plan tasks; they can drive avance without locking it.

alter table public.ted_plan_tareas
  add column if not exists checklist jsonb not null default '[]'::jsonb;

alter table public.ted_plan_tareas
  drop constraint if exists ted_plan_tareas_checklist_is_array;

alter table public.ted_plan_tareas
  add constraint ted_plan_tareas_checklist_is_array
  check (jsonb_typeof(checklist) = 'array');
