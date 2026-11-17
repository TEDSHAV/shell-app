-- Requisiciones: modalidad "servicio_extra" (pedido extra a una OSI).
--
-- Un pedido extra va ligado a una OSI pero NO trae nada de ella (ni jornada, ni honorarios, ni recursos):
-- todo lo que pide se imputa como gasto extra en el control de costos.
--
-- Depende de 20261014180000_req_lineas_catalogo_pedido (SGestion, rama feat/cambios-solped), que crea
-- requisiciones.clase_pedido y su CHECK. Orden de despliegue: BD -> SGestion -> Shell.
--
-- Qué cambia:
--   1. El CHECK de clase_pedido acepta 'servicio_extra'.
--   2. analyze_req_osi_ecc_gate: para 'servicio_extra' el costo previsto de la OSI es 0 y se ignoran los
--      osi_fixed_items; así todo el pedido cuenta como extra. Sin esto el extra "cabría" dentro del costo de la
--      OSI y nunca pasaría por el control.
--   Las funciones de depósito (fn_req_deposito_de_req, fn_req_aplicar_entradas) no cambian: un extra es
--   Externo, sus líneas son cajón 'directo' y ya no mueven stock.

alter table public.requisiciones
  drop constraint if exists requisiciones_clase_pedido_check;
alter table public.requisiciones
  add constraint requisiciones_clase_pedido_check
  check (
    clase_pedido is null
    or clase_pedido in (
      'departamento',
      'servicio_directo',
      'servicio_inventario',
      'servicio_extra'
    )
  );

comment on column public.requisiciones.clase_pedido is
  'departamento | servicio_directo | servicio_inventario | servicio_extra. Un documento = un cajón. servicio_extra: ligada a una OSI, sin lo precargado de la OSI; todo cuenta como extra.';

create or replace function public.analyze_req_osi_ecc_gate(p_id_requisicion integer)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_req record;
  v_osi record;
  v_cost_req numeric := 0;
  v_cost_osi numeric := 0;
  v_extra numeric := 0;
  v_pote numeric := 0;
  v_remaining numeric := 0;
  v_colchon numeric := 0;
  v_just smallint := 2;
  v_n_lineas integer := 0;
  v_lineas numeric := 0;
  v_fixed numeric := 0;
  v_es_extra boolean := false;
begin
  select *
  into v_req
  from public.requisiciones
  where id = p_id_requisicion;

  if v_req.id is null then
    return jsonb_build_object('ok', false, 'error', 'Requisición no encontrada.');
  end if;

  if coalesce(v_req.clase_pedido, '') in (
    'departamento',
    'servicio_inventario'
  ) then
    return jsonb_build_object(
      'ok', true,
      'cost_req', 0,
      'cost_osi', 0,
      'extra', 0,
      'pote', 0,
      'remaining_for_req', 0,
      'colchon_ecc_osi', 0,
      'needs_approval', false,
      'nivel_justificacion_req', 2,
      'estatus', 'no_aplica',
      'skip_reason', v_req.clase_pedido
    );
  end if;

  v_es_extra := coalesce(v_req.clase_pedido, '') = 'servicio_extra';

  select
    count(*)::integer,
    coalesce(sum(
      l.cantidad * coalesce(l.costo_pagado, l.costo_catalogo, 0)
    ), 0)
  into v_n_lineas, v_lineas
  from public.req_lineas l
  where l.id_requisicion = p_id_requisicion;

  if not v_es_extra then
    v_fixed := coalesce((
      select sum(
        coalesce((fx->>'costo_traslado')::numeric, 0) +
        coalesce((fx->>'impresion_total')::numeric, 0) +
        coalesce((fx->>'honorarios_total')::numeric, 0) +
        coalesce((fx->>'informe_final_total')::numeric, 0)
      )
      from jsonb_array_elements(coalesce(v_req.osi_fixed_items, '[]'::jsonb)) fx
    ), 0);
  end if;

  if v_n_lineas > 0 then
    v_cost_req := v_lineas + v_fixed;
  else
    v_cost_req := v_fixed + coalesce((
      select sum(coalesce((it->>'total')::numeric, 0))
      from jsonb_array_elements(coalesce(v_req.additional_items, '[]'::jsonb)) it
    ), 0);
  end if;

  if v_cost_req <= 0 and not v_es_extra then
    v_cost_req := coalesce(v_req.costo_traslado, 0)
      + coalesce(v_req.impresion_total, 0)
      + coalesce(v_req.honorarios_total, 0)
      + coalesce(v_req.informe_final_total, 0);
  end if;

  if v_req.id_osi is not null then
    select *
    into v_osi
    from public.ejecucion_osi
    where id = v_req.id_osi;

    -- Un pedido extra no trae nada de la OSI: todo lo que pide es gasto adicional.
    if not v_es_extra then
      v_cost_osi := coalesce(v_osi.osi_costo_base_catalogo, 0)
        + coalesce(v_osi.pool_consumed, 0);
    end if;
    v_remaining := coalesce(v_osi.pool_remaining_req, 0);
    v_colchon := greatest(0, coalesce(v_osi.colchon_ecc_osi, 0));

    select coalesce(v.osi_req_justificacion_nivel, 2)
    into v_just
    from public.ecc_catalogo_version v
    where v.id = v_osi.id_catalogo_version;
  end if;

  v_extra := greatest(0, round(v_cost_req, 2) - round(v_cost_osi, 2));
  v_pote := round(greatest(0, v_remaining) + v_colchon, 2);

  return jsonb_build_object(
    'ok', true,
    'cost_req', round(v_cost_req, 2),
    'cost_osi', round(v_cost_osi, 2),
    'extra', round(v_extra, 2),
    'pote', v_pote,
    'remaining_for_req', round(greatest(0, v_remaining), 2),
    'colchon_ecc_osi', round(v_colchon, 2),
    'needs_approval', v_extra > v_pote,
    'nivel_justificacion_req', coalesce(v_just, 2),
    'estatus', case
      when v_extra <= 0 then 'no_aplica'
      when v_extra > v_pote then 'pendiente'
      else 'justifica'
    end
  );
end;
$function$;
