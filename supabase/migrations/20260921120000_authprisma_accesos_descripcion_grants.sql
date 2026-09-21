-- TED access console: descriptions on apps/roles + write path for service_role.
-- Permissions already have descripcion. Role/app wizard needs the same.

alter table authprisma.apps
  add column if not exists descripcion text;

alter table authprisma.roles
  add column if not exists descripcion text;

grant usage on schema authprisma to service_role;

grant select, insert, update, delete on all tables in schema authprisma
  to service_role;

grant usage, select on all sequences in schema authprisma to service_role;

alter default privileges in schema authprisma
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema authprisma
  grant usage, select on sequences to service_role;
