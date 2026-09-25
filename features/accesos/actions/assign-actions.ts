"use server";

import { revalidatePath } from "next/cache";
import { require_ted_accesos, num } from "./assert-ted";
import {
  assign_role_schema,
  assign_role_to_users_schema,
  revoke_role_schema,
  sync_permission_roles_schema,
} from "../schemas";

function revalidate_accesos() {
  revalidatePath("/ted/usuarios/accesos", "layout");
  revalidatePath("/ted/usuarios");
}

export async function assign_user_app_role(input: unknown) {
  const parsed = assign_role_schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || "Datos inválidos" };
  }
  const supabase = await require_ted_accesos();
  const { usuario_id, app_id, role_id } = parsed.data;

  const { data: role, error: roleErr } = await supabase
    .schema("authprisma")
    .from("roles")
    .select("id, app_id")
    .eq("id", role_id)
    .maybeSingle();
  if (roleErr || !role) {
    return { ok: false as const, error: "El rol no existe." };
  }
  if (num(role.app_id) !== app_id) {
    return { ok: false as const, error: "Ese rol no pertenece a la aplicación." };
  }

  const { error } = await supabase
    .schema("authprisma")
    .from("user_app_roles")
    .upsert(
      { usuario_id, app_id, role_id },
      { onConflict: "usuario_id,app_id" },
    );
  if (error) return { ok: false as const, error: error.message };
  revalidate_accesos();
  return { ok: true as const };
}

export async function revoke_user_app_role(input: unknown) {
  const parsed = revoke_role_schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || "Datos inválidos" };
  }
  const supabase = await require_ted_accesos();
  const { error } = await supabase
    .schema("authprisma")
    .from("user_app_roles")
    .delete()
    .eq("usuario_id", parsed.data.usuario_id)
    .eq("app_id", parsed.data.app_id);
  if (error) return { ok: false as const, error: error.message };
  revalidate_accesos();
  return { ok: true as const };
}

export async function sync_permission_roles(input: unknown) {
  const parsed = sync_permission_roles_schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || "Datos inválidos",
    };
  }
  const supabase = await require_ted_accesos();
  const auth = supabase.schema("authprisma");
  const permission_id = parsed.data.permission_id;
  const wanted = [...new Set(parsed.data.role_ids)];

  const { data: current, error: curErr } = await auth
    .from("role_permissions")
    .select("role_id")
    .eq("permission_id", permission_id);
  if (curErr) return { ok: false as const, error: curErr.message };

  const have = new Set(
    ((current || []) as Array<{ role_id: number }>).map((r) => num(r.role_id)),
  );
  const to_add = wanted.filter((id) => !have.has(id));
  const to_drop = [...have].filter((id) => !wanted.includes(id));

  if (to_drop.length > 0) {
    const { error } = await auth
      .from("role_permissions")
      .delete()
      .eq("permission_id", permission_id)
      .in("role_id", to_drop);
    if (error) return { ok: false as const, error: error.message };
  }

  if (to_add.length > 0) {
    const { error } = await auth.from("role_permissions").insert(
      to_add.map((role_id) => ({ role_id, permission_id })),
    );
    if (error) return { ok: false as const, error: error.message };
  }

  revalidate_accesos();
  return { ok: true as const, added: to_add.length, removed: to_drop.length };
}

export async function assign_role_to_users(input: unknown) {
  const parsed = assign_role_to_users_schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || "Datos inválidos",
    };
  }
  const supabase = await require_ted_accesos();
  const { role_id, usuario_ids } = parsed.data;
  const unique_users = [...new Set(usuario_ids)];
  if (unique_users.length === 0) {
    return { ok: false as const, error: "Elige al menos una persona." };
  }

  const { data: role, error: roleErr } = await supabase
    .schema("authprisma")
    .from("roles")
    .select("id, app_id")
    .eq("id", role_id)
    .maybeSingle();
  if (roleErr || !role) {
    return { ok: false as const, error: "El rol no existe." };
  }
  const app_id = num(role.app_id);

  const { error } = await supabase
    .schema("authprisma")
    .from("user_app_roles")
    .upsert(
      unique_users.map((usuario_id) => ({ usuario_id, app_id, role_id })),
      { onConflict: "usuario_id,app_id" },
    );
  if (error) return { ok: false as const, error: error.message };
  revalidate_accesos();
  return { ok: true as const, count: unique_users.length };
}
