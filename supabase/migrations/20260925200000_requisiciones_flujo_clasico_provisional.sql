-- Modo provisional: restaurar cadena clásica de internas
-- (coordinador → líder → Admin) sin umbral de montos.
-- No se dropean columnas (umbral_lider_usd, costos_confirmados_at).

-- 1) Cerrar el estatus experimental `parcial` como abierta.
update public.requisiciones
set estatus_admin = 'pendiente'
where estatus_admin = 'parcial'
  and deleted_at is null;

-- 2) Internas abiertas que saltaron el sello de líder (umbral / estimación).
--    No reabre las que creó el líder de la gerencia (bypass clásico).
update public.requisiciones r
set
  lider_estatus = 'pendiente',
  costos_confirmados_at = null
where r.tipo_solicitud = 'Interno'
  and r.deleted_at is null
  and r.estatus_admin = 'pendiente'
  and r.lider_estatus is null
  and (r.coordinador_estatus is null or r.coordinador_estatus = 'aprobada')
  and not exists (
    select 1
    from public.usuarios u
    join public.departamentos d
      on lower(d.nombre) = lower(trim(r.departamento))
    join public.gerencias g
      on lower(g.nombre) = lower(trim(d.gerencia))
    where u.id_auth = r.created_by
      and g.lider = u.id
  );
