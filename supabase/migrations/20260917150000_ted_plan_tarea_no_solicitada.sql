-- Distinct task status: not requested (excluded from compliance %).

alter table public.ted_plan_tareas
  add column if not exists no_solicitada boolean not null default false;
