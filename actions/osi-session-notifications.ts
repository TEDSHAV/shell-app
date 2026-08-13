"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { fanOutNotifyByConfig } from "@/lib/notification-recipient/runtime-resolve";

const APP_SLUG = "capacitacion";
const EVENT_KEY = "session_status_changed";

export async function notifySessionStatusChange(params: {
  osiId: number;
  nroOsi: string;
  sessionNumber: number;
  newStatusName: string;
  prevStatusName: string | null;
}): Promise<void> {
  const { osiId, nroOsi, sessionNumber, newStatusName, prevStatusName } = params;

  try {
    const supabase = await createAdminClient();

    const { data: osiData } = await supabase
      .from("v_osi_lista")
      .select("ejecutivo_negocios")
      .eq("id_osi", osiId)
      .maybeSingle();

    const title = "Estado de Sesión Actualizado";
    const body =
      prevStatusName !== null
        ? `La sesión #${sessionNumber} de la OSI ${nroOsi} ha cambiado de "${prevStatusName}" a "${newStatusName}".`
        : `La sesión #${sessionNumber} de la OSI ${nroOsi} ahora tiene el estado "${newStatusName}".`;

    const rows = await fanOutNotifyByConfig(supabase, {
      appSlug: APP_SLUG,
      eventKey: EVENT_KEY,
      title,
      body,
      linkPath: `/consulta-osi/preview/${osiId}`,
      dedupeKey: `session:${osiId}:${sessionNumber}:status:${Date.now()}`,
      priority: 2,
      context: {
        ejecutivo_nombre: osiData?.ejecutivo_negocios ?? null,
      },
    });

    if (rows === 0) {
      console.warn("[notifySessionStatusChange] No recipients resolved");
    }
  } catch (err) {
    console.error("[notifySessionStatusChange] Unexpected error:", err);
  }
}
