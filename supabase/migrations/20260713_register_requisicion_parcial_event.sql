-- Register the "requisicion_parcial" event type so notify.inbox inserts succeed.
-- Matches the pattern used by requisicion_created, requisicion_procesada, requisicion_rechazada.

insert into notify.event_types (app_slug, event_key, default_priority, channel_mask)
values (
  'administracion',
  'requisicion_parcial',
  1,
  '{"in_app": true}'::jsonb
)
on conflict (app_slug, event_key) do update
set default_priority = excluded.default_priority,
    channel_mask = excluded.channel_mask;
