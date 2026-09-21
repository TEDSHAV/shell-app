"use server";

import { revalidatePath } from "next/cache";
import { require_ted_accesos, num } from "./assert-ted";
import {
  assign_role_schema,
  revoke_role_schema,
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
