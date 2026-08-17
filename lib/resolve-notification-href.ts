import { getAppByDbSlug } from "@/config/apps";
import type { InboxNotification } from "@/types/notifications";

const SCAP_APP_SLUG = "scapacitacion";

function scap_osi_preview_href(link_path: string): string | null {
  const match = link_path.match(
    /\/(?:ingenieria|scapacitacion)\/osi\/preview\/(\d+)/,
  );
  if (!match) {
    return null;
  }
  return `/negocios/scapacitacion/osi/preview/${match[1]}`;
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
    const scap_href = scap_osi_preview_href(notification.link_path);
    if (scap_href) {
      return scap_href;
    }
  }

  const app = getAppByDbSlug(notification.app_slug);
  let target = notification.link_path;

  if (app && !target.startsWith(app.basePath)) {
    target = `${app.basePath}${target}`;
  }

  if (target.includes("/capacitacion/scapacitacion")) {
    target = target.replace(
      "/capacitacion/scapacitacion",
      "/negocios/scapacitacion",
    );
  }

  if (target.includes("/capacitacion/ingenieria/osi/preview/")) {
    target = target.replace(
      "/capacitacion/ingenieria/osi/preview/",
      "/negocios/scapacitacion/osi/preview/",
    );
  }

  return target;
}
