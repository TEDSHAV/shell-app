-- Versiones planificadas por app (TED → Versiones) y vínculo objetivo → versión.
-- Las versiones liberadas salen de los tags git (features/planificacion/data/versiones-git.json);
-- aquí solo viven las que aún no tienen tag. Mínimo 1.0.0.

create table if not exists public.ted_plan_versiones (
  id bigint generated always as identity primary key,
  app_id bigint not null references public.ted_plan_apps(id) on delete cascade,
  version text not null
    check (version ~ '^[1-9][0-9]*\.[0-9]+\.[0-9]+$'),
  mes_plan text check (mes_plan ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  notas text,
  created_by integer references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app_id, version)
);

comment on table public.ted_plan_versiones is
  'Versiones planificadas por app (sin tag git aún). Las liberadas vienen de git.';

drop trigger if exists ted_plan_versiones_set_updated_at on public.ted_plan_versiones;
create trigger ted_plan_versiones_set_updated_at
  before update on public.ted_plan_versiones
  for each row execute function public.set_updated_at();

alter table public.ted_plan_objetivos
  add column if not exists version_id bigint
    references public.ted_plan_versiones(id) on delete set null;

create index if not exists ted_plan_objetivos_version_idx
  on public.ted_plan_objetivos (version_id);

alter table public.ted_plan_versiones enable row level security;

drop policy if exists ted_plan_versiones_all on public.ted_plan_versiones;
create policy ted_plan_versiones_all on public.ted_plan_versiones
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

drop policy if exists ted_plan_versiones_gerencia_select on public.ted_plan_versiones;
do $$
begin
  if to_regproc('public.fn_is_plan_gerencia') is not null then
    execute $pol$
      create policy ted_plan_versiones_gerencia_select
        on public.ted_plan_versiones
        for select to authenticated
        using (public.fn_is_plan_gerencia())
    $pol$;
  end if;
end $$;

grant select, insert, update, delete on public.ted_plan_versiones
  to authenticated, service_role;

-- Plan de octubre 2026: 2.0.0 para las apps ya en 1.x; Servicios Técnicos (0.1.0)
-- pasa a 1.0.0; Shell ("general", contenedor de Prisma) 1.0.0 → 2.0.0.
insert into public.ted_plan_versiones (app_id, version, mes_plan, notas)
select a.id, p.version, '2026-10', 'Plan de octubre 2026'
from (
  values
    ('negocios', '2.0.0'),
    ('administracion', '2.0.0'),
    ('recursos-humanos', '2.0.0'),
    ('servicios-tecnicos', '1.0.0'),
    ('general', '2.0.0')
) as p (slug, version)
join public.ted_plan_apps a on a.slug = p.slug
on conflict (app_id, version) do nothing;

-- Objetivos de octubre → versión del plan de su app principal.
update public.ted_plan_objetivos o
set version_id = v.id
from public.ted_plan_versiones v
where v.app_id = o.app_id
  and v.mes_plan = '2026-10'
  and o.fecha_inicio >= date '2026-10-01'
  and o.fecha_inicio < date '2026-11-01'
  and o.version_id is null;

-- Objetivos de octubre sin app principal: calibración → ST, asistencia → RH.
update public.ted_plan_objetivos o
set version_id = v.id
from public.ted_plan_versiones v
join public.ted_plan_apps a on a.id = v.app_id
where v.mes_plan = '2026-10'
  and o.version_id is null
  and o.fecha_inicio >= date '2026-10-01'
  and o.fecha_inicio < date '2026-11-01'
  and (
    (a.slug = 'servicios-tecnicos' and o.titulo ilike '%calibraci%')
    or (a.slug = 'recursos-humanos' and o.titulo ilike '%asistencia%')
  );

notify pgrst, 'reload schema';
