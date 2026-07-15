"use server";

import { createAdminClient } from "@/lib/supabase/server";

const SPECIFIC_RECIPIENT_IDS = [
  "40850123-47ad-4bd8-b25a-614db421f3d3",
  "2aae79c5-4319-47cc-b8be-4aaf7f855f9d",
];

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

    // 1. Ensure event_type exists
    const { data: existingEventType } = await supabase
      .schema("notify")
      .from("event_types")
      .select("id")
      .eq("app_slug", APP_SLUG)
      .eq("event_key", EVENT_KEY)
      .maybeSingle();

    if (!existingEventType) {
      const { error: eventTypeError } = await supabase
        .schema("notify")
        .from("event_types")
        .insert({
          app_slug: APP_SLUG,
          event_key: EVENT_KEY,
          default_priority: 2,
          channel_mask: ["inbox"] as unknown as import("@/types/supabase").Json,
        });

      if (eventTypeError) {
        console.error(
          "[notifySessionStatusChange] Error creating event_type:",
          eventTypeError,
        );
        return;
      }
    }

    // 2. Look up ejecutivo_negocios from v_osi_formato_completo
    const { data: osiData } = await supabase
      .from("v_osi_formato_completo")
      .select("ejecutivo_negocios")
      .eq("id_osi", osiId)
      .maybeSingle();

    const ejecutivoName = osiData?.ejecutivo_negocios ?? null;

    // 3. Match ejecutivo name to usuarios.nombre_apellido → get id_auth
    let ejecutivoAuthId: string | null = null;
    if (ejecutivoName) {
      const { data: ejecutivoUser } = await supabase
        .from("usuarios")
        .select("id_auth")
        .ilike("nombre_apellido", ejecutivoName)
        .not("id_auth", "is", null)
        .eq("esta_activo", true)
        .maybeSingle();
      ejecutivoAuthId = ejecutivoUser?.id_auth ?? null;
    }

    // 4. Look up all active users in Administracion + Capacitacion departments
    const { data: deptos } = await supabase
      .from("departamentos")
      .select("id, nombre")
      .or("nombre.ilike.%admin%,nombre.ilike.%capacitacion%");

    const deptIds = (deptos || []).map((d: { id: number }) => d.id);

    let deptUserAuthIds: string[] = [];
    if (deptIds.length > 0) {
      const { data: deptUsers } = await supabase
        .from("usuarios")
        .select("id_auth")
        .in("departamento", deptIds)
        .not("id_auth", "is", null)
        .eq("esta_activo", true);
      deptUserAuthIds = (deptUsers || [])
        .map((u: { id_auth: string | null }) => u.id_auth)
        .filter((id: string | null): id is string => id !== null);
    }

    // 5. Combine all recipient id_auth values (dedupe)
    const recipientIds = new Set<string>([
      ...SPECIFIC_RECIPIENT_IDS,
      ...deptUserAuthIds,
    ]);
    if (ejecutivoAuthId) recipientIds.add(ejecutivoAuthId);

    if (recipientIds.size === 0) {
      console.warn("[notifySessionStatusChange] No recipients found");
      return;
    }

    // 6. Insert one row per recipient into notify.inbox
    const title = "Estado de Sesión Actualizado";
    const body =
      prevStatusName !== null
        ? `La sesión #${sessionNumber} de la OSI ${nroOsi} ha cambiado de "${prevStatusName}" a "${newStatusName}".`
        : `La sesión #${sessionNumber} de la OSI ${nroOsi} ahora tiene el estado "${newStatusName}".`;
    const linkPath = `/consulta-osi/preview/${osiId}`;
    const dedupeKey = `session:${osiId}:${sessionNumber}:status:${Date.now()}`;

    const rows = Array.from(recipientIds).map((recipientIdAuth) => ({
      app_slug: APP_SLUG,
      event_key: EVENT_KEY,
      recipient_id_auth: recipientIdAuth,
      title,
      body,
      link_path: linkPath,
      dedupe_key: dedupeKey,
      priority: 2,
    }));

    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert(rows);

    if (insertError) {
      console.error(
        "[notifySessionStatusChange] Error inserting notifications:",
        insertError,
      );
    }
  } catch (err) {
    console.error("[notifySessionStatusChange] Unexpected error:", err);
  }
}
