-- Drop extra-lideres table. ST approval uses authprisma app id=5 (st) role lider.

drop policy if exists gerencias_lideres_select_authenticated on public.gerencias_lideres;
drop table if exists public.gerencias_lideres;

insert into authprisma.roles (app_id, slug, nombre)
select a.id, 'lider', 'Lider'
from authprisma.apps a
where a.id = 5
  and not exists (
    select 1 from authprisma.roles r
    where r.app_id = 5 and r.slug = 'lider'
  );

insert into authprisma.user_app_roles (usuario_id, app_id, role_id)
select 13, 5, r.id
from authprisma.roles r
where r.app_id = 5
  and r.slug = 'lider'
  and exists (select 1 from public.usuarios u where u.id = 13)
on conflict (usuario_id, app_id) do update
  set role_id = excluded.role_id,
      updated_at = now();
