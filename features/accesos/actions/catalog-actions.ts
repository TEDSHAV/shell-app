"use server";

import { revalidatePath } from "next/cache";
import { require_ted_accesos, num } from "./assert-ted";
import {
  app_upsert_schema,
  apply_permission_delta_schema,
  permission_create_schema,
  permission_update_schema,
  role_permission_set_schema,
  role_upsert_schema,
} from "../schemas";
import { apply_delta_to_ids } from "../lib/role-compose";
import { build_permission_slug, is_valid_permission_slug, slugify_kebab } from "../lib/slugs";

function revalidate_accesos() {
  revalidatePath("/ted/usuarios/accesos", "layout");
}

export async function upsert_acceso_app(input: unknown) {
  const parsed = app_upsert_schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || "Datos inválidos" };
  }
  const supabase = await require_ted_accesos();
  const row = {
    nombre: parsed.data.nombre,
    slug: parsed.data.slug,
    descripcion: parsed.data.descripcion || null,
  };
  const query = parsed.data.id
    ? supabase.schema("authprisma").from("apps").update(row).eq("id", parsed.data.id)
    : supabase.schema("authprisma").from("apps").insert(row);
  const { error } = await query;
  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      return { ok: false as const, error: "Ya existe una app con ese slug." };
    }
    return { ok: false as const, error: error.message };
  }
  revalidate_accesos();
  return { ok: true as const };
}

export async function upsert_acceso_role(input: unknown) {
  const parsed = role_upsert_schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || "Datos inválidos" };
  }
  const supabase = await require_ted_accesos();
  const payload = {
    app_id: parsed.data.app_id,
    nombre: parsed.data.nombre,
    slug: parsed.data.slug,
    descripcion: parsed.data.descripcion || null,
  };

  let role_id = parsed.data.id ?? 0;
  if (parsed.data.id) {
    const { error } = await supabase
      .schema("authprisma")
      .from("roles")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("app_id", parsed.data.app_id);
    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, error: "Esa app ya tiene un rol con ese slug." };
      }
      return { ok: false as const, error: error.message };
    }
  } else {
    const { data, error } = await supabase
      .schema("authprisma")
      .from("roles")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) {
      if (error?.code === "23505") {
        return { ok: false as const, error: "Esa app ya tiene un rol con ese slug." };
      }
      return { ok: false as const, error: error?.message || "No se pudo crear el rol." };
    }
    role_id = num(data.id);
  }

  const set_result = await set_role_permissions({
    role_id,
    permission_ids: parsed.data.permission_ids,
  });
  if (!set_result.ok) return set_result;
  revalidate_accesos();
  return { ok: true as const, role_id };
}

export async function set_role_permissions(input: unknown) {
  const parsed = role_permission_set_schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || "Datos inválidos" };
  }
  const supabase = await require_ted_accesos();
  const { role_id, permission_ids } = parsed.data;

  const { error: delErr } = await supabase
    .schema("authprisma")
    .from("role_permissions")
    .delete()
    .eq("role_id", role_id);
  if (delErr) return { ok: false as const, error: delErr.message };

  if (permission_ids.length > 0) {
    const { error } = await supabase
      .schema("authprisma")
      .from("role_permissions")
      .insert(permission_ids.map((permission_id) => ({ role_id, permission_id })));
    if (error) return { ok: false as const, error: error.message };
  }
  revalidate_accesos();
  return { ok: true as const };
}

export async function create_acceso_permission(input: unknown) {
  const parsed = permission_create_schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || "Datos inválidos" };
  }
  const slug = build_permission_slug(
    parsed.data.modulo,
    parsed.data.recurso || "",
    parsed.data.accion,
  );
  if (!is_valid_permission_slug(slug)) {
    return { ok: false as const, error: "El slug generado no es válido." };
  }
  const supabase = await require_ted_accesos();
  const auth = supabase.schema("authprisma");

  if (parsed.data.save_module && parsed.data.app_id) {
    const { error: modErr } = await auth.from("permission_modules").upsert(
      {
        slug: slugify_kebab(parsed.data.modulo),
        nombre: parsed.data.module_nombre || parsed.data.modulo,
        descripcion: parsed.data.module_descripcion || null,
        app_id: parsed.data.app_id,
      },
      { onConflict: "slug" },
    );
    if (modErr) return { ok: false as const, error: modErr.message };
  }

  if (parsed.data.save_action) {
    const { error: actErr } = await auth.from("permission_actions").upsert(
      {
        slug: slugify_kebab(parsed.data.accion),
        nombre: parsed.data.action_nombre || parsed.data.accion,
        descripcion: parsed.data.action_descripcion || null,
      },
      { onConflict: "slug" },
    );
    if (actErr) return { ok: false as const, error: actErr.message };
  }

  const { data, error } = await auth
    .from("permissions")
    .insert({
      slug,
      descripcion: parsed.data.descripcion || null,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false as const, error: `Ya existe el permiso ${slug}.` };
    }
    return { ok: false as const, error: error?.message || "No se pudo crear." };
  }
  revalidate_accesos();
  return { ok: true as const, slug, id: num(data.id) };
}

export async function update_acceso_permission(input: unknown) {
  const parsed = permission_update_schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || "Datos inválidos" };
  }
  const supabase = await require_ted_accesos();
  const { error } = await supabase
    .schema("authprisma")
    .from("permissions")
    .update({ descripcion: parsed.data.descripcion || null })
    .eq("id", parsed.data.id);
  if (error) return { ok: false as const, error: error.message };
  revalidate_accesos();
  return { ok: true as const };
}

export async function apply_permission_delta_to_roles(input: unknown) {
  const parsed = apply_permission_delta_schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || "Datos inválidos" };
  }
  const { role_ids, add_permission_ids, remove_permission_ids } = parsed.data;
  if (add_permission_ids.length === 0 && remove_permission_ids.length === 0) {
    return { ok: true as const };
  }

  const supabase = await require_ted_accesos();
  const auth = supabase.schema("authprisma");

  const { data: rows, error: loadErr } = await auth
    .from("role_permissions")
    .select("role_id, permission_id")
    .in("role_id", role_ids);
  if (loadErr) return { ok: false as const, error: loadErr.message };

  const by_role = new Map<number, number[]>();
  for (const id of role_ids) by_role.set(id, []);
  for (const row of rows || []) {
    const role_id = num(row.role_id);
    const list = by_role.get(role_id) || [];
    list.push(num(row.permission_id));
    by_role.set(role_id, list);
  }

  for (const role_id of role_ids) {
    const next = apply_delta_to_ids(
      by_role.get(role_id) || [],
      add_permission_ids,
      remove_permission_ids,
    );
    const result = await set_role_permissions({ role_id, permission_ids: next });
    if (!result.ok) return result;
  }

  revalidate_accesos();
  return { ok: true as const };
}

export async function delete_acceso_role(role_id: number) {
  const supabase = await require_ted_accesos();
  const { count, error: countErr } = await supabase
    .schema("authprisma")
    .from("user_app_roles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", role_id);
  if (countErr) return { ok: false as const, error: countErr.message };
  if ((count || 0) > 0) {
    return {
      ok: false as const,
      error: "Hay usuarios con este rol. Revócalo antes de eliminarlo.",
    };
  }
  const { error } = await supabase
    .schema("authprisma")
    .from("roles")
    .delete()
    .eq("id", role_id);
  if (error) return { ok: false as const, error: error.message };
  revalidate_accesos();
  return { ok: true as const };
}
