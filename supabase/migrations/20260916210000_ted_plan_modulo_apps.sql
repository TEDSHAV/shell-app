-- A module can belong to several apps. Keep ted_plan_modulos.app_id
-- as the first linked app for older queries.

create table if not exists public.ted_plan_modulo_apps (
  modulo_id bigint not null references public.ted_plan_modulos(id) on delete cascade,
  app_id bigint not null references public.ted_plan_apps(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (modulo_id, app_id)
);

create index if not exists ted_plan_modulo_apps_app_idx
  on public.ted_plan_modulo_apps (app_id);

insert into public.ted_plan_modulo_apps (modulo_id, app_id)
select m.id, m.app_id
from public.ted_plan_modulos m
where m.app_id is not null
on conflict do nothing;

alter table public.ted_plan_modulo_apps enable row level security;

drop policy if exists ted_plan_modulo_apps_all on public.ted_plan_modulo_apps;
create policy ted_plan_modulo_apps_all on public.ted_plan_modulo_apps
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

grant select, insert, update, delete on public.ted_plan_modulo_apps to authenticated;
