-- Period objectives (gerencia commitment). Tasks hang via objetivo_id.

create table public.ted_plan_objetivos (
  id bigint generated always as identity primary key,
  titulo text not null,
  descripcion text,
  fecha_inicio date not null,
  fecha_fin date not null,
  app_id bigint references public.ted_plan_apps(id) on delete set null,
  estado text not null default 'abierto'
    check (estado in ('abierto', 'cumplido', 'cancelado')),
  created_by integer references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);

create index ted_plan_objetivos_fechas_idx
  on public.ted_plan_objetivos (fecha_inicio, fecha_fin);

create index ted_plan_objetivos_app_idx
  on public.ted_plan_objetivos (app_id);

create trigger ted_plan_objetivos_set_updated_at
  before update on public.ted_plan_objetivos
  for each row execute function public.set_updated_at();

alter table public.ted_plan_tareas
  add column if not exists objetivo_id bigint
    references public.ted_plan_objetivos(id) on delete set null;

create index if not exists ted_plan_tareas_objetivo_idx
  on public.ted_plan_tareas (objetivo_id);

alter table public.ted_plan_objetivos enable row level security;

create policy ted_plan_objetivos_all on public.ted_plan_objetivos
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

grant select, insert, update, delete on public.ted_plan_objetivos to authenticated;
