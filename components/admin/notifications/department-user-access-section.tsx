"use client";

import { useMemo, useState } from "react";
import { Building2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { RecipientConfigDraft, UserAccessSnapshot } from "@/lib/notification-recipient-config";
import {
  get_department_effective_tri_state,
  toggle_department_access,
  toggle_user_access,
} from "@/lib/notification-recipient-config";
import {
  group_users_by_department,
  type AppRoleMembersByKey,
  type DepartmentUserOption,
  type PermissionMembersByKey,
} from "@/lib/notification-recipient-selection";
import { cn } from "@/lib/utils";

import { TriStateCheckbox } from "./tri-state-checkbox";

type DepartmentUserAccessSectionProps = {
  usuarios: DepartmentUserOption[];
  departamento_names: Map<number, string>;
  draft: RecipientConfigDraft;
  role_members: AppRoleMembersByKey;
  permission_members: PermissionMembersByKey;
  snapshots: Map<number, UserAccessSnapshot>;
  on_draft_change: (next: RecipientConfigDraft) => void;
};

function badge_label(badge: string): string {
  switch (badge) {
    case "role":
      return "Por rol";
    case "department":
      return "Por dpto";
    case "permission":
      return "Por permiso";
    case "special":
      return "Especial";
    case "manual":
      return "Manual";
    case "excluded":
      return "Excluido";
    default:
      return "";
  }
}

export function DepartmentUserAccessSection({
  usuarios,
  departamento_names,
  draft,
  role_members,
  permission_members,
  snapshots,
  on_draft_change,
}: DepartmentUserAccessSectionProps) {
  const [search, setSearch] = useState("");
  const [open_groups, set_open_groups] = useState<Set<string>>(new Set());

  const groups = useMemo(
    () => group_users_by_department(usuarios, departamento_names),
    [usuarios, departamento_names],
  );

  const filtered_groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups
      .map((group) => ({
        ...group,
        usuarios: group.usuarios.filter((user) => {
          const snap = snapshots.get(user.id);
          const dept_name = group.departamento_nombre.toLowerCase();
          return (
            user.nombre.toLowerCase().includes(query) ||
            (user.email ?? "").toLowerCase().includes(query) ||
            (user.cargo ?? "").toLowerCase().includes(query) ||
            dept_name.includes(query) ||
            (snap?.via_role_keys.join(" ") ?? "").toLowerCase().includes(query)
          );
        }),
      }))
      .filter((group) => group.usuarios.length > 0);
  }, [groups, search, snapshots]);

  const total_with_access = Array.from(snapshots.values()).filter(
    (snap) => snap.has_access,
  ).length;

  const toggle_group = (group_key: string) => {
    set_open_groups((prev) => {
      const next = new Set(prev);
      if (next.has(group_key)) next.delete(group_key);
      else next.add(group_key);
      return next;
    });
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Equipos y personas</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Los roles marcados incluyen automáticamente a sus usuarios. Puedes excluir o añadir personas.
        </p>
        <Badge variant="secondary" className="mt-2">
          {total_with_access} con acceso
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar nombre, cargo, email o departamento…"
          className="pl-9"
        />
      </div>

      {filtered_groups.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No hay resultados para esa búsqueda.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered_groups.map((group) => {
            const tri_state = get_department_effective_tri_state(group, snapshots);
            const group_key =
              group.departamento_id != null
                ? `dept-${group.departamento_id}`
                : "dept-none";
            const is_open = open_groups.has(group_key);

            return (
              <div
                key={group_key}
                className="overflow-hidden rounded-xl border border-border/80 bg-card"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <TriStateCheckbox
                    state={tri_state}
                    onToggle={() =>
                      on_draft_change(
                        toggle_department_access(group, draft, snapshots),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => toggle_group(group_key)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{group.departamento_nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.usuarios.length} personas
                      </p>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {is_open ? "▲" : "▼"}
                    </span>
                  </button>
                </div>

                {is_open ? (
                  <div className="border-t bg-muted/15 px-4 pb-4 pt-3">
                    <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                      {group.usuarios.map((user) => {
                        const snap = snapshots.get(user.id);
                        const has_access = snap?.has_access ?? false;
                        const excluded = snap?.excluded ?? false;
                        return (
                          <label
                            key={user.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors",
                              excluded
                                ? "border-red-200 bg-red-50"
                                : has_access
                                  ? "border-indigo-200 bg-indigo-50/50"
                                  : "border-border bg-background hover:border-indigo-200",
                            )}
                          >
                            <Checkbox
                              className="mt-1"
                              checked={has_access}
                              onCheckedChange={() =>
                                on_draft_change(
                                  toggle_user_access(
                                    user,
                                    draft,
                                    role_members,
                                    permission_members,
                                  ),
                                )
                              }
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{user.nombre}</p>
                              {user.email ? (
                                <p className="text-xs text-muted-foreground truncate">
                                  {user.email}
                                </p>
                              ) : null}
                              {user.cargo ? (
                                <p className="text-xs text-muted-foreground truncate">
                                  {user.cargo}
                                </p>
                              ) : null}
                              {snap && snap.badges.filter((b) => b !== "none").length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {snap.badges
                                    .filter((badge) => badge !== "none")
                                    .map((badge) => (
                                      <Badge
                                        key={`${user.id}-${badge}`}
                                        variant={
                                          badge === "excluded" ? "destructive" : "secondary"
                                        }
                                        className="text-[10px]"
                                      >
                                        {badge_label(badge)}
                                      </Badge>
                                    ))}
                                </div>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
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
