"use server";

import { require_ticket_user } from "./assert-user";
import { isTedMember } from "@/actions/ted";
import type { TicketCatalog } from "../lib/types";

export async function load_ticket_catalog(): Promise<
  { ok: true; data: TicketCatalog } | { ok: false; error: string }
> {
  const gate = await require_ticket_user();
  if (!gate.ok) return gate;
  const { supabase } = gate;
  const is_ted = await isTedMember();

  const [apps_res, mods_res, links_res, parts_res, users_res] = await Promise.all([
    supabase
      .from("ted_plan_apps" as never)
      .select("id, slug, nombre")
      .is("archived_at", null)
      .order("nombre"),
    supabase
      .from("ted_plan_modulos" as never)
      .select("id, app_id, nombre")
      .is("archived_at", null)
      .order("nombre"),
    supabase.from("ted_plan_modulo_apps" as never).select("modulo_id, app_id"),
    supabase
      .from("ted_plan_modulo_participantes" as never)
      .select("modulo_id, usuario_id"),
    supabase
      .from("usuarios")
      .select("id, nombre_apellido, esta_activo")
      .eq("esta_activo", true)
      .order("nombre_apellido"),
  ]);

  if (apps_res.error) {
    return { ok: false, error: "No se pudieron cargar las apps." };
  }

  const links = (links_res.data ?? []) as Array<{
    modulo_id: number;
    app_id: number;
  }>;
  const parts = (parts_res.data ?? []) as Array<{
    modulo_id: number;
    usuario_id: number;
  }>;
  const first_part = new Map<number, number>();
  for (const row of parts) {
    if (!first_part.has(row.modulo_id)) first_part.set(row.modulo_id, row.usuario_id);
  }
  const first_app_part = new Map<number, number>();
  for (const row of parts) {
    const app_ids = links
      .filter((link) => link.modulo_id === row.modulo_id)
      .map((link) => link.app_id);
    for (const app_id of app_ids) {
      if (!first_app_part.has(app_id)) first_app_part.set(app_id, row.usuario_id);
    }
  }

  const modulos = ((mods_res.data ?? []) as Array<{
    id: number;
    app_id: number | null;
    nombre: string;
  }>).flatMap((modulo) => {
    const app_ids = [
      ...new Set([
        ...links.filter((link) => link.modulo_id === modulo.id).map((l) => l.app_id),
        ...(modulo.app_id ? [modulo.app_id] : []),
      ]),
    ];
    return app_ids.map((app_id) => ({
      id: modulo.id,
      app_id,
      nombre: modulo.nombre,
      default_asignado_id:
        first_part.get(modulo.id) ?? first_app_part.get(app_id) ?? null,
    }));
  });

  const usuarios = ((users_res.data ?? []) as Array<{
    id: number;
    nombre_apellido: string;
  }>).map((user) => ({
    id: user.id,
    label: user.nombre_apellido || `Usuario ${user.id}`,
  }));

  return {
    ok: true,
    data: {
      apps: (apps_res.data ?? []) as TicketCatalog["apps"],
      modulos,
      usuarios,
      is_ted,
    },
  };
}
