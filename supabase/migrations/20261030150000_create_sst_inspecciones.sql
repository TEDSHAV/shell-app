-- Create sst_inspecciones table for multi-device sync and historical inspection reviews
CREATE TABLE IF NOT EXISTS public.sst_inspecciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_informe TEXT NOT NULL,
  titulo TEXT NOT NULL DEFAULT 'Formato de Inspección SGI',
  sede TEXT NOT NULL DEFAULT 'OFICINAS TED / SERVICIOS TÉCNICOS',
  empresa TEXT NOT NULL DEFAULT 'TED DE VENEZUELA / SHA DE VENEZUELA C.A.',
  alcance TEXT NOT NULL DEFAULT 'Todas las áreas operativas, administrativas y técnicas',
  fecha_inspeccion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_corte DATE NOT NULL DEFAULT CURRENT_DATE,
  inspector_nombre TEXT NOT NULL DEFAULT 'LILIANA MONTERO',
  inspector_cargo TEXT NOT NULL DEFAULT 'COORDINADORA DE CALIDAD Y SST',
  acompanante TEXT DEFAULT 'ACOMPAÑANTE OPERATIVO',
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'en_progreso', 'completada', 'emitida')),
  
  -- Metrics summary
  indice_cumplimiento NUMERIC(5,2) DEFAULT 0,
  total_items INT DEFAULT 0,
  conformes_count INT DEFAULT 0,
  no_conformes_count INT DEFAULT 0,
  no_aplica_count INT DEFAULT 0,
  riesgo_alto_count INT DEFAULT 0,
  plazo_vencido_count INT DEFAULT 0,
  
  -- Structured inspection data (items with compressed photo evidences, areas list, equipment catastro)
  areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  tableros JSONB NOT NULL DEFAULT '[]'::jsonb,
  extintores JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  destinatarios_email JSONB NOT NULL DEFAULT '["kgomez@st.shadevenezuela.com.ve", "amorales@ted.shadevenezuela.com.ve"]'::jsonb,
  observaciones_generales TEXT DEFAULT '',
  
  -- Audit tracking
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sst_inspecciones_fecha ON public.sst_inspecciones(fecha_inspeccion DESC);
CREATE INDEX IF NOT EXISTS idx_sst_inspecciones_estado ON public.sst_inspecciones(estado);
CREATE INDEX IF NOT EXISTS idx_sst_inspecciones_created_at ON public.sst_inspecciones(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.sst_inspecciones ENABLE ROW LEVEL SECURITY;

-- Security Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sst_inspecciones' AND policyname = 'Allow authenticated read sst_inspecciones'
  ) THEN
    CREATE POLICY "Allow authenticated read sst_inspecciones"
      ON public.sst_inspecciones FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sst_inspecciones' AND policyname = 'Allow authenticated insert sst_inspecciones'
  ) THEN
    CREATE POLICY "Allow authenticated insert sst_inspecciones"
      ON public.sst_inspecciones FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sst_inspecciones' AND policyname = 'Allow authenticated update sst_inspecciones'
  ) THEN
    CREATE POLICY "Allow authenticated update sst_inspecciones"
      ON public.sst_inspecciones FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sst_inspecciones' AND policyname = 'Allow authenticated delete sst_inspecciones'
  ) THEN
    CREATE POLICY "Allow authenticated delete sst_inspecciones"
      ON public.sst_inspecciones FOR DELETE
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sst_inspecciones' AND policyname = 'Allow service_role full access sst_inspecciones'
  ) THEN
    CREATE POLICY "Allow service_role full access sst_inspecciones"
      ON public.sst_inspecciones FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

