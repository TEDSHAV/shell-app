-- 20261104170000_osi_sesion_permisos_por_accion.sql
-- Calendario de servicios, segunda parte (sobre 20261104120000_osi_sesion_reagenda_calendario):
--   * un permiso por acción: osis:sesion:ejecutar, osis:sesion:reagendar, osis:sesion:cancelar
--     (reemplazan a osis:sesion:gestionar), asignados a todos los roles de sgestion;
--   * estado "No se dio": se sabe que la sesión no se dictó en su fecha, pero aún no se decide
--     si se reagenda o se cancela. Vive en columnas propias; no escribe historial_cambios_estado
--     (el último estatus sigue siendo el que era) ni cambia el estatus de la OSI;
--   * la ejecución no acepta fechas futuras (hora de Caracas).
-- Nota de dueño: osi_sesion es de Capacitación; vive en Shell por decisión de la usuaria (2026-11-04).

-- ─── Columnas "No se dio" ───
alter table public.osi_sesion
  add column if not exists no_se_dio boolean not null default false,
  add column if not exists no_se_dio_at timestamptz,
  add column if not exists no_se_dio_por integer references public.usuarios(id),
  add column if not exists no_se_dio_nota text;

comment on column public.osi_sesion.no_se_dio is
  'Se registró que la sesión no se dictó en su fecha; falta decidir si se reagenda o se cancela. Se limpia al ejecutar, reagendar o cancelar.';

-- ─── Vista: columnas nuevas al final ───
create or replace view public.v_osi_sesion_calendario
with (security_invoker = true) as
select
  s.id as id_sesion,
  s.id_osi,
  l.nro_osi,
  s.nro_sesion,
  count(*) over (partition by s.id_osi) as total_sesiones,
  s.fecha as fecha_planificada,
  s.hora_inicio,
  s.hora_fin,
  s.fecha_reagendada,
  s.hora_reagendada,
  s.fecha_ejecutada,
  s.hora_ejecutada,
  coalesce(s.fecha_ejecutada, s.fecha_reagendada, s.fecha) as fecha_efectiva,
  s.reagenda_count,
  s.motivo_no_ejecucion_tipo,
  s.motivo_no_ejecucion,
  h.id_estatus_nuevo as id_estatus_sesion,
  l.id_estatus as id_estatus_osi,
  l.nombre_empresa,
  l.servicio,
  l.tipo_servicio,
  l.id_ciudad_direccion_ejecucion_efectiva as id_ciudad,
  l.direccion_ejecucion,
  l.ejecutivo_negocios,
  s.no_se_dio,
  s.no_se_dio_at,
  s.no_se_dio_nota
from public.osi_sesion s
join public.v_osi_lista l on l.id_osi = s.id_osi
left join lateral (
  select hc.id_estatus_nuevo
  from public.historial_cambios_estado hc
  where hc.tabla_afectada = 'osi_sesion' and hc.id_registro = s.id
  order by hc.fecha_cambio desc
  limit 1
) h on true
where l.nro_osi not ilike 'PEN-%';

grant select on public.v_osi_sesion_calendario to authenticated;

-- ─── RPC: un permiso por acción, "no_se_dio" y sin ejecuciones futuras ───
create or replace function public.osi_sesion_registrar_accion(
  p_id_sesion bigint,
  p_accion text,
  p_fecha date default null,
  p_hora time default null,
  p_motivo_tipo text default null,
  p_motivo text default null,
  p_en_fecha_planificada boolean default null
)
returns table (id_osi integer, id_estatus_sesion integer, id_estatus_anterior integer, id_estatus_osi integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario integer := authprisma.current_usuario_id();
  v_hoy date := (now() at time zone 'America/Caracas')::date;
  v_permiso text;
  v_sesion public.osi_sesion%rowtype;
  v_prev integer;
  v_nuevo integer;
  v_total integer;
  v_ejecutadas integer;
  v_no_ejecutadas integer;
  v_osi_estatus integer;
  v_nro text;
begin
  v_permiso := case p_accion
    when 'ejecutar' then 'osis:sesion:ejecutar'
    when 'no_se_dio' then 'osis:sesion:ejecutar'
    when 'reagendar' then 'osis:sesion:reagendar'
    when 'no_ejecutar' then 'osis:sesion:cancelar'
  end;
  if v_permiso is null then
    raise exception 'Acción no válida: %', p_accion using errcode = '22023';
  end if;
  if not authprisma.can_access(v_permiso, 'sgestion') then
    raise exception 'No tienes permiso para esta acción' using errcode = '42501';
  end if;

  select * into v_sesion from public.osi_sesion where id = p_id_sesion for update;
  if not found then
    raise exception 'Sesión no encontrada' using errcode = 'P0002';
  end if;

  select hc.id_estatus_nuevo into v_prev
  from public.historial_cambios_estado hc
  where hc.tabla_afectada = 'osi_sesion' and hc.id_registro = p_id_sesion
  order by hc.fecha_cambio desc, hc.id desc
  limit 1;

  -- "No se dio": solo marca; no toca historial ni el estatus de la OSI.
  if p_accion = 'no_se_dio' then
    if v_sesion.fecha_ejecutada is not null or v_prev in (12, 39) then
      raise exception 'La sesión ya está ejecutada o cancelada' using errcode = '22023';
    end if;
    if coalesce(v_sesion.fecha_reagendada, v_sesion.fecha) > v_hoy then
      raise exception 'La fecha de la sesión todavía no llega' using errcode = '22023';
    end if;
    update public.osi_sesion
    set no_se_dio = true,
        no_se_dio_at = now(),
        no_se_dio_por = v_usuario,
        no_se_dio_nota = nullif(btrim(coalesce(p_motivo, '')), '')
    where id = p_id_sesion;

    select e.id_estatus into v_osi_estatus from public.ejecucion_osi e where e.id = v_sesion.id_osi;
    return query select v_sesion.id_osi, v_prev, v_prev, v_osi_estatus;
    return;
  end if;

  if p_accion = 'ejecutar' then
    if p_fecha is null then
      raise exception 'Indica la fecha real de ejecución' using errcode = '22023';
    end if;
    if p_fecha > v_hoy then
      raise exception 'La fecha de ejecución no puede ser futura' using errcode = '22023';
    end if;
    v_nuevo := 12;
    update public.osi_sesion
    set fecha_ejecutada = p_fecha,
        hora_ejecutada = coalesce(p_hora, v_sesion.hora_reagendada, v_sesion.hora_inicio),
        ejecutada_en_fecha_planificada = coalesce(p_en_fecha_planificada, p_fecha = v_sesion.fecha),
        motivo_no_ejecucion_tipo = null,
        motivo_no_ejecucion = null,
        no_se_dio = false
    where id = p_id_sesion;

  elsif p_accion = 'reagendar' then
    if coalesce(btrim(p_motivo), '') = '' then
      raise exception 'Indica el motivo de la reagenda' using errcode = '22023';
    end if;
    v_nuevo := 46;
    insert into public.osi_sesion_reagenda (id_sesion, fecha_desde, fecha_hasta, hora_hasta, motivo_tipo, motivo, id_usuario)
    values (
      p_id_sesion,
      coalesce(v_sesion.fecha_reagendada, v_sesion.fecha),
      p_fecha,
      p_hora,
      p_motivo_tipo,
      btrim(p_motivo),
      v_usuario
    );
    update public.osi_sesion
    set fecha_reagendada = p_fecha,
        hora_reagendada = case when p_fecha is null then null else coalesce(p_hora, v_sesion.hora_inicio) end,
        reagenda_count = reagenda_count + 1,
        fecha_ejecutada = null,
        hora_ejecutada = null,
        ejecutada_en_fecha_planificada = null,
        motivo_no_ejecucion_tipo = null,
        motivo_no_ejecucion = null,
        no_se_dio = false
    where id = p_id_sesion;

  else -- no_ejecutar (cancelar)
    if coalesce(btrim(p_motivo), '') = '' then
      raise exception 'Indica el motivo de la cancelación' using errcode = '22023';
    end if;
    v_nuevo := 39;
    update public.osi_sesion
    set motivo_no_ejecucion_tipo = p_motivo_tipo,
        motivo_no_ejecucion = btrim(p_motivo),
        fecha_ejecutada = null,
        hora_ejecutada = null,
        ejecutada_en_fecha_planificada = null,
        no_se_dio = false
    where id = p_id_sesion;
  end if;

  insert into public.historial_cambios_estado
    (tabla_afectada, id_registro, id_estatus_anterior, id_estatus_nuevo, fecha_cambio, id_usuario_cambio)
  values ('osi_sesion', p_id_sesion, v_prev, v_nuevo, now(), v_usuario);

  -- Estado de la OSI: solo se cierra cuando todas sus sesiones están en estado final.
  select count(*),
         count(*) filter (where ult.id_estatus_nuevo = 12),
         count(*) filter (where ult.id_estatus_nuevo = 39)
  into v_total, v_ejecutadas, v_no_ejecutadas
  from public.osi_sesion s
  left join lateral (
    select hc.id_estatus_nuevo
    from public.historial_cambios_estado hc
    where hc.tabla_afectada = 'osi_sesion' and hc.id_registro = s.id
    order by hc.fecha_cambio desc, hc.id desc
    limit 1
  ) ult on true
  where s.id_osi = v_sesion.id_osi;

  select e.id_estatus, e.nro_osi_secuencial into v_osi_estatus, v_nro
  from public.ejecucion_osi e where e.id = v_sesion.id_osi for update;

  if v_ejecutadas + v_no_ejecutadas = v_total then
    if v_ejecutadas > 0 and coalesce(v_nro, '') !~* '^PEN-[0-9]+$' then
      v_osi_estatus := 12;
    elsif v_ejecutadas = 0 then
      v_osi_estatus := 39;
    end if;
  elsif v_osi_estatus in (12, 39) then
    v_osi_estatus := 11;
  elsif v_osi_estatus = 10 and v_nuevo = 12 then
    v_osi_estatus := 11;
  end if;

  update public.ejecucion_osi e
  set id_estatus = v_osi_estatus
  where e.id = v_sesion.id_osi and e.id_estatus is distinct from v_osi_estatus;

  return query select v_sesion.id_osi, v_nuevo, v_prev, v_osi_estatus;
end;
$$;

revoke all on function public.osi_sesion_registrar_accion(bigint, text, date, time, text, text, boolean) from public, anon;
grant execute on function public.osi_sesion_registrar_accion(bigint, text, date, time, text, text, boolean) to authenticated;

-- ─── Permisos: uno por acción, en todos los roles de sgestion ───
-- (osis:sesion:gestionar ya no lo crea 20261104120000, así que no hay nada que retirar.)
insert into authprisma.permissions (slug, descripcion) values
  ('osis:sesion:ejecutar', 'Marcar una sesión de OSI como ejecutada o como «no se dio» (Calendario de servicios)'),
  ('osis:sesion:reagendar', 'Reagendar una sesión de OSI (Calendario de servicios)'),
  ('osis:sesion:cancelar', 'Cancelar una sesión de OSI: no se dio y no se va a dar (Calendario de servicios)')
on conflict (slug) do nothing;

insert into authprisma.role_permissions (role_id, permission_id)
select r.id, p.id
from authprisma.roles r
join authprisma.apps a on a.id = r.app_id and a.slug = 'sgestion'
cross join authprisma.permissions p
where p.slug in ('osis:sesion:ejecutar', 'osis:sesion:reagendar', 'osis:sesion:cancelar')
on conflict do nothing;
