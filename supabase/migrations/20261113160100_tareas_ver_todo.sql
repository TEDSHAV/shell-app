-- 20261113160000_tareas_ver_todo.sql
-- Tareas (Negocios /tareas): quién ve las tareas de todos los departamentos.
-- Cada persona ve lo de su departamento más lo suyo; quien tenga `tareas:ver-todo` ve y filtra todo.
-- Va en una app propia («tareas», como spresupuesto o ted) para no cambiar el rol que cada quien tiene en su app:
-- el rol `ver-todo` de la app `tareas` lleva el permiso. Se asigna en Accesos (app Tareas) o desde
-- /tareas/configuracion de Negocios con las funciones de abajo; las dos escriben la misma fila de user_app_roles.
-- SuperAdmin de sgestion y Gerencia general lo ven todo sin este rol (lo resuelve Negocios: fn_tareas_ve_todo).
-- Idempotente.

insert into authprisma.apps (slug, nombre, descripcion)
values ('tareas', 'Tareas', 'Visibilidad entre departamentos del módulo de tareas.')
on conflict (slug) do nothing;

insert into authprisma.permissions (slug, descripcion)
values ('tareas:ver-todo', 'Ve y filtra las tareas de todos los departamentos')
on conflict (slug) do nothing;

insert into authprisma.roles (app_id, slug, nombre, descripcion)
select a.id, 'ver-todo', 'Ve todas las tareas', 'Líderes que siguen las tareas de todos los departamentos.'
from authprisma.apps a
where a.slug = 'tareas'
on conflict (app_id, slug) do nothing;

insert into authprisma.role_permissions (role_id, permission_id)
select r.id, p.id
from authprisma.roles r
join authprisma.apps a on a.id = r.app_id and a.slug = 'tareas'
join authprisma.permissions p on p.slug = 'tareas:ver-todo'
where r.slug = 'ver-todo'
on conflict do nothing;

-- Quién lo administra desde Negocios: quien configura vistas de tareas.
create or replace function authprisma.fn_tareas_puede_asignar_ver_todo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select authprisma.can_access('tareas:vistas:configurar', 'sgestion');
$$;

-- Personas con el rol `ver-todo` de la app `tareas` (lo mismo que muestra Accesos).
create or replace function authprisma.fn_tareas_ver_todo_listar()
returns table (usuario_id integer, nombre text, departamento integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not authprisma.fn_tareas_puede_asignar_ver_todo() then
    raise exception 'Sin permiso para ver quién ve todas las tareas.';
  end if;
  return query
    select u.id, u.nombre_apellido::text, u.departamento
    from authprisma.user_app_roles uar
    join authprisma.apps a on a.id = uar.app_id and a.slug = 'tareas'
    join authprisma.roles r on r.id = uar.role_id and r.slug = 'ver-todo'
    join public.usuarios u on u.id = uar.usuario_id
    order by u.nombre_apellido;
end;
$$;

-- Da (p_activo = true) o quita el rol `ver-todo` de la app `tareas` a una persona.
create or replace function authprisma.fn_tareas_ver_todo_asignar(p_usuario_id integer, p_activo boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app bigint;
  v_rol bigint;
begin
  if not authprisma.fn_tareas_puede_asignar_ver_todo() then
    raise exception 'Sin permiso para cambiar quién ve todas las tareas.';
  end if;
  select a.id, r.id into v_app, v_rol
  from authprisma.apps a join authprisma.roles r on r.app_id = a.id and r.slug = 'ver-todo'
  where a.slug = 'tareas';
  if v_rol is null then
    raise exception 'Falta el rol ver-todo de la app tareas.';
  end if;
  if not exists (select 1 from public.usuarios u where u.id = p_usuario_id) then
    raise exception 'Persona no válida.';
  end if;
  if p_activo then
    insert into authprisma.user_app_roles (usuario_id, app_id, role_id)
    values (p_usuario_id, v_app, v_rol)
    on conflict (usuario_id, app_id) do update set role_id = excluded.role_id, updated_at = now();
  else
    delete from authprisma.user_app_roles where usuario_id = p_usuario_id and app_id = v_app;
  end if;
end;
$$;

revoke execute on function authprisma.fn_tareas_puede_asignar_ver_todo() from public, anon;
revoke execute on function authprisma.fn_tareas_ver_todo_listar() from public, anon;
revoke execute on function authprisma.fn_tareas_ver_todo_asignar(integer, boolean) from public, anon;
grant execute on function authprisma.fn_tareas_puede_asignar_ver_todo() to authenticated;
grant execute on function authprisma.fn_tareas_ver_todo_listar() to authenticated;
grant execute on function authprisma.fn_tareas_ver_todo_asignar(integer, boolean) to authenticated;
