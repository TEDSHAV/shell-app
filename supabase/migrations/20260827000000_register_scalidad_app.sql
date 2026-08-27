-- 20260827000000_register_scalidad_app.sql
-- Register the Calidad app in the authprisma schema so the shell can
-- manage roles and permissions for it.
--
-- Schema reference:
--   apps(id, slug, nombre)
--   roles(id, app_id, nombre, slug) — unique(app_id, slug)
--   permissions(id, slug, descripcion) — unique(slug)
--   role_permissions(role_id, permission_id) — PK(role_id, permission_id)
--   user_app_roles(id, usuario_id, app_id, role_id) — unique(usuario_id, app_id)

-- 1. Register the app
insert into authprisma.apps (slug, nombre)
values ('scalidad', 'Calidad')
on conflict (slug) do nothing;

-- 2. Create the "access" role for this app
insert into authprisma.roles (app_id, slug, nombre)
select a.id, 'access', 'Acceso'
from authprisma.apps a
where a.slug = 'scalidad'
on conflict (app_id, slug) do nothing;

-- 3. Create the "scalidad:all:access" permission (matches requiredPermissions in shell config/apps.ts)
insert into authprisma.permissions (slug, descripcion)
values ('scalidad:all:access', 'Acceso total al módulo de Calidad')
on conflict (slug) do nothing;

-- 4. Link the permission to the role
insert into authprisma.role_permissions (role_id, permission_id)
select r.id, p.id
from authprisma.roles r
cross join authprisma.permissions p
where r.app_id = (select id from authprisma.apps where slug = 'scalidad')
  and r.slug = 'access'
  and p.slug = 'scalidad:all:access'
on conflict do nothing;
