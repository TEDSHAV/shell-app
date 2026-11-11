-- 20261111120000_tareas_vistas_configurar_permiso.sql
-- Negocios (SGestion) · /tareas/configuracion: crear y editar vistas de tareas, sus tipos y sus reglas.
-- Las políticas de tareas_vistas y tareas_categorias (migraciones de SGestion) aceptan este permiso.
-- Se asigna a SuperAdmin y Admin de sgestion.

insert into authprisma.permissions (slug, descripcion) values
  ('tareas:vistas:configurar', 'Configurar las vistas de tareas: tipos, avance, reglas del sistema')
on conflict (slug) do nothing;

insert into authprisma.role_permissions (role_id, permission_id)
select r.id, p.id
from authprisma.roles r
join authprisma.apps a on a.id = r.app_id and a.slug = 'sgestion'
join authprisma.permissions p on p.slug = 'tareas:vistas:configurar'
where r.slug in ('superadmin', 'admin')
on conflict do nothing;
