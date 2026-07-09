"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function notifyAdminsOfNewRequisicion(
  requisicionId: number,
  solicitanteName: string,
) {
  try {
    const supabase = await createAdminClient();

    const { data: depto, error: deptError } = await supabase
      .from("departamentos")
      .select("id, nombre")
      .ilike("nombre", "%admin%")
      .single();

    if (deptError || !depto) {
      console.error(
        "[notifyAdminsOfNewRequisicion] Could not find Administracion department:",
        deptError,
      );
      return;
    }

    const { data: adminUsers, error: usersError } = await supabase
      .from("usuarios")
      .select("id_auth")
      .eq("departamento", depto.id)
      .not("id_auth", "is", null)
      .eq("esta_activo", true);

    if (usersError || !adminUsers || adminUsers.length === 0) {
      console.warn(
        "[notifyAdminsOfNewRequisicion] No active admin users found:",
        usersError,
      );
      return;
    }

    const rows = adminUsers
      .filter((u: { id_auth: string | null }) => u.id_auth)
      .map((u: { id_auth: string }) => ({
        app_slug: "administracion",
        event_key: "requisicion_created",
        recipient_id_auth: u.id_auth,
        title: "Nueva Requisición Creada",
        body: `${solicitanteName} ha creado una nueva requisición (#${requisicionId}).`,
        link_path: `/requisiciones/edit/${requisicionId}`,
        dedupe_key: `requisicion:${requisicionId}:created`,
        priority: 2,
      }));

    if (rows.length === 0) return;

    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert(rows);

    if (insertError) {
      console.error(
        "[notifyAdminsOfNewRequisicion] Error inserting notifications:",
        insertError,
      );
    }
  } catch (err) {
    console.error("[notifyAdminsOfNewRequisicion] Unexpected error:", err);
  }
}

export async function notifyCreatorOfProcesada(
  requisicionId: number,
  creatorAuthId: string,
) {
  try {
    const supabase = await createAdminClient();

    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert({
          app_slug: "administracion",
          event_key: "requisicion_procesada",
          recipient_id_auth: creatorAuthId,
          title: "Requisición Procesada",
          body: `Tu requisición #${requisicionId} ha sido procesada por Administración.`,
          link_path: `/requisiciones/edit/${requisicionId}`,
          dedupe_key: `requisicion:${requisicionId}:procesada`,
          priority: 2,
        });

    if (insertError) {
      console.error(
        "[notifyCreatorOfProcesada] Error inserting notification:",
        insertError,
      );
    }
    } catch (err) {
    console.error("[notifyCreatorOfProcesada] Unexpected error:", err);
  }
}

export async function notifyCreatorOfRechazada(
  requisicionId: number,
  creatorAuthId: string,
) {
  try {
    const supabase = await createAdminClient();

    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert({
          app_slug: "administracion",
          event_key: "requisicion_rechazada",
          recipient_id_auth: creatorAuthId,
          title: "Requisición Rechazada",
          body: `Tu requisición #${requisicionId} ha sido rechazada por Administración.`,
          link_path: `/requisiciones/view/${requisicionId}`,
          dedupe_key: `requisicion:${requisicionId}:rechazada`,
          priority: 2,
        });

    if (insertError) {
      console.error(
        "[notifyCreatorOfRechazada] Error inserting notification:",
        insertError,
      );
    }
  } catch (err) {
    console.error("[notifyCreatorOfRechazada] Unexpected error:", err);
  }
}
