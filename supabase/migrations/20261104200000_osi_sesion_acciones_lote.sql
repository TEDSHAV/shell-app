-- 20261104200000_osi_sesion_acciones_lote.sql
-- Calendario de servicios y Consulta de OSIs: misma acción sobre varias sesiones a la vez.
-- Reutiliza osi_sesion_registrar_accion (permisos, validaciones y estado de la OSI) para cada sesión.
-- Cada sesión va en su propio subbloque: si una falla, se informa y las demás siguen.
-- Nota de dueño: osi_sesion es de Capacitación; vive en Shell por decisión de la usuaria (2026-11-04).

create or replace function public.osi_sesion_registrar_acciones_lote(
  p_accion text,
  p_ids_sesion bigint[],
  p_fecha date default null,
  p_hora time default null,
  p_motivo_tipo text default null,
  p_motivo text default null,
  -- Solo para 'ejecutar': cada sesión se marca ejecutada en su propia fecha (reagendada o planificada).
  p_fecha_propia boolean default false
)
returns table (id_sesion bigint, ok boolean, error text, id_osi integer, id_estatus_osi integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id bigint;
  v_fecha date;
  r record;
begin
  if coalesce(array_length(p_ids_sesion, 1), 0) = 0 then
    return;
  end if;
  if array_length(p_ids_sesion, 1) > 200 then
    raise exception 'Máximo 200 sesiones por lote' using errcode = '22023';
  end if;

  -- Orden fijo por id: varias sesiones de la misma OSI toman los bloqueos siempre en el mismo orden.
  for v_id in select distinct x from unnest(p_ids_sesion) x order by x loop
    begin
      v_fecha := p_fecha;
      if p_accion = 'ejecutar' and p_fecha_propia then
        select coalesce(s.fecha_reagendada, s.fecha) into v_fecha from public.osi_sesion s where s.id = v_id;
      end if;

      select * into r
      from public.osi_sesion_registrar_accion(v_id, p_accion, v_fecha, p_hora, p_motivo_tipo, p_motivo, null);

      id_sesion := v_id; ok := true; error := null; id_osi := r.id_osi; id_estatus_osi := r.id_estatus_osi;
      return next;
    exception when others then
      id_sesion := v_id; ok := false; error := sqlerrm; id_osi := null; id_estatus_osi := null;
      return next;
    end;
  end loop;
end;
$$;

revoke all on function public.osi_sesion_registrar_acciones_lote(text, bigint[], date, time, text, text, boolean) from public, anon;
grant execute on function public.osi_sesion_registrar_acciones_lote(text, bigint[], date, time, text, text, boolean) to authenticated;
