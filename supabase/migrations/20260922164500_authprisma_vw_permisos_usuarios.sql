-- Missing on staging; production has this denormalized catalog view.

create or replace view authprisma.vw_permisos_usuarios as
select
  a.id as app_id,
  a.nombre as app_nombre,
  a.slug as app_slug,
  r.id as role_id,
  r.nombre as role_nombre,
  r.slug as role_slug,
  coalesce(
    array_agg(distinct p.slug) filter (where p.slug is not null),
    array[]::text[]
  ) as permisos_slugs,
  u.id as usuario_id,
  u.nombre_apellido as usuario_nombre,
  u.email_corporativo as usuario_email,
  u.cargo as usuario_cargo,
  u.esta_activo as usuario_activo,
  uar.created_at as asignacion_fecha
from authprisma.apps a
join authprisma.roles r on r.app_id = a.id
left join authprisma.role_permissions rp on rp.role_id = r.id
left join authprisma.permissions p on p.id = rp.permission_id
left join authprisma.user_app_roles uar
  on uar.role_id = r.id and uar.app_id = a.id
left join public.usuarios u on u.id = uar.usuario_id
group by
  a.id, a.nombre, a.slug,
  r.id, r.nombre, r.slug,
  u.id, u.nombre_apellido, u.email_corporativo, u.cargo, u.esta_activo,
  uar.created_at;

comment on view authprisma.vw_permisos_usuarios is
  'Una fila = app + rol (+ usuario si hay asignacion). TED Accesos.';

grant select on authprisma.vw_permisos_usuarios to anon, authenticated, service_role;

notify pgrst, 'reload schema';
