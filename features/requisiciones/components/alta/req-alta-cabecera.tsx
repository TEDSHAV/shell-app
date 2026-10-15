"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatDate } from "@/lib/utils";
import type { RequisicionFormData } from "@/types/requisiciones";
import type { ClasePedido } from "../../lib/req-destino";

function prioridad_pill(value: string) {
  const color =
    value === "Alta"
      ? "bg-red-100 text-red-800"
      : value === "Media"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-green-100 text-green-800";
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${color}`}
    >
      {value || "-"}
    </span>
  );
}

export function ReqAltaCabecera({
  form,
  clase,
  modo,
  on_fecha,
  on_prioridad,
  on_solicitante,
}: {
  form: RequisicionFormData;
  clase: ClasePedido;
  modo: "editar" | "ver";
  on_fecha?: (value: string) => void;
  on_prioridad?: (value: RequisicionFormData["prioridad"]) => void;
  on_solicitante?: (value: string) => void;
}) {
  const edit = modo === "editar";
  const show_osi = clase === "servicio_directo";
  const osi = form.selectedOSIs[0];
  const fecha_ver = form.fecha_solicitud
    ? formatDate(new Date(`${form.fecha_solicitud}T00:00:00`))
    : "-";
  const sesion = form.selectedSesion;

  return (
    <div>
      <div className="grid grid-cols-12 border-b border-gray-300">
        <div className="col-span-3 flex items-center border-r border-gray-300 bg-gray-50 p-3 text-sm font-bold">
          Fecha de solicitud:
        </div>
        <div
          className={`flex items-center border-r border-gray-300 p-3 ${
            show_osi ? "col-span-4" : "col-span-9"
          }`}
        >
          {edit ? (
            <Input
              type="date"
              value={form.fecha_solicitud}
              onChange={(e) => on_fecha?.(e.target.value)}
              className="h-8 border-none px-0 focus-visible:ring-0"
            />
          ) : (
            <span className="text-sm font-medium">{fecha_ver}</span>
          )}
        </div>
        {show_osi ? (
          <>
            <div className="col-span-2 flex items-center border-r border-gray-300 bg-gray-50 p-3 text-sm font-bold">
              N° OSI:
            </div>
            <div className="col-span-3 flex items-center p-3 font-bold text-blue-700">
              {osi?.nro_osi || "-"}
            </div>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-12 border-b border-gray-300">
        <div className="col-span-3 flex flex-col justify-center border-r border-gray-300 bg-gray-50 p-3">
          <span className="text-sm font-bold">Gerencia solicitante:</span>
        </div>
        <div className="col-span-3 flex items-center border-r border-gray-300 p-3 font-medium uppercase">
          {form.gerencia_solicitante || "-"}
        </div>
        <div className="col-span-3 flex flex-col justify-center border-r border-gray-300 bg-gray-50 p-3">
          <span className="text-sm font-bold">Departamento:</span>
        </div>
        <div className="col-span-3 flex items-center p-3 font-medium uppercase">
          {form.departamento || "-"}
        </div>
      </div>

      <div className="grid grid-cols-12 border-b border-gray-300">
        <div className="col-span-3 flex flex-col justify-center border-r border-gray-300 bg-gray-50 p-3">
          <span className="text-sm font-bold">Nombre del solicitante:</span>
        </div>
        <div className="col-span-9 flex items-center p-3 font-bold uppercase">
          {edit ? (
            <Input
              value={form.solicitante}
              onChange={(e) => on_solicitante?.(e.target.value)}
              className="h-8 border-none px-0 text-sm font-bold uppercase focus-visible:ring-0"
            />
          ) : (
            form.solicitante || "-"
          )}
        </div>
      </div>

      {sesion ? (
        <div className="grid grid-cols-12 border-b border-gray-300">
          <div className="col-span-3 flex items-center border-r border-gray-300 bg-gray-50 p-3 text-sm font-bold">
            Sesión:
          </div>
          <div className="col-span-9 p-3 text-sm font-medium">
            {`Sesión #${sesion.nro_sesion ?? sesion.id_sesion}${
              sesion.fecha ? ` — ${sesion.fecha}` : ""
            }`}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-12 border-b border-gray-300">
        <div className="col-span-3 flex items-center border-r border-gray-300 bg-gray-50 p-3 text-sm font-bold">
          Prioridad:
        </div>
        <div className="col-span-9 flex items-center gap-8 p-3">
          {edit ? (
            <RadioGroup
              value={form.prioridad}
              onValueChange={(v: string) =>
                on_prioridad?.(v as RequisicionFormData["prioridad"])
              }
              className="grid-flow-col"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Alta" id="alta-prio" />
                <Label htmlFor="alta-prio" className="text-xs">
                  Alta
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Media" id="media-prio" />
                <Label htmlFor="media-prio" className="text-xs">
                  Media
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Baja" id="baja-prio" />
                <Label htmlFor="baja-prio" className="text-xs">
                  Baja
                </Label>
              </div>
            </RadioGroup>
          ) : (
            prioridad_pill(form.prioridad || "")
          )}
        </div>
      </div>
    </div>
  );
}
