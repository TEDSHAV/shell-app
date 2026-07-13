"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function notifyOsiStatusChanged(input: {
  osiId: number;
  newStatusId: number;
  nroOsi: string;
  newStatusName: string;
  ejecutivoNegocios?: string | null;
}): Promise<{ rows: number }> {
  try {
    const adminClient = await createAdminClient();

    const { data, error } = await adminClient.rpc(
      "notify_shell_osi_status_changed",
      {
        p_osi_id: input.osiId,
        p_new_status_id: input.newStatusId,
        p_nro_osi: input.nroOsi,
        p_new_status_name: input.newStatusName,
        p_ejecutivo_negocios: input.ejecutivoNegocios?.trim() || null,
      },
    );

    if (error) {
      console.error(
        "[osi-notifications] RPC notify_shell_osi_status_changed failed:",
        error,
      );
      return { rows: 0 };
    }

    const rows = typeof data === "number" ? data : 0;
    if (rows === 0) {
      console.warn(
        "[osi-notifications] No recipients resolved for OSI status change",
        { osiId: input.osiId, newStatusId: input.newStatusId },
      );
    }

    return { rows };
  } catch (err) {
    console.error("[osi-notifications] Unexpected error:", err);
    return { rows: 0 };
  }
}
