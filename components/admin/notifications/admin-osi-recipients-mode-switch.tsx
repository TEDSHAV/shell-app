"use client";

import { useState, useTransition } from "react";

import {
  setAdminOsiRecipientsMode,
  type AdminOsiRecipientsMode,
} from "@/actions/notification-admin";
import { cn } from "@/lib/utils";

type Props = {
  initial_mode: AdminOsiRecipientsMode;
};

export function AdminOsiRecipientsModeSwitch({ initial_mode }: Props) {
  const [mode, set_mode] = useState<AdminOsiRecipientsMode>(initial_mode);
  const [pending, start_transition] = useTransition();
  const [error, set_error] = useState<string | null>(null);

  function on_change(next: AdminOsiRecipientsMode) {
    set_error(null);
    start_transition(async () => {
      const result = await setAdminOsiRecipientsMode(next);
      if (!result.success) {
        set_error(result.error ?? "No se pudo cambiar el modo");
        return;
      }
      set_mode(result.mode ?? next);
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        mode === "config"
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border bg-muted/30",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            Destinatarios Admin / OSI (requisiciones + estatus OSI)
          </p>
          <p className="text-xs text-muted-foreground">
            Legacy = hardcode actual. Config = lee TED (
            <code className="text-[11px]">event_recipient_config</code>
            ). El resto de eventos Negocios ya usa config.
          </p>
        </div>
        <select
          value={mode}
          disabled={pending}
          onChange={(event) =>
            on_change(event.target.value as AdminOsiRecipientsMode)
          }
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="legacy">Legacy (seguro)</option>
          <option value="config">Config TED</option>
        </select>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
