-- Objetivo a nombre de quien lo pidió + TED se autoasigna en Cubrir.

alter table public.ted_plan_objetivos
  add column if not exists solicitado_por integer references public.usuarios(id);

update public.ted_plan_objetivos
set solicitado_por = created_by
where solicitado_por is null
  and created_by is not null;

create index if not exists ted_plan_objetivos_solicitado_idx
  on public.ted_plan_objetivos (solicitado_por);

create table if not exists public.ted_plan_objetivo_responsables (
  objetivo_id bigint not null references public.ted_plan_objetivos(id) on delete cascade,
  usuario_id integer not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (objetivo_id, usuario_id)
);

create index if not exists ted_plan_objetivo_responsables_user_idx
  on public.ted_plan_objetivo_responsables (usuario_id);

alter table public.ted_plan_objetivo_responsables enable row level security;

drop policy if exists ted_plan_objetivo_responsables_all
  on public.ted_plan_objetivo_responsables;
create policy ted_plan_objetivo_responsables_all
  on public.ted_plan_objetivo_responsables
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'fn_is_plan_gerencia'
  ) then
    execute $p$
      drop policy if exists ted_plan_objetivo_responsables_gerencia_select
        on public.ted_plan_objetivo_responsables;
      create policy ted_plan_objetivo_responsables_gerencia_select
        on public.ted_plan_objetivo_responsables
        for select to authenticated
        using (public.fn_is_plan_gerencia())
    $p$;
  end if;
end $$;

grant select, insert, update, delete on public.ted_plan_objetivo_responsables
  to authenticated, service_role;

notify pgrst, 'reload schema';
