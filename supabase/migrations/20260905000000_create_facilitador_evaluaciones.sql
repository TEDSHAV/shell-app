-- 20260905000000_create_facilitador_evaluaciones.sql
-- Create the facilitador_evaluaciones table for the RG-CAP-004 facilitador
-- evaluation form (Verificación Inicial, Seguimiento, Reevaluación).
--
-- The form is complex (6 criteria sections in Phase 1, weighted components in
-- Phase 2, variable per-OSI columns in Phase 3), so the per-phase payloads are
-- stored as JSONB. Computed/derived fields (puntaje_total, porcentaje_total,
-- condicion_final) are top-level columns so the list view can filter/sort
-- without parsing JSONB.
--
-- Access: capacitación dashboard users (app-level gating via middleware).

create table public.facilitador_evaluaciones (
  id                bigint generated always as identity primary key,
  facilitador_id    bigint not null references public.facilitadores(id) on delete cascade,

  -- Evaluation type: which phase(s) are filled
  tipo_evaluacion   text not null
                    check (tipo_evaluacion in ('nuevo', 'seguimiento', 'reevaluacion')),

  -- Header — Datos del Facilitador
  evaluador_nombre  text,
  evaluador_cargo   text,
  recomendado_por   text,
  tipo_proveedor    text,
  entrevista        text,
  firma             text,
  fecha_evaluacion  date not null,

  -- Phase 1: Verificación Inicial (checkbox/radio selections + observaciones)
  -- Shape: { secciones: { nivel_educativo: { opcion, observacion }, ... }, total_puntos }
  fase_inicial      jsonb not null default '{}'::jsonb,

  -- Phase 2: Seguimiento (null when tipo = 'nuevo')
  -- Shape: { docs_iniciales_pct, encuestas_pct, gestion_actividades: { items: [n x6], total, pct }, total_pct, observaciones, oportunidades_mejora, metodologias }
  fase_seguimiento  jsonb,

  -- Phase 3: Reevaluación (null when tipo != 'reevaluacion')
  -- Shape: { osis: [{ nro_osi, docs, encuestas, gestion, total }], condicion }
  fase_reevaluacion jsonb,

  -- Computed/derived (set server-side on save)
  puntaje_total     numeric(5,2),
  porcentaje_total  numeric(5,2),
  condicion_final   text
                    check (condicion_final in ('aprobado', 'aprobado_supervision', 'no_aprobado', 'aceptable', 'no_aceptable')),

  -- General observaciones (verificación inicial)
  observaciones     text,

  -- Metadata
  creado_por        bigint references public.usuarios(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index on public.facilitador_evaluaciones (facilitador_id);
create index on public.facilitador_evaluaciones (fecha_evaluacion desc);
create index on public.facilitador_evaluaciones (tipo_evaluacion);

-- RLS policies
alter table public.facilitador_evaluaciones enable row level security;

-- Read: any authenticated user (app-level gating restricts to capacitación dashboard)
create policy "fac_eval_read" on public.facilitador_evaluaciones
  for select to authenticated using (true);

-- Insert: any authenticated user
create policy "fac_eval_insert" on public.facilitador_evaluaciones
  for insert to authenticated with check (true);

-- Update: any authenticated user
create policy "fac_eval_update" on public.facilitador_evaluaciones
  for update to authenticated using (true);

-- Delete: any authenticated user
create policy "fac_eval_delete" on public.facilitador_evaluaciones
  for delete to authenticated using (true);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger fac_eval_updated_at
  before update on public.facilitador_evaluaciones
  for each row execute function public.set_updated_at();
