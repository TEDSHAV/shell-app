"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  add_plan_mail_config,
  remove_plan_mail_config,
} from "../actions/plan-mail-config-actions";
import type { PlanMailRecipient, PlanMailRol } from "../lib/plan-mail-recipients";

function RecipientColumn({
  title,
  hint,
  rol,
  rows,
}: {
  title: string;
  hint: string;
  rol: PlanMailRol;
  rows: PlanMailRecipient[];
}) {
  const router = useRouter();
  const [email, set_email] = useState("");
  const [nombre, set_nombre] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const listed = rows.filter((row) => row.rol === rol);

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    start(async () => {
      set_error(null);
      const result = await fn();
      if (!result.ok) {
        set_error(result.error);
        return;
      }
      set_email("");
      set_nombre("");
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
      <ul className="mt-4 space-y-2">
        {listed.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{row.email}</p>
              {row.nombre ? (
                <p className="truncate text-xs text-slate-400">{row.nombre}</p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={pending}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-600"
              aria-label={`Quitar ${row.email}`}
              onClick={() => run(() => remove_plan_mail_config(row.id))}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {listed.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
            Sin correos. Añade al menos uno para esta copia.
          </li>
        ) : null}
      </ul>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
        <Input
          type="email"
          value={email}
          onChange={(event) => set_email(event.target.value)}
          placeholder="correo@shadevenezuela.com.ve"
          className="h-10 rounded-xl"
        />
        <Input
          value={nombre}
          onChange={(event) => set_nombre(event.target.value)}
          placeholder="Nombre"
          className="h-10 rounded-xl"
        />
        <Button
          type="button"
          disabled={pending || !email.trim()}
          className="h-10 rounded-xl bg-violet-700 text-white hover:bg-violet-600"
          onClick={() =>
            run(() =>
              add_plan_mail_config({ rol, email, nombre: nombre.trim() }),
            )
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          Añadir
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}

export function ObjetivosMailConfig({ rows }: { rows: PlanMailRecipient[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <RecipientColumn
        rol="solicitante"
        title="Solicitantes (gerencia)"
        hint="Añade o quita correos. Reciben la plantilla de solicitantes (gerencia)."
        rows={rows}
      />
      <RecipientColumn
        rol="ejecutante"
        title="Ejecutantes (equipo TED)"
        hint="Añade o quita correos. Reciben la plantilla de ejecutantes (equipo TED)."
        rows={rows}
      />
    </div>
  );
}
