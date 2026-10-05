import type { createAdminClient } from "@/lib/supabase/server";
import { TED_APP_SLUG, TED_ROLE_GERENCIA } from "@/lib/ted-slugs";
import { PLAN_GERENCIA_USER_IDS } from "./plan-access";
import type { PlanUsuarioOption } from "./types";

type Admin = Awaited<ReturnType<typeof createAdminClient>>;

async function gerencia_usuario_ids(supabase: Admin): Promise<number[]> {
  const auth = supabase.schema("authprisma");
  const { data: app } = await auth
    .from("apps")
    .select("id")
    .eq("slug", TED_APP_SLUG)
    .maybeSingle();
  const app_id = Number((app as { id?: number } | null)?.id ?? 0);
  if (!app_id) return [...PLAN_GERENCIA_USER_IDS];

  const { data: roles } = await auth
    .from("roles")
    .select("id")
    .eq("app_id", app_id)
    .eq("slug", TED_ROLE_GERENCIA);
  const role_ids = ((roles ?? []) as Array<{ id: number }>).map((row) => row.id);
  if (role_ids.length === 0) return [...PLAN_GERENCIA_USER_IDS];

  const { data: assigned } = await auth
    .from("user_app_roles")
    .select("usuario_id")
    .eq("app_id", app_id)
    .in("role_id", role_ids);
  const ids = [
    ...new Set(
      ((assigned ?? []) as Array<{ usuario_id: number }>).map(
        (row) => row.usuario_id,
      ),
    ),
  ];
  return ids.length > 0 ? ids : [...PLAN_GERENCIA_USER_IDS];
}

export async function list_objetivo_solicitantes(
  supabase: Admin,
  extra_ids: number[] = [],
): Promise<PlanUsuarioOption[]> {
  const ids = [
    ...new Set([...await gerencia_usuario_ids(supabase), ...extra_ids.filter((id) => id > 0)]),
  ];
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre_apellido, esta_activo")
    .in("id", ids)
    .order("nombre_apellido");
  if (error) {
    console.error("[planificacion] solicitantes gerencia:", error);
    return [];
  }
  return ((data ?? []) as Array<{
    id: number;
    nombre_apellido: string;
    esta_activo: boolean | null;
  }>)
    .filter((user) => user.esta_activo !== false || extra_ids.includes(user.id))
    .map((user) => ({
      id: user.id,
      label: user.nombre_apellido || `Usuario ${user.id}`,
    }));
}
