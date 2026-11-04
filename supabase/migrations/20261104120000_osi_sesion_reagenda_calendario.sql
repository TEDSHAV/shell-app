-- 20261104120000_osi_sesion_reagenda_calendario.sql
-- Calendario de servicios (Shell /consulta-osi/calendario):
--   * reagenda iterativa por sesión sin tocar osi_sesion.fecha (fecha planificada legal),
--   * no ejecución por sesión con motivo,
--   * vista de calendario, RPC transaccional de acciones y RPC de conteo de comentarios por OSI,
--   * permiso osis:sesion:gestionar para todos los roles de sgestion.
-- Nota de dueño: osi_sesion es de Capacitación (nextjs-capacitacion-module); esta migración vive
-- en Shell por decisión de la usuaria (2026-11-04).
-- osi_sesion.fecha alimenta fn_sync_osi_dates_from_sessions (fecha_inicio_real / fecha_fin_real),
-- por eso la reagenda escribe en columnas propias.

-- ─── Columnas en osi_sesion ───
alter table public.osi_sesion
  add column if not exists fecha_reagendada date,
  add column if not exists hora_reagendada time,
  add column if not exists reagenda_count smallint not null default 0,
  add column if not exists motivo_no_ejecucion_tipo text,
  add column if not exists motivo_no_ejecucion text;

comment on column public.osi_sesion.fecha_reagendada is
  'Última fecha tentativa de reagenda. Null con estatus 46 = por confirmar. No reemplaza a fecha (planificada).';

-- ─── Historial de reagendas ───
create table if not exists public.osi_sesion_reagenda (
  id bigint generated always as identity primary key,
  id_sesion bigint not null references public.osi_sesion(id) on delete cascade,
  fecha_desde date,
  fecha_hasta date,
  hora_hasta time,
  motivo_tipo text,
  motivo text not null,
  id_usuario integer references public.usuarios(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_osi_sesion_reagenda_sesion
  on public.osi_sesion_reagenda (id_sesion, created_at desc);

alter table public.osi_sesion_reagenda enable row level security;

drop policy if exists osi_sesion_reagenda_select on public.osi_sesion_reagenda;
create policy osi_sesion_reagenda_select on public.osi_sesion_reagenda
  for select to authenticated
  using ((select authprisma.current_usuario_id()) is not null);

grant select on public.osi_sesion_reagenda to authenticated;

-- ─── Vista del calendario (una fila por sesión) ───
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
  l.ejecutivo_negocios
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

-- ─── RPC: ejecutar / reagendar / no ejecutar una sesión ───
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
  v_sesion public.osi_sesion%rowtype;
  v_prev integer;
  v_nuevo integer;
  v_total integer;
  v_ejecutadas integer;
  v_no_ejecutadas integer;
  v_osi_estatus integer;
  v_nro text;
begin
  if not authprisma.can_access('osis:sesion:gestionar', 'sgestion') then
    raise exception 'No tienes permiso para gestionar la ejecución de sesiones' using errcode = '42501';
  end if;

  select * into v_sesion from public.osi_sesion where id = p_id_sesion for update;
  if not found then
    raise exception 'Sesión no encontrada' using errcode = 'P0002';
  end if;

  select hc.id_estatus_nuevo into v_prev
  from public.historial_cambios_estado hc
  where hc.tabla_afectada = 'osi_sesion' and hc.id_registro = p_id_sesion
  order by hc.fecha_cambio desc
  limit 1;

  if p_accion = 'ejecutar' then
    if p_fecha is null then
      raise exception 'Indica la fecha real de ejecución' using errcode = '22023';
    end if;
    v_nuevo := 12;
    update public.osi_sesion
    set fecha_ejecutada = p_fecha,
        hora_ejecutada = coalesce(p_hora, v_sesion.hora_reagendada, v_sesion.hora_inicio),
        ejecutada_en_fecha_planificada = coalesce(p_en_fecha_planificada, p_fecha = v_sesion.fecha),
        motivo_no_ejecucion_tipo = null,
        motivo_no_ejecucion = null
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
        motivo_no_ejecucion = null
    where id = p_id_sesion;

  elsif p_accion = 'no_ejecutar' then
    if coalesce(btrim(p_motivo), '') = '' then
      raise exception 'Indica el motivo de la no ejecución' using errcode = '22023';
    end if;
    v_nuevo := 39;
    update public.osi_sesion
    set motivo_no_ejecucion_tipo = p_motivo_tipo,
        motivo_no_ejecucion = btrim(p_motivo),
        fecha_ejecutada = null,
        hora_ejecutada = null,
        ejecutada_en_fecha_planificada = null
    where id = p_id_sesion;

  else
    raise exception 'Acción no válida: %', p_accion using errcode = '22023';
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

-- ─── RPC: comentarios vinculados por OSI (respeta RLS de comentarios_contexto) ───
create or replace function public.get_osi_comentarios_resumen(p_osi_ids integer[])
returns table (id_osi integer, total integer, ultimo_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select v.entity_id as id_osi,
         count(distinct v.comentario_id)::integer as total,
         max(c.created_at) as ultimo_at
  from public.comentario_entidad_vinculos v
  join public.comentarios_contexto c on c.id = v.comentario_id
  where v.entity_type = 'osi'
    and v.entity_id = any (p_osi_ids)
  group by v.entity_id;
$$;

revoke all on function public.get_osi_comentarios_resumen(integer[]) from public, anon;
grant execute on function public.get_osi_comentarios_resumen(integer[]) to authenticated;

-- ─── Permiso y asignación a todos los roles de sgestion ───
insert into authprisma.permissions (slug, descripcion)
values ('osis:sesion:gestionar', 'Ejecutar, reagendar o marcar como no ejecutadas las sesiones de una OSI (Calendario de servicios)')
on conflict (slug) do nothing;

insert into authprisma.role_permissions (role_id, permission_id)
select r.id, p.id
from authprisma.roles r
join authprisma.apps a on a.id = r.app_id and a.slug = 'sgestion'
cross join authprisma.permissions p
where p.slug = 'osis:sesion:gestionar'
on conflict do nothing;
