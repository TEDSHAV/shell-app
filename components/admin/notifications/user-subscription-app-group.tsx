"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { UserEventSubscriptionRow } from "@/lib/notification-recipient-config";
import type { NotificationCatalogGroupMeta } from "@/lib/notification-catalog-groups";
import { format_subscription_reasons } from "@/lib/notification-recipient/user-subscription-display";
import { cn } from "@/lib/utils";

type SubscriptionRowProps = {
  row: UserEventSubscriptionRow;
  checked: boolean;
  dirty: boolean;
  busy: boolean;
  brand_color: string;
  on_toggle: (enabled: boolean) => void;
};

function SubscriptionRow({
  row,
  checked,
  dirty,
  busy,
  brand_color,
  on_toggle,
}: SubscriptionRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        dirty
          ? "border-amber-300 bg-amber-50/70"
          : row.subscribed
            ? "border-primary/25 bg-primary/[0.03]"
            : "border-border/70 bg-background",
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className="font-medium"
            style={{ color: row.subscribed && !dirty ? brand_color : undefined }}
          >
            {row.title}
          </p>
          {!row.is_active ? (
            <Badge variant="outline" className="text-[10px]">
              Inactivo
            </Badge>
          ) : null}
          {row.conditional && !row.subscribed ? (
            <Badge variant="outline" className="text-[10px]">
              Solo en el evento
            </Badge>
          ) : null}
          {dirty ? (
            <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-800">
              {checked ? "Se añadirá al guardar" : "Se quitará al guardar"}
            </Badge>
          ) : null}
        </div>
        {row.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2">{row.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {format_subscription_reasons(row.condition_labels)}
        </p>
      </div>
      <label className="flex shrink-0 cursor-pointer items-center gap-2 sm:pl-4">
        <input
          type="checkbox"
          checked={checked}
          disabled={busy}
          onChange={(event) => on_toggle(event.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <span className="text-sm font-medium w-[4.5rem]">
          {checked ? "Recibe" : "No"}
        </span>
      </label>
    </div>
  );
}

type UserSubscriptionAppGroupProps = {
  group: NotificationCatalogGroupMeta;
  rows: UserEventSubscriptionRow[];
  default_open?: boolean;
  pending_key: string | null;
  is_pending: boolean;
  overrides?: Record<string, boolean>;
  on_toggle: (app_slug: string, event_key: string, enabled: boolean) => void;
};

export function UserSubscriptionAppGroup({
  group,
  rows,
  default_open = false,
  pending_key,
  is_pending,
  overrides = {},
  on_toggle,
}: UserSubscriptionAppGroupProps) {
  const [open, set_open] = useState(default_open);
  const Icon = group.icon;

  if (rows.length === 0) return null;

  return (
    <section
      className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: group.brand_color }}
    >
      <button
        type="button"
        onClick={() => set_open((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              group.accent_class,
            )}
            style={{ backgroundColor: `${group.brand_color}18` }}
          >
            <Icon className="h-4 w-4" style={{ color: group.brand_color }} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold" style={{ color: group.brand_color }}>
                {group.label}
              </h3>
              <Badge
                variant="secondary"
                className="text-[10px]"
                style={{
                  backgroundColor: `${group.brand_color}14`,
                  color: group.brand_color,
                }}
              >
                {rows.length} {rows.length === 1 ? "aviso" : "avisos"}
              </Badge>
            </div>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          className="space-y-2 border-t px-4 py-3"
          style={{ borderTopColor: `${group.brand_color}22` }}
        >
          {rows.map((row) => {
            const key = `${row.app_slug}:${row.event_key}`;
            const has_override = Object.prototype.hasOwnProperty.call(overrides, key);
            const checked = has_override ? overrides[key] : row.subscribed;
            const dirty = has_override && overrides[key] !== row.subscribed;
            return (
              <SubscriptionRow
                key={key}
                row={row}
                checked={checked}
                dirty={dirty}
                brand_color={group.brand_color}
                busy={is_pending}
                on_toggle={(enabled) =>
                  on_toggle(row.app_slug, row.event_key, enabled)
                }
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
