-- 20261026153000_add_corte_to_asistencia_diaria.sql
-- Permite registrar asistencias independientes por corte (mañana vs tarde)
-- y configura la hora de reinicio de sesión de mediodía/almuerzo (12:30 PM).

alter table public.asistencia_config
  add column if not exists hora_reset_mediodia time not null default '12:30:00';

alter table public.asistencia_diaria
  add column if not exists corte smallint not null default 1 check (corte in (1, 2));

-- Actualiza la restricción única de asistencia diaria para que sea por usuario, fecha y corte
alter table public.asistencia_diaria
  drop constraint if exists asistencia_diaria_usuario_fecha_uk;

alter table public.asistencia_diaria
  add constraint asistencia_diaria_usuario_fecha_corte_uk
  unique (usuario_id, fecha, corte);

create index if not exists asistencia_diaria_usuario_fecha_corte_idx
  on public.asistencia_diaria (usuario_id, fecha desc, corte);

create index if not exists asistencia_diaria_fecha_corte_idx
  on public.asistencia_diaria (fecha desc, corte);
