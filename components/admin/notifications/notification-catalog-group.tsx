"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import type { NotificationEventListItem } from "@/actions/notification-admin";
import { TriggerKindPill } from "@/components/admin/notifications/trigger-kind-pill";
import type { NotificationCatalogGroupMeta } from "@/lib/notification-catalog-groups";
import { notify_event_detail_path } from "@/lib/notification-admin-paths";
import { get_trigger_kind_meta } from "@/lib/notification-trigger-meta";
import { cn } from "@/lib/utils";

type NotificationCatalogGroupProps = {
  group: NotificationCatalogGroupMeta;
  events: NotificationEventListItem[];
  default_open?: boolean;
};

export function NotificationCatalogGroup({
  group,
  events,
  default_open = false,
}: NotificationCatalogGroupProps) {
  const [open, set_open] = useState(default_open);
  const Icon = group.icon;

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
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              group.accent_class,
            )}
            style={{ backgroundColor: `${group.brand_color}18` }}
          >
            <Icon className="h-4 w-4" style={{ color: group.brand_color }} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ color: group.brand_color }}>
                {group.label}
              </h2>
              <span className="text-xs text-muted-foreground">
                ({events.length} eventos)
              </span>
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
        <div className="border-t border-border/70">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-sm">
              <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium w-[28%]">Evento</th>
                  <th className="px-4 py-2.5 font-medium w-[32%]">Qué avisa</th>
                  <th className="px-4 py-2.5 font-medium w-[14%]">Origen</th>
                  <th className="px-4 py-2.5 font-medium w-[18%]">Referencia técnica</th>
                  <th className="px-4 py-2.5 font-medium w-[8%]">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {events.map((event) => {
                  const trigger = get_trigger_kind_meta(event.trigger_kind);
                  return (
                    <tr
                      key={`${event.app_slug}:${event.event_key}`}
                      className="hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 align-top">
                        <Link
                          href={notify_event_detail_path(
                            event.app_slug,
                            event.event_key,
                          )}
                          className="font-medium hover:underline"
                          style={{ color: group.brand_color }}
                        >
                          {event.title ?? event.event_key}
                        </Link>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {event.event_key}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/80">
                          {event.app_slug}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        <p className="line-clamp-3 text-xs leading-relaxed">
                          {event.description ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <TriggerKindPill meta={trigger} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <code className="block text-[10px] text-muted-foreground break-all">
                          {event.trigger_ref ?? "—"}
                        </code>
                        {event.has_config ? (
                          <span className="mt-1 inline-block text-[10px] text-muted-foreground">
                            Destinatarios configurados
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                            event.is_active
                              ? "bg-emerald-500/10 text-emerald-700"
                              : "bg-slate-500/10 text-slate-500",
                          )}
                        >
                          {event.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
