-- Frozen Prisma overview snapshots (one token = one photo, not live data).

create table public.ted_plan_public_snapshots (
  token text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  created_by integer null
);

alter table public.ted_plan_public_snapshots enable row level security;

revoke all on table public.ted_plan_public_snapshots from anon, authenticated;
