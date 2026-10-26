-- 20261026104500_register_scalidad_notify_event_types.sql
-- Register Calidad formulario respuesta event type in notify.event_types.
-- Required because notify.inbox has a FK constraint:
--   notify_inbox_event_fk foreign key (app_slug, event_key)
--     references notify.event_types (app_slug, event_key)

INSERT INTO notify.event_types (app_slug, event_key, default_priority, channel_mask, title, description, trigger_kind, is_active)
VALUES
  (
    'scalidad',
    'formulario_respuesta_submitted',
    2,
    '{"in_app": true}'::jsonb,
    'Nueva Respuesta de Formulario / Evaluación',
    'Notificación a miembros de Calidad cuando se envía una nueva respuesta a un formulario o evaluación para su revisión y calificación.',
    'app_writer',
    true
  )
ON CONFLICT (app_slug, event_key) DO UPDATE
SET
  default_priority = EXCLUDED.default_priority,
  channel_mask = EXCLUDED.channel_mask,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  trigger_kind = EXCLUDED.trigger_kind,
  is_active = EXCLUDED.is_active;
