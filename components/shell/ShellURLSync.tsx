"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apps } from "@/config/apps";

const ADMIN_FACTURACION_PREFIX = "/requisiciones/facturacion";

/** Remapea rutas de facturación de Negocios al embed de Administración. */
function rewrite_admin_facturacion_href(href: string): string {
  if (href.startsWith("/negocios/facturacion")) {
    return href.replace("/negocios/facturacion", ADMIN_FACTURACION_PREFIX);
  }
  if (href.startsWith("/facturacion")) {
    return `/requisiciones${href}`;
  }
  return href;
}

export function ShellURLSync() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SHELL_NAVIGATE") {
        let href = String(event.data.href ?? "");
        if (
          window.location.pathname.startsWith(ADMIN_FACTURACION_PREFIX) &&
          (href.startsWith("/negocios/facturacion") ||
            href.startsWith("/facturacion"))
        ) {
          href = rewrite_admin_facturacion_href(href);
        }
        if (href.startsWith("/") && window.location.pathname !== href) {
          router.push(href);
        }
        return;
      }

      if (event.data?.type === "IFRAME_NAVIGATION") {
        const { path, appId } = event.data;
        const on_admin_facturacion =
          window.location.pathname.startsWith(ADMIN_FACTURACION_PREFIX);
        const path_str = String(path ?? "");

        // Embed Admin → Negocios/facturacion: no saltar a la app Negocios.
        if (
          on_admin_facturacion &&
          (appId === "negocios" || path_str.startsWith("/facturacion"))
        ) {
          const fact_path = path_str.startsWith("/facturacion")
            ? path_str
            : path_str.startsWith("/")
              ? `/facturacion${path_str}`
              : `/facturacion/${path_str}`;
          const newBrowserPath = `/requisiciones${fact_path}`;
          if (window.location.pathname !== newBrowserPath) {
            window.history.replaceState(null, "", newBrowserPath);
            window.dispatchEvent(new CustomEvent("shell-url-change"));
          }
          return;
        }

        const app = apps.find((a) => a.id === appId);

        if (app) {
          // Construct the new browser URL
          // If the app is hosted at /capacitacion and internal path is /dashboard/x
          // We want the browser to show /capacitacion/dashboard/x
          const newBrowserPath = `${app.basePath}${path}`;

          if (window.location.pathname !== newBrowserPath) {
            // Update the URL without reloading or triggering a full Next.js navigation
            // this allows the breadcrumb component to react to the pathname change
            window.history.replaceState(null, "", newBrowserPath);

            // We also need to trigger a custom event or just use router.push with shallow if it were supported
            // but in App Router we can just use replaceState and the usePathname hook in breadcrumbs
            // *should* pick it up if it's a client component.

            // Dispatch a custom event so breadcrumb/sidebar hooks can detect the change
            // without confusing the Next.js App Router's internal state
            window.dispatchEvent(new CustomEvent("shell-url-change"));
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [pathname, router]);

  return null;
}
