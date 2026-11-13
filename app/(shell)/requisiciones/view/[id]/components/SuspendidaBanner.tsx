"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PauseCircle } from "lucide-react";
import { reactivarRequisicion, type SuspensionRequisicion } from "@/actions/requisiciones-suspension";

/** Aviso de requisición suspendida por su OSI, con «Reactivar» solo si le queda una OSI activa. */
export function SuspendidaBanner({ id, info }: { id: number; info: SuspensionRequisicion }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, set_error] = useState<string | null>(null);
  const suspendidas = info.osis.filter((o) => o.suspendida).map((o) => o.nro_osi ?? `ID ${o.id_osi}`);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      <div className="flex items-start gap-2">
        <PauseCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Requisición suspendida</p>
          <p>
            {suspendidas.length ? `La OSI ${suspendidas.join(", ")} está suspendida. ` : "Su OSI está suspendida. "}
            Mientras tanto no se aprueba ni se procesa.{" "}
            {info.puede_reactivar
              ? "Le queda otra OSI activa: puedes reactivarla aquí."
              : "Se reactiva sola cuando se reactive la OSI (en el calendario de servicios, «Reactivar»)."}
          </p>
          {error ? <p className="mt-1 font-medium text-rose-700">{error}</p> : null}
        </div>
      </div>
      {info.puede_reactivar ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              set_error(null);
              const r = await reactivarRequisicion(id);
              if (!r.ok) return set_error(r.error);
              router.refresh();
            })
          }
          className="inline-flex h-9 items-center rounded-lg bg-rose-600 px-3 font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {pending ? "Reactivando…" : "Reactivar requisición"}
        </button>
      ) : null}
    </div>
  );
}
