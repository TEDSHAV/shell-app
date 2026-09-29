import type { createAdminClient } from "@/lib/supabase/server";
import { fanOutNotifyByConfig } from "@/lib/notification-recipient/runtime-resolve";
import { PRIORIDAD_LABEL } from "./labels";
import type { TicketPrioridad } from "./types";
import { email_ticket_created } from "./ticket-email";

type Admin = Awaited<ReturnType<typeof createAdminClient>>;

function excerpt(text: string | null | undefined, max = 180): string {
  const value = (text ?? "").replace(/\s+/g, " ").trim();
  if (!value) return "Sin descripción.";
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

function label_prioridad(raw: string | null | undefined): string {
  const key = (raw ?? "media") as TicketPrioridad;
  return PRIORIDAD_LABEL[key] ?? raw ?? "Media";
}

export async function notify_ticket_created(
  supabase: Admin,
  ticket_id: number,
): Promise<void> {
  const { data: ticket } = await supabase
    .from("ted_plan_tickets" as never)
    .select(
      "id, titulo, descripcion, prioridad, solicitado_por, created_by, app_id, modulo_id",
    )
    .eq("id", ticket_id)
    .maybeSingle();
  const row = ticket as {
    id: number;
    titulo?: string;
    descripcion?: string | null;
    prioridad?: string;
    solicitado_por?: number | null;
    created_by?: number | null;
    app_id?: number | null;
    modulo_id?: number | null;
  } | null;
  if (!row) return;

  const user_ids = [row.solicitado_por, row.created_by].filter(
    (id): id is number => Boolean(id),
  );
  const names = new Map<number, string>();
  if (user_ids.length > 0) {
    const { data: users } = await supabase
      .from("usuarios")
      .select("id, nombre_apellido")
      .in("id", user_ids);
    for (const user of (users ?? []) as Array<{
      id: number;
      nombre_apellido: string;
    }>) {
      names.set(user.id, user.nombre_apellido);
    }
  }

  let app_nombre = "App";
  if (row.app_id) {
    const { data: app } = await supabase
      .from("ted_plan_apps" as never)
      .select("nombre")
      .eq("id", row.app_id)
      .maybeSingle();
    app_nombre = (app as { nombre?: string } | null)?.nombre ?? app_nombre;
  }

  let modulo_nombre = "Módulo";
  if (row.modulo_id) {
    const { data: modulo } = await supabase
      .from("ted_plan_modulos" as never)
      .select("nombre")
      .eq("id", row.modulo_id)
      .maybeSingle();
    modulo_nombre =
      (modulo as { nombre?: string } | null)?.nombre ?? modulo_nombre;
  }

  const solicitante =
    (row.solicitado_por ? names.get(row.solicitado_por) : null) ?? "Usuario";
  const registrador =
    (row.created_by ? names.get(row.created_by) : null) ?? solicitante;
  const a_nombre =
    row.created_by &&
    row.solicitado_por &&
    row.created_by !== row.solicitado_por;

  const lines = [
    `Solicitante: ${solicitante}`,
    a_nombre ? `Registrado por: ${registrador} (a nombre de ${solicitante})` : null,
    `App: ${app_nombre}`,
    `Módulo: ${modulo_nombre}`,
    `Prioridad: ${label_prioridad(row.prioridad)}`,
    `Título: ${row.titulo ?? "Ticket"}`,
    "",
    excerpt(row.descripcion),
  ].filter((line): line is string => line !== null);

  await fanOutNotifyByConfig(supabase, {
    appSlug: "ted",
    eventKey: "ticket_created",
    title: "Nueva solicitud TED · ticket",
    body: lines.join("\n"),
    linkPath: "/ted/planificacion/tickets",
    metadata: { ticket_id },
    dedupeKey: `ticket:${ticket_id}:created`,
    priority: 2,
  });
  await email_ticket_created({
    ticket_id,
    titulo: row.titulo ?? "Ticket",
    solicitante,
    registrador,
    a_nombre: Boolean(a_nombre),
    app_nombre,
    modulo_nombre,
    prioridad: label_prioridad(row.prioridad),
    descripcion: excerpt(row.descripcion),
  });
}
