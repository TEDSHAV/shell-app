export const NOTIFY_ADMIN_BASE = "/ted/notificaciones";

export function notify_event_detail_path(app_slug: string, event_key: string): string {
  return `${NOTIFY_ADMIN_BASE}/${encodeURIComponent(app_slug)}/${encodeURIComponent(event_key)}`;
}

export function notify_user_detail_path(usuario_id: number): string {
  return `${NOTIFY_ADMIN_BASE}/usuarios/${usuario_id}`;
}
