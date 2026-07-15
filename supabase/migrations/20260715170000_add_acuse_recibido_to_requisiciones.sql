-- Add acuse de recibo (acknowledge receipt) columns to requisiciones
ALTER TABLE requisiciones
  ADD COLUMN IF NOT EXISTS acuse_recibido boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS acuse_recibido_at timestamptz,
  ADD COLUMN IF NOT EXISTS acuse_recibido_por text;
