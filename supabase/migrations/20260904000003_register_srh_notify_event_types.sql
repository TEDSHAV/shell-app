-- Register RH solicitud event types in notify.event_types.
-- Required because notify.inbox has a FK constraint:
--   notify_inbox_event_fk foreign KEY (app_slug, event_key)
--     references notify.event_types (app_slug, event_key)
-- Without these rows, inserting into notify.inbox fails silently.

INSERT INTO notify.event_types (app_slug, event_key, default_priority, channel_mask, title, description, trigger_kind, is_active)
VALUES
  (
    'srh',
    'rh_solicitud_created',
    2,
    '{"in_app": true}'::jsonb,
    'Nueva Solicitud de Usuario (RRHH)',
    'Notificación a TED cuando un usuario de Administración crea una solicitud de nuevo empleado.',
    'app_writer',
    true
  ),
  (
    'srh',
    'rh_solicitud_completada',
    2,
    '{"in_app": true}'::jsonb,
    'Solicitud de Usuario Completada',
    'Notificación al solicitante cuando TED marca su solicitud como completada.',
    'app_writer',
    true
  ),
  (
    'srh',
    'rh_solicitud_rechazada',
    2,
    '{"in_app": true}'::jsonb,
    'Solicitud de Usuario Rechazada',
    'Notificación al solicitante cuando TED rechaza su solicitud.',
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
