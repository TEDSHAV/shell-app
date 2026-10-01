import type { createAdminClient } from "@/lib/supabase/server";

type Admin = Awaited<ReturnType<typeof createAdminClient>>;

export const PLAN_MAIL_ROLES = ["solicitante", "ejecutante"] as const;
export type PlanMailRol = (typeof PLAN_MAIL_ROLES)[number];

export type PlanMailRecipient = {
  id: number;
  rol: PlanMailRol;
  email: string;
  nombre: string | null;
  activo: boolean;
};

function is_mail_rol(value: string): value is PlanMailRol {
  return value === "solicitante" || value === "ejecutante";
}

function normalize_email(raw: string): string {
  return raw.trim().toLowerCase();
}

export function valid_plan_mail(raw: string): string | null {
  const email = normalize_email(raw);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export async function list_plan_mail_recipients(
  supabase: Admin,
): Promise<PlanMailRecipient[]> {
  const { data, error } = await supabase
    .from("ted_plan_mail_recipients" as never)
    .select("id, rol, email, nombre, activo")
    .order("id");
  if (error) {
    console.error("[planificacion] mail recipients:", error);
    return [];
  }
  return ((data ?? []) as Array<{
    id: number;
    rol: string;
    email: string;
    nombre: string | null;
    activo: boolean;
  }>)
    .filter((row) => is_mail_rol(row.rol))
    .map((row) => ({
      id: row.id,
      rol: row.rol,
      email: row.email,
      nombre: row.nombre,
      activo: row.activo,
    }));
}

export function emails_for_rol(
  rows: PlanMailRecipient[],
  rol: PlanMailRol,
): string[] {
  return [
    ...new Set(
      rows
        .filter((row) => row.rol === rol && row.activo)
        .map((row) => normalize_email(row.email))
        .filter(Boolean),
    ),
  ];
}

export async function add_plan_mail_recipient(
  supabase: Admin,
  input: { rol: PlanMailRol; email: string; nombre?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = valid_plan_mail(input.email);
  if (!email) return { ok: false, error: "El correo no es válido." };
  const { error } = await supabase.from("ted_plan_mail_recipients" as never).insert({
    rol: input.rol,
    email,
    nombre: input.nombre?.trim() || null,
    activo: true,
  } as never);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ese correo ya está en esta lista." };
    }
    console.error("[planificacion] add mail recipient:", error);
    return { ok: false, error: "No se pudo agregar el destinatario." };
  }
  return { ok: true };
}

export async function remove_plan_mail_recipient(
  supabase: Admin,
  id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from("ted_plan_mail_recipients" as never)
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[planificacion] remove mail recipient:", error);
    return { ok: false, error: "No se pudo quitar el destinatario." };
  }
  return { ok: true };
}
