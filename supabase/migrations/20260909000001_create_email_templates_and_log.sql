-- 20260909000001_create_email_templates_and_log.sql
-- Email templates + send log for the "Asignar Facilitador" email feature.
--
-- capacitacion_email_templates: editable email templates (subject + body) with
--   {{placeholders}} that are rendered from OSI + facilitador data. One default
--   per event_type (validated in app). Seeded with the "Asignación de Facilitador"
--   template provided by the Capacitación team.
--
-- capacitacion_email_log: append-only log of every email sent (or attempted) from
--   the assign-facilitador flow. The `attachments` jsonb column is the foundation
--   for the future R2/Backblaze PPT attachment feature (array of {key,name,size,url}).
--
-- Access: capacitación dashboard users (app-level gating via middleware + RLS for
-- authenticated users, mirroring facilitador_evaluaciones).

-- ─── Email templates ──────────────────────────────────────────────────────────

create table if not exists public.capacitacion_email_templates (
  id          bigint generated always as identity primary key,
  name        text not null,
  slug        text not null unique,
  event_type  text not null default 'asignacion_facilitador',
  subject     text not null,
  body        text not null,
  is_default  boolean not null default false,
  is_active   boolean not null default true,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists capacitacion_email_templates_event_type_idx
  on public.capacitacion_email_templates (event_type);
create index if not exists capacitacion_email_templates_active_idx
  on public.capacitacion_email_templates (is_active);

alter table public.capacitacion_email_templates enable row level security;

create policy "cap_email_tpl_read" on public.capacitacion_email_templates
  for select to authenticated using (true);
create policy "cap_email_tpl_insert" on public.capacitacion_email_templates
  for insert to authenticated with check (true);
create policy "cap_email_tpl_update" on public.capacitacion_email_templates
  for update to authenticated using (true);
create policy "cap_email_tpl_delete" on public.capacitacion_email_templates
  for delete to authenticated using (true);

create trigger cap_email_tpl_updated_at
  before update on public.capacitacion_email_templates
  for each row execute function public.set_updated_at();

-- ─── Email send log ───────────────────────────────────────────────────────────

create table if not exists public.capacitacion_email_log (
  id              bigint generated always as identity primary key,
  osi_id          bigint,
  facilitador_id  bigint references public.facilitadores(id) on delete set null,
  assignment_id   bigint,
  template_id     bigint references public.capacitacion_email_templates(id) on delete set null,
  to_email        text not null,
  subject         text not null,
  body_sent       text not null,
  status          text not null check (status in ('sent', 'failed', 'not_configured')),
  error_message   text,
  -- Foundation for future R2/Backblaze PPT attachments:
  -- array of { key, name, size, url }
  attachments     jsonb not null default '[]'::jsonb,
  sent_by         uuid,
  sent_at         timestamptz not null default now()
);

create index if not exists capacitacion_email_log_osi_idx
  on public.capacitacion_email_log (osi_id);
create index if not exists capacitacion_email_log_facilitador_idx
  on public.capacitacion_email_log (facilitador_id);
create index if not exists capacitacion_email_log_sent_at_idx
  on public.capacitacion_email_log (sent_at desc);

alter table public.capacitacion_email_log enable row level security;

create policy "cap_email_log_read" on public.capacitacion_email_log
  for select to authenticated using (true);
create policy "cap_email_log_insert" on public.capacitacion_email_log
  for insert to authenticated with check (true);

-- ─── Seed: default "Asignación de Facilitador" template ────────────────────────
-- The body preserves the exact text provided by the Capacitación team, with
-- {{placeholders}} for the OSI/facilitador-dependent fields.

insert into public.capacitacion_email_templates
  (name, slug, event_type, subject, body, is_default, is_active)
values (
  'Asignación de Facilitador',
  'asignacion-facilitador',
  'asignacion_facilitador',
  '🚀 ¡Nueva Asignación Confirmada! — OSI {{nro_osi}}',
  $BODY$🚀 ¡Nueva Asignación Confirmada!

Estimado Sr. {{facilitador_nombre}}

Confirmamos su asignación para el curso de {{curso}} con la empresa {{empresa}}. Agradecemos su compromiso y entusiasmo para esta importante actividad.

🗓️ Detalles Clave de la Ejecución

  Fecha        {{fechas}}        📅
  Duración     {{duracion}} horas POR DÍA ⏱️
  Horario      {{horario}} AMBOS DÍAS ⏰
  Contacto     {{contacto}} 👤
  Dirección    {{direccion}} 📍

✅ Consignación y Requisitos Esenciales
Para asegurar la calidad y el cumplimiento de nuestras políticas:

💻 Equipo: Lleve su laptop con cargador y cables de conexión necesarios.

⚠️ Seguridad: Es indispensable llevar los EPP (Equipo de Protección Personal) correspondientes al tema y lugar de la actividad.

📤 Envío de Material (Máx. 24 horas): Toda la documentación (Factura, evaluaciones, listas, encuestas, etc., llena según la Orden de Compra) debe enviarse por Zoom en un máximo de 24 horas post-actividad.

📑 Calificaciones: La nota mínima aprobatoria es 14 puntos. Si algún participante obtiene una nota inferior, notifique inmediatamente a Capacitación.

📸 Registro: Envíe el Registro Fotográfico, Lista de Asistencia y Encuestas (evite mostrar elementos que comprometan a la empresa, según política interna).

🛑 Políticas del Facilitador (Importante)
Para mantener la profesionalidad y evitar inconvenientes:

Discreción: Evite emitir comentarios personales, juicios de valor u opiniones sobre los procedimientos internos, instalaciones, equipos, o personal de la empresa.

No Negociación: Evite llegar a acuerdos de horarios o actividades extras directamente con los participantes. Cualquier cambio en la planificación debe ser consultado y autorizado por la Coordinadora de Capacitación.

✨ Clave del Éxito
La actividad debe ser altamente dinámica. Utilizar prácticas y ejemplos es fundamental. Por favor, evite limitarse a leer la presentación, pues afecta negativamente la imagen del facilitador.

¡Esperamos que sea una jornada inolvidable y enriquecedora!

— Coordinación de Capacitación SHA$BODY$,
  true,
  true
)
on conflict (slug) do nothing;
