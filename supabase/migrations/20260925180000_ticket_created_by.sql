-- Quién registró el ticket (puede diferir de solicitado_por si TED lo carga a nombre de otro).

alter table public.ted_plan_tickets
  add column if not exists created_by integer references public.usuarios(id) on delete set null;

update public.ted_plan_tickets t
set created_by = e.created_by
from (
  select distinct on (ticket_id)
    ticket_id,
    created_by
  from public.ted_plan_ticket_eventos
  order by ticket_id, created_at asc, id asc
) e
where t.id = e.ticket_id
  and t.created_by is null
  and e.created_by is not null;

update public.ted_plan_tickets
set created_by = solicitado_por
where created_by is null
  and solicitado_por is not null;

create index if not exists ted_plan_tickets_created_by_idx
  on public.ted_plan_tickets (created_by);

comment on column public.ted_plan_tickets.created_by is
  'Usuario que registró el ticket. Distinto de solicitado_por cuando TED lo carga a nombre de otra persona.';
