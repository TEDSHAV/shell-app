-- Multiple TED assignees per planning task.

create table if not exists public.ted_plan_tarea_asignados (
  tarea_id bigint not null references public.ted_plan_tareas(id) on delete cascade,
  usuario_id integer not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tarea_id, usuario_id)
);

insert into public.ted_plan_tarea_asignados (tarea_id, usuario_id)
select id, asignado_id
from public.ted_plan_tareas
where asignado_id is not null
on conflict do nothing;

alter table public.ted_plan_tarea_asignados enable row level security;

drop policy if exists ted_plan_tarea_asignados_all on public.ted_plan_tarea_asignados;

create policy ted_plan_tarea_asignados_all on public.ted_plan_tarea_asignados
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

grant select, insert, update, delete on public.ted_plan_tarea_asignados to authenticated;

notify pgrst, 'reload schema';
