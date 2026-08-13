"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { fanOutNotifyByConfig } from "@/lib/notification-recipient/runtime-resolve";
import { isAdminOsiConfigMode } from "@/lib/notification-recipient/runtime-mode";

const APP_SLUG = "capacitacion";
const EVENT_KEY = "session_status_changed";

const LEGACY_SPECIFIC_RECIPIENT_IDS = [
  "40850123-47ad-4bd8-b25a-614db421f3d3",
  "2aae79c5-4319-47cc-b8be-4aaf7f855f9d",
];

async function legacyNotifySessionStatusChange(params: {
  osiId: number;
  nroOsi: string;
  sessionNumber: number;
  newStatusName: string;
  prevStatusName: string | null;
}): Promise<void> {
  const { osiId, nroOsi, sessionNumber, newStatusName, prevStatusName } = params;
  const supabase = await createAdminClient();

  const { data: osiData } = await supabase
    .from("v_osi_lista")
    .select("ejecutivo_negocios")
    .eq("id_osi", osiId)
    .maybeSingle();

  const ejecutivoName = osiData?.ejecutivo_negocios ?? null;
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

  const recipientIds = new Set<string>([
    ...LEGACY_SPECIFIC_RECIPIENT_IDS,
    ...deptUserAuthIds,
  ]);
  if (ejecutivoAuthId) recipientIds.add(ejecutivoAuthId);

  if (recipientIds.size === 0) {
    console.warn("[notifySessionStatusChange] legacy: no recipients");
    return;
  }

  const title = "Estado de Sesión Actualizado";
  const body =
    prevStatusName !== null
      ? `La sesión #${sessionNumber} de la OSI ${nroOsi} ha cambiado de "${prevStatusName}" a "${newStatusName}".`
      : `La sesión #${sessionNumber} de la OSI ${nroOsi} ahora tiene el estado "${newStatusName}".`;

  const rows = Array.from(recipientIds).map((recipientIdAuth) => ({
    app_slug: APP_SLUG,
    event_key: EVENT_KEY,
    recipient_id_auth: recipientIdAuth,
    title,
    body,
    link_path: `/consulta-osi/preview/${osiId}`,
    dedupe_key: `session:${osiId}:${sessionNumber}:status:${Date.now()}`,
    priority: 2,
  }));

  const { error: insertError } = await supabase
    .schema("notify")
    .from("inbox")
    .insert(rows);

  if (insertError) {
    console.error("[notifySessionStatusChange] legacy insert:", insertError);
  }
}

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

    if (!(await isAdminOsiConfigMode(supabase))) {
      await legacyNotifySessionStatusChange(params);
      return;
    }

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
