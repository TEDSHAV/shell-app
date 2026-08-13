import type { SupabaseClient } from "@supabase/supabase-js";

export type NotifyRecipientContext = {
  recipient_auth_ids?: string[];
  creador_auth?: string;
  assignee_auth?: string;
  owner_auth?: string;
  solicitante_auth?: string;
  suplente_auth?: string;
  ejecutivo_nombre?: string | null;
  ejecutivo_usuario_id?: number | null;
  departamento_nombre?: string | null;
};

export async function resolveNotifyRecipients(
  supabase: SupabaseClient,
  appSlug: string,
  eventKey: string,
  context: NotifyRecipientContext = {},
): Promise<string[]> {
  const { data, error } = await supabase.rpc("resolve_notify_recipients", {
    p_app_slug: appSlug,
    p_event_key: eventKey,
    p_context: context,
  });

  if (error) {
    console.error(
      `[resolveNotifyRecipients] ${appSlug}/${eventKey}:`,
      error,
    );
    return [];
  }

  return Array.isArray(data) ? (data as string[]) : [];
}

export async function fanOutNotifyByConfig(
  supabase: SupabaseClient,
  params: {
    appSlug: string;
    eventKey: string;
    title: string;
    body: string;
    linkPath?: string | null;
    metadata?: Record<string, unknown>;
    dedupeKey?: string | null;
    priority?: number | null;
    context?: NotifyRecipientContext;
  },
): Promise<number> {
  const { data, error } = await supabase.rpc("fan_out_notify_by_config", {
    p_app_slug: params.appSlug,
    p_event_key: params.eventKey,
    p_title: params.title,
    p_body: params.body,
    p_link_path: params.linkPath ?? null,
    p_metadata: params.metadata ?? {},
    p_dedupe_key: params.dedupeKey ?? null,
    p_priority: params.priority ?? null,
    p_context: params.context ?? {},
  });

  if (error) {
    console.error(
      `[fanOutNotifyByConfig] ${params.appSlug}/${params.eventKey}:`,
      error,
    );
    return 0;
  }

  return typeof data === "number" ? data : 0;
}
