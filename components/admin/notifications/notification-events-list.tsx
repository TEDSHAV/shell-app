"use client";

import { useMemo, useState } from "react";
import { Bell, Search } from "lucide-react";

import type { NotificationEventListItem } from "@/actions/notification-admin";
import { NotificationCatalogGroup } from "@/components/admin/notifications/notification-catalog-group";
import { NotificationCatalogManual } from "@/components/admin/notifications/notification-catalog-manual";
import { Input } from "@/components/ui/input";
import { group_events_by_catalog } from "@/lib/notification-catalog-groups";
import { cn } from "@/lib/utils";

type NotificationEventsListProps = {
  events: NotificationEventListItem[];
};

export function NotificationEventsList({ events }: NotificationEventsListProps) {
  const [search, set_search] = useState("");
  const [active_filter, set_active_filter] = useState<"all" | "active" | "inactive">(
    "all",
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      if (active_filter === "active" && !event.is_active) return false;
      if (active_filter === "inactive" && event.is_active) return false;
      if (!query) return true;
      return (
        event.app_slug.toLowerCase().includes(query) ||
        event.event_key.toLowerCase().includes(query) ||
        (event.title ?? "").toLowerCase().includes(query) ||
        (event.description ?? "").toLowerCase().includes(query) ||
        (event.trigger_ref ?? "").toLowerCase().includes(query)
      );
    });
  }, [events, search, active_filter]);

  const grouped = useMemo(
    () => group_events_by_catalog(filtered),
    [filtered],
  );

  const active_count = filtered.filter((event) => event.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Catálogo de notificaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Configura quién recibe cada aviso.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => set_search(event.target.value)}
            placeholder="Buscar por nombre, descripción o trigger…"
            className="h-10 border-primary/15 bg-background pl-9 shadow-sm"
          />
        </div>
        <select
          value={active_filter}
          onChange={(event) =>
            set_active_filter(event.target.value as "all" | "active" | "inactive")
          }
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Activos e inactivos</option>
          <option value="active">Solo activos</option>
          <option value="inactive">Solo inactivos</option>
        </select>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} eventos · {active_count} activos
      </p>

      <NotificationCatalogManual />

      <div className="space-y-3">
        {grouped.map((entry, index) => (
          <NotificationCatalogGroup
            key={entry.group.id}
            group={entry.group}
            events={entry.events}
            default_open={index === 0}
          />
        ))}
        {grouped.length === 0 ? (
          <div
            className={cn(
              "rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground",
            )}
          >
            No hay eventos que coincidan con los filtros.
          </div>
        ) : null}
      </div>
    </div>
  );
}
