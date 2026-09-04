"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const APP_SLUG = "srh";

type SolicitudEstado = "pendiente" | "en_proceso" | "completada" | "rechazada";

/**
 * Build a specific notification body based on what was requested.
 */
function buildCompletionBody(
  nombreApellido: string,
  solicitarEmail: boolean,
  solicitarFirmaEmail: boolean,
): string {
  const parts: string[] = [];
  if (solicitarEmail) parts.push("el usuario y el email corporativo");
  else if (solicitarFirmaEmail) parts.push("el usuario y la firma de email");
  else parts.push("el usuario");
  return `Tu solicitud para crear ${parts.join(", ")} para ${nombreApellido} ha sido completada por TED.`;
}

/**
 * TED updates the status of an RH solicitud from the shell's TED page.
 * Updates the row directly via admin client and fires a notification
 * to the solicitante (best-effort).
 */
export async function updateRhSolicitudStatus(
  id: number,
  estado: SolicitudEstado,
  notas?: string | null,
): Promise<{ success: boolean; error?: string }> {
  if (!id || !estado) {
    return { success: false, error: "Parámetros inválidos" };
  }

  const validEstados: SolicitudEstado[] = [
    "pendiente",
    "en_proceso",
    "completada",
    "rechazada",
  ];
  if (!validEstados.includes(estado)) {
    return { success: false, error: "Estado inválido" };
  }

  try {
    // Use cookie client to get the current user (for procesado_por)
    const cookieClient = await createClient();
    const admin = await createAdminClient();

    const {
      data: { user },
    } = await cookieClient.auth.getUser();
    let procesadoPor: number | null = null;
    if (user) {
      const { data: userData } = await admin
        .from("usuarios")
        .select("id")
        .eq("id_auth", user.id)
        .maybeSingle();
      procesadoPor = userData?.id ?? null;
    }

    const updateData: Record<string, unknown> = {
      estado,
      updated_at: new Date().toISOString(),
    };

    if (notas !== undefined) {
      updateData.notas = notas?.trim() || null;
    }

    if (estado !== "pendiente") {
      updateData.procesado_por = procesadoPor;
    }

    const { error: updateError } = await admin
      .from("rh_solicitudes")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("[updateRhSolicitudStatus] DB error:", updateError);
      return { success: false, error: "Error al actualizar la solicitud" };
    }

    // Fire-and-forget notification to the solicitante when status changes
    // to completada or rechazada
    if (estado === "completada" || estado === "rechazada") {
      try {
        const { data: solicitud, error: solError } = await admin
          .from("rh_solicitudes")
          .select("solicitado_por, nombre_apellido, solicitar_email, solicitar_firma_email")
          .eq("id", id)
          .maybeSingle();

        if (solError || !solicitud) {
          console.error("[updateRhSolicitudStatus] Could not fetch solicitud:", solError);
          revalidatePath("/ted/rh-solicitudes");
          return { success: true };
        }

        if (solicitud.solicitado_por) {
          const { data: solicitante, error: solicError } = await admin
            .from("usuarios")
            .select("id_auth")
            .eq("id", solicitud.solicitado_por)
            .maybeSingle();

          if (solicError || !solicitante?.id_auth) {
            console.warn("[updateRhSolicitudStatus] Could not resolve solicitante id_auth:", solicError);
            revalidatePath("/ted/rh-solicitudes");
            return { success: true };
          }

          const isRechazada = estado === "rechazada";
          const eventKey = isRechazada
            ? "rh_solicitud_rechazada"
            : "rh_solicitud_completada";

          const title = isRechazada
            ? "Solicitud de Usuario Rechazada"
            : "Solicitud de Usuario Completada";

          const body = isRechazada
            ? notas?.trim()
              ? `Tu solicitud para ${solicitud.nombre_apellido} ha sido rechazada por TED. Motivo: ${notas.trim()}`
              : `Tu solicitud para ${solicitud.nombre_apellido} ha sido rechazada por TED.`
            : buildCompletionBody(
                solicitud.nombre_apellido,
                solicitud.solicitar_email,
                solicitud.solicitar_firma_email,
              );

          const { error: insertError } = await admin
            .schema("notify")
            .from("inbox")
            .insert({
              app_slug: APP_SLUG,
              event_key: eventKey,
              recipient_id_auth: solicitante.id_auth,
              title,
              body,
              link_path: `/dashboard/rh/solicitudes/${id}`,
              metadata: {
                solicitud_id: id,
                nombre_apellido: solicitud.nombre_apellido,
                is_rechazada: isRechazada,
                solicitar_email: solicitud.solicitar_email,
                solicitar_firma_email: solicitud.solicitar_firma_email,
              },
              dedupe_key: `rh_solicitud:${id}:${isRechazada ? "rechazada" : "completada"}:${Date.now()}`,
              priority: 2,
            });

          if (insertError) {
            console.error("[updateRhSolicitudStatus] Notify insert error:", insertError);
          } else {
            console.log(`[updateRhSolicitudStatus] Notified solicitante for solicitud ${id} (${estado})`);
          }
        }
      } catch (notifErr) {
        console.error(
          "[updateRhSolicitudStatus] Notification error:",
          notifErr,
        );
      }
    }

    revalidatePath("/ted/rh-solicitudes");
    return { success: true };
  } catch (err) {
    console.error("[updateRhSolicitudStatus] Unexpected error:", err);
    return { success: false, error: "Error inesperado" };
  }
}
