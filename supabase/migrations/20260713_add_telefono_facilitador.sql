-- Add telefono_facilitador snapshot column to requisiciones.
-- Mirrors the existing facilitador/cedula_facilitador/rif_facilitador/banco/nro_cuenta snapshot fields.
alter table requisiciones add column if not exists telefono_facilitador text;
