"use client";

import { useTransition } from "react";
import { Database } from "lucide-react";
import { switchDevDbTarget } from "@/features/ted/actions/switch-dev-db";
import type { DevDbSnapshot, DevDbTarget } from "@/lib/supabase/dev-db";

export function TedDevDbSwitcher({ snapshot }: { snapshot: DevDbSnapshot }) {
  const [pending, start] = useTransition();
  if (!snapshot.enabled) return null;

  const select = (target: DevDbTarget) => {
    if (target === snapshot.target || pending) return;
    if (
      target === "production" &&
      !window.confirm(
        "Vas a apuntar este next dev a PRODUCCIÓN. Los cambios tocan datos reales. ¿Continuar?",
      )
    ) {
      return;
    }
    start(() => {
      void switchDevDbTarget(target);
    });
  };

  return (
    <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
          <Database className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-amber-950">
            Base de datos local (solo next dev)
          </h2>
          <p className="mt-1 text-xs text-amber-900/80">
            Cambia a cuál proyecto Supabase apunta esta sesión. Cada entorno
            guarda su propia cookie de auth; al cambiar hay que iniciar sesión
            de nuevo.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !snapshot.staging}
              onClick={() => select("staging")}
              className={
                snapshot.target === "staging"
                  ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-700 text-white"
                  : "px-3 py-1.5 text-xs font-semibold rounded-md bg-white border border-amber-300 text-amber-950 hover:bg-amber-100 disabled:opacity-40"
              }
            >
              Staging (g)
            </button>
            <button
              type="button"
              disabled={pending || !snapshot.production}
              onClick={() => select("production")}
              className={
                snapshot.target === "production"
                  ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-red-700 text-white"
                  : "px-3 py-1.5 text-xs font-semibold rounded-md bg-white border border-amber-300 text-amber-950 hover:bg-amber-100 disabled:opacity-40"
              }
            >
              Producción (o)
            </button>
          </div>
          {!snapshot.production ? (
            <p className="mt-2 text-[11px] text-amber-800">
              Producción no está lista: agrega DEV_SUPABASE_PROD_URL,
              DEV_SUPABASE_PROD_PUBLISHABLE_KEY y DEV_SUPABASE_PROD_SERVICE_ROLE_KEY
              en shell-app/.env.local y reinicia next dev.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
