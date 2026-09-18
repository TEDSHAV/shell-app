"use server";

import { require_ticket_user } from "./assert-user";
import { require_ted_plan_context } from "@/features/planificacion/actions/assert-ted";
import type {
  TicketEstado,
  TicketEvento,
  TicketPrioridad,
  TicketQueueItem,
  TicketRow,
} from "../lib/types";

type RawTicket = {
  id: number;
  titulo: string;
  descripcion: string | null;
  prioridad: TicketPrioridad;
  estado: TicketEstado;
  app_id: number | null;
  modulo_id: number | null;
  solicitado_por: number | null;
  asignado_id: number | null;
  respuesta: string | null;
  respondido_at: string | null;
  tarea_id: number | null;
  created_at: string;
};

async function hydrate(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createAdminClient>>,
  rows: RawTicket[],
  options?: { include_events?: boolean },
): Promise<TicketRow[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const user_ids = [
    ...new Set(
      rows.flatMap((row) => [row.solicitado_por, row.asignado_id].filter(Boolean) as number[]),
    ),
  ];
  const app_ids = [...new Set(rows.map((row) => row.app_id).filter(Boolean) as number[])];
  const mod_ids = [...new Set(rows.map((row) => row.modulo_id).filter(Boolean) as number[])];

  const [users, apps, mods, cols, events] = await Promise.all([
    user_ids.length
      ? supabase.from("usuarios").select("id, nombre_apellido").in("id", user_ids)
      : Promise.resolve({ data: [] }),
    app_ids.length
      ? supabase.from("ted_plan_apps" as never).select("id, nombre").in("id", app_ids)
      : Promise.resolve({ data: [] }),
    mod_ids.length
      ? supabase.from("ted_plan_modulos" as never).select("id, nombre").in("id", mod_ids)
      : Promise.resolve({ data: [] }),
    supabase
      .from("ted_plan_ticket_colaboradores" as never)
      .select("ticket_id, usuario_id")
      .in("ticket_id", ids),
    options?.include_events === false
      ? Promise.resolve({ data: [] })
      : supabase
          .from("ted_plan_ticket_eventos" as never)
          .select("id, ticket_id, estado, nota, created_by, created_at")
          .in("ticket_id", ids)
          .order("created_at", { ascending: true }),
  ]);

  const name_by = new Map(
    ((users.data ?? []) as Array<{ id: number; nombre_apellido: string }>).map((u) => [
      u.id,
      u.nombre_apellido,
    ]),
  );
  const app_by = new Map(
    ((apps.data ?? []) as Array<{ id: number; nombre: string }>).map((a) => [a.id, a.nombre]),
  );
  const mod_by = new Map(
    ((mods.data ?? []) as Array<{ id: number; nombre: string }>).map((m) => [m.id, m.nombre]),
  );
  const cols_by = new Map<number, number[]>();
  for (const row of (cols.data ?? []) as Array<{ ticket_id: number; usuario_id: number }>) {
    const list = cols_by.get(row.ticket_id) ?? [];
    list.push(row.usuario_id);
    cols_by.set(row.ticket_id, list);
  }
  const events_by = new Map<number, TicketEvento[]>();
  for (const row of (events.data ?? []) as Array<TicketEvento & { ticket_id: number }>) {
    const list = events_by.get(row.ticket_id) ?? [];
    list.push({
      id: row.id,
      estado: row.estado,
      nota: row.nota,
      created_by: row.created_by,
      created_at: row.created_at,
    });
    events_by.set(row.ticket_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    prioridad: row.prioridad,
    estado: row.estado,
    app_id: row.app_id,
    app_nombre: row.app_id ? (app_by.get(row.app_id) ?? "App") : "App",
    modulo_id: row.modulo_id,
    modulo_nombre: row.modulo_id ? (mod_by.get(row.modulo_id) ?? "Módulo") : "GENERAL",
    solicitado_por: row.solicitado_por,
    solicitante: row.solicitado_por
      ? (name_by.get(row.solicitado_por) ?? "Usuario")
      : "Usuario",
    asignado_id: row.asignado_id,
    asignado: row.asignado_id ? (name_by.get(row.asignado_id) ?? "Usuario") : null,
    colaborador_ids: cols_by.get(row.id) ?? [],
    respuesta: row.respuesta,
    respondido_at: row.respondido_at,
    tarea_id: row.tarea_id,
    created_at: row.created_at,
    eventos: events_by.get(row.id) ?? [],
    source: "nativo",
  }));
}

const SELECT =
  "id, titulo, descripcion, prioridad, estado, app_id, modulo_id, solicitado_por, asignado_id, respuesta, respondido_at, tarea_id, created_at";

export async function list_my_tickets(): Promise<
  { ok: true; tickets: TicketRow[]; queues: Record<number, TicketQueueItem[]> } | { ok: false; error: string }
> {
  const gate = await require_ticket_user();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate;
  const { data, error } = await supabase
    .from("ted_plan_tickets" as never)
    .select(SELECT)
    .eq("solicitado_por", user_id)
    .order("created_at", { ascending: false });
  if (error) {
    return { ok: false, error: "No se pudieron cargar tus tickets." };
  }
  const tickets = await hydrate(supabase, (data ?? []) as RawTicket[]);
  const queues: Record<number, TicketQueueItem[]> = {};
  const modulo_ids = [
    ...new Set(tickets.map((t) => t.modulo_id).filter(Boolean) as number[]),
  ];
  if (modulo_ids.length > 0) {
    const { data: others } = await supabase
      .from("ted_plan_tickets" as never)
      .select("id, titulo, estado, prioridad, modulo_id")
      .in("modulo_id", modulo_ids)
      .in("estado", ["abierto", "en_curso"])
      .order("created_at");
    for (const row of (others ?? []) as Array<
      TicketQueueItem & { modulo_id: number }
    >) {
      const list = queues[row.modulo_id] ?? [];
      list.push({
        id: row.id,
        titulo: row.titulo,
        estado: row.estado,
        prioridad: row.prioridad,
      });
      queues[row.modulo_id] = list;
    }
  }
  return { ok: true, tickets, queues };
}

export async function list_ted_tickets(): Promise<
  { ok: true; tickets: TicketRow[] } | { ok: false; error: string }
> {
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { data, error } = await gate.ctx.supabase
    .from("ted_plan_tickets" as never)
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) {
    return { ok: false, error: "No se pudieron cargar los tickets." };
  }
  const tickets = await hydrate(gate.ctx.supabase, (data ?? []) as RawTicket[], {
    include_events: false,
  });
  return { ok: true, tickets };
}
