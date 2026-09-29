-- Sobre del plan mensual: los objetivos viven en ted_plan_objetivos;
-- esta tabla guarda borrador / emitido y la versión de avisos.

create table if not exists public.ted_plan_mes (
  mes text primary key
    check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  estado text not null default 'borrador'
    check (estado in ('borrador', 'emitido')),
  version integer not null default 0,
  emitido_at timestamptz,
  emitido_por integer references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ted_plan_mes_set_updated_at on public.ted_plan_mes;
create trigger ted_plan_mes_set_updated_at
  before update on public.ted_plan_mes
  for each row execute function public.set_updated_at();

insert into public.ted_plan_mes (mes, estado, version)
select distinct to_char(o.fecha_inicio, 'YYYY-MM'), 'borrador', 0
from public.ted_plan_objetivos o
on conflict (mes) do nothing;

alter table public.ted_plan_mes enable row level security;

drop policy if exists ted_plan_mes_all on public.ted_plan_mes;
create policy ted_plan_mes_all on public.ted_plan_mes
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

drop policy if exists ted_plan_mes_gerencia_select on public.ted_plan_mes;
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'fn_is_plan_gerencia'
  ) then
    execute $pol$
      create policy ted_plan_mes_gerencia_select
        on public.ted_plan_mes
        for select to authenticated
        using (public.fn_is_plan_gerencia())
    $pol$;
  end if;
end $$;

grant select, insert, update, delete on public.ted_plan_mes
  to authenticated, service_role;

notify pgrst, 'reload schema';
