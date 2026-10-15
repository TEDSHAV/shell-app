"use client";

import {
  Building2,
  Check,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { PasoAlta, PasoAltaMeta } from "../../lib/req-alta-pasos";

const ICONS: Record<PasoAlta, typeof Building2> = {
  destino: Building2,
  uso: Wallet,
  creacion: ClipboardList,
  confirmar: ShieldCheck,
  listo: Sparkles,
};

export function ReqAltaStepper({
  pasos,
  actual,
  on_go,
}: {
  pasos: PasoAltaMeta[];
  actual: PasoAlta;
  on_go: (paso: PasoAlta) => void;
}) {
  const active = pasos.findIndex((row) => row.id === actual);
  return (
    <nav aria-label="Pasos de la requisición" className="w-full">
      <ol className="flex items-start">
        {pasos.map((paso, index) => {
          const Icon = ICONS[paso.id];
          const done = index < active && !paso.skipped;
          const current = paso.id === actual;
          const clickable = done;
          return (
            <li key={paso.id} className="flex min-w-0 flex-1 items-start">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && on_go(paso.id)}
                className="flex w-full min-w-0 flex-col items-center gap-1 px-0.5 text-center"
              >
                <span className="flex w-full items-center">
                  <span
                    className={`h-0.5 flex-1 ${
                      index === 0
                        ? "bg-transparent"
                        : index <= active
                          ? "bg-blue-600"
                          : "bg-gray-200"
                    }`}
                  />
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                      current
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : done
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : paso.skipped
                            ? "border-gray-200 bg-gray-50 text-gray-300"
                            : "border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <span
                    className={`h-0.5 flex-1 ${
                      index === pasos.length - 1
                        ? "bg-transparent"
                        : index < active
                          ? "bg-blue-600"
                          : "bg-gray-200"
                    }`}
                  />
                </span>
                <span
                  className={`text-[11px] font-semibold leading-tight ${
                    current
                      ? "text-blue-700"
                      : paso.skipped
                        ? "text-gray-300 line-through"
                        : "text-gray-600"
                  }`}
                >
                  {paso.skipped ? paso.label : `${paso.n}. ${paso.label}`}
                </span>
                <span
                  className={`hidden max-w-[7rem] text-[10px] leading-tight sm:block ${
                    current ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  {paso.hint}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-sm text-gray-600">
        Paso actual:{" "}
        <span className="font-semibold text-gray-900">
          {pasos.find((row) => row.id === actual)?.label}
        </span>
      </p>
    </nav>
  );
}
