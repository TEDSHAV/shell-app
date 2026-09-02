export interface InboxNotification {
  id: string;
  title: string;
  body: string;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
  priority: number;
  app_slug: string;
  event_key: string;
  /** Present on Realtime payloads; optional on list selects. */
  recipient_id_auth?: string;
}
