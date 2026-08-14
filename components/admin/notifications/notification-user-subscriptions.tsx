"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, BellOff, Info, Save, Search, User } from "lucide-react";

import { setUserEventSubscriptions } from "@/actions/notification-admin";
import { SubscriptionCollapsibleBlock } from "@/components/admin/notifications/subscription-collapsible-block";
import { UserSubscriptionAppGroup } from "@/components/admin/notifications/user-subscription-app-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  build_user_subscription_summary,
  NOTIFICATION_CATALOG_GROUPS,
  type UserSubscriptionSummary,
} from "@/lib/notification-catalog-groups";
import { NOTIFY_ADMIN_BASE } from "@/lib/notification-admin-paths";
import type {
  NotificationEventCatalogRow,
  NotificationRecipientConfigRow,
  UserEventSubscriptionRow,
} from "@/lib/notification-recipient-config";
import type { InboxSummariesByAuthId } from "@/lib/notification-recipient/inbox-summary";
import {
  format_subscription_reasons,
  group_subscription_partition,
  partition_user_subscription_rows,
} from "@/lib/notification-recipient/user-subscription-display";
import type {
  AppRoleMembersByKey,
  AppRoleOption,
  DepartmentUserOption,
  PermissionMembersByKey,
} from "@/lib/notification-recipient-selection";
import { cn } from "@/lib/utils";

type NotificationUserSubscriptionsProps = {
  user: DepartmentUserOption;
  departamento_nombre: string | null;
  departamento_names: Map<number, string>;
  events: NotificationEventCatalogRow[];
  configs: NotificationRecipientConfigRow[];
  app_roles: AppRoleOption[];
  role_members: AppRoleMembersByKey;
  permission_members: PermissionMembersByKey;
  inbox_by_auth_id: InboxSummariesByAuthId;
};

function event_key_from_override(key: string): { app_slug: string; event_key: string } {
  const sep = key.indexOf(":");
  return { app_slug: key.slice(0, sep), event_key: key.slice(sep + 1) };
}

export function NotificationUserSubscriptions({
  user,
  departamento_nombre,
  departamento_names,
  events,
  configs,
  app_roles,
  role_members,
  permission_members,
  inbox_by_auth_id,
}: NotificationUserSubscriptionsProps) {
  const router = useRouter();
  const [search, set_search] = useState("");
  const [overrides, set_overrides] = useState<Record<string, boolean>>({});
  const [message, set_message] = useState<string | null>(null);
  const [is_pending, start_transition] = useTransition();

  const summary = useMemo<UserSubscriptionSummary>(
    () =>
      build_user_subscription_summary(user, {
        events,
        configs,
        app_roles,
        role_members,
        permission_members,
        departamento_names,
        inbox_by_auth_id,
        active_events_only: true,
      }),
    [
      user,
      events,
      configs,
      app_roles,
      role_members,
      permission_members,
      departamento_names,
      inbox_by_auth_id,
    ],
  );

  const original_by_key = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const row of summary.rows) {
      map.set(`${row.app_slug}:${row.event_key}`, row.subscribed);
    }
    return map;
  }, [summary.rows]);

  useEffect(() => {
    set_overrides((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [key, enabled] of Object.entries(next)) {
        if (original_by_key.get(key) === enabled) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [original_by_key]);

  const partition = useMemo(
    () => partition_user_subscription_rows(summary.rows),
    [summary.rows],
  );

  const grouped = useMemo(
    () => group_subscription_partition(partition),
    [partition],
  );

  const dirty_changes = useMemo(() => {
    return Object.entries(overrides)
      .filter(([key, enabled]) => original_by_key.get(key) !== enabled)
      .map(([key, enabled]) => ({ ...event_key_from_override(key), enabled }));
  }, [overrides, original_by_key]);

  const query = search.trim().toLowerCase();

  const filter_row = (row: UserEventSubscriptionRow) => {
    if (!query) return true;
    return [row.title, row.description ?? "", format_subscription_reasons(row.condition_labels)]
      .join(" ")
      .toLowerCase()
      .includes(query);
  };

  const receives_by_app = useMemo(
    () =>
      NOTIFICATION_CATALOG_GROUPS.map((group_meta) => {
        const bucket = grouped.find((g) => g.group_id === group_meta.id);
        const rows = bucket?.receives.filter(filter_row) ?? [];
        return { group: group_meta, rows };
      }).filter((entry) => entry.rows.length > 0),
    [grouped, query],
  );

  const not_receives_by_app = useMemo(
    () =>
      NOTIFICATION_CATALOG_GROUPS.map((group_meta) => {
        const bucket = grouped.find((g) => g.group_id === group_meta.id);
        const rows = bucket?.does_not_receive.filter(filter_row) ?? [];
        return { group: group_meta, rows };
      }).filter((entry) => entry.rows.length > 0),
    [grouped, query],
  );

  const receives_filtered = partition.receives.filter(filter_row);
  const not_receives_filtered = partition.does_not_receive.filter(filter_row);

  const handle_toggle = (app_slug: string, event_key: string, enabled: boolean) => {
    const key = `${app_slug}:${event_key}`;
    set_message(null);
    set_overrides((prev) => ({ ...prev, [key]: enabled }));
  };

  const handle_save = () => {
    if (dirty_changes.length === 0) return;
    set_message(null);
    start_transition(async () => {
      const result = await setUserEventSubscriptions({
        usuario_id: user.id,
        changes: dirty_changes,
      });
      if (result.success) {
        set_message("Cambios guardados.");
        router.refresh();
      } else {
        set_message(result.error ?? "No se pudo guardar.");
      }
    });
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="space-y-2">
        <Link
          href={`${NOTIFY_ADMIN_BASE}/usuarios`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a usuarios
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{user.nombre}</h1>
            <p className="text-sm text-muted-foreground">
              {user.email ?? "Sin email"}
              {departamento_nombre ? ` · ${departamento_nombre}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
        <p className="text-sm font-medium text-foreground">
          Esta persona recibe{" "}
          <span className="font-bold tabular-nums">{partition.receives.length}</span>{" "}
          {partition.receives.length === 1 ? "tipo de aviso" : "tipos de aviso"}
        </p>
        {partition.receives.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {partition.receives.map((row) => (
              <li key={`${row.app_slug}:${row.event_key}`} className="flex gap-2 text-sm">
                <span className="text-primary">✓</span>
                <span>
                  <span className="font-medium">{row.title}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — {format_subscription_reasons(row.condition_labels)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No tiene avisos fijos asignados. Marca avisos abajo y guarda los cambios.
          </p>
        )}
      </div>

      {partition.recent_inbox_only.length > 0 ? (
        <div className="flex gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            En los últimos 90 días también le llegó (sin suscripción fija):{" "}
            {partition.recent_inbox_only.map((r) => r.title).join(", ")}.
          </p>
        </div>
      ) : null}

      {message ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            message.includes("guardados")
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800",
          )}
        >
          {message}
        </p>
      ) : null}

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => set_search(event.target.value)}
          placeholder="Buscar aviso…"
          className="h-10 border-primary/15 bg-background pl-9 shadow-sm"
        />
      </div>

      <SubscriptionCollapsibleBlock
        title="Recibe estos avisos"
        count={receives_filtered.length}
        default_open
        icon={Bell}
      >
        {receives_filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Ningún aviso coincide con la búsqueda.
          </p>
        ) : (
          receives_by_app.map((entry, index) => (
            <UserSubscriptionAppGroup
              key={entry.group.id}
              group={entry.group}
              rows={entry.rows}
              default_open={index === 0}
              pending_key={null}
              is_pending={is_pending}
              overrides={overrides}
              on_toggle={handle_toggle}
            />
          ))
        )}
      </SubscriptionCollapsibleBlock>

      <SubscriptionCollapsibleBlock
        title="No recibe"
        count={not_receives_filtered.length}
        default_open={partition.receives.length > 0 ? false : true}
        icon={BellOff}
        tone="muted"
      >
        {not_receives_filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {partition.does_not_receive.length === 0
              ? "Todos los avisos configurables ya están activos."
              : "Ningún aviso coincide con la búsqueda."}
          </p>
        ) : (
          not_receives_by_app.map((entry, index) => (
            <UserSubscriptionAppGroup
              key={entry.group.id}
              group={entry.group}
              rows={entry.rows}
              default_open={index === 0}
              pending_key={null}
              is_pending={is_pending}
              overrides={overrides}
              on_toggle={handle_toggle}
            />
          ))
        )}
      </SubscriptionCollapsibleBlock>

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-border/80 bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {dirty_changes.length === 0
            ? "Marca o desmarca avisos y pulsa guardar para aplicarlos."
            : `${dirty_changes.length} cambio${dirty_changes.length === 1 ? "" : "s"} sin guardar`}
        </p>
        <Button
          type="button"
          disabled={is_pending || dirty_changes.length === 0}
          className="min-w-[180px]"
          onClick={handle_save}
        >
          <Save className="mr-2 h-4 w-4" />
          {is_pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
