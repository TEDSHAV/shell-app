-- 20261104210000_osi_sesion_permiso_cualquier_app.sql
-- Los permisos osis:sesion:{ejecutar,reagendar,cancelar} se pueden asignar a roles de cualquier app
-- (sgestion, scapacitacion, servicios técnicos…). La RPC solo revisaba la app sgestion, mientras el
-- Shell los busca en todas las apps del usuario: con el permiso en un rol de scapacitacion la pantalla
-- ofrecía la acción y la BD la rechazaba ("No tienes permiso para esta acción").
-- Ahora la BD también acepta el permiso venga de la app que venga.

-- ─── ¿El usuario actual tiene el permiso en alguna de sus apps? ───
create or replace function authprisma.can_access_any_app(target_permission text)
returns boolean
language sql
stable
security definer
set search_path = public, authprisma
as $$
  select exists (
    select 1
    from public.usuarios u
    join authprisma.user_app_roles uar on uar.usuario_id = u.id
    join authprisma.roles r on r.id = uar.role_id and r.app_id = uar.app_id
    join authprisma.role_permissions rp on rp.role_id = r.id
    join authprisma.permissions p on p.id = rp.permission_id
    where u.id_auth = auth.uid()
      and p.slug = target_permission
  );
$$;

revoke all on function authprisma.can_access_any_app(text) from public, anon;
grant execute on function authprisma.can_access_any_app(text) to authenticated;

-- ─── RPC: igual que en 20261104170000, salvo el chequeo de permiso ───
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
  if not authprisma.can_access_any_app(v_permiso) then
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
