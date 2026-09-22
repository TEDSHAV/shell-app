-- Requisiciones: depto RRHH, umbral configurable y confirmación de costos internas.

insert into public.departamentos (nombre, descripcion, esta_activo, gerencia)
select 'recursos_humanos', 'Recursos Humanos', true, 'administracion'
where not exists (
  select 1
  from public.departamentos d
  where lower(replace(d.nombre, ' ', '_')) in ('recursos_humanos', 'recursoshumanos')
     or (lower(d.nombre) like '%recurso%' and lower(d.nombre) like '%humano%')
);

alter table public.requisiciones
  add column if not exists costos_confirmados_at timestamptz;

create table if not exists public.requisiciones_ajustes (
  id integer primary key default 1 check (id = 1),
  umbral_lider_usd numeric not null default 100,
  updated_at timestamptz default now(),
  updated_by uuid
);

insert into public.requisiciones_ajustes (id, umbral_lider_usd)
values (1, 100)
on conflict (id) do nothing;

comment on table public.requisiciones_ajustes is
  'Ajustes del módulo de requisiciones. Umbral USD para exigir sello de líder en internas.';
