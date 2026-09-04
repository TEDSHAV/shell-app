"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";

const APP_SLUG = "srh";

type SolicitudEstado = "pendiente" | "en_proceso" | "completada" | "rechazada";

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
    const supabase = await createAdminClient();

    // Get the current user's usuario id (for procesado_por)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let procesadoPor: number | null = null;
    if (user) {
      const { data: userData } = await supabase
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

    const { error: updateError } = await supabase
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
        const { data: solicitud } = await supabase
          .from("rh_solicitudes")
          .select("solicitado_por, nombre_apellido")
          .eq("id", id)
          .maybeSingle();

        if (solicitud?.solicitado_por) {
          const { data: solicitante } = await supabase
            .from("usuarios")
            .select("id_auth")
            .eq("id", solicitud.solicitado_por)
            .maybeSingle();

          if (solicitante?.id_auth) {
            const eventKey =
              estado === "rechazada"
                ? "rh_solicitud_rechazada"
                : "rh_solicitud_completada";

            const title =
              estado === "rechazada"
                ? "Solicitud de Usuario Rechazada"
                : "Solicitud de Usuario Completada";

            const body =
              estado === "rechazada"
                ? notas?.trim()
                  ? `Tu solicitud para crear el usuario ${solicitud.nombre_apellido} ha sido rechazada por TED. Motivo: ${notas.trim()}`
                  : `Tu solicitud para crear el usuario ${solicitud.nombre_apellido} ha sido rechazada por TED.`
                : `Tu solicitud para crear el usuario ${solicitud.nombre_apellido} ha sido completada por TED. El usuario ya ha sido creado en el sistema.`;

            await supabase.schema("notify").from("inbox").insert({
              app_slug: APP_SLUG,
              event_key: eventKey,
              recipient_id_auth: solicitante.id_auth,
              title,
              body,
              link_path: `/dashboard/rh/solicitudes/${id}`,
              metadata: {
                solicitud_id: id,
                nombre_apellido: solicitud.nombre_apellido,
                is_rechazada: estado === "rechazada",
              },
              dedupe_key: `rh_solicitud:${id}:${estado === "rechazada" ? "rechazada" : "completada"}:${Date.now()}`,
              priority: 2,
            });
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
