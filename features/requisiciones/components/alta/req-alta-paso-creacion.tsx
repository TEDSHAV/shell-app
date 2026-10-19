"use client";

import { useState } from "react";
import type {
  OSIFixedItem,
  OSIFullData,
  RequisicionFormData,
} from "@/types/requisiciones";
import type { CajonPedido, CatalogAmbitoPedido, ClasePedido } from "../../lib/req-destino";
import type { ReqLineaDraft } from "../../lib/req-lineas-types";
import type { ReqDeposito } from "../../lib/req-stock-types";
import { apply_fixed_to_form } from "../../lib/req-alta-form";
import { ReqAltaCabecera } from "./req-alta-cabecera";
import { ReqAltaOsiPicker } from "./req-alta-osi";
import { ReqAltaTablaDetalles } from "./req-alta-tabla-detalles";
import { ReqAltaStockAnalisis } from "./req-alta-stock-analisis";

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
  abastecer_inicial = false,
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
  abastecer_inicial?: boolean;
}) {
  const show_stock =
    clase === "servicio_inventario" || clase === "departamento";
  const [analisis_open, setAnalisisOpen] = useState(
    abastecer_inicial || clase === "servicio_inventario",
  );
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
            : clase === "servicio_inventario"
              ? "Reposición de inventario. Escriba la descripción y elija del catálogo, o déjela suelta."
              : "Pedido interno. Escriba la descripción: si está en catálogo se enlaza; si no, sale suelta."}
        </p>
      </div>
      {clase === "servicio_directo" ? (
        <ReqAltaOsiPicker
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
          mostrar_osi={clase === "servicio_directo"}
          osi_fixed={form.osi_fixed_items}
          on_fixed={set_fixed}
          lineas={lineas}
          on_lineas={on_lineas}
          cajon={cajon}
          ambito={ambito}
          id_departamento={id_departamento}
          departamento_nombre={form.departamento}
        />
      </div>
      {show_stock ? (
        <ReqAltaStockAnalisis
          open={analisis_open}
          on_open_change={setAnalisisOpen}
          deposito={deposito_stock}
          id_departamento={
            deposito_stock === "departamento" ? id_departamento : null
          }
          lineas={lineas}
        />
      ) : null}
    </div>
  );
}
