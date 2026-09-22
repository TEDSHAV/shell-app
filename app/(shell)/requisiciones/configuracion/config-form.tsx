"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";

export function RequisicionesConfigForm({
  initialUmbral,
  saveAction,
}: {
  initialUmbral: number;
  saveAction: (umbral: number) => Promise<void>;
}) {
  const router = useRouter();
  const [umbral, setUmbral] = useState(initialUmbral);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSave() {
    setSaving(true);
    setError("");
    try {
      await saveAction(umbral);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="space-y-2">
        <Label htmlFor="umbral">Umbral para sello de líder (USD)</Label>
        <NumberInput
          id="umbral"
          value={umbral}
          onValueChange={(n) => setUmbral(Number(n) || 0)}
          allowDecimal
          min={0}
          step={1}
          className="h-9"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="button" onClick={onSave} disabled={saving}>
        {saving ? "Guardando…" : "Guardar"}
      </Button>
    </div>
  );
}
