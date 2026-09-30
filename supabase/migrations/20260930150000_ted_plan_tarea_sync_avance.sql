-- Sync task avance from checkboxes embedded in descripcion.

alter table public.ted_plan_tareas
  add column if not exists sync_avance_checklist boolean not null default false;
