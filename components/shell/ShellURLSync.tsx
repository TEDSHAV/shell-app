"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apps } from "@/config/apps";

export function ShellURLSync() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "IFRAME_NAVIGATION") {
        const { path, appId } = event.data;
        const app = apps.find(a => a.id === appId);
        
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
            window.dispatchEvent(new CustomEvent('shell-url-change'));
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [pathname, router]);

  return null;
}
