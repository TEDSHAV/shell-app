-- Mapa vivo de quién sella internas: organigrama (depto/gerencia) + usuarios.
-- Se actualiza solo cuando cambia el coordinador del depto o el líder de la gerencia.
-- Los tramitadores de Administración salen de quién tiene el permiso de procesar.

create or replace view public.v_requisiciones_mapa_aprobadores
with (security_invoker = true) as
select
  d.id as departamento_id,
  d.nombre as departamento,
  nullif(btrim(d.gerencia), '') as gerencia,
  uc.nombre_apellido as coordinador_nombre,
  ul.nombre_apellido as lider_nombre
from public.departamentos d
left join public.usuarios uc
  on uc.id = d.coordinador
 and coalesce(uc.esta_activo, true)
left join public.gerencias g
  on lower(btrim(g.nombre)) = lower(btrim(d.gerencia))
left join public.usuarios ul
  on ul.id = g.lider
 and coalesce(ul.esta_activo, true)
order by
  lower(coalesce(d.gerencia, '')),
  lower(d.nombre);

create or replace view public.v_requisiciones_mapa_tramite
with (security_invoker = true) as
select distinct
  u.id as usuario_id,
  u.nombre_apellido as nombre
from authprisma.permissions p
join authprisma.role_permissions rp on rp.permission_id = p.id
join authprisma.roles r on r.id = rp.role_id
join authprisma.user_app_roles uar on uar.role_id = r.id
join public.usuarios u on u.id = uar.usuario_id
where p.slug = 'requisiciones:gestion:process'
  and u.nombre_apellido is not null
  and btrim(u.nombre_apellido) <> ''
  and coalesce(u.esta_activo, true)
order by u.nombre_apellido;

grant select on public.v_requisiciones_mapa_aprobadores to authenticated, service_role;
grant select on public.v_requisiciones_mapa_tramite to authenticated, service_role;
