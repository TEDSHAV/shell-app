"use client";

import { AlertTriangle, Package, ShieldCheck } from "lucide-react";
import type { RequisicionFormData } from "@/types/requisiciones";
import type { ReqGatePreview } from "@/actions/req-alta-gate";
import { osi_fixed_line_total } from "@/lib/requisicion-osi-clone";
import {
  req_interna_fuera_ventana,
  texto_aviso_ventana,
} from "../../lib/req-ventana-mensual";
import {
  deposito_stock_from_clase,
  type CajonPedido,
  type CatalogAmbitoPedido,
  type ClasePedido,
} from "../../lib/req-destino";
import {
  empty_linea_draft,
  linea_total,
  lineas_as_additional_items,
  type ReqLineaDraft,
} from "../../lib/req-lineas-types";
import { RequisicionAumentoCostosPanel } from "@/app/(shell)/requisiciones/components/RequisicionAumentoCostosPanel";
import { ReqAltaCabecera } from "./req-alta-cabecera";
import { ReqAltaTablaDetalles } from "./req-alta-tabla-detalles";
import { ReqAltaStockAnalisis } from "./req-alta-stock-analisis";

export function ReqAltaRevision({
  clase,
  form,
  lineas,
  gate,
}: {
  clase: ClasePedido;
  form: RequisicionFormData;
  lineas: ReqLineaDraft[];
  gate: ReqGatePreview | null;
}) {
  const extras = lineas.filter((row) => row.origen !== "osi_recurso");
  const total =
    (form.osi_fixed_items || []).reduce(
      (sum, row) => sum + osi_fixed_line_total(row),
      0,
    ) + extras.reduce((sum, row) => sum + linea_total(row), 0);
  const ventana =
    clase === "departamento" && req_interna_fuera_ventana(form.fecha_solicitud);
  const sellos =
    clase === "servicio_directo"
      ? "Al crear, va a la bandeja de Administración (requisición externa)."
      : "Al crear, primero sella coordinador o líder, y después Administración.";

  return (
    <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
      <p className="text-sm font-semibold text-blue-900">Qué implica</p>
      <p className="text-sm text-gray-800">
        Total de este documento:{" "}
        <span className="font-semibold">${total.toFixed(2)}</span>
      </p>
      {ventana ? (
        <p className="flex items-start gap-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {texto_aviso_ventana()}
        </p>
      ) : null}
      {clase === "servicio_directo" && gate ? (
        <div className="space-y-1 text-xs text-gray-700">
          <p>Pedido + consumo ya confirmado: {gate.cost_req.toFixed(2)}</p>
          <p>Costo previsto de la OSI: {gate.cost_osi.toFixed(2)}</p>
          {gate.consumo_osi > 0 ? (
            <p>Ya repartido desde depósito: {gate.consumo_osi.toFixed(2)}</p>
          ) : null}
          <p className="font-medium">
            {gate.needs_approval
              ? "El extra supera el pote: al tramitar pedirán justificación."
              : gate.estatus === "justifica"
                ? "Hay extra, pero cabe en el pote de la OSI."
                : "Sin extra sobre lo previsto en la OSI."}
          </p>
        </div>
      ) : null}
      {clase === "servicio_inventario" ? (
        <p className="text-xs text-gray-700">
          Entra al depósito del servicio. No se carga al curso.
        </p>
      ) : null}
      {clase === "departamento" && !ventana ? (
        <p className="text-xs text-gray-700">{sellos}</p>
      ) : null}
    </div>
  );
}

export function ReqAltaEstatusFinal({
  clase,
  form,
  lineas,
  cajon,
  ambito,
  id_departamento,
  gate,
  emit_hermana,
  on_emit_hermana,
  hermana,
  on_hermana,
  ambito_hermana,
  on_justificacion,
}: {
  clase: ClasePedido;
  form: RequisicionFormData;
  lineas: ReqLineaDraft[];
  cajon: CajonPedido;
  ambito: CatalogAmbitoPedido;
  id_departamento: number | null;
  gate: ReqGatePreview | null;
  emit_hermana: boolean;
  on_emit_hermana: (value: boolean) => void;
  hermana: ReqLineaDraft[];
  on_hermana: (next: ReqLineaDraft[]) => void;
  ambito_hermana: CatalogAmbitoPedido;
  on_justificacion: (value: string) => void;
}) {
  const ventana =
    clase === "departamento" && req_interna_fuera_ventana(form.fecha_solicitud);
  const sellos =
    clase === "servicio_directo"
      ? "Bandeja de Administración (externa)."
      : "Primero sello de área, luego Administración.";
  const extras = lineas.filter((row) => row.origen !== "osi_recurso");
  const total_req =
    (form.osi_fixed_items || []).reduce(
      (sum, row) => sum + osi_fixed_line_total(row),
      0,
    ) + extras.reduce((sum, row) => sum + linea_total(row), 0);
  const total_h = hermana.reduce((sum, row) => sum + linea_total(row), 0);
  const puede_hermana = clase === "servicio_directo";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          Documento a crear
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Este es el resumen final. Todavía no se ha guardado nada. {sellos}
        </p>
      </div>
      <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
        <ReqAltaCabecera form={form} clase={clase} modo="ver" />
        <ReqAltaTablaDetalles
          modo="ver"
          mostrar_osi={clase === "servicio_directo"}
          osi_fixed={form.osi_fixed_items}
          lineas={lineas}
          cajon={cajon}
          ambito={ambito}
          id_departamento={id_departamento}
          departamento_nombre={form.departamento}
        />
        {clase === "servicio_directo" ? (
          <RequisicionAumentoCostosPanel
            isInterna={false}
            idOsi={form.selectedOSIs[0]?.id_osi ?? null}
            osiFixedItems={form.osi_fixed_items}
            additionalItems={lineas_as_additional_items(lineas)}
            idSesion={form.id_sesion}
            justification={form.aumento_costos_justificacion || ""}
            onJustificationChange={on_justificacion}
          />
        ) : null}
      </div>
      {clase !== "servicio_directo" ? (
        <ReqAltaRevision clase={clase} form={form} lineas={lineas} gate={gate} />
      ) : null}
      {ventana ? (
        <p className="flex items-start gap-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {texto_aviso_ventana()}
        </p>
      ) : null}
      {puede_hermana ? (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/40 p-3">
          <label className="flex items-start gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              className="mt-1"
              checked={emit_hermana}
              onChange={(e) => {
                const on = e.target.checked;
                on_emit_hermana(on);
                if (on && hermana.length === 0) {
                  on_hermana([empty_linea_draft("inventario")]);
                }
              }}
            />
            <span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <Package className="h-4 w-4" />
                También reponer depósito
              </span>
              <span className="mt-0.5 block text-xs text-gray-600">
                Se crea un segundo documento de inventario (hermana), no
                cargado a la OSI. Si no lo marca, solo sale el gasto del curso.
              </span>
            </span>
          </label>
          {emit_hermana ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
                <ReqAltaTablaDetalles
                  modo="editar"
                  mostrar_osi={false}
                  osi_fixed={[]}
                  lineas={hermana}
                  on_lineas={on_hermana}
                  cajon="inventario"
                  ambito={ambito_hermana}
                  id_departamento={id_departamento}
                  departamento_nombre={form.departamento}
                />
              </div>
              <ReqAltaStockAnalisis
                deposito={deposito_stock_from_clase(
                  "servicio_inventario",
                  ambito_hermana,
                )}
                id_departamento={null}
                lineas={hermana}
                on_lineas={on_hermana}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-gray-900">
        Se emitirá: req de {clase === "servicio_directo" ? "curso" : "pedido"} $
        {total_req.toFixed(2)}
        {emit_hermana && puede_hermana
          ? ` + reposición $${total_h.toFixed(2)}`
          : ""}
      </p>
    </div>
  );
}
