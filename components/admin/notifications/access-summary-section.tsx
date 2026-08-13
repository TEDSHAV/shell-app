"use client";

import {
  Building2,
  KeyRound,
  ShieldOff,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { EffectiveAccessSummary } from "@/lib/notification-recipient-config";
import { cn } from "@/lib/utils";

type AccessSummarySectionProps = {
  summary: EffectiveAccessSummary;
  compact?: boolean;
};

type SummaryBlockProps = {
  icon: typeof Users;
  title: string;
  count: number;
  empty_label?: string;
  children: React.ReactNode;
  accent?: string;
};

function SummaryBlock({
  icon: Icon,
  title,
  count,
  empty_label = "Nadie",
  children,
  accent = "text-primary",
}: SummaryBlockProps) {
  const is_empty = count === 0;

  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-4",
        is_empty ? "border-dashed border-border/70 opacity-70" : "border-border/80",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md bg-muted/60",
              accent,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold">{title}</p>
        </div>
        <Badge variant={is_empty ? "outline" : "secondary"} className="tabular-nums text-sm">
          {count}
        </Badge>
      </div>
      {is_empty ? (
        <p className="text-sm text-muted-foreground">{empty_label}</p>
      ) : (
        <div className="text-sm leading-relaxed">{children}</div>
      )}
    </div>
  );
}

export function AccessSummarySection({
  summary,
  compact = false,
}: AccessSummarySectionProps) {
  const has_any =
    summary.total > 0 ||
    summary.by_role.length > 0 ||
    summary.by_permission.length > 0 ||
    summary.by_department.length > 0 ||
    summary.by_special.length > 0 ||
    summary.manual_users.length > 0 ||
    summary.excluded_users.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Destinatarios
          </p>
          <p className="text-4xl font-bold tabular-nums leading-none">{summary.total}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            personas con acceso configurado
          </p>
        </div>
        {!compact ? (
          <div className="flex flex-wrap gap-2 pb-1">
            <Badge variant="outline" className="text-sm">
              {summary.permission_count} permisos en regla
            </Badge>
            <Badge variant="outline" className="text-sm">
              {summary.special_rule_count} reglas especiales
            </Badge>
          </div>
        ) : null}
      </div>

      {summary.contextual_rule_labels.length > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <p className="font-medium text-amber-900">También aplica según el evento</p>
          <p className="mt-1 text-muted-foreground">
            Estas reglas no se cuentan arriba porque dependen del registro (quién
            creó, ejecutivo del trato, etc.):{" "}
            <span className="text-foreground">
              {summary.contextual_rule_labels.join(" · ")}
            </span>
          </p>
        </div>
      ) : null}

      {!has_any ? (
        <div className="rounded-lg border border-dashed p-5 text-base text-muted-foreground">
          Nadie recibiría este aviso con la configuración actual. Añade roles, permisos o
          personas.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryBlock
            icon={KeyRound}
            title="Por permiso"
            count={summary.by_permission.reduce((acc, row) => acc + row.count, 0)}
            accent="text-violet-600"
          >
            <ul className="space-y-1.5">
              {summary.by_permission.map((row) => (
                <li key={row.permission_slug} className="flex justify-between gap-2">
                  <span className="truncate font-mono text-sm">{row.permission_slug}</span>
                  <span className="shrink-0 font-medium tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </SummaryBlock>

          <SummaryBlock
            icon={Users}
            title="Por rol"
            count={summary.by_role.reduce((acc, row) => acc + row.count, 0)}
            accent="text-blue-600"
          >
            <ul className="space-y-1.5">
              {summary.by_role.map((row) => (
                <li key={row.role_key} className="flex justify-between gap-2">
                  <span className="truncate">{row.role_label}</span>
                  <span className="shrink-0 font-medium tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </SummaryBlock>

          <SummaryBlock
            icon={Building2}
            title="Por departamento"
            count={summary.by_department.reduce((acc, row) => acc + row.count, 0)}
            accent="text-emerald-600"
          >
            <ul className="space-y-1.5">
              {summary.by_department.map((row) => (
                <li key={row.departamento_id} className="flex justify-between gap-2">
                  <span className="truncate">{row.nombre}</span>
                  <span className="shrink-0 font-medium tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </SummaryBlock>

          <SummaryBlock
            icon={Sparkles}
            title="Broadcast / especiales"
            count={summary.by_special.reduce((acc, row) => acc + row.count, 0)}
            empty_label="Sin broadcast ni especiales evaluables"
            accent="text-amber-600"
          >
            <ul className="space-y-1.5">
              {summary.by_special.map((row) => (
                <li key={row.rule_label} className="flex justify-between gap-2">
                  <span className="truncate">{row.rule_label}</span>
                  <span className="shrink-0 font-medium tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </SummaryBlock>

          <SummaryBlock
            icon={UserCheck}
            title="Añadidos manualmente"
            count={summary.manual_users.length}
            empty_label="Sin altas manuales"
            accent="text-teal-600"
          >
            <ul className="space-y-1.5">
              {summary.manual_users.map((row) => (
                <li key={row.user_id}>{row.nombre}</li>
              ))}
            </ul>
          </SummaryBlock>

          <SummaryBlock
            icon={ShieldOff}
            title="Excluidos"
            count={summary.excluded_users.length}
            empty_label="Sin exclusiones"
            accent="text-red-600"
          >
            <ul className="space-y-1.5">
              {summary.excluded_users.map((row) => (
                <li key={row.user_id}>{row.nombre}</li>
              ))}
            </ul>
          </SummaryBlock>
        </div>
      )}
    </section>
  );
}
