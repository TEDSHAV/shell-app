"use client";

import type {
  OSIFixedItem,
  OSIFullData,
  RequisicionFormData,
} from "@/types/requisiciones";
import {
  es_clase_con_osi,
  trae_recursos_osi,
  type CajonPedido,
  type CatalogAmbitoPedido,
  type ClasePedido,
} from "../../lib/req-destino";
import type { ReqLineaDraft } from "../../lib/req-lineas-types";
import type { ReqDeposito } from "../../lib/req-stock-types";
import { apply_fixed_to_form } from "../../lib/req-alta-form";
import { ReqAltaCabecera } from "./req-alta-cabecera";
import { ReqAltaOsiPicker } from "./req-alta-osi";
import { ReqAltaTablaDetalles } from "./req-alta-tabla-detalles";
import { ReqAltaStockAnalisis } from "./req-alta-stock-analisis";
import {
  ReqAltaFacilitador,
  type BancoOpcion,
  type FacilitadorOpcion,
} from "./req-alta-facilitador";
import { ReqAltaObservaciones } from "./req-alta-observaciones";
import { isCapacitacionDept } from "@/lib/requisiciones-gerencia";

export function ReqAltaPasoCreacion({
  clase,
  ambito,
  cajon,
  form,
  on_form,
  id_departamento,
  osis,
  osi_sessions,
  osi,
  id_sesion,
  on_pick_osi,
  on_sesion,
  lineas,
  on_lineas,
  deposito_stock = "departamento",
  facilitators = [],
  banks = [],
}: {
  clase: ClasePedido;
  ambito: CatalogAmbitoPedido;
  cajon: CajonPedido;
  form: RequisicionFormData;
  on_form: (next: RequisicionFormData) => void;
  id_departamento: number | null;
  osis: OSIFullData[];
  osi_sessions: Array<{
    id: number;
    id_osi: number;
    nro_sesion: number;
    fecha: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
  }>;
  osi: OSIFullData | null;
  id_sesion: number | null;
  on_pick_osi: (osi: OSIFullData) => void;
  on_sesion: (id: number) => void;
  lineas: ReqLineaDraft[];
  on_lineas: (next: ReqLineaDraft[]) => void;
  deposito_stock?: ReqDeposito;
  facilitators?: FacilitadorOpcion[];
  banks?: BancoOpcion[];
}) {
  // Depto → solo almacén departamental. Reponer servicio → solo ejecución Cap/ST.
  const show_stock =
    clase === "servicio_inventario" || clase === "departamento";
  const set_fixed = (next: OSIFixedItem[]) => {
    on_form(apply_fixed_to_form({ ...form, osi_fixed_items: next }, next[0]));
  };
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Pedido</h2>
        <p className="mt-1 text-sm text-gray-600">
          {clase === "servicio_directo"
            ? "Misma hoja de siempre: recursos de la OSI (horas × tarifa) y, si hace falta, ítems extra. Lo de depósito se activa en Revisar."
            : clase === "servicio_extra"
              ? "Pedido extra a la OSI: no trae nada de la OSI. Añada desde cero cada ítem que necesite (catálogo o suelto); todo cuenta como extra."
            : clase === "servicio_inventario"
              ? "Reposición de inventario. Escriba la descripción y elija del catálogo, o déjela suelta."
              : "Pedido interno. Escriba la descripción: si está en catálogo se enlaza; si no, sale suelta."}
        </p>
      </div>
      {es_clase_con_osi(clase) ? (
        <ReqAltaOsiPicker
          solo_extra={clase === "servicio_extra"}
          osis={osis}
          osi_sessions={osi_sessions}
          departamento={form.departamento}
          selected={osi}
          id_sesion={id_sesion}
          on_pick={on_pick_osi}
          on_sesion={on_sesion}
        />
      ) : null}
      <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
        <ReqAltaCabecera
          form={form}
          clase={clase}
          modo="editar"
          on_fecha={(value) => on_form({ ...form, fecha_solicitud: value })}
          on_prioridad={(value) => on_form({ ...form, prioridad: value })}
          on_solicitante={(value) => on_form({ ...form, solicitante: value })}
        />
        <ReqAltaTablaDetalles
          modo="editar"
          mostrar_osi={trae_recursos_osi(clase)}
          osi_fixed={form.osi_fixed_items}
          on_fixed={set_fixed}
          lineas={lineas}
          on_lineas={on_lineas}
          cajon={cajon}
          ambito={ambito}
          id_departamento={id_departamento}
          departamento_nombre={form.departamento}
        />
        <ReqAltaObservaciones
          modo="editar"
          value={form.observaciones || ""}
          on_change={(value) => on_form({ ...form, observaciones: value })}
        />
        {clase === "servicio_directo" && isCapacitacionDept(form.departamento) ? (
          <ReqAltaFacilitador
            modo="editar"
            form={form}
            on_form={on_form}
            facilitadores={facilitators}
            bancos={banks}
          />
        ) : null}
      </div>
      {show_stock ? (
        <ReqAltaStockAnalisis
          deposito={deposito_stock}
          id_departamento={
            deposito_stock === "departamento" ? id_departamento : null
          }
          lineas={lineas}
          on_lineas={on_lineas}
        />
      ) : null}
    </div>
  );
}
