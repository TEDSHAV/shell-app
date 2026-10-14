"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";

export function ReqItemSueltoDialog({
  open,
  on_close,
  on_confirm,
}: {
  open: boolean;
  on_close: () => void;
  on_confirm: (row: {
    nombre_item: string;
    unidad: string;
    cantidad: number;
  }) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState("und");
  const [cantidad, setCantidad] = useState(1);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-bold">Ítem suelto (sin ficha)</p>
          <div>
            <Label className="text-xs">Nombre</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Unidad</Label>
              <Input
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Cantidad</Label>
              <NumberInput
                value={cantidad}
                min={0.001}
                onValueChange={(n) => setCantidad(n)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={on_close}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!nombre.trim()}
              onClick={() => {
                on_confirm({
                  nombre_item: nombre.trim(),
                  unidad: unidad.trim() || "und",
                  cantidad: cantidad || 1,
                });
                setNombre("");
                setUnidad("und");
                setCantidad(1);
              }}
            >
              Añadir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
