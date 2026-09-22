-- Tabla de caché compartido para consultas oficiales de cédulas (CNE / SENIAT)
CREATE TABLE IF NOT EXISTS cat_cedulas_cache (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nacionalidad CHAR(1) NOT NULL CHECK (nacionalidad IN ('V', 'E')),
  cedula VARCHAR(15) NOT NULL,
  nombre_completo VARCHAR(255) NOT NULL,
  rif VARCHAR(25),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cat_cedulas_cache_nac_cedula UNIQUE (nacionalidad, cedula)
);

CREATE INDEX IF NOT EXISTS idx_cat_cedulas_cache_lookup 
ON cat_cedulas_cache (nacionalidad, cedula);

-- RLS: Lectura y escritura para usuarios autenticados del sistema
ALTER TABLE cat_cedulas_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on cat_cedulas_cache"
ON cat_cedulas_cache FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert/update on cat_cedulas_cache"
ON cat_cedulas_cache FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

COMMENT ON TABLE cat_cedulas_cache IS 'Caché compartido entre módulos de PRISMA para verificación y autocompletado de cédulas';
