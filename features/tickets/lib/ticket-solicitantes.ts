import type { createAdminClient } from "@/lib/supabase/server";

type Admin = Awaited<ReturnType<typeof createAdminClient>>;

export async function load_ticket_solicitante_ids(
  supabase: Admin,
  ticket_id: number,
  fallback?: number | null,
): Promise<number[]> {
  const { data } = await supabase
    .from("ted_plan_ticket_solicitantes" as never)
    .select("usuario_id")
    .eq("ticket_id", ticket_id);
  const ids = [
    ...new Set(
      ((data ?? []) as Array<{ usuario_id: number }>).map((row) => row.usuario_id),
    ),
  ];
  if (ids.length > 0) return ids;
  return fallback && fallback > 0 ? [fallback] : [];
}

export async function save_ticket_solicitantes(
  supabase: Admin,
  ticket_id: number,
  usuario_ids: number[],
): Promise<void> {
  const unique = [...new Set(usuario_ids.filter((id) => id > 0))];
  await supabase
    .from("ted_plan_ticket_solicitantes" as never)
    .delete()
    .eq("ticket_id", ticket_id);
  if (unique.length === 0) return;
  await supabase.from("ted_plan_ticket_solicitantes" as never).insert(
    unique.map((usuario_id) => ({ ticket_id, usuario_id })) as never,
  );
}

export async function notify_users_ticket(
  supabase: Admin,
  input: {
    ticket_id: number;
    usuario_ids: number[];
    event_key: string;
    title: string;
    body: string;
    link_path: string;
    estado?: string;
  },
): Promise<void> {
  const ids = [...new Set(input.usuario_ids.filter((id) => id > 0))];
  if (ids.length === 0) return;
  const { data: users } = await supabase
    .from("usuarios")
    .select("id, id_auth")
    .in("id", ids);
  const rows = ((users ?? []) as Array<{ id: number; id_auth?: string | null }>)
    .map((user) => user.id_auth)
    .filter((auth): auth is string => Boolean(auth));
  if (rows.length === 0) return;
  const { error } = await supabase.schema("notify").from("inbox").insert(
    rows.map((recipient_id_auth) => ({
      app_slug: "ted",
      event_key: input.event_key,
      recipient_id_auth,
      title: input.title,
      body: input.body,
      link_path: input.link_path,
      metadata: { ticket_id: input.ticket_id, estado: input.estado ?? null },
      dedupe_key: `ticket:${input.ticket_id}:${input.event_key}:${recipient_id_auth}:${Date.now()}`,
      priority: 2,
    })),
  );
  if (error) {
    console.error("[tickets] notify users:", error);
  }
}
