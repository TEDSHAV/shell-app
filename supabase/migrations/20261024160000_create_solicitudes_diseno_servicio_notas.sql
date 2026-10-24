-- Append-only log of notes and observations for solicitudes_diseno_servicio.
-- Facilitates communication between Negocios (solicitante) and the executing
-- departments (Capacitación & Servicios Técnicos).

CREATE TABLE IF NOT EXISTS solicitudes_diseno_servicio_notas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  solicitud_id INTEGER NOT NULL,
  nota TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  autor_nombre TEXT,
  autor_departamento TEXT,
  CONSTRAINT solicitudes_diseno_servicio_notas_solicitud_fkey
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_diseno_servicio(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_diseno_servicio_notas_solicitud
  ON solicitudes_diseno_servicio_notas (solicitud_id, created_at DESC);

ALTER TABLE solicitudes_diseno_servicio_notas
  ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read all notes
DROP POLICY IF EXISTS "diseno_servicio_notas_select" ON solicitudes_diseno_servicio_notas;
CREATE POLICY "diseno_servicio_notas_select"
  ON solicitudes_diseno_servicio_notas FOR SELECT
  TO authenticated USING (true);

-- Policy: authenticated users can insert/update/delete notes
DROP POLICY IF EXISTS "diseno_servicio_notas_modify" ON solicitudes_diseno_servicio_notas;
CREATE POLICY "diseno_servicio_notas_modify"
  ON solicitudes_diseno_servicio_notas FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Register notification event type for user mentions in notes
INSERT INTO notify.event_types (
  app_slug, event_key, default_priority, channel_mask, title, description, trigger_kind, is_active
)
VALUES (
  'sgestion',
  'diseno_servicio_mencion',
  2,
  '{"in_app": true}'::jsonb,
  'Mención en Nota de Diseño de Servicio',
  'Aviso al usuario cuando es etiquetado o mencionado en las notas de una solicitud de nuevo servicio.',
  'app_writer',
  true
)
ON CONFLICT (app_slug, event_key) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_active = true;

