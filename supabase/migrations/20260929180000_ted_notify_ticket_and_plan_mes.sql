-- Avisos TED: ticket nuevo + plan del mes (emitido / actualizado).
-- Destinatarios: operadores rol ted:ted, editables en /ted/notificaciones.

insert into notify.event_types (
  app_slug, event_key, default_priority, channel_mask, title, description, trigger_kind, is_active
)
values
  (
    'ted',
    'ticket_created',
    2,
    '{"in_app": true}'::jsonb,
    'Nueva solicitud TED · ticket',
    'Aviso a operadores TED cuando se crea un ticket (solicitud de usuario).',
    'app_writer',
    true
  ),
  (
    'ted',
    'plan_mes_emitido',
    2,
    '{"in_app": true}'::jsonb,
    'Plan del mes emitido',
    'Aviso a TED cuando gerencia emite el plan de objetivos del mes.',
    'app_writer',
    true
  ),
  (
    'ted',
    'plan_mes_actualizado',
    2,
    '{"in_app": true}'::jsonb,
    'Plan del mes actualizado',
    'Aviso a TED cuando, con el plan ya emitido, se añade, quita o edita un objetivo.',
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
values
  (
    'ted',
    'ticket_created',
    '["ted:ted"]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    'Operadores TED. Editable en TED → Notificaciones.'
  ),
  (
    'ted',
    'plan_mes_emitido',
    '["ted:ted"]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    'Operadores TED. Editable en TED → Notificaciones.'
  ),
  (
    'ted',
    'plan_mes_actualizado',
    '["ted:ted"]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    'Operadores TED. Editable en TED → Notificaciones.'
  )
on conflict (app_slug, event_key) do update
set
  allowed_role_slugs = excluded.allowed_role_slugs,
  notes = excluded.notes,
  updated_at = now();
