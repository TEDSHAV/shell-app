import { getAppByDbSlug } from "@/config/apps";
import type { InboxNotification } from "@/types/notifications";

const SCAP_APP_SLUG = "scapacitacion";

const SCAP_OSI_PREVIEW_LINK_RE =
  /\/(?:ingenieria\/|scapacitacion\/)?osi\/preview\/(\d+)/;

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
