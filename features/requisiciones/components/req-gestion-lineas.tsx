"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import {
  homologar_req_linea_action,
  update_req_linea_pagado_action,
} from "@/actions/req-homologar";
import type { CajonPedido } from "../lib/req-destino";
import { ambito_from_departamento, type ClasePedido } from "../lib/req-destino";

type LineaRow = {
  id: number;
  nombre_item: string;
  unidad: string | null;
  cantidad: number;
  costo_catalogo: number | null;
  costo_pagado: number | null;
  esta_suelto: boolean;
  id_item_costo: number | null;
  cajon: CajonPedido;
};

export function ReqGestionLineas({
  lineas,
  departamento,
  clase_pedido,
  can_edit,
}: {
  lineas: LineaRow[];
  departamento: string;
  clase_pedido: ClasePedido | null;
  can_edit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const sueltos = (lineas || []).filter(
    (row) => row.esta_suelto && !row.id_item_costo,
  );
  if (!sueltos.length) return null;
  const ambito = clase_pedido
    ? ambito_from_departamento(departamento, clase_pedido)
    : "departamentos";

  return (
    <div className="border-b border-gray-300 p-3 space-y-2">
      <p className="text-xs font-bold uppercase text-amber-800">
        Ítems sueltos — al tramitar, Administración decide si van al catálogo
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="p-1">Ítem</th>
            <th className="p-1">Cant</th>
            <th className="p-1">Base</th>
            <th className="p-1">Pagado</th>
            <th className="p-1" />
          </tr>
        </thead>
        <tbody>
          {sueltos.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-1">
                {row.nombre_item}
                {row.esta_suelto ? (
                  <span className="ml-1 text-amber-700">suelto</span>
                ) : null}
              </td>
              <td className="p-1">{row.cantidad}</td>
              <td className="p-1">
                {Number(row.costo_catalogo || 0).toFixed(2)}
              </td>
              <td className="p-1">
                {can_edit ? (
                  <NumberInput
                    value={Number(row.costo_pagado ?? 0)}
                    allowDecimal
                    min={0}
                    className="h-7 w-24 text-xs"
                    onValueChange={async (n) => {
                      setBusy(row.id);
                      await update_req_linea_pagado_action({
                        id_linea: row.id,
                        costo_pagado: n,
                      });
                      setBusy(null);
                      router.refresh();
                    }}
                  />
                ) : (
                  row.costo_pagado == null
                    ? "—"
                    : Number(row.costo_pagado).toFixed(2)
                )}
              </td>
              <td className="p-1">
                {can_edit && row.esta_suelto && !row.id_item_costo ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px]"
                    disabled={busy === row.id}
                    onClick={async () => {
                      setBusy(row.id);
                      const res = await homologar_req_linea_action({
                        id_linea: row.id,
                        ambito_catalogo: ambito,
                        cajon: row.cajon,
                      });
                      setBusy(null);
                      if (!res.ok) alert(res.error || "No se pudo homologar");
                      else router.refresh();
                    }}
                  >
                    ¿Añadir al catálogo?
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReqHermanaChip({
  hermana,
}: {
  hermana?: {
    id: number;
    clase_pedido?: string | null;
    nro_correlativo?: string | null;
  } | null;
}) {
  if (!hermana?.id) return null;
  const is_repo = hermana.clase_pedido === "servicio_inventario";
  const label = is_repo
    ? `Va con req #${hermana.id} (reposición)`
    : `Va con req #${hermana.id} (curso)`;
  return (
    <a
      href={`/requisiciones/view/${hermana.id}`}
      className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800"
    >
      {hermana.nro_correlativo
        ? `${label} · ${hermana.nro_correlativo}`
        : label}
    </a>
  );
}
