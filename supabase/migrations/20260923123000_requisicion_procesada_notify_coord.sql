-- requisicion_procesada: creador + coordinador del depto (TED configurable)

update notify.event_types
set
  available_special_rules = '["creador_requisicion","coordinador_departamento"]'::jsonb,
  updated_at = now()
where app_slug = 'administracion'
  and event_key = 'requisicion_procesada';

update notify.event_recipient_config
set
  allowed_role_slugs = '["st:coordinador","scapacitacion:coordinador","scalidad:coordinador","sadministracion:coordinador","sadministracion:aprobador-coordinador-requisiciones"]'::jsonb,
  allowed_permission_slugs = '["requisiciones:gestion:approve-coordinador"]'::jsonb,
  special_rules = '{"creador_requisicion": true, "coordinador_departamento": true}'::jsonb,
  notes = 'Creador + coordinador del depto de la req (organigrama ∩ permiso/rol coord). Editable en TED.',
  updated_at = now()
where app_slug = 'administracion'
  and event_key = 'requisicion_procesada';
