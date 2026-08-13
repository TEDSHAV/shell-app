import { get_trigger_kind_meta } from "@/lib/notification-trigger-meta";

export function trigger_kind_label(kind: string | null): string {
  return get_trigger_kind_meta(kind).label;
}
