-- Link solicitud #57 (CURSO DE TRIMOTOS) to the service ID (127) used by its executed OSI 3339,
-- and deactivate the empty duplicate catalog entry (215).

UPDATE public.solicitudes_diseno_servicio
SET id_servicio_relacionado = 127
WHERE id = 57
  AND id_servicio_relacionado = 215;

UPDATE public.catalogo_servicios
SET esta_activo = false,
    mostrar_en_catalogo = false
WHERE id = 215;
