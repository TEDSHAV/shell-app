-- 20261026114500_add_second_corte_to_asistencia.sql
-- Agrega soporte para el segundo corte de asistencia (2:00 PM / 14:00) y bitácora por corte

alter table public.asistencia_config
  add column if not exists activo_corte_2 boolean not null default true,
  add column if not exists hora_corte_2 time not null default '14:00:00';

alter table public.asistencia_reportes_log
  add column if not exists corte smallint not null default 1 check (corte in (1, 2));

-- Actualiza la restricción de unicidad para permitir 1 envío programado por corte en una misma fecha
drop index if exists public.asistencia_reportes_log_scheduled_once_uidx;

create unique index if not exists asistencia_reportes_log_scheduled_corte_uidx
  on public.asistencia_reportes_log (fecha, corte)
  where tipo = 'scheduled' and status in ('sending', 'sent', 'skipped_holiday');
