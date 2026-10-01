-- Varios solicitantes por ticket (TED puede registrar a nombre de más de uno).

create table if not exists public.ted_plan_ticket_solicitantes (
  ticket_id bigint not null references public.ted_plan_tickets(id) on delete cascade,
  usuario_id integer not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ticket_id, usuario_id)
);

insert into public.ted_plan_ticket_solicitantes (ticket_id, usuario_id)
select t.id, t.solicitado_por
from public.ted_plan_tickets t
where t.solicitado_por is not null
on conflict do nothing;

create index if not exists ted_plan_ticket_solicitantes_usuario_idx
  on public.ted_plan_ticket_solicitantes (usuario_id);

alter table public.ted_plan_ticket_solicitantes enable row level security;

drop policy if exists ted_plan_tickets_select on public.ted_plan_tickets;
create policy ted_plan_tickets_select on public.ted_plan_tickets
  for select to authenticated
  using (
    public.fn_is_ted_member()
    or solicitado_por = public.fn_current_usuario_id()
    or asignado_id = public.fn_current_usuario_id()
    or created_by = public.fn_current_usuario_id()
    or exists (
      select 1
      from public.ted_plan_ticket_colaboradores c
      where c.ticket_id = ted_plan_tickets.id
        and c.usuario_id = public.fn_current_usuario_id()
    )
    or exists (
      select 1
      from public.ted_plan_ticket_solicitantes s
      where s.ticket_id = ted_plan_tickets.id
        and s.usuario_id = public.fn_current_usuario_id()
    )
  );

drop policy if exists ted_plan_tickets_update on public.ted_plan_tickets;
create policy ted_plan_tickets_update on public.ted_plan_tickets
  for update to authenticated
  using (
    public.fn_is_ted_member()
    or solicitado_por = public.fn_current_usuario_id()
    or asignado_id = public.fn_current_usuario_id()
    or exists (
      select 1
      from public.ted_plan_ticket_colaboradores c
      where c.ticket_id = ted_plan_tickets.id
        and c.usuario_id = public.fn_current_usuario_id()
    )
    or exists (
      select 1
      from public.ted_plan_ticket_solicitantes s
      where s.ticket_id = ted_plan_tickets.id
        and s.usuario_id = public.fn_current_usuario_id()
    )
  )
  with check (
    public.fn_is_ted_member()
    or solicitado_por = public.fn_current_usuario_id()
    or asignado_id = public.fn_current_usuario_id()
    or exists (
      select 1
      from public.ted_plan_ticket_colaboradores c
      where c.ticket_id = ted_plan_tickets.id
        and c.usuario_id = public.fn_current_usuario_id()
    )
    or exists (
      select 1
      from public.ted_plan_ticket_solicitantes s
      where s.ticket_id = ted_plan_tickets.id
        and s.usuario_id = public.fn_current_usuario_id()
    )
  );

drop policy if exists ted_plan_ticket_solicitantes_select on public.ted_plan_ticket_solicitantes;
create policy ted_plan_ticket_solicitantes_select on public.ted_plan_ticket_solicitantes
  for select to authenticated
  using (
    public.fn_is_ted_member()
    or usuario_id = public.fn_current_usuario_id()
    or exists (
      select 1
      from public.ted_plan_tickets t
      where t.id = ticket_id
        and (
          t.solicitado_por = public.fn_current_usuario_id()
          or t.asignado_id = public.fn_current_usuario_id()
          or t.created_by = public.fn_current_usuario_id()
        )
    )
  );

drop policy if exists ted_plan_ticket_solicitantes_write on public.ted_plan_ticket_solicitantes;
create policy ted_plan_ticket_solicitantes_write on public.ted_plan_ticket_solicitantes
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

drop policy if exists ted_plan_ticket_eventos_select on public.ted_plan_ticket_eventos;
create policy ted_plan_ticket_eventos_select on public.ted_plan_ticket_eventos
  for select to authenticated
  using (
    public.fn_is_ted_member()
    or exists (
      select 1 from public.ted_plan_tickets t
      where t.id = ticket_id
        and (
          t.solicitado_por = public.fn_current_usuario_id()
          or t.asignado_id = public.fn_current_usuario_id()
          or t.created_by = public.fn_current_usuario_id()
        )
    )
    or exists (
      select 1
      from public.ted_plan_ticket_solicitantes s
      where s.ticket_id = ted_plan_ticket_eventos.ticket_id
        and s.usuario_id = public.fn_current_usuario_id()
    )
  );

grant select, insert, update, delete on public.ted_plan_ticket_solicitantes to authenticated;

notify pgrst, 'reload schema';
