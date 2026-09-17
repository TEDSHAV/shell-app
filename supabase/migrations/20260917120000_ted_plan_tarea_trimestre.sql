-- Task calendar: store a date or a range. Occupied months are derived.

alter table public.ted_plan_tareas
  add column if not exists fecha_inicio date;

alter table public.ted_plan_tareas
  add column if not exists fecha_fin date;

alter table public.ted_plan_tareas
  drop constraint if exists ted_plan_tareas_fecha_rango;

alter table public.ted_plan_tareas
  add constraint ted_plan_tareas_fecha_rango
  check (
    fecha_inicio is null
    or fecha_fin is null
    or fecha_fin >= fecha_inicio
  );
