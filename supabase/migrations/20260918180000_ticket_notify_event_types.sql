INSERT INTO notify.event_types (app_slug, event_key, default_priority, channel_mask, title, description, trigger_kind, is_active)
VALUES
  (
    'sgestion',
    'ticket_completado',
    2,
    '{"in_app": true}'::jsonb,
    'Requerimiento completado',
    'Aviso al solicitante cuando TED cierra su ticket con una respuesta.',
    'app_writer',
    true
  ),
  (
    'sgestion',
    'ticket_no_procede',
    2,
    '{"in_app": true}'::jsonb,
    'Requerimiento no procede',
    'Aviso al solicitante cuando TED marca su ticket como no procede.',
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
