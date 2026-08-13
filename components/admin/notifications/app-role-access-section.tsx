"use client";

import { useMemo, useState } from "react";
import { AppWindow, Search, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { RecipientConfigDraft } from "@/lib/notification-recipient-config";
import {
  count_role_access,
  get_app_tri_state,
  group_app_roles,
  toggle_app_selection,
  toggle_role_selection,
  to_app_role_key,
  type AppRoleMembersByKey,
  type AppRoleOption,
} from "@/lib/notification-recipient-selection";
import { cn } from "@/lib/utils";

import { TriStateCheckbox } from "./tri-state-checkbox";

type AppRoleAccessSectionProps = {
  app_roles: AppRoleOption[];
  role_members: AppRoleMembersByKey;
  draft: RecipientConfigDraft;
  load_error?: string | null;
  on_draft_change: (next: RecipientConfigDraft) => void;
};

export function AppRoleAccessSection({
  app_roles,
  role_members,
  draft,
  load_error,
  on_draft_change,
}: AppRoleAccessSectionProps) {
  const [search, setSearch] = useState("");
  const [open_apps, setOpenApps] = useState<Set<string>>(new Set());
  const selected_role_keys = draft.selected_role_keys;

  const groups = useMemo(() => group_app_roles(app_roles), [app_roles]);

  const filtered_groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups
      .map((group) => ({
        ...group,
        roles: group.roles.filter((role) => {
          const role_key = to_app_role_key(group.app_slug, role.role_slug);
          const members = role_members[role_key] ?? [];
          const member_match = members.some(
            (member) =>
              member.nombre.toLowerCase().includes(query) ||
              (member.cargo ?? "").toLowerCase().includes(query) ||
              (member.email ?? "").toLowerCase().includes(query),
          );
          return (
            member_match ||
            group.app_nombre.toLowerCase().includes(query) ||
            group.app_slug.toLowerCase().includes(query) ||
            role.role_nombre.toLowerCase().includes(query) ||
            role.role_slug.toLowerCase().includes(query)
          );
        }),
      }))
      .filter((group) => group.roles.length > 0);
  }, [groups, role_members, search]);

  const summary = count_role_access(groups, selected_role_keys);

  const toggle_app = (app_slug: string) => {
    setOpenApps((prev) => {
      const next = new Set(prev);
      if (next.has(app_slug)) next.delete(app_slug);
      else next.add(app_slug);
      return next;
    });
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Apps y roles</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Al activar un rol, sus usuarios quedan incluidos. Puedes excluirlos en Personas.
        </p>
        <div className="mt-2 flex gap-2">
          <Badge variant="secondary">{summary.apps} apps</Badge>
          <Badge variant="outline">{summary.roles} roles</Badge>
        </div>
      </div>

      {load_error ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {load_error}
        </p>
      ) : null}

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar app, rol o persona…"
          className="pl-9"
        />
      </div>

      {filtered_groups.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No hay roles para mostrar.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered_groups.map((group) => {
            const tri_state = get_app_tri_state(group, selected_role_keys);
            const is_open = open_apps.has(group.app_slug);

            return (
              <div
                key={group.app_slug}
                className="overflow-hidden rounded-xl border border-border/80 bg-card"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <TriStateCheckbox
                    state={tri_state}
                    onToggle={() =>
                      on_draft_change({
                        ...draft,
                        selected_role_keys: toggle_app_selection(
                          group,
                          selected_role_keys,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => toggle_app(group.app_slug)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <AppWindow className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{group.app_nombre}</p>
                      <p className="text-xs text-muted-foreground">{group.app_slug}</p>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {is_open ? "▲" : "▼"}
                    </span>
                  </button>
                </div>

                {is_open ? (
                  <div className="border-t bg-muted/15 px-4 pb-4 pt-3 space-y-3">
                    {group.roles.map((role) => {
                      const role_key = to_app_role_key(group.app_slug, role.role_slug);
                      const members = role_members[role_key] ?? [];
                      const checked = selected_role_keys.has(role_key);

                      return (
                        <div
                          key={role_key}
                          className="rounded-lg border border-border/70 bg-background p-3"
                        >
                          <label className="flex items-center gap-3 cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() =>
                                on_draft_change({
                                  ...draft,
                                  selected_role_keys: toggle_role_selection(
                                    group.app_slug,
                                    role.role_slug,
                                    selected_role_keys,
                                  ),
                                })
                              }
                            />
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{role.role_nombre}</span>
                              <span className="text-xs text-muted-foreground">
                                ({role.role_slug})
                              </span>
                            </div>
                            <Badge variant="outline" className="ml-auto text-[10px]">
                              {members.length} miembros
                            </Badge>
                          </label>

                          {members.length > 0 ? (
                            <ul className="mt-3 ml-7 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                              {members.slice(0, 8).map((member) => (
                                <li
                                  key={member.usuario_id}
                                  className={cn(
                                    checked && "text-foreground",
                                  )}
                                >
                                  {member.nombre}
                                </li>
                              ))}
                              {members.length > 8 ? (
                                <li>+{members.length - 8} más</li>
                              ) : null}
                            </ul>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
