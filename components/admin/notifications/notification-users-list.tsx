"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { UserSubscriptionSummary } from "@/lib/notification-catalog-groups";
import { subscribed_titles } from "@/lib/notification-recipient/user-subscription-display";
import { notify_user_detail_path } from "@/lib/notification-admin-paths";
import type { DepartmentUserOption } from "@/lib/notification-recipient-selection";
import { cn } from "@/lib/utils";

type NotificationUsersListProps = {
  usuarios: DepartmentUserOption[];
  departamento_names: Map<number, string>;
  subscription_summaries: Map<number, UserSubscriptionSummary>;
};

function SubscriptionPreview({
  summary,
}: {
  summary: UserSubscriptionSummary;
}) {
  const titles = subscribed_titles(summary.rows);

  if (titles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No recibe avisos fijos</p>
    );
  }

  const preview = titles.slice(0, 4);

  return (
    <div className="space-y-1.5 text-right lg:text-left">
      <p className="text-base font-semibold tabular-nums">
        Recibe {titles.length}{" "}
        <span className="text-sm font-normal text-muted-foreground">
          {titles.length === 1 ? "aviso" : "avisos"}
        </span>
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
        {preview.join(" · ")}
        {titles.length > preview.length
          ? ` · +${titles.length - preview.length} más`
          : ""}
      </p>
    </div>
  );
}

export function NotificationUsersList({
  usuarios,
  departamento_names,
  subscription_summaries,
}: NotificationUsersListProps) {
  const [search, set_search] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return usuarios;
    return usuarios.filter((user) => {
      const dept =
        user.departamento_id != null
          ? (departamento_names.get(user.departamento_id) ?? "")
          : "";
      const summary = subscription_summaries.get(user.id);
      const subscription_text = subscribed_titles(summary?.rows ?? []).join(" ");
      return (
        user.nombre.toLowerCase().includes(query) ||
        (user.email ?? "").toLowerCase().includes(query) ||
        (user.cargo ?? "").toLowerCase().includes(query) ||
        dept.toLowerCase().includes(query) ||
        subscription_text.toLowerCase().includes(query)
      );
    });
  }, [usuarios, departamento_names, search, subscription_summaries]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notificaciones por usuario
          </h1>
          <p className="text-sm text-muted-foreground">
            Qué avisos recibe cada persona de forma habitual. Entra al detalle para
            activar o quitar avisos.
          </p>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => set_search(event.target.value)}
          placeholder="Buscar nombre, email, cargo o notificación…"
          className="h-10 border-primary/15 bg-background pl-9 shadow-sm"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} de {usuarios.length} usuarios
      </p>

      <div className="space-y-3">
        {filtered.map((user) => {
          const summary =
            subscription_summaries.get(user.id) ?? {
              total_subscribed: 0,
              total_conditional: 0,
              total_inbox_events: 0,
              total_active_events: 0,
              by_group: [],
              rows: [],
            };

          return (
            <Link
              key={user.id}
              href={notify_user_detail_path(user.id)}
              className="block rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-colors hover:bg-muted/20 hover:border-primary/20"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-base font-semibold text-primary">{user.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.email ?? "Sin email"}
                    {user.departamento_id != null
                      ? ` · ${departamento_names.get(user.departamento_id) ?? "—"}`
                      : ""}
                    {user.cargo ? ` · ${user.cargo}` : ""}
                  </p>
                </div>
                <div className="shrink-0 sm:min-w-[240px]">
                  <SubscriptionPreview summary={summary} />
                </div>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 ? (
          <div
            className={cn(
              "rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground",
            )}
          >
            No hay usuarios que coincidan con la búsqueda.
          </div>
        ) : null}
      </div>
    </div>
  );
}
