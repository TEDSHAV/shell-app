"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RequisicionFormData } from "@/types/requisiciones";

export type FacilitadorOpcion = {
  id: number;
  nombre_apellido: string;
  cedula?: string | null;
  rif?: string | null;
  telefono?: string | null;
  datos_bancarios?: Array<{
    banco?: string | null;
    nro_cuenta?: string | null;
    es_principal?: boolean | null;
  }> | null;
};

export type BancoOpcion = { id: number; nombre: string };

/** Al elegir facilitador se copian sus datos y su cuenta principal, igual que en el formulario clásico. */
function datos_de_facilitador(
  facilitador: FacilitadorOpcion | undefined,
): Partial<RequisicionFormData> {
  const cuentas = facilitador?.datos_bancarios ?? [];
  const principal = cuentas.find((c) => c.es_principal) ?? cuentas[0];
  return {
    cod_facilitador: facilitador ? String(facilitador.id) : "",
    facilitador: facilitador?.nombre_apellido || "",
    cedula_facilitador: facilitador?.cedula || "",
    rif_facilitador: facilitador?.rif || "",
    telefono_facilitador: facilitador?.telefono || "",
    banco: principal?.banco || "",
    nro_cuenta: principal?.nro_cuenta || "",
  };
}

const CELDA = "border-r border-gray-300 p-2";

/**
 * Bloque «Facilitador asignado» de las requisiciones externas de Capacitación: quién dicta el curso y
 * a qué cuenta se le paga. Con `modo="ver"` solo muestra lo elegido (resumen de Revisar).
 */
export function ReqAltaFacilitador({
  modo,
  form,
  on_form,
  facilitadores,
  bancos,
}: {
  modo: "editar" | "ver";
  form: RequisicionFormData;
  on_form?: (next: RequisicionFormData) => void;
  facilitadores: FacilitadorOpcion[];
  bancos: BancoOpcion[];
}) {
  const edit = modo === "editar";
  const elegir = (id: string) =>
    on_form?.({
      ...form,
      ...datos_de_facilitador(facilitadores.find((f) => String(f.id) === id)),
    });
  const vacio = "—";

  return (
    <div className="border-t border-gray-300 text-xs">
      <div className="border-b border-gray-300 bg-gray-200 py-1 text-center text-sm font-bold uppercase">
        Facilitador asignado
      </div>
      <div className="grid grid-cols-12 border-b border-gray-300 bg-gray-50 font-bold">
        <div className={`col-span-3 ${CELDA}`}>Facilitador</div>
        <div className={`col-span-3 ${CELDA}`}>Datos personales</div>
        <div className={`col-span-3 ${CELDA}`}>Cédula</div>
        <div className="col-span-3 p-2">RIF</div>
      </div>
      <div className="grid grid-cols-12 border-b border-gray-300">
        <div className={`col-span-3 ${CELDA}`}>
          {edit ? (
            <>
              <Select value={form.cod_facilitador || ""} onValueChange={elegir}>
                <SelectTrigger className="h-8 rounded-none border-none text-xs focus:ring-0">
                  <SelectValue placeholder="Seleccionar facilitador..." />
                </SelectTrigger>
                <SelectContent>
                  {facilitadores.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.nombre_apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 flex justify-between text-[10px] text-gray-500">
                <span>Cód. facilitador:</span>
                <span className="font-bold">{form.cod_facilitador || vacio}</span>
              </p>
            </>
          ) : (
            <span className="font-bold">{form.cod_facilitador || vacio}</span>
          )}
        </div>
        <div className={`col-span-3 flex items-center font-bold uppercase ${CELDA}`}>
          {form.facilitador || vacio}
        </div>
        <div className={`col-span-3 flex items-center font-bold ${CELDA}`}>
          {form.cedula_facilitador || vacio}
        </div>
        <div className="col-span-3 flex items-center p-2 font-bold uppercase">
          {form.rif_facilitador || vacio}
        </div>
      </div>
      <div className="grid grid-cols-12">
        <div className={`col-span-1 bg-gray-50 font-bold ${CELDA}`}>Banco</div>
        <div className={`col-span-3 ${CELDA}`}>
          {edit ? (
            <select
              value={form.banco || ""}
              onChange={(e) => on_form?.({ ...form, banco: e.target.value })}
              className="w-full rounded border border-gray-300 px-1 py-0.5 text-xs font-bold uppercase focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">Seleccionar...</option>
              {bancos.map((b) => (
                <option key={b.id} value={b.nombre}>
                  {b.nombre}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-bold uppercase">{form.banco || vacio}</span>
          )}
        </div>
        <div className={`col-span-2 bg-gray-50 font-bold ${CELDA}`}>Nro. cuenta</div>
        <div className={`col-span-3 break-all font-bold ${CELDA}`}>
          {form.nro_cuenta || vacio}
        </div>
        <div className={`col-span-1 bg-gray-50 font-bold ${CELDA}`}>Tel.</div>
        <div className="col-span-2 p-2 font-bold">
          {form.telefono_facilitador || vacio}
        </div>
      </div>
    </div>
  );
}
