"use server";

import { createAdminClient } from "@/lib/supabase/server";

const APP_SLUG = "scapacitacion";
const EVENT_KEY = "diseno_servicio_finalizado";

// Notify the original solicitante that their diseno-servicio solicitud has been
// finalized (status -> Completado). Non-throwing: a notify-schema issue
// must not roll back the finalize flow.
//
// NOTE: The event_type (scapacitacion, diseno_servicio_finalizado) must exist
// in notify.event_types. In local dev, run supabase/local-dev-fix-notify-fanout.sql
// to create it (the service role lacks sequence permissions to upsert at runtime).
export async function notifySolicitanteOfFinalizacion(solicitudId: number) {
  try {
    const supabase = await createAdminClient();

    // 1. Fetch the solicitud's solicitante id + nombre_sugerido
    const { data: solicitud, error: solError } = await supabase
      .from("solicitudes_diseno_servicio")
      .select("id_solicitante, nombre_sugerido")
      .eq("id", solicitudId)
      .maybeSingle();

    if (solError || !solicitud) {
      console.error(
        "[notifySolicitanteOfFinalizacion] Could not fetch solicitud:",
        solError,
      );
      return;
    }

    const solicitanteId = solicitud.id_solicitante;
    if (!solicitanteId) {
      console.warn(
        "[notifySolicitanteOfFinalizacion] Solicitud has no id_solicitante:",
        solicitudId,
      );
      return;
    }

    // 2. Resolve the solicitante's auth id
    const { data: solicitante, error: userError } = await supabase
      .from("usuarios")
      .select("id_auth")
      .eq("id", solicitanteId)
      .maybeSingle();

    if (userError || !solicitante?.id_auth) {
      console.warn(
        "[notifySolicitanteOfFinalizacion] Could not resolve solicitante auth id:",
        userError,
      );
      return;
    }

    const nombreSugerido = solicitud.nombre_sugerido || `#${solicitudId}`;

    // 3. Insert the inbox notification
    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert({
        app_slug: APP_SLUG,
        event_key: EVENT_KEY,
        recipient_id_auth: solicitante.id_auth,
        title: "Solicitud de Diseño Finalizada",
        body: `Tu solicitud de diseño "${nombreSugerido}" ha sido finalizada. Ya puedes consultar los detalles.`,
        link_path: `/nuevo-servicio/${solicitudId}`,
        dedupe_key: `diseno_servicio:${solicitudId}:finalizada:${Date.now()}`,
        priority: 2,
      });

    if (insertError) {
      console.error(
        "[notifySolicitanteOfFinalizacion] Error inserting notification:",
        JSON.stringify(insertError, null, 2),
      );
    }
  } catch (err) {
    console.error("[notifySolicitanteOfFinalizacion] Unexpected error:", err);
  }
}
