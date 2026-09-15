-- Extra líderes per gerencia. gerencias.lider stays the titular;
-- gerencias_lideres lets additional users (e.g. Gerente General) approve
-- without replacing existing líderes.

create table if not exists public.gerencias_lideres (
  gerencia text not null references public.gerencias (nombre)
    on update cascade on delete cascade,
  id_usuario integer not null references public.usuarios (id)
    on delete cascade,
  created_at timestamptz not null default now(),
  primary key (gerencia, id_usuario)
);

create index if not exists gerencias_lideres_id_usuario_idx
  on public.gerencias_lideres (id_usuario);

alter table public.gerencias_lideres enable row level security;

grant select on public.gerencias_lideres to authenticated;

create policy gerencias_lideres_select_authenticated
  on public.gerencias_lideres
  for select
  to authenticated
  using (true);

-- Backfill titular líderes, then add usuario 13 (Pedro Morgado) on every gerencia.
insert into public.gerencias_lideres (gerencia, id_usuario)
select g.nombre, g.lider
from public.gerencias g
where g.nombre is not null
  and g.lider is not null
on conflict do nothing;

insert into public.gerencias_lideres (gerencia, id_usuario)
select g.nombre, 13
from public.gerencias g
where g.nombre is not null
  and exists (select 1 from public.usuarios u where u.id = 13)
on conflict do nothing;
