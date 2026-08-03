"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { isTedMember } from "@/actions/ted";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export interface CreateUserResult {
  success?: boolean;
  error?: string;
  userId?: string;
}

/**
 * Creates a new Supabase auth user and a matching row in `usuarios`.
 *
 * Restricted to members of the TED department (programmers). The caller's
 * membership is re-checked server-side (defense-in-depth).
 *
 * - Email is auto-confirmed (email_confirm: true) so the user can log in
 *   immediately with the admin-provided password.
 * - A `usuarios` row is inserted linking `id_auth` to the new auth user id.
 */
export async function createUser(
  input: {
    email: string;
    password: string;
    nombre_apellido: string;
    departamento: number | null;
  },
): Promise<CreateUserResult> {
  try {
    // --- Authorization: TED members only ---
    const allowed = await isTedMember();
    if (!allowed) {
      return { error: "No tienes permisos para realizar esta acción." };
    }

    // --- Input validation ---
    const email = (input.email || "").trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email)) {
      return { error: "Correo electrónico inválido." };
    }
    if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
      return {
        error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      };
    }
    const nombre_apellido = (input.nombre_apellido || "").trim();
    if (!nombre_apellido) {
      return { error: "El nombre y apellido son requeridos." };
    }

    const admin = await createAdminClient();

    // --- Check for existing auth user with this email ---
    const { data: existingList, error: listError } =
      await admin.auth.admin.listUsers();
    if (listError) {
      console.error("[createUser] Error listing users:", listError);
      return { error: "Error al verificar usuarios existentes." };
    }
    const exists = (existingList?.users ?? []).some(
      (u) => (u.email || "").toLowerCase() === email,
    );
    if (exists) {
      return { error: "Ya existe un usuario con ese correo electrónico." };
    }

    // --- Create auth user (auto-confirmed) ---
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      console.error("[createUser] Error creating auth user:", authError);
      return { error: authError?.message || "Error al crear el usuario." };
    }

    const authUserId = authData.user.id;

    // --- Insert usuarios row ---
    const { error: usuarioError } = await admin
      .from("usuarios")
      .insert({
        id_auth: authUserId,
        email_corporativo: email,
        nombre_apellido,
        departamento: input.departamento ?? null,
        esta_activo: true,
      });

    if (usuarioError) {
      // Best-effort cleanup: remove the auth user if the usuarios insert failed,
      // so we don't leave an orphaned auth account.
      console.error(
        "[createUser] Error inserting usuarios row, rolling back auth user:",
        usuarioError,
      );
      await admin.auth.admin.deleteUser(authUserId);
      return {
        error: `Error al crear el registro de usuario: ${usuarioError.message}`,
      };
    }

    return { success: true, userId: authUserId };
  } catch (err) {
    console.error("[createUser] Unexpected error:", err);
    return { error: "Error inesperado al crear el usuario." };
  }
}
