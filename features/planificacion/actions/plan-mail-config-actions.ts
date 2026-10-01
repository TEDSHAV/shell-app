"use server";

import { revalidatePath } from "next/cache";
import { require_ted_plan_context } from "./assert-ted";
import {
  add_plan_mail_recipient,
  list_plan_mail_recipients,
  PLAN_MAIL_ROLES,
  remove_plan_mail_recipient,
  type PlanMailRecipient,
  type PlanMailRol,
} from "../lib/plan-mail-recipients";

function revalidate_config() {
  revalidatePath("/ted/planificacion/objetivos");
  revalidatePath("/ted/planificacion/objetivos/configuracion");
}

export async function load_plan_mail_config(): Promise<
  { ok: true; rows: PlanMailRecipient[] } | { ok: false; error: string }
> {
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const rows = await list_plan_mail_recipients(gate.ctx.supabase);
  return { ok: true, rows };
}

export async function add_plan_mail_config(raw: {
  rol: string;
  email: string;
  nombre?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  if (!PLAN_MAIL_ROLES.includes(raw.rol as PlanMailRol)) {
    return { ok: false, error: "Rol de destinatario inválido." };
  }
  const result = await add_plan_mail_recipient(gate.ctx.supabase, {
    rol: raw.rol as PlanMailRol,
    email: raw.email,
    nombre: raw.nombre,
  });
  if (!result.ok) return result;
  revalidate_config();
  return { ok: true };
}

export async function remove_plan_mail_config(
  id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: "Destinatario inválido." };
  }
  const result = await remove_plan_mail_recipient(gate.ctx.supabase, id);
  if (!result.ok) return result;
  revalidate_config();
  return { ok: true };
}
