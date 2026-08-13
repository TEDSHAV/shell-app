import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminOsiRecipientsMode = "legacy" | "config";

export async function getAdminOsiRecipientsMode(
  supabase: SupabaseClient,
): Promise<AdminOsiRecipientsMode> {
  const { data, error } = await supabase.rpc(
    "get_notify_admin_osi_recipients_mode",
  );

  if (error) {
    console.error("[getAdminOsiRecipientsMode]", error);
    return "legacy";
  }

  return data === "config" ? "config" : "legacy";
}

export async function isAdminOsiConfigMode(
  supabase: SupabaseClient,
): Promise<boolean> {
  return (await getAdminOsiRecipientsMode(supabase)) === "config";
}
