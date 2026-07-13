-- Add deleted_at column for soft delete (admin users only).
alter table requisiciones add column if not exists deleted_at timestamptz;
