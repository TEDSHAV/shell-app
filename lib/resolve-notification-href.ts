import { getAppByDbSlug } from "@/config/apps";
import type { InboxNotification } from "@/types/notifications";

const SCAP_APP_SLUG = "scapacitacion";
const SESSION_STATUS_EVENT = "session_status_changed";

const SCAP_OSI_PREVIEW_LINK_RE =
  /\/(?:ingenieria\/|scapacitacion\/)?osi\/preview\/(\d+)/;

const CONSULTA_OSI_PREVIEW_ID_RE =
  /\/(?:consulta-osi|(?:scapacitacion\/)?osi)\/(?:preview|edit)\/(\d+)/;

function extract_osi_id(link_path: string): number {
  const match = link_path.match(CONSULTA_OSI_PREVIEW_ID_RE);
  return match ? Number(match[1]) || 0 : 0;
}

function consulta_osi_preview_href(osi_id: number): string | null {
  if (osi_id <= 0) return null;
  return `/consulta-osi/preview/${osi_id}`;
}

/**
 * SCap OSI preview lives in Gestión but should open under Capacitación in Shell.
 */
function capacitacion_osi_preview_href(link_path: string): string | null {
  const match = link_path.match(SCAP_OSI_PREVIEW_LINK_RE);
  if (!match) {
    return null;
  }
  return `/capacitacion/osi/preview/${match[1]}`;
}

/**
 * Resolve Shell navigation target for a notification inbox row.
 */
export function resolve_notification_href(
  notification: InboxNotification,
): string | null {
  if (!notification.link_path) {
    return null;
  }

  if (notification.event_key === SESSION_STATUS_EVENT) {
    return (
      consulta_osi_preview_href(extract_osi_id(notification.link_path)) ??
      (notification.link_path.startsWith("/consulta-osi")
        ? notification.link_path
        : null)
    );
  }

  if (notification.link_path.startsWith("/consulta-osi")) {
    return notification.link_path;
  }

  if (notification.app_slug === SCAP_APP_SLUG) {
    const cap_href = capacitacion_osi_preview_href(notification.link_path);
    if (cap_href) {
      return cap_href;
    }
  }

  const app = getAppByDbSlug(notification.app_slug);
  let target = notification.link_path;

  if (app && !target.startsWith(app.basePath)) {
    target = `${app.basePath}${target}`;
  }

  return target;
}
