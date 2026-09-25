-- Ticket notifications belong to TED (badge TED), not Negocios (sgestion).
-- FK ON UPDATE CASCADE updates notify.inbox and notify.event_recipient_config.

update notify.event_types
set
  app_slug = 'ted',
  description = case event_key
    when 'ticket_completado' then
      'Aviso al solicitante cuando TED cierra su ticket con una respuesta.'
    when 'ticket_no_procede' then
      'Aviso al solicitante cuando TED marca su ticket como no procede.'
    else description
  end
where app_slug = 'sgestion'
  and event_key in ('ticket_completado', 'ticket_no_procede');
