"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { isTedMember } from "@/actions/ted";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Resets a user's Supabase auth password via the Auth Admin API.
 *
 * Restricted to members of the TED department (programmers) only. The caller's
 * membership is re-checked server-side (defense-in-depth) — the UI hides the
 * card for non-TED users, but this action must not trust that.
 *
 * Replaces the unsafe approach of mutating `auth.users` directly via SQL.
 */
export async function resetUserPassword(
  email: string,
  newPassword: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    // --- Authorization: TED members only ---
    const allowed = await isTedMember();
    if (!allowed) {
      return { error: "No tienes permisos para realizar esta acción." };
    }

    // --- Input validation ---
    const trimmedEmail = (email || "").trim().toLowerCase();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      return { error: "Correo electrónico inválido." };
    }
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      return {
        error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      };
    }

    // --- Resolve auth user id from usuarios by email_corporativo ---
    const admin = await createAdminClient();
    const { data: usuario, error: usuarioError } = await admin
      .from("usuarios")
      .select("id_auth")
      .ilike("email_corporativo", trimmedEmail)
      .limit(1)
      .maybeSingle();

    if (usuarioError) {
      console.error("[resetUserPassword] Error looking up usuario:", usuarioError);
      return { error: "Error al buscar el usuario." };
    }
    if (!usuario || !usuario.id_auth) {
      return {
        error: "Usuario no encontrado o sin cuenta de auth vinculada.",
      };
    }

    // --- Update password via Auth Admin API ---
    const { error: updateError } = await admin.auth.admin.updateUserById(
      usuario.id_auth,
      { password: newPassword },
    );

    if (updateError) {
      console.error("[resetUserPassword] Error updating password:", updateError);
      return { error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[resetUserPassword] Unexpected error:", err);
    return { error: "Error inesperado al actualizar la contraseña." };
  }
}
