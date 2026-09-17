"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/features/planificacion/components/search-select";
import { create_ticket } from "../actions/ticket-actions";
import { TICKET_PRIORIDADES } from "../schemas";
import { PRIORIDAD_LABEL } from "../lib/labels";
import type { TicketCatalog } from "../lib/types";

export function TicketForm({ catalog }: { catalog: TicketCatalog }) {
  const router = useRouter();
  const [app_id, set_app_id] = useState(String(catalog.apps[0]?.id ?? ""));
  const [modulo_id, set_modulo_id] = useState("");
  const [titulo, set_titulo] = useState("");
  const [descripcion, set_descripcion] = useState("");
  const [prioridad, set_prioridad] = useState<(typeof TICKET_PRIORIDADES)[number]>("media");
  const [asignado_id, set_asignado_id] = useState("");
  const [colab, set_colab] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const modulos = useMemo(
    () => catalog.modulos.filter((m) => String(m.app_id) === app_id),
    [catalog.modulos, app_id],
  );

  const default_asig = useMemo(() => {
    const mod = modulos.find((m) => String(m.id) === modulo_id);
    const from_mod = mod?.default_asignado_id;
    const from_app = modulos.find((m) => m.default_asignado_id)?.default_asignado_id;
    return from_mod ?? from_app ?? null;
  }, [modulos, modulo_id]);

  const assigned = asignado_id || (default_asig ? String(default_asig) : "");

  function on_submit(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      set_error(null);
      const extra = colab ? [Number(colab)] : [];
      const result = await create_ticket({
        titulo,
        descripcion,
        app_id: Number(app_id),
        modulo_id: modulo_id ? Number(modulo_id) : null,
        prioridad,
        asignado_id: assigned ? Number(assigned) : null,
        colaborador_ids: extra,
      });
      if (!result.ok) {
        set_error(result.error);
        return;
      }
      router.push("/tickets/mios");
      router.refresh();
    });
  }

  return (
    <form onSubmit={on_submit} className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Ticket Prisma</h1>
        <p className="mt-1 text-sm text-slate-500">
          Requerimientos o errores. Se crea una tarea tipo ticket, fuera de la planificación hasta que TED la promueva.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>App</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={app_id}
          onChange={(e) => {
            set_app_id(e.target.value);
            set_modulo_id("");
            set_asignado_id("");
          }}
        >
          {catalog.apps.map((app) => (
            <option key={app.id} value={app.id}>
              {app.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Módulo</Label>
        <SearchSelect
          value={modulo_id}
          placeholder="Buscar módulo (vacío = GENERAL)"
          onChange={set_modulo_id}
          options={[
            { value: "", label: "GENERAL (si no encaja otro)" },
            ...modulos.map((m) => ({ value: String(m.id), label: m.nombre })),
          ]}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tic-tit">Título</Label>
        <Input
          id="tic-tit"
          value={titulo}
          onChange={(e) => set_titulo(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tic-des">Detalle / comportamiento esperado</Label>
        <Textarea
          id="tic-des"
          value={descripcion}
          onChange={(e) => set_descripcion(e.target.value)}
          required
          rows={5}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Prioridad</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={prioridad}
          onChange={(e) =>
            set_prioridad(e.target.value as (typeof TICKET_PRIORIDADES)[number])
          }
        >
          {TICKET_PRIORIDADES.map((item) => (
            <option key={item} value={item}>
              {PRIORIDAD_LABEL[item]}
              {item === "alta" ? " (bloquea operación)" : ""}
              {item === "media" ? " (necesaria, hay alternativa)" : ""}
              {item === "baja" ? " (mejora visual o sugerencia)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Asignado (dueño del módulo/app)</Label>
          <SearchSelect
            value={assigned}
            placeholder="Persona a cargo"
            onChange={set_asignado_id}
            options={catalog.usuarios.map((u) => ({
              value: String(u.id),
              label: u.label,
            }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Colaborador extra</Label>
          <SearchSelect
            value={colab}
            placeholder="Opcional"
            onChange={set_colab}
            options={[
              { value: "", label: "Ninguno" },
              ...catalog.usuarios.map((u) => ({
                value: String(u.id),
                label: u.label,
              })),
            ]}
          />
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={pending} className="bg-slate-900 text-white">
        {pending ? "Enviando…" : "Enviar ticket"}
      </Button>
    </form>
  );
}
