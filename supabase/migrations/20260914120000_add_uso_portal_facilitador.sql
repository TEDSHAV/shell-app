-- Track whether the facilitador used the facilitador portal to upload participants,
-- per certificate. Nullable: existing rows and any insert missing the field stay valid.
ALTER TABLE public.certificados
  ADD COLUMN IF NOT EXISTS uso_portal_facilitador boolean;

COMMENT ON COLUMN public.certificados.uso_portal_facilitador IS
  'true si el facilitador cargó la lista de participantes vía el portal del facilitador; false si se cargó manualmente; NULL para certificados previos a la funcionalidad.';
