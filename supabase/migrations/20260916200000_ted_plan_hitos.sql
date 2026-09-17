-- TED planning milestones for the Gantt roadmap.

create table public.ted_plan_hitos (
  id bigint generated always as identity primary key,
  app_id bigint not null references public.ted_plan_apps(id) on delete cascade,
  modulo_id bigint references public.ted_plan_modulos(id) on delete set null,
  titulo text not null,
  descripcion text,
  trimestre text not null
    check (trimestre in ('T1', 'T2', 'T3', 'T4')),
  anio integer not null default extract(year from timezone('America/Caracas', now()))::integer,
  icono text not null default 'deploy'
    check (icono in ('deploy', 'engine', 'team')),
  created_by integer references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ted_plan_hitos_app_idx on public.ted_plan_hitos (app_id);
create index ted_plan_hitos_anio_trim_idx on public.ted_plan_hitos (anio, trimestre);

create trigger ted_plan_hitos_set_updated_at
  before update on public.ted_plan_hitos
  for each row execute function public.set_updated_at();

alter table public.ted_plan_hitos enable row level security;

create policy ted_plan_hitos_all on public.ted_plan_hitos
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

grant select, insert, update, delete on public.ted_plan_hitos to authenticated;
