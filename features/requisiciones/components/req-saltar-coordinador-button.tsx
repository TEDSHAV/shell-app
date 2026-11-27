"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saltarAprobacionCoordinador } from "@/actions/requisiciones-saltar-coordinador";

export function SaltarCoordinadorButton({
  requisicionId,
  disabled = false,
  compact = false,
}: {
  requisicionId: number;
  disabled?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    if (
      !confirm(
        "¿Omitir el sello del coordinador y enviarla a la aprobación del líder?",
      )
    ) {
      return;
    }
    setPending(true);
    try {
      await saltarAprobacionCoordinador(requisicionId);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo pasar al líder");
    } finally {
      setPending(false);
    }
  };

  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || pending}
        onClick={onClick}
        className="h-8 w-8 text-amber-700 hover:text-amber-900 hover:bg-amber-50"
        title="Pasar al líder, sin sello del coordinador"
      >
        <FastForward className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || pending}
      onClick={onClick}
      className="h-8 px-3 text-xs flex gap-1 border-amber-300 text-amber-800 hover:bg-amber-50"
    >
      <FastForward className="h-3.5 w-3.5" />
      {pending ? "Enviando..." : "Pasar al líder"}
    </Button>
  );
}
