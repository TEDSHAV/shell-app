"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { getAppById } from "@/config/apps";
import { build_tickets_frame_url } from "@/lib/tickets-form-url";
import { createClient } from "@/lib/supabase/client";
import { hasEnvVars } from "@/lib/utils";

/**
 * Google Form via official embed URL (embedded=true).
 * Signed-in Google users in the browser are recognized inside the iframe.
 */
export function TicketsAppFrame() {
  const app = getAppById("tickets")!;
  const [src, setSrc] = useState(() => build_tickets_frame_url());
  const [isLoading, setIsLoading] = useState(true);

  const title = useMemo(() => app.name, [app.name]);

  useEffect(() => {
    if (!hasEnvVars) {
      return;
    }

    const entry_id = process.env.NEXT_PUBLIC_TICKETS_FORM_EMAIL_ENTRY_ID?.trim();
    if (!entry_id) {
      return;
    }

    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setSrc(build_tickets_frame_url(user.email));
      }
    })();
  }, []);

  return (
    <div className="relative flex-1 min-h-0 h-full w-full overflow-hidden bg-white">
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 w-full h-full min-h-[480px] border-0"
        style={{ margin: 0 }}
        onLoad={() => setIsLoading(false)}
        allow="clipboard-read; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {isLoading && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-background"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Cargando {title}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
