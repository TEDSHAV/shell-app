import type { FlatPlanTask } from "@/features/planificacion/lib/flatten-plan-tasks";
import { given_name, people_on_tarea } from "@/features/planificacion/lib/people";
import type { TicketEstado, TicketRow } from "./types";

function estado_from_avance(
  avance: number,
  no_solicitada: boolean,
): TicketEstado {
  if (no_solicitada) return "no_procede";
  if (avance >= 100) return "cerrado";
  if (avance > 0) return "en_curso";
  return "abierto";
}

export function merge_ticket_inbox(
  native: TicketRow[],
  items: FlatPlanTask[],
): TicketRow[] {
  const linked_tarea = new Set(
    native.map((row) => row.tarea_id).filter((id): id is number => Boolean(id)),
  );
  const linked_ticket = new Set(native.map((row) => row.id));
  const from_plan: TicketRow[] = [];

  for (const item of items) {
    if (item.tarea.origen !== "TICKET") continue;
    if (linked_tarea.has(item.tarea.id)) continue;
    if (item.tarea.ticket_id && linked_ticket.has(item.tarea.ticket_id)) {
      continue;
    }
    const people = people_on_tarea(item.tarea);
    from_plan.push({
      id: item.tarea.id,
      titulo: item.tarea.titulo,
      descripcion: null,
      prioridad: "media",
      estado: estado_from_avance(
        item.tarea.avance,
        item.tarea.no_solicitada,
      ),
      app_id: null,
      app_nombre: item.app_nombre,
      modulo_id: item.tarea.modulo_id,
      modulo_nombre: item.modulo_nombre,
      solicitado_por: null,
      solicitante: "Plan",
      asignado_id: people[0]?.usuario_id ?? item.tarea.asignado_id,
      asignado: people.map((person) => given_name(person.nombre)).join(", ") || null,
      colaborador_ids: [],
      respuesta: null,
      respondido_at: null,
      tarea_id: item.tarea.id,
      created_at: "",
      eventos: [],
      source: "plan",
      avance: item.tarea.avance,
    });
  }

  return [
    ...native.map((row) => ({ ...row, source: "nativo" as const })),
    ...from_plan,
  ];
}
