"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AppWindow,
  ChevronDown,
  Save,
  Users,
  Wrench,
} from "lucide-react";

import { updateNotificationEventConfig } from "@/actions/notification-admin";
import type { PermissionOption } from "@/actions/notification-admin";
import { AccessSummarySection } from "@/components/admin/notifications/access-summary-section";
import { AppRoleAccessSection } from "@/components/admin/notifications/app-role-access-section";
import { DepartmentUserAccessSection } from "@/components/admin/notifications/department-user-access-section";
import { PermissionsAccessSection } from "@/components/admin/notifications/permissions-access-section";
import { SpecialRulesSection } from "@/components/admin/notifications/special-rules-section";
import { TriggerKindPill } from "@/components/admin/notifications/trigger-kind-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NOTIFY_ADMIN_BASE } from "@/lib/notification-admin-paths";
import {
  get_catalog_group_meta,
  resolve_catalog_group,
} from "@/lib/notification-catalog-groups";
import {
  build_effective_access_summary,
  draft_from_event_and_config,
  type NotificationEventCatalogRow,
  type NotificationRecipientConfigRow,
  type RecipientConfigDraft,
} from "@/lib/notification-recipient-config";
import { get_trigger_kind_meta } from "@/lib/notification-trigger-meta";
import {
  role_keys_to_slugs,
  type AppRoleMembersByKey,
  type AppRoleOption,
  type DepartmentUserOption,
  type PermissionMembersByKey,
} from "@/lib/notification-recipient-selection";
import { cn } from "@/lib/utils";

type ViewTab = "recipients" | "people" | "special";

type NotificationEventWorkspaceProps = {
  event: NotificationEventCatalogRow;
  config: NotificationRecipientConfigRow | null;
  usuarios: DepartmentUserOption[];
  departamento_names: Map<number, string>;
  app_roles: AppRoleOption[];
  role_members: AppRoleMembersByKey;
  permission_members: PermissionMembersByKey;
  permissions: PermissionOption[];
  app_roles_error: string | null;
};

export function NotificationEventWorkspace({
  event,
  config,
  usuarios,
  departamento_names,
  app_roles,
  role_members,
  permission_members,
  permissions,
  app_roles_error,
}: NotificationEventWorkspaceProps) {
  const [view_tab, set_view_tab] = useState<ViewTab>("recipients");
  const [show_metadata, set_show_metadata] = useState(false);
  const [show_summary_detail, set_show_summary_detail] = useState(false);
  const [draft, set_draft] = useState<RecipientConfigDraft>(() =>
    draft_from_event_and_config(event, config),
  );
  const [saving, set_saving] = useState(false);
  const [message, set_message] = useState<string | null>(null);

  useEffect(() => {
    set_draft(draft_from_event_and_config(event, config));
  }, [event, config]);

  const summary = useMemo(
    () =>
      build_effective_access_summary({
        usuarios,
        departamento_names,
        app_roles,
        role_members,
        permission_members,
        draft,
      }),
    [
      usuarios,
      departamento_names,
      app_roles,
      role_members,
      permission_members,
      draft,
    ],
  );

  const catalog_group = get_catalog_group_meta(resolve_catalog_group(event));
  const trigger_meta = get_trigger_kind_meta(event.trigger_kind);

  const handle_save = async () => {
    set_saving(true);
    set_message(null);
    const result = await updateNotificationEventConfig({
      app_slug: event.app_slug,
      event_key: event.event_key,
      title: draft.title,
      description: draft.description,
      trigger_kind: draft.trigger_kind,
      trigger_ref: draft.trigger_ref,
      is_active: draft.is_active,
      allowed_role_slugs: role_keys_to_slugs(draft.selected_role_keys),
      allowed_permission_slugs: draft.allowed_permission_slugs,
      allowed_departamento_ids: draft.allowed_departamento_ids,
      allowed_user_ids: draft.allowed_user_ids,
      denied_user_ids: draft.denied_user_ids,
      special_rules: draft.special_rules,
      notes: draft.notes,
    });
    set_saving(false);
    if (result.success) {
      set_message("Configuración guardada.");
    } else {
      set_message(result.error ?? "No se pudo guardar.");
    }
  };

  const tabs: Array<{ id: ViewTab; label: string; icon: typeof Users }> = [
    { id: "recipients", label: "Roles y permisos", icon: AppWindow },
    { id: "people", label: "Personas", icon: Users },
    { id: "special", label: "Casos especiales", icon: Wrench },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Link
          href={NOTIFY_ADMIN_BASE}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Volver al catálogo
        </Link>

        <div
          className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5"
          style={{ borderLeftWidth: 4, borderLeftColor: catalog_group.brand_color }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1">
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: catalog_group.brand_color }}
              >
                {catalog_group.label}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">{draft.title}</h1>
              <p className="text-sm text-muted-foreground">
                {event.description ?? "Sin descripción en catálogo."}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {event.app_slug} · {event.event_key}
              </p>
            </div>
            <div className="shrink-0 rounded-lg bg-muted/40 px-4 py-3 text-center">
              <p className="text-3xl font-bold tabular-nums">{summary.total}</p>
              <p className="text-sm text-muted-foreground">personas configuradas</p>
              <button
                type="button"
                onClick={() => set_show_summary_detail((v) => !v)}
                className="mt-1 text-[11px] text-primary hover:underline"
              >
                {show_summary_detail ? "Ocultar desglose" : "Ver desglose"}
              </button>
            </div>
          </div>

          {show_summary_detail ? (
            <div className="mt-4 border-t pt-4">
              <AccessSummarySection summary={summary} compact />
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div
          className={cn(
            "rounded-lg border p-3",
            trigger_meta.bg_class,
            trigger_meta.border_class,
          )}
        >
          <p className="text-[11px] font-medium text-muted-foreground">Origen del aviso</p>
          <div className="mt-1.5">
            <TriggerKindPill meta={trigger_meta} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {trigger_meta.description}
          </p>
        </div>
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Referencia técnica</p>
          <code className="mt-1.5 block text-xs break-all text-foreground">
            {event.trigger_ref ?? "—"}
          </code>
        </div>
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Estado en catálogo</p>
          <p className="mt-1.5 text-sm font-medium">
            {draft.is_active ? (
              <span className="text-emerald-700">Activo — visible y configurable</span>
            ) : (
              <span className="text-slate-500">Inactivo — legado o sin writer</span>
            )}
          </p>
        </div>
      </div>

      {message ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            message.includes("guardada")
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800",
          )}
        >
          {message}
        </p>
      ) : null}

      <div className="rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="grid h-11 grid-cols-3 gap-1 border-b border-border/70 bg-muted/30 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => set_view_tab(tab.id)}
                className={cn(
                  "inline-flex h-9 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium transition-colors",
                  view_tab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6">
          {view_tab === "recipients" ? (
            <div className="space-y-8">
              <AppRoleAccessSection
                app_roles={app_roles}
                role_members={role_members}
                draft={draft}
                load_error={app_roles_error}
                on_draft_change={set_draft}
              />
              <PermissionsAccessSection
                permissions={permissions}
                draft={draft}
                on_draft_change={set_draft}
              />
            </div>
          ) : null}

          {view_tab === "people" ? (
            <DepartmentUserAccessSection
              usuarios={usuarios}
              departamento_names={departamento_names}
              draft={draft}
              role_members={role_members}
              permission_members={permission_members}
              snapshots={summary.snapshots}
              on_draft_change={set_draft}
            />
          ) : null}

          {view_tab === "special" ? (
            <SpecialRulesSection
              available_rules={event.available_special_rules}
              draft={draft}
              on_draft_change={set_draft}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <button
            type="button"
            onClick={() => set_show_metadata((v) => !v)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", show_metadata && "rotate-180")}
            />
            {show_metadata ? "Ocultar datos del catálogo" : "Editar título y notas del evento"}
          </button>
          <Button
            type="button"
            disabled={saving}
            className="min-w-[180px]"
            onClick={() => void handle_save()}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando…" : "Guardar destinatarios"}
          </Button>
        </div>

        {show_metadata ? (
          <div className="border-t border-border/70 bg-muted/10 px-4 py-4 sm:px-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-title">Título en catálogo</Label>
                <Input
                  id="event-title"
                  value={draft.title}
                  onChange={(event_input) =>
                    set_draft({ ...draft, title: event_input.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-active">Estado</Label>
                <label className="flex h-10 items-center gap-2 text-sm">
                  <input
                    id="event-active"
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(event_input) =>
                      set_draft({ ...draft, is_active: event_input.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Evento activo
                </label>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="event-description">Descripción</Label>
                <Textarea
                  id="event-description"
                  value={draft.description}
                  onChange={(event_input) =>
                    set_draft({ ...draft, description: event_input.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-notes">Notas internas (TED)</Label>
                <Input
                  id="config-notes"
                  value={draft.notes}
                  onChange={(event_input) =>
                    set_draft({ ...draft, notes: event_input.target.value })
                  }
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
