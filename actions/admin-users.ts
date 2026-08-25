"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isTedMember } from "@/actions/ted";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export interface CreateUserResult {
  success?: boolean;
  error?: string;
  userId?: string;
}

export interface AppRoleOption {
  app_id: number;
  app_slug: string;
  app_nombre: string;
  role_id: number;
  role_slug: string;
  role_nombre: string;
}

/**
 * Fetches all apps and their roles from the `authprisma` schema.
 *
 * Returns a flat list of `{ app_id, app_slug, app_nombre, role_id, role_slug,
 * role_nombre }` rows, sorted by app name then role name. Used by the TED
 * user-creation form to populate the app + role dropdowns.
 */
export async function getAllAppRoles(): Promise<AppRoleOption[]> {
  try {
    // Use the regular cookie-based client, not the admin client. The service
    // role key lacks USAGE permission on the authprisma schema, but the
    // authenticated client has access via RLS policies (same pattern as
    // actions/apps.ts → getAppRoles / getUserRolesByApp).
    const supabase = await createClient();

    const { data: apps, error: appsError } = await supabase
      .schema("authprisma")
      .from("apps")
      .select("id, slug, nombre")
      .order("nombre", { ascending: true });
    if (appsError) {
      console.error("[getAllAppRoles] apps query error:", appsError);
      return [];
    }
    if (!apps) return [];

    const { data: roles, error: rolesError } = await supabase
      .schema("authprisma")
      .from("roles")
      .select("id, slug, nombre, app_id")
      .order("nombre", { ascending: true });
    if (rolesError) {
      console.error("[getAllAppRoles] roles query error:", rolesError);
      return [];
    }
    if (!roles) return [];

    const appMap = new Map(
      (apps as Array<{ id: bigint; slug: string; nombre: string | null }>).map(
        (a) => [Number(a.id), a],
      ),
    );

    return (roles as Array<{
      id: bigint;
      slug: string;
      nombre: string | null;
      app_id: bigint;
    }>)
      .map((r) => {
        const app = appMap.get(Number(r.app_id));
        if (!app) return null;
        return {
          app_id: Number(r.app_id),
          app_slug: app.slug,
          app_nombre: app.nombre ?? app.slug,
          role_id: Number(r.id),
          role_slug: r.slug,
          role_nombre: r.nombre ?? r.slug,
        };
      })
      .filter((x): x is AppRoleOption => x !== null);
  } catch (err) {
    console.error("[getAllAppRoles] Unexpected error:", err);
    return [];
  }
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
    app_role?: { app_id: number; role_id: number };
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
    const { data: newUsuario, error: usuarioError } = await admin
      .from("usuarios")
      .insert({
        id_auth: authUserId,
        email_corporativo: email,
        nombre_apellido,
        departamento: input.departamento ?? null,
        esta_activo: true,
      })
      .select("id")
      .single();

    if (usuarioError || !newUsuario) {
      // Best-effort cleanup: remove the auth user if the usuarios insert failed,
      // so we don't leave an orphaned auth account.
      console.error(
        "[createUser] Error inserting usuarios row, rolling back auth user:",
        usuarioError,
      );
      await admin.auth.admin.deleteUser(authUserId);
      return {
        error: `Error al crear el registro de usuario: ${usuarioError?.message ?? "unknown"}`,
      };
    }

    // --- Insert app role (optional) ---
    // Links the new user to an app + role in authprisma.user_app_roles so the
    // shell sidebar shows the corresponding app links. A user can only have one
    // role per app (unique(usuario_id, app_id) constraint).
    //
    // Uses the regular cookie-based client (not admin) because the service role
    // key lacks USAGE permission on the authprisma schema. The caller is an
    // authenticated TED member, so RLS policies allow the insert.
    if (input.app_role) {
      const supabase = await createClient();
      const { error: roleError } = await supabase
        .schema("authprisma")
        .from("user_app_roles")
        .insert({
          usuario_id: newUsuario.id,
          app_id: input.app_role.app_id,
          role_id: input.app_role.role_id,
        });
      if (roleError) {
        // Don't roll back — the user is already created and can log in.
        // The role can be fixed manually in the authprisma tables.
        console.warn(
          "[createUser] Error inserting user_app_roles (user was created):",
          roleError,
        );
      }
    }

    return { success: true, userId: authUserId };
  } catch (err) {
    console.error("[createUser] Unexpected error:", err);
    return { error: "Error inesperado al crear el usuario." };
  }
}

export interface AdminUserRow {
  id: number;
  nombre_apellido: string;
  email_corporativo: string | null;
  esta_activo: boolean | null;
  id_auth: string | null;
}

/**
 * Returns all users from the `usuarios` table for the TED admin toggle UI.
 * Restricted to TED members (programmers).
 */
export async function getAllUsersAdmin(): Promise<{
  data?: AdminUserRow[];
  error?: string;
}> {
  try {
    const allowed = await isTedMember();
    if (!allowed) {
      return { error: "No tienes permisos para realizar esta acción." };
    }

    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("usuarios")
      .select("id, nombre_apellido, email_corporativo, esta_activo, id_auth")
      .order("nombre_apellido", { ascending: true });

    if (error) {
      console.error("[getAllUsersAdmin] query error:", error);
      return { error: error.message };
    }

    return { data: (data as AdminUserRow[]) || [] };
  } catch (err) {
    console.error("[getAllUsersAdmin] Unexpected error:", err);
    return { error: "Error inesperado al listar usuarios." };
  }
}

/**
 * Toggles a user's `esta_activo` flag and syncs the Supabase Auth ban status.
 *
 * When deactivating (`isActive = false`):
 *   - Sets `usuarios.esta_activo = false`
 *   - Bans the auth user via `ban_duration` (100-year duration) so their JWT
 *     is invalidated at the next refresh and they can't log in again.
 *
 * When reactivating (`isActive = true`):
 *   - Sets `usuarios.esta_activo = true`
 *   - Lifts the Supabase Auth ban (`ban_duration = 'none'`).
 *
 * Restricted to TED members. If `id_auth` is null (legacy row), only the DB
 * flag is flipped — the Supabase ban is skipped.
 */
export async function setUserActiveStatus(
  input: { usuarioId: number; isActive: boolean },
): Promise<{ success?: boolean; error?: string }> {
  try {
    const allowed = await isTedMember();
    if (!allowed) {
      return { error: "No tienes permisos para realizar esta acción." };
    }

    const admin = await createAdminClient();

    // Fetch the current row to get id_auth
    const { data: usuario, error: fetchError } = await admin
      .from("usuarios")
      .select("id_auth, esta_activo")
      .eq("id", input.usuarioId)
      .single();

    if (fetchError || !usuario) {
      console.error("[setUserActiveStatus] fetch error:", fetchError);
      return { error: "Usuario no encontrado." };
    }

    // No-op if already in the desired state
    if (usuario.esta_activo === input.isActive) {
      return { success: true };
    }

    // Flip the DB flag
    const { error: updateError } = await admin
      .from("usuarios")
      .update({ esta_activo: input.isActive })
      .eq("id", input.usuarioId);

    if (updateError) {
      console.error("[setUserActiveStatus] update error:", updateError);
      return { error: updateError.message };
    }

    // Sync Supabase Auth ban (skip if no id_auth — legacy row)
    if (usuario.id_auth) {
      const banValue = input.isActive ? "none" : "876000h";

      const { error: banError } = await admin.auth.admin.updateUserById(
        usuario.id_auth,
        { ban_duration: banValue },
      );

      if (banError) {
        // Don't fail the whole operation — the DB flag is already flipped,
        // which is the primary enforcement mechanism (shell layout check).
        console.warn(
          "[setUserActiveStatus] Supabase ban sync failed (DB flag was updated):",
          banError,
        );
      }
    }

    return { success: true };
  } catch (err) {
    console.error("[setUserActiveStatus] Unexpected error:", err);
    return { error: "Error inesperado al actualizar el estado del usuario." };
  }
}
