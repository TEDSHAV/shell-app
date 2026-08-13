"use client";

import { useMemo, useState } from "react";
import { KeyRound, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { RecipientConfigDraft } from "@/lib/notification-recipient-config";
import type { PermissionOption } from "@/actions/notification-admin";

type PermissionsAccessSectionProps = {
  permissions: PermissionOption[];
  draft: RecipientConfigDraft;
  on_draft_change: (next: RecipientConfigDraft) => void;
};

export function PermissionsAccessSection({
  permissions,
  draft,
  on_draft_change,
}: PermissionsAccessSectionProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return permissions;
    return permissions.filter(
      (perm) =>
        perm.slug.toLowerCase().includes(query) ||
        (perm.descripcion ?? "").toLowerCase().includes(query),
    );
  }, [permissions, search]);

  const toggle_permission = (slug: string) => {
    const selected = new Set(draft.allowed_permission_slugs);
    if (selected.has(slug)) selected.delete(slug);
    else selected.add(slug);
    on_draft_change({
      ...draft,
      allowed_permission_slugs: Array.from(selected).sort(),
    });
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Permisos authprisma</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Criterio usado por la mayoría de triggers SQL vía fan_out_by_permissions.
        </p>
        <Badge variant="secondary" className="mt-2">
          {draft.allowed_permission_slugs.length} seleccionados
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar permiso…"
          className="pl-9"
        />
      </div>

      <div className="max-h-80 overflow-y-auto rounded-xl border border-border/80 divide-y">
        {filtered.map((perm) => {
          const checked = draft.allowed_permission_slugs.includes(perm.slug);
          return (
            <label
              key={perm.slug}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30"
            >
              <Checkbox
                className="mt-0.5"
                checked={checked}
                onCheckedChange={() => toggle_permission(perm.slug)}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-mono">{perm.slug}</span>
                </div>
                {perm.descripcion ? (
                  <p className="text-xs text-muted-foreground mt-1">{perm.descripcion}</p>
                ) : null}
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
}
