-- Un objetivo puede cubrir varias apps. ted_plan_objetivos.app_id
-- queda como la primera (consultas antiguas).

create table if not exists public.ted_plan_objetivo_apps (
  objetivo_id bigint not null references public.ted_plan_objetivos(id) on delete cascade,
  app_id bigint not null references public.ted_plan_apps(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (objetivo_id, app_id)
);

create index if not exists ted_plan_objetivo_apps_app_idx
  on public.ted_plan_objetivo_apps (app_id);

insert into public.ted_plan_objetivo_apps (objetivo_id, app_id)
select o.id, o.app_id
from public.ted_plan_objetivos o
where o.app_id is not null
on conflict do nothing;

alter table public.ted_plan_objetivo_apps enable row level security;

drop policy if exists ted_plan_objetivo_apps_all on public.ted_plan_objetivo_apps;
create policy ted_plan_objetivo_apps_all on public.ted_plan_objetivo_apps
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

grant select, insert, update, delete on public.ted_plan_objetivo_apps
  to authenticated, service_role;

notify pgrst, 'reload schema';
