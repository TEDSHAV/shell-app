-- Lider role for Administración (authprisma app id=4). Assign usuario 13 (Pedro).
-- user_app_roles is unique per (usuario_id, app_id): this replaces the previous
-- role on app 4 for that user.

insert into authprisma.roles (app_id, slug, nombre)
select a.id, 'lider', 'Lider'
from authprisma.apps a
where a.id = 4
  and not exists (
    select 1 from authprisma.roles r
    where r.app_id = 4 and r.slug = 'lider'
  );

insert into authprisma.user_app_roles (usuario_id, app_id, role_id)
select 13, 4, r.id
from authprisma.roles r
where r.app_id = 4
  and r.slug = 'lider'
  and exists (select 1 from public.usuarios u where u.id = 13)
on conflict (usuario_id, app_id) do update
  set role_id = excluded.role_id,
      updated_at = now();
