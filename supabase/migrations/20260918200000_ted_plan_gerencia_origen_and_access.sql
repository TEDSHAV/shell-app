-- Gerencia allowlist (usuarios 1, 13) can SELECT plan rows.
-- Convert leftover GERENCIA task origins into objetivos + REQUERIMIENTO.

create or replace function public.fn_is_plan_gerencia()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id_auth = auth.uid()
      and u.id in (1, 13)
  );
$$;

drop policy if exists ted_plan_objetivos_gerencia_select on public.ted_plan_objetivos;
create policy ted_plan_objetivos_gerencia_select
  on public.ted_plan_objetivos
  for select to authenticated
  using (public.fn_is_plan_gerencia());

drop policy if exists ted_plan_tareas_gerencia_select on public.ted_plan_tareas;
create policy ted_plan_tareas_gerencia_select
  on public.ted_plan_tareas
  for select to authenticated
  using (public.fn_is_plan_gerencia());

do $$
declare
  r record;
  v_anchor date;
  v_start date;
  v_end date;
  v_id bigint;
begin
  for r in
    select
      t.id,
      t.titulo,
      t.fecha_inicio,
      t.created_at,
      m.app_id
    from public.ted_plan_tareas t
    join public.ted_plan_modulos m on m.id = t.modulo_id
    where t.origen = 'GERENCIA'
      and t.objetivo_id is null
  loop
    v_anchor := coalesce(
      r.fecha_inicio,
      (r.created_at at time zone 'America/Caracas')::date,
      (timezone('America/Caracas', now()))::date
    );
    v_start := date_trunc('month', v_anchor)::date;
    v_end := (date_trunc('month', v_anchor) + interval '1 month' - interval '1 day')::date;
    insert into public.ted_plan_objetivos (
      titulo, fecha_inicio, fecha_fin, app_id, estado
    )
    values (r.titulo, v_start, v_end, r.app_id, 'abierto')
    returning id into v_id;
    update public.ted_plan_tareas
    set objetivo_id = v_id
    where id = r.id;
  end loop;
end $$;

update public.ted_plan_tareas
set origen = 'REQUERIMIENTO'
where origen = 'GERENCIA';
