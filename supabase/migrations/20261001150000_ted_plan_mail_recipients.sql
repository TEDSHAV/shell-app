-- Destinatarios de correo del plan de objetivos: solicitantes (gerencia) y ejecutantes (TED).

create table if not exists public.ted_plan_mail_recipients (
  id bigint generated always as identity primary key,
  rol text not null check (rol in ('solicitante', 'ejecutante')),
  email text not null,
  nombre text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint ted_plan_mail_recipients_email_chk
    check (position('@' in email) > 1)
);

create unique index if not exists ted_plan_mail_recipients_rol_email_uidx
  on public.ted_plan_mail_recipients (rol, lower(email));

insert into public.ted_plan_mail_recipients (rol, email, nombre, activo)
values
  ('solicitante', 'lmontero@shadevenezuela.com.ve', 'Gerencia', true),
  ('solicitante', 'pmorgado@shadevenezuela.com.ve', 'Gerencia', true),
  ('ejecutante', 'prisma@ted.shadevenezuela.com.ve', 'Equipo TED', true)
on conflict (rol, lower(email)) do nothing;

alter table public.ted_plan_mail_recipients enable row level security;

drop policy if exists ted_plan_mail_recipients_ted on public.ted_plan_mail_recipients;
create policy ted_plan_mail_recipients_ted on public.ted_plan_mail_recipients
  for all to authenticated
  using (public.fn_is_ted_member())
  with check (public.fn_is_ted_member());

grant select, insert, update, delete on public.ted_plan_mail_recipients
  to authenticated, service_role;

do $$
declare
  seq text;
begin
  seq := pg_get_serial_sequence('public.ted_plan_mail_recipients', 'id');
  if seq is not null then
    execute format('grant usage, select on sequence %s to authenticated, service_role', seq);
  end if;
end $$;

notify pgrst, 'reload schema';
