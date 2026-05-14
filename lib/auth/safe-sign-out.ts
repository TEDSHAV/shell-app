import type { SupabaseClient } from "@supabase/supabase-js";

function is_benign_sign_out_error(error: unknown): boolean {
  if (error == null) {
    return true;
  }
  const msg =
    error instanceof Error
      ? `${error.name}: ${error.message}`.toLowerCase()
      : String(error).toLowerCase();
  if (msg.includes("session_not_found") || msg.includes("session not found")) {
    return true;
  }
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
      ? (error as { status: number }).status
      : null;
  if (status === 403 || status === 401 || status === 404) {
    return true;
  }
  return false;
}

/**
 * Skip POST /logout when there is no session; ignore benign server errors.
 */
export async function sign_out_best_effort(
  supabase: SupabaseClient,
): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error && !is_benign_sign_out_error(error)) {
      console.warn("sign_out_best_effort: unexpected signOut error", error);
    }
  } catch (error) {
    if (!is_benign_sign_out_error(error)) {
      console.warn("sign_out_best_effort: getSession/signOut failed", error);
    }
  }
}
