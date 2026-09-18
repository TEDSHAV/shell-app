"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { require_ted_plan_context } from "./assert-ted";
import { load_plan_workspace } from "./list-plan";
import type { PlanApp } from "../lib/types";

export async function create_prisma_public_link(): Promise<
  | { ok: true; url: string; apps: PlanApp[]; captured_at: string }
  | { ok: false; error: string }
> {
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const loaded = await load_plan_workspace();
  if (!loaded.ok) return loaded;

  const token = randomBytes(18).toString("base64url");
  const captured_at = new Date().toISOString();
  const { error } = await gate.ctx.supabase
    .from("ted_plan_public_snapshots" as never)
    .insert({
      token,
      payload: loaded.data,
      created_by: gate.ctx.user_id,
    } as never);
  if (error) {
    console.error("[planificacion] snapshot:", error);
    return { ok: false, error: "No se pudo guardar la foto del plan." };
  }

  const header_list = await headers();
  const host =
    header_list.get("x-forwarded-host") ?? header_list.get("host") ?? "";
  const proto = header_list.get("x-forwarded-proto") ?? "https";
  if (!host) {
    return { ok: false, error: "No se pudo resolver el origen del enlace." };
  }
  return {
    ok: true,
    url: `${proto}://${host}/prisma-publico/${token}`,
    apps: loaded.data.apps,
    captured_at,
  };
}
