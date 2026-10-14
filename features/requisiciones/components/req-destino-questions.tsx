"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { DestinoPedido, ServicioKind } from "../lib/req-destino";

export function ReqDestinoQuestions({
  destino,
  servicio,
  disabled,
  on_destino,
  on_servicio,
}: {
  destino: DestinoPedido | null;
  servicio: ServicioKind | null;
  disabled?: boolean;
  on_destino: (value: DestinoPedido) => void;
  on_servicio: (value: ServicioKind) => void;
}) {
  return (
    <div className="mb-4 space-y-3 rounded border border-gray-200 bg-white p-3">
      <p className="text-sm font-bold">¿Para quién es este pedido?</p>
      <RadioGroup
        value={destino || ""}
        onValueChange={(v) => on_destino(v as DestinoPedido)}
        className="flex flex-col gap-2"
      >
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="departamento" disabled={disabled} />
          <span>Mi departamento (req interna, sin OSI)</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="servicio" disabled={disabled} />
          <span>Dar un servicio (curso / ST)</span>
        </label>
      </RadioGroup>
      {destino === "servicio" ? (
        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-bold">¿Cómo se usa el gasto?</p>
          <RadioGroup
            value={servicio || ""}
            onValueChange={(v) => on_servicio(v as ServicioKind)}
            className="flex flex-col gap-2"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="directo" disabled={disabled} />
              <span>Se gasta en esta OSI (directo, con OSI)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="inventario" disabled={disabled} />
              <span>Reposición del depósito (sin OSI, otro documento)</span>
            </label>
          </RadioGroup>
          <p className="text-[11px] text-gray-500">
            Directo e inventario no se mezclan en el mismo número. Si pide
            directo, al guardar puede emitir también la hermana de reposición.
          </p>
        </div>
      ) : null}
      {destino ? <Label className="sr-only">destino</Label> : null}
    </div>
  );
}
