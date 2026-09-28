"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/number-input";
import type { RequisicionItem } from "@/types/requisiciones";
import { item_pedido } from "@/lib/requisiciones-entrega";

type Decision = "cerrado_corto" | "resto_pendiente";

export function RequisicionEntregaModal({
  open,
  item,
  onClose,
  onConfirm,
}: {
  open: boolean;
  item: RequisicionItem | null;
  onClose: () => void;
  onConfirm: (
    cant_entregada: number,
    decision: Decision | null,
  ) => Promise<void> | void;
}) {
  const pedido = item ? item_pedido(item) : 1;
  const [cant, setCant] = useState(pedido);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    const prev = item.cant_entregada;
    setCant(
      prev != null && Number.isFinite(Number(prev)) ? Number(prev) : item_pedido(item),
    );
    setDecision(
      item.cierre_entrega === "resto_pendiente" ||
        item.cierre_entrega === "cerrado_corto"
        ? item.cierre_entrega
        : null,
    );
    setIsSubmitting(false);
  }, [open, item]);

  if (!open || !item) return null;

  const isShort = cant < pedido;
  const canSubmit = !isSubmitting && cant >= 0 && cant <= pedido && (!isShort || decision);

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onConfirm(cant, isShort ? decision : null);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al registrar la entrega");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-md border-none bg-white shadow-2xl">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900">Cantidad entregada</h3>
          <p className="mt-1 text-sm text-gray-600">
            Pedido: <strong>{pedido}</strong>
            {item.descripcion ? ` — ${item.descripcion}` : ""}
          </p>
          <label className="mt-4 block text-xs font-semibold uppercase text-gray-500">
            Entregado
          </label>
          <NumberInput
            value={cant}
            onValueChange={setCant}
            allowDecimal={false}
            min={0}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          {isShort ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-700">
                Se entrega menos de lo pedido. ¿Cómo se cierra este ítem?
              </p>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="cierre_entrega"
                  checked={decision === "cerrado_corto"}
                  onChange={() => setDecision("cerrado_corto")}
                  className="mt-1"
                />
                <span>Solo se entregará esto (cierra el faltante)</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="cierre_entrega"
                  checked={decision === "resto_pendiente"}
                  onChange={() => setDecision("resto_pendiente")}
                  className="mt-1"
                />
                <span>Dejar el resto pendiente</span>
              </label>
            </div>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canSubmit}
              onClick={() => void handleConfirm()}
            >
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
