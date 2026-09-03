-- 20260904000002_alter_rh_solicitudes_email_to_checkbox.sql
-- Replace email_corporativo text column with solicitar_email boolean checkbox.
-- Run this if the original migration was already applied with email_corporativo.

-- Add the new boolean column
alter table public.rh_solicitudes
  add column if not exists solicitar_email boolean not null default false;

-- Drop the old text column
alter table public.rh_solicitudes
  drop column if exists email_corporativo;
