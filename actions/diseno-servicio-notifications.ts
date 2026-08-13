"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { fanOutNotifyByConfig } from "@/lib/notification-recipient/runtime-resolve";

const APP_SLUG = "scapacitacion";
const EVENT_KEY = "diseno_servicio_finalizado";

export async function notifySolicitanteOfFinalizacion(solicitudId: number) {
  try {
    const supabase = await createAdminClient();

    const { data: solicitud, error: solError } = await supabase
      .from("solicitudes_diseno_servicio")
      .select("id_solicitante, nombre_sugerido")
      .eq("id", solicitudId)
      .maybeSingle();

    if (solError || !solicitud?.id_solicitante) {
      console.error(
        "[notifySolicitanteOfFinalizacion] Could not fetch solicitud:",
        solError,
      );
      return;
    }

    const { data: solicitante, error: userError } = await supabase
      .from("usuarios")
      .select("id_auth")
      .eq("id", solicitud.id_solicitante)
      .maybeSingle();

    if (userError || !solicitante?.id_auth) {
      console.warn(
        "[notifySolicitanteOfFinalizacion] Could not resolve solicitante auth id:",
        userError,
      );
      return;
    }

    const nombreSugerido = solicitud.nombre_sugerido || `#${solicitudId}`;

    await fanOutNotifyByConfig(supabase, {
      appSlug: APP_SLUG,
      eventKey: EVENT_KEY,
      title: "Solicitud de Diseño Finalizada",
      body: `Tu solicitud de diseño "${nombreSugerido}" ha sido finalizada. Ya puedes consultar los detalles.`,
      linkPath: `/nuevo-servicio/${solicitudId}`,
      dedupeKey: `diseno_servicio:${solicitudId}:finalizada:${Date.now()}`,
      priority: 2,
      context: { solicitante_auth: solicitante.id_auth },
    });
  } catch (err) {
    console.error("[notifySolicitanteOfFinalizacion] Unexpected error:", err);
  }
}
