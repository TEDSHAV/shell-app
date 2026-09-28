"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function RequisicionCierreModal({
  open,
  verified,
  total,
  isSubmitting,
  onYes,
  onNo,
}: {
  open: boolean;
  verified: number;
  total: number;
  isSubmitting: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-md border-none bg-white shadow-2xl">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900">
            ¿Procesar la requisición finalmente?
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Todos los ítems están resueltos ({verified} de {total}). Si
            confirma, la requisición queda procesada.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onNo}
            >
              No
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={onYes}
            >
              Sí, procesar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
