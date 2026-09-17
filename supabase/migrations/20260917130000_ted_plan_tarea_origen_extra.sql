-- Extra origen/contexto values from the plan Excel.

do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'ted_plan_tareas'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%PLAN%TICKET%GERENCIA%'
  loop
    execute format('alter table public.ted_plan_tareas drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.ted_plan_tareas
  drop constraint if exists ted_plan_tareas_origen_check;

alter table public.ted_plan_tareas
  add constraint ted_plan_tareas_origen_check
  check (
    origen in (
      'PLAN',
      'TICKET',
      'GERENCIA',
      'USUARIO',
      'REQUERIMIENTO',
      'ADICIONAL'
    )
  );
