-- Requisiciones notify: cola Admin por roles TED + territorio∩permiso en sellos.
-- Control editable en /ted/notificaciones (event_recipient_config).

-- 1) Resolver: organigrama de sello ∩ roles/permisos si están configurados;
--    permisos globales (no amarrados al app_slug del evento notify).
create or replace function notify.resolve_recipients(
  p_app_slug text,
  p_event_key text,
  p_context jsonb default '{}'::jsonb
)
returns table(id_auth uuid)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_active boolean;
  v_cfg record;
  v_rules jsonb;
  v_stamp_mode boolean;
  v_has_role_or_perm boolean;
begin
  select et.is_active
  into v_active
  from notify.event_types et
  where et.app_slug = p_app_slug
    and et.event_key = p_event_key;

  if not found or not coalesce(v_active, false) then
    return;
  end if;

  select
    c.allowed_role_slugs,
    c.allowed_permission_slugs,
    c.allowed_departamento_ids,
    c.allowed_user_ids,
    c.denied_user_ids,
    c.special_rules
  into v_cfg
  from notify.event_recipient_config c
  where c.app_slug = p_app_slug
    and c.event_key = p_event_key;

  if not found then
    return;
  end if;

  v_rules := coalesce(v_cfg.special_rules, '{}'::jsonb);
  v_stamp_mode :=
    coalesce((v_rules->>'lider_gerencia')::boolean, false)
    or coalesce((v_rules->>'coordinador_departamento')::boolean, false);
  v_has_role_or_perm :=
    jsonb_array_length(coalesce(v_cfg.allowed_role_slugs, '[]'::jsonb)) > 0
    or jsonb_array_length(coalesce(v_cfg.allowed_permission_slugs, '[]'::jsonb)) > 0;

  return query
  with
  manual_users as (
    select u.id_auth, u.id as usuario_id
    from jsonb_array_elements_text(coalesce(v_cfg.allowed_user_ids, '[]'::jsonb)) aid
    join public.usuarios u on u.id = aid.value::bigint
    where u.id_auth is not null
      and coalesce(u.esta_activo, true)
  ),
  role_users as (
    select distinct u.id_auth, u.id as usuario_id
    from jsonb_array_elements_text(coalesce(v_cfg.allowed_role_slugs, '[]'::jsonb)) rk
    cross join lateral (
      select
        lower(trim(split_part(rk.value, ':', 1))) as app_slug,
        lower(trim(split_part(rk.value, ':', 2))) as role_slug
    ) parsed
    join authprisma.apps a on a.slug = parsed.app_slug
    join authprisma.roles r
      on r.app_id = a.id
     and lower(r.slug) = parsed.role_slug
    join authprisma.user_app_roles uar
      on uar.role_id = r.id
     and uar.app_id = a.id
    join public.usuarios u on u.id = uar.usuario_id
    where parsed.role_slug <> ''
      and u.id_auth is not null
      and coalesce(u.esta_activo, true)
  ),
  -- Permisos globales: el rol puede vivir en sadministracion aunque el evento
  -- notify use app_slug = administracion.
  perm_users as (
    select distinct u.id_auth, u.id as usuario_id
    from jsonb_array_elements_text(coalesce(v_cfg.allowed_permission_slugs, '[]'::jsonb)) ps
    join authprisma.permissions p on p.slug = ps.value
    join authprisma.role_permissions rp on rp.permission_id = p.id
    join authprisma.roles r on r.id = rp.role_id
    join authprisma.user_app_roles uar on uar.role_id = r.id
    join public.usuarios u on u.id = uar.usuario_id
    where u.id_auth is not null
      and coalesce(u.esta_activo, true)
  ),
  gate_users as (
    select * from role_users
    union
    select * from perm_users
  ),
  dept_users as (
    select distinct u.id_auth, u.id as usuario_id
    from jsonb_array_elements_text(coalesce(v_cfg.allowed_departamento_ids, '[]'::jsonb)) did
    join public.usuarios u on u.departamento = did.value::bigint
    where u.id_auth is not null
      and coalesce(u.esta_activo, true)
  ),
  broadcast_users as (
    select distinct u.id_auth, u.id as usuario_id
    from authprisma.user_app_roles uar
    join authprisma.apps a on a.id = uar.app_id
    join public.usuarios u on u.id = uar.usuario_id
    where v_rules ? 'broadcast_app_members'
      and a.slug = trim(v_rules->>'broadcast_app_members')
      and u.id_auth is not null
      and coalesce(u.esta_activo, true)
  ),
  admin_dept_users as (
    select distinct u.id_auth, u.id as usuario_id
    from public.departamentos d
    join public.usuarios u on u.departamento = d.id
    where coalesce((v_rules->>'departamento_admin_ilike')::boolean, false)
      and d.nombre ilike '%admin%'
      and u.id_auth is not null
      and coalesce(u.esta_activo, true)
  ),
  cap_dept_users as (
    select distinct u.id_auth, u.id as usuario_id
    from public.departamentos d
    join public.usuarios u on u.departamento = d.id
    where coalesce((v_rules->>'departamento_capacitacion_ilike')::boolean, false)
      and d.nombre ilike '%capacitacion%'
      and u.id_auth is not null
      and coalesce(u.esta_activo, true)
  ),
  match_ejecutivo_users as (
    select distinct u.id_auth, u.id as usuario_id
    from public.usuarios u
    where coalesce((v_rules->>'match_ejecutivo_nombre')::boolean, false)
      and nullif(btrim(p_context->>'ejecutivo_nombre'), '') is not null
      and u.nombre_apellido ilike btrim(p_context->>'ejecutivo_nombre')
      and u.id_auth is not null
      and coalesce(u.esta_activo, true)
  ),
  ejecutivo_trato_users as (
    select distinct u.id_auth, u.id as usuario_id
    from public.usuarios u
    where coalesce((v_rules->>'ejecutivo_trato')::boolean, false)
      and (p_context->>'ejecutivo_usuario_id') ~ '^[0-9]+$'
      and u.id = (p_context->>'ejecutivo_usuario_id')::bigint
      and u.id_auth is not null
      and coalesce(u.esta_activo, true)
  ),
  lider_users as (
    select distinct u.id_auth, u.id as usuario_id
    from public.departamentos d
    join public.gerencias g on g.nombre = d.gerencia
    join public.usuarios u on u.id = g.lider
    where coalesce((v_rules->>'lider_gerencia')::boolean, false)
      and nullif(btrim(p_context->>'departamento_nombre'), '') is not null
      and d.nombre ilike btrim(p_context->>'departamento_nombre')
      and u.id_auth is not null
      and coalesce(u.esta_activo, true)
      and (
        not v_has_role_or_perm
        or u.id in (select g2.usuario_id from gate_users g2)
      )
  ),
  coordinador_users as (
    select distinct u.id_auth, u.id as usuario_id
    from public.departamentos d
    left join public.gerencias g on g.nombre = d.gerencia
    join public.usuarios u on u.id = coalesce(d.coordinador, g.lider)
    where coalesce((v_rules->>'coordinador_departamento')::boolean, false)
      and nullif(btrim(p_context->>'departamento_nombre'), '') is not null
      and d.nombre ilike btrim(p_context->>'departamento_nombre')
      and u.id_auth is not null
      and coalesce(u.esta_activo, true)
      and (
        not v_has_role_or_perm
        or u.id in (select g2.usuario_id from gate_users g2)
      )
  ),
  direct_auth_ids as (
    select distinct auth_text::uuid as auth_id
    from (
      select jsonb_array_elements_text(coalesce(p_context->'recipient_auth_ids', '[]'::jsonb)) as auth_text
      union all
      select p_context->>'creador_auth'
      where nullif(btrim(p_context->>'creador_auth'), '') is not null
      union all
      select p_context->>'creator_auth'
      where nullif(btrim(p_context->>'creator_auth'), '') is not null
      union all
      select p_context->>'assignee_auth'
      where nullif(btrim(p_context->>'assignee_auth'), '') is not null
      union all
      select p_context->>'owner_auth'
      where nullif(btrim(p_context->>'owner_auth'), '') is not null
      union all
      select p_context->>'solicitante_auth'
      where nullif(btrim(p_context->>'solicitante_auth'), '') is not null
      union all
      select p_context->>'suplente_auth'
      where nullif(btrim(p_context->>'suplente_auth'), '') is not null
    ) raw
    where auth_text is not null
      and btrim(auth_text) <> ''
  ),
  direct_users as (
    select distinct u.id_auth, u.id as usuario_id
    from direct_auth_ids d
    join public.usuarios u on u.id_auth = d.auth_id
    where u.id_auth is not null
      and coalesce(u.esta_activo, true)
      and (
        coalesce((v_rules->>'creador_requisicion')::boolean, false)
        or coalesce((v_rules->>'assignee')::boolean, false)
        or coalesce((v_rules->>'owner')::boolean, false)
        or coalesce((v_rules->>'solicitante')::boolean, false)
        or coalesce((v_rules->>'suplente')::boolean, false)
        or coalesce((v_rules->>'creator')::boolean, false)
        or (
          coalesce((v_rules->>'lider_gerencia')::boolean, false)
          and jsonb_array_length(coalesce(p_context->'recipient_auth_ids', '[]'::jsonb)) > 0
        )
        or (
          coalesce((v_rules->>'coordinador_departamento')::boolean, false)
          and jsonb_array_length(coalesce(p_context->'recipient_auth_ids', '[]'::jsonb)) > 0
        )
      )
  ),
  all_grants as (
    -- En modo sello (territorio), roles/permisos solo filtran organigrama;
    -- no se expanden a todos los titulares del permiso.
    select * from role_users where not v_stamp_mode
    union
    select * from perm_users where not v_stamp_mode
    union
    select * from dept_users
    union
    select * from broadcast_users
    union
    select * from admin_dept_users
    union
    select * from cap_dept_users
    union
    select * from match_ejecutivo_users
    union
    select * from ejecutivo_trato_users
    union
    select * from lider_users
    union
    select * from coordinador_users
    union
    select * from direct_users
  ),
  denied as (
    select did.value::bigint as usuario_id
    from jsonb_array_elements_text(coalesce(v_cfg.denied_user_ids, '[]'::jsonb)) did
  )
  select distinct g.id_auth
  from all_grants g
  where g.id_auth is not null
    and (
      g.usuario_id in (select m.usuario_id from manual_users m)
      or g.usuario_id not in (select d.usuario_id from denied d)
    )
  union
  select m.id_auth
  from manual_users m;
end;
$function$;

-- 2) Evento: llega a cola operativa de Administración
insert into notify.event_types (
  app_slug, event_key, default_priority, channel_mask, title, description, trigger_kind, is_active
)
values (
  'administracion',
  'requisicion_pending_admin',
  2,
  '{"in_app": true}'::jsonb,
  'Requisición lista para Administración',
  'Aviso a la cola operativa (estimar / procesar) cuando una requisición queda en manos de Administración.',
  'app_writer',
  true
)
on conflict (app_slug, event_key) do update
set
  default_priority = excluded.default_priority,
  channel_mask = excluded.channel_mask,
  title = excluded.title,
  description = excluded.description,
  trigger_kind = excluded.trigger_kind,
  is_active = excluded.is_active;

-- 3) Destinatarios por defecto (editables en TED)
insert into notify.event_recipient_config (
  app_slug,
  event_key,
  allowed_role_slugs,
  allowed_permission_slugs,
  allowed_departamento_ids,
  allowed_user_ids,
  denied_user_ids,
  special_rules,
  notes
)
values (
  'administracion',
  'requisicion_pending_admin',
  '["sadministracion:gestor","sadministracion:coordinador"]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  'Cola operativa Admin. Por defecto gestor + coordinador (no líder). Cambiar roles/permisos en TED → Notificaciones.'
)
on conflict (app_slug, event_key) do update
set
  allowed_role_slugs = excluded.allowed_role_slugs,
  allowed_permission_slugs = excluded.allowed_permission_slugs,
  special_rules = excluded.special_rules,
  notes = excluded.notes,
  updated_at = now();

-- 4) Sellos: territorio organigrama ∩ (permiso de sello ∪ roles producto/transversales)
update notify.event_recipient_config
set
  allowed_role_slugs = '["st:coordinador","scapacitacion:coordinador","scalidad:coordinador","sadministracion:coordinador","sadministracion:aprobador-coordinador-requisiciones"]'::jsonb,
  allowed_permission_slugs = '["requisiciones:gestion:approve-coordinador"]'::jsonb,
  special_rules = '{"coordinador_departamento": true}'::jsonb,
  notes = '1er sello: organigrama ∩ (permiso approve-coordinador o roles coord producto/Admin). Editable en TED.',
  updated_at = now()
where app_slug = 'administracion'
  and event_key = 'requisicion_pending_coordinador';

update notify.event_recipient_config
set
  allowed_role_slugs = '["st:lider","scapacitacion:lider","scalidad:lider","sgestion:lider","sadministracion:lider","sadministracion:aprobador-lider-requisiciones"]'::jsonb,
  allowed_permission_slugs = '["requisiciones:gestion:approve-lider"]'::jsonb,
  special_rules = '{"lider_gerencia": true}'::jsonb,
  notes = '2º sello: organigrama ∩ (permiso approve-lider o roles lider producto/Admin). Editable en TED.',
  updated_at = now()
where app_slug = 'administracion'
  and event_key = 'requisicion_pending_lider';

-- 5) created: alinear con cola operativa (por si aún se dispara)
update notify.event_recipient_config
set
  allowed_role_slugs = '["sadministracion:gestor","sadministracion:coordinador"]'::jsonb,
  allowed_permission_slugs = '[]'::jsonb,
  special_rules = '{}'::jsonb,
  notes = 'Preferir requisicion_pending_admin. Destinatarios: gestor + coordinador Admin (no líder). Editable en TED.',
  updated_at = now()
where app_slug = 'administracion'
  and event_key = 'requisicion_created';
