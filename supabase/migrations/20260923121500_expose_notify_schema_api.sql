-- Expose notify to PostgREST Data API (TED catalog, inbox, recipient config).
-- Without this, .schema('notify') returns PGRST106 and the TED catalog is empty.

alter role authenticator set pgrst.db_schemas =
  'public, graphql_public, authprisma, notify';

grant usage on schema notify to anon, authenticated, service_role;

grant select on all tables in schema notify to anon, authenticated;
grant all on all tables in schema notify to service_role;
grant all on all sequences in schema notify to service_role;
grant execute on all functions in schema notify to anon, authenticated, service_role;

alter default privileges in schema notify
  grant select on tables to anon, authenticated;
alter default privileges in schema notify
  grant all on tables to service_role;
alter default privileges in schema notify
  grant all on sequences to service_role;
alter default privileges in schema notify
  grant execute on functions to anon, authenticated, service_role;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
