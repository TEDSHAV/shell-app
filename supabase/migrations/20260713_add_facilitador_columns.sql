-- Add missing facilitador snapshot columns to requisiciones.
-- These columns are referenced by actions/requisiciones.ts but were never created via migration.
-- telefono_facilitador is handled separately in 20260713_add_telefono_facilitador.sql.

alter table requisiciones add column if not exists cod_facilitador integer;
alter table requisiciones add column if not exists facilitador text;
alter table requisiciones add column if not exists cedula_facilitador text;
alter table requisiciones add column if not exists rif_facilitador text;
alter table requisiciones add column if not exists banco text;
alter table requisiciones add column if not exists nro_cuenta text;
