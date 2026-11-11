-- 20261103084500_add_editado_to_asistencia_diaria.sql
-- Agrega columna booleana para registrar si la asistencia fue editada manualmente

alter table public.asistencia_diaria
  add column if not exists editado boolean not null default false;

