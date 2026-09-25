-- El cliente admin (service_role) consulta ted_plan_* por PostgREST.
-- Sin GRANT, /tickets falla con "No se pudieron cargar las apps".

do $$
declare
  obj text;
begin
  for obj in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename like 'ted_plan%'
  loop
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated, service_role',
      obj
    );
  end loop;

  for obj in
    select sequence_name
    from information_schema.sequences
    where sequence_schema = 'public'
      and sequence_name like 'ted_plan%'
  loop
    execute format(
      'grant usage, select on sequence public.%I to authenticated, service_role',
      obj
    );
  end loop;

  for obj in
    select table_name
    from information_schema.views
    where table_schema = 'public'
      and table_name like '%ted_plan%'
  loop
    execute format(
      'grant select on table public.%I to authenticated, service_role',
      obj
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
