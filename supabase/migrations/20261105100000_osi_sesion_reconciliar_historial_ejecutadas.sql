-- 20261105100000_osi_sesion_reconciliar_historial_ejecutadas.sql
-- Datos: sesiones con fecha_ejecutada cuyo último estatus en historial_cambios_estado no es 12.
-- La RPC del calendario calcula el estatus de la OSI con el historial; con este desfase, una acción sobre
-- esas sesiones podía reabrir una OSI ya ejecutada (y facturada).
-- Prod (2026-11-04, solo lectura): 8 sesiones, todas de la OSI 3508 (id 283, estatus 12), ejecutadas el
-- 2026-09-03 y pasadas a 11/10 en el historial el 2026-09-25 sin quitar la fecha de ejecución.
-- Agrega el 12 que falta (con el estatus anterior real) y no toca nada más. Es idempotente.
-- Nota de dueño: osi_sesion es de Capacitación; vive en Shell por decisión de la usuaria (2026-11-04).

with ultimo as (
  select distinct on (hc.id_registro) hc.id_registro, hc.id_estatus_nuevo
  from public.historial_cambios_estado hc
  where hc.tabla_afectada = 'osi_sesion'
  order by hc.id_registro, hc.fecha_cambio desc, hc.id desc
)
insert into public.historial_cambios_estado
  (tabla_afectada, id_registro, id_estatus_anterior, id_estatus_nuevo, fecha_cambio, id_usuario_cambio)
select 'osi_sesion', s.id, u.id_estatus_nuevo, 12, now(), null
from public.osi_sesion s
left join ultimo u on u.id_registro = s.id
where s.fecha_ejecutada is not null
  and coalesce(u.id_estatus_nuevo, 0) <> 12;
