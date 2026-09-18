"use server";

import { revalidatePath } from "next/cache";
import { require_ticket_user } from "./assert-user";
import { require_ted_plan_context } from "@/features/planificacion/actions/assert-ted";
import { isTedMember } from "@/actions/ted";
import {
  ticket_assign_schema,
  ticket_create_schema,
  ticket_promote_schema,
  ticket_reply_schema,
} from "../schemas";
import { createAdminClient } from "@/lib/supabase/server";

async function notify_ticket_requester(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  ticket_id: number,
  estado: "cerrado" | "no_procede",
  respuesta: string,
) {
  const { data: ticket } = await supabase
    .from("ted_plan_tickets" as never)
    .select("titulo, solicitado_por")
    .eq("id", ticket_id)
    .maybeSingle();
  const row = ticket as { titulo?: string; solicitado_por?: number | null } | null;
  if (!row?.solicitado_por) return;
  const { data: user } = await supabase
    .from("usuarios")
    .select("id_auth")
    .eq("id", row.solicitado_por)
    .maybeSingle();
  const auth_id = (user as { id_auth?: string | null } | null)?.id_auth;
  if (!auth_id) return;
  const closed = estado === "cerrado";
  const titulo = row.titulo ?? "tu requerimiento";
  const { error } = await supabase.schema("notify").from("inbox").insert({
    app_slug: "sgestion",
    event_key: closed ? "ticket_completado" : "ticket_no_procede",
    recipient_id_auth: auth_id,
    title: closed
      ? "Tu requerimiento fue completado"
      : "Tu requerimiento no procede",
    body: `«${titulo}»\n\n${respuesta}`,
    link_path: "/tickets/mios",
    metadata: { ticket_id, estado },
    dedupe_key: `ticket:${ticket_id}:${estado}:${Date.now()}`,
    priority: 2,
  });
  if (error) {
    console.error("[tickets] notify:", error);
  }
}

export async function sync_ticket_on_tarea_done(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  tarea_id: number,
  user_id: number | null,
  respuesta: string,
) {
  const { data } = await supabase
    .from("ted_plan_tareas" as never)
    .select("ticket_id")
    .eq("id", tarea_id)
    .maybeSingle();
  const ticket_id = Number(
    (data as { ticket_id?: number | null } | null)?.ticket_id ?? 0,
  );
  if (ticket_id <= 0) return;
  const { data: ticket } = await supabase
    .from("ted_plan_tickets" as never)
    .select("id, estado")
    .eq("id", ticket_id)
    .maybeSingle();
  const estado = (ticket as { estado?: string } | null)?.estado;
  if (!ticket || estado === "cerrado" || estado === "no_procede") return;
  const note =
    respuesta.trim() || "El requerimiento se completó en el plan Prisma.";
  await supabase
    .from("ted_plan_tickets" as never)
    .update({
      estado: "cerrado",
      respuesta: note,
      respondido_por: user_id,
      respondido_at: new Date().toISOString(),
    } as never)
    .eq("id", ticket_id);
  await add_evento(supabase, ticket_id, "cerrado", note, user_id);
  await notify_ticket_requester(supabase, ticket_id, "cerrado", note);
}

function revalidate_tickets() {
  revalidatePath("/tickets");
  revalidatePath("/tickets/mios");
  revalidatePath("/ted/planificacion");
  revalidatePath("/ted/planificacion/tickets");
  revalidatePath("/ted/planificacion/tareas");
}

async function add_evento(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  ticket_id: number,
  estado: string | null,
  nota: string | null,
  created_by: number | null,
) {
  await supabase.from("ted_plan_ticket_eventos" as never).insert({
    ticket_id,
    estado,
    nota,
    created_by,
  } as never);
}

async function ensure_modulo(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  app_id: number,
  modulo_id: number | null | undefined,
  user_id: number,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  if (modulo_id && modulo_id > 0) {
    const { data } = await supabase
      .from("ted_plan_modulo_apps" as never)
      .select("modulo_id")
      .eq("modulo_id", modulo_id)
      .eq("app_id", app_id)
      .maybeSingle();
    if (data) return { ok: true, id: modulo_id };
    const { data: fallback } = await supabase
      .from("ted_plan_modulos" as never)
      .select("id")
      .eq("id", modulo_id)
      .eq("app_id", app_id)
      .maybeSingle();
    if (fallback) return { ok: true, id: modulo_id };
  }

  const { data: existing } = await supabase
    .from("ted_plan_modulos" as never)
    .select("id")
    .eq("app_id", app_id)
    .ilike("nombre", "GENERAL")
    .limit(1)
    .maybeSingle();
  if (existing) {
    const id = Number((existing as { id: number }).id);
    await supabase
      .from("ted_plan_modulo_apps" as never)
      .upsert({ modulo_id: id, app_id } as never, {
        onConflict: "modulo_id,app_id",
      });
    return { ok: true, id };
  }

  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from("ted_plan_modulos" as never)
    .insert({
      app_id,
      nombre: "GENERAL",
      subtitulo: "Tickets y trabajo transversal de la app",
      trimestre_entrega: "T1",
      anio: year,
      created_by: user_id,
    } as never)
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: "No se pudo crear el módulo GENERAL." };
  }
  const id = Number((data as { id: number }).id);
  await supabase
    .from("ted_plan_modulo_apps" as never)
    .upsert({ modulo_id: id, app_id } as never, {
      onConflict: "modulo_id,app_id",
    });
  return { ok: true, id };
}

async function default_asignado(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  modulo_id: number,
  app_id: number,
): Promise<number | null> {
  const { data: parts } = await supabase
    .from("ted_plan_modulo_participantes" as never)
    .select("usuario_id")
    .eq("modulo_id", modulo_id)
    .limit(1);
  const first = ((parts ?? []) as Array<{ usuario_id: number }>)[0];
  if (first) return first.usuario_id;
  const { data: links } = await supabase
    .from("ted_plan_modulo_apps" as never)
    .select("modulo_id")
    .eq("app_id", app_id);
  const ids = ((links ?? []) as Array<{ modulo_id: number }>).map((row) => row.modulo_id);
  if (ids.length === 0) return null;
  const { data: more } = await supabase
    .from("ted_plan_modulo_participantes" as never)
    .select("usuario_id")
    .in("modulo_id", ids)
    .limit(1);
  return ((more ?? []) as Array<{ usuario_id: number }>)[0]?.usuario_id ?? null;
}

export async function create_ticket(raw: unknown) {
  const parsed = ticket_create_schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await require_ticket_user();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate;
  const input = parsed.data;
  const ted = await isTedMember();
  const solicitado_por =
    ted && input.solicitado_por && input.solicitado_por > 0
      ? input.solicitado_por
      : user_id;
  const modulo = await ensure_modulo(supabase, input.app_id, input.modulo_id, user_id);
  if (!modulo.ok) return modulo;
  const asignado_id =
    input.asignado_id ??
    (await default_asignado(supabase, modulo.id, input.app_id));

  const { data: ticket, error: t_err } = await supabase
    .from("ted_plan_tickets" as never)
    .insert({
      titulo: input.titulo,
      descripcion: input.descripcion,
      solicitado_por,
      app_id: input.app_id,
      modulo_id: modulo.id,
      prioridad: input.prioridad,
      asignado_id,
      estado: "abierto",
    } as never)
    .select("id")
    .single();
  if (t_err || !ticket) {
    console.error("[tickets] create:", t_err);
    return { ok: false as const, error: "No se pudo crear el ticket." };
  }
  const ticket_id = Number((ticket as { id: number }).id);

  const { data: orden_row } = await supabase
    .from("ted_plan_tareas" as never)
    .select("orden")
    .eq("modulo_id", modulo.id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const orden = Number((orden_row as { orden?: number } | null)?.orden ?? 0) + 1;

  const { data: tarea, error: tar_err } = await supabase
    .from("ted_plan_tareas" as never)
    .insert({
      modulo_id: modulo.id,
      titulo: input.titulo,
      origen: "TICKET",
      avance: 0,
      no_solicitada: false,
      completada: false,
      entregable_tipo: "ninguno",
      ticket_id,
      created_by: user_id,
      asignado_id,
      orden,
      en_planificacion: false,
    } as never)
    .select("id")
    .single();
  if (tar_err || !tarea) {
    console.error("[tickets] tarea:", tar_err);
    return { ok: false as const, error: "El ticket se creó, pero falló la tarea." };
  }
  const tarea_id = Number((tarea as { id: number }).id);
  await supabase
    .from("ted_plan_tickets" as never)
    .update({ tarea_id } as never)
    .eq("id", ticket_id);

  const extra = input.colaborador_ids.filter((id) => id !== asignado_id);
  if (extra.length > 0) {
    await supabase.from("ted_plan_ticket_colaboradores" as never).insert(
      extra.map((usuario_id) => ({ ticket_id, usuario_id })) as never,
    );
  }
  await add_evento(
    supabase,
    ticket_id,
    "abierto",
    solicitado_por === user_id
      ? "Ticket creado"
      : "Ticket registrado a nombre de otro usuario",
    user_id,
  );
  revalidate_tickets();
  return { ok: true as const, id: ticket_id };
}

export async function reply_ticket(raw: unknown) {
  const parsed = ticket_reply_schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("ted_plan_tickets" as never)
    .update({
      estado: parsed.data.estado,
      respuesta: parsed.data.respuesta,
      respondido_por: user_id,
      respondido_at: now,
    } as never)
    .eq("id", parsed.data.ticket_id);
  if (error) {
    return { ok: false as const, error: "No se pudo responder el ticket." };
  }
  if (parsed.data.estado === "no_procede") {
    const { data: ticket } = await supabase
      .from("ted_plan_tickets" as never)
      .select("tarea_id")
      .eq("id", parsed.data.ticket_id)
      .maybeSingle();
    const tarea_id = Number((ticket as { tarea_id?: number } | null)?.tarea_id ?? 0);
    if (tarea_id > 0) {
      await supabase
        .from("ted_plan_tareas" as never)
        .update({ no_solicitada: true, avance: 0, completada: false } as never)
        .eq("id", tarea_id);
    }
  }
  await add_evento(
    supabase,
    parsed.data.ticket_id,
    parsed.data.estado,
    parsed.data.respuesta,
    user_id,
  );
  if (parsed.data.estado === "cerrado" || parsed.data.estado === "no_procede") {
    await notify_ticket_requester(
      supabase,
      parsed.data.ticket_id,
      parsed.data.estado,
      parsed.data.respuesta,
    );
  }
  revalidate_tickets();
  return { ok: true as const };
}

export async function assign_ticket(raw: unknown) {
  const parsed = ticket_assign_schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const { error } = await supabase
    .from("ted_plan_tickets" as never)
    .update({ asignado_id: parsed.data.asignado_id } as never)
    .eq("id", parsed.data.ticket_id);
  if (error) return { ok: false as const, error: "No se pudo asignar." };
  const { data: ticket } = await supabase
    .from("ted_plan_tickets" as never)
    .select("tarea_id")
    .eq("id", parsed.data.ticket_id)
    .maybeSingle();
  const tarea_id = Number((ticket as { tarea_id?: number } | null)?.tarea_id ?? 0);
  if (tarea_id > 0) {
    await supabase
      .from("ted_plan_tareas" as never)
      .update({ asignado_id: parsed.data.asignado_id } as never)
      .eq("id", tarea_id);
  }
  await supabase
    .from("ted_plan_ticket_colaboradores" as never)
    .delete()
    .eq("ticket_id", parsed.data.ticket_id);
  const extra = parsed.data.colaborador_ids.filter(
    (id) => id !== parsed.data.asignado_id,
  );
  if (extra.length > 0) {
    await supabase.from("ted_plan_ticket_colaboradores" as never).insert(
      extra.map((usuario_id) => ({
        ticket_id: parsed.data.ticket_id,
        usuario_id,
      })) as never,
    );
  }
  await add_evento(supabase, parsed.data.ticket_id, null, "Asignación actualizada", user_id);
  revalidate_tickets();
  return { ok: true as const };
}

export async function promote_ticket(raw: unknown) {
  const parsed = ticket_promote_schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const { data: ticket, error } = await supabase
    .from("ted_plan_tickets" as never)
    .select("id, tarea_id")
    .eq("id", parsed.data.ticket_id)
    .maybeSingle();
  if (error || !ticket) {
    return { ok: false as const, error: "Ticket no encontrado." };
  }
  const tarea_id = Number((ticket as { tarea_id?: number }).tarea_id ?? 0);
  await supabase
    .from("ted_plan_tickets" as never)
    .update({ estado: "planificado" } as never)
    .eq("id", parsed.data.ticket_id);
  if (tarea_id > 0) {
    await supabase
      .from("ted_plan_tareas" as never)
      .update({
        en_planificacion: true,
        trimestre: parsed.data.trimestre ?? null,
        no_solicitada: false,
      } as never)
      .eq("id", tarea_id);
  }
  await add_evento(
    supabase,
    parsed.data.ticket_id,
    "planificado",
    parsed.data.trimestre
      ? `Pasado a planificación ${parsed.data.trimestre}`
      : "Pasado a planificación",
    user_id,
  );
  revalidate_tickets();
  return { ok: true as const };
}
