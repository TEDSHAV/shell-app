-- Evento distinto cuando el líder aprueba costos (monto > límite).

insert into notify.event_types (
  app_slug, event_key, default_priority, channel_mask, title, description, trigger_kind, is_active
)
values (
  'administracion',
  'requisicion_costos_aprobados',
  2,
  '{"in_app": true}'::jsonb,
  'Costos aprobados — lista para procesar',
  'Aviso a la cola operativa cuando el líder aprueba los costos de una interna (tras superar el límite).',
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
  'requisicion_costos_aprobados',
  '["sadministracion:gestor","sadministracion:coordinador"]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  'Mismo set operativo que pending_admin (gestor + coordinador). Editable en TED.'
)
on conflict (app_slug, event_key) do update
set
  allowed_role_slugs = excluded.allowed_role_slugs,
  allowed_permission_slugs = excluded.allowed_permission_slugs,
  special_rules = excluded.special_rules,
  notes = excluded.notes,
  updated_at = now();

-- Clarificar pending_admin (estimar / trámite inicial)
update notify.event_types
set
  title = 'Requisición pendiente de estimar / trámite',
  description = 'Llega a Admin para estimar costos (internas) o tramitar (externas / sin más sellos).',
  updated_at = now()
where app_slug = 'administracion'
  and event_key = 'requisicion_pending_admin';

update notify.event_recipient_config
set
  notes = 'Cola operativa inicial (estimar costos o trámite). Distinto de costos_aprobados (tras sello líder). Editable en TED.',
  updated_at = now()
where app_slug = 'administracion'
  and event_key = 'requisicion_pending_admin';
