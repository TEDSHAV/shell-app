-- Align authprisma privileges with production so the Data API
-- (anon / authenticated / service_role) can read the catalog.
-- Policies already exist; without GRANT the JS client gets a permission error.

grant usage on schema authprisma to anon, authenticated, service_role;

grant select on all tables in schema authprisma to anon, authenticated;
grant all on all tables in schema authprisma to service_role;
grant all on all sequences in schema authprisma to service_role;

alter default privileges in schema authprisma
  grant select on tables to anon, authenticated;
alter default privileges in schema authprisma
  grant all on tables to service_role;
alter default privileges in schema authprisma
  grant all on sequences to service_role;
