-- El mapa de aprobadores vive en la app (misma regla que el sello:
-- permiso/rol + territorio). Estas vistas solo reflejaban organigrama y
-- desorientaban el manual.

drop view if exists public.v_requisiciones_mapa_tramite;
drop view if exists public.v_requisiciones_mapa_aprobadores;
