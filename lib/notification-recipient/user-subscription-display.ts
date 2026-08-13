import type { UserEventSubscriptionRow } from "@/lib/notification-recipient/types";
import {
  get_catalog_group_meta,
  resolve_catalog_group,
  type NotificationCatalogGroupId,
} from "@/lib/notification-catalog-groups";

/** Convierte etiquetas internas en texto legible para el admin. */
export function humanize_subscription_reason(label: string): string {
  if (label === "Manual" || label === "Incluido manualmente") {
    return "Incluido manualmente";
  }
  if (label === "Departamento") return "Por su departamento en el catálogo";
  if (label === "Excluido") return "Excluido de este aviso";
  if (label.startsWith("Rol: ")) {
    return `Rol: ${label.slice(5)}`;
  }
  if (label.startsWith("Permiso: ")) {
    const slug = label.slice(9);
    return `Permiso ${slug.replaceAll(":", " · ")}`;
  }
  if (label.startsWith("Broadcast: ")) {
    return `Miembro de la app ${label.slice(11)}`;
  }
  if (label === "Departamento Administración") {
    return "Trabaja en Administración";
  }
  if (label === "Departamento Capacitación") {
    return "Trabaja en Capacitación";
  }
  if (label === "Sin motivo definido") return "Sin motivo definido";
  if (label === "Creador de la requisición") {
    return "Cuando crea o es el solicitante de la requisición";
  }
  if (label === "Líder de gerencia") {
    return "Cuando debe aprobar como líder de gerencia";
  }
  if (label === "Coordinador de departamento") {
    return "Cuando debe aprobar como coordinador";
  }
  if (label === "Destinatario / asignado") {
    return "Cuando le mencionan o asignan directamente";
  }
  if (label === "Solo cuando participa en el evento") {
    return label;
  }
  return label;
}

export function format_subscription_reasons(labels: string[]): string {
  const readable = labels
    .filter(
      (l) =>
        l !== "Sin criterio configurado" &&
        l !== "Sin motivo definido" &&
        l !== "Excluido",
    )
    .map(humanize_subscription_reason);
  if (readable.length === 0) return "Sin motivo definido";
  return readable.join(" · ");
}

export type UserSubscriptionPartition = {
  receives: UserEventSubscriptionRow[];
  does_not_receive: UserEventSubscriptionRow[];
  /** Menciones, aprobaciones puntuales, etc. — no son suscripción fija */
  situational: UserEventSubscriptionRow[];
  /** Llegó a la campana pero no está en la lista de «recibe» */
  recent_inbox_only: UserEventSubscriptionRow[];
};

export function partition_user_subscription_rows(
  rows: UserEventSubscriptionRow[],
): UserSubscriptionPartition {
  const receives: UserEventSubscriptionRow[] = [];
  const does_not_receive: UserEventSubscriptionRow[] = [];
  const recent_inbox_only: UserEventSubscriptionRow[] = [];

  for (const row of rows) {
    if (row.subscribed) {
      receives.push(row);
      continue;
    }
    does_not_receive.push(row);
    if (row.received_in_inbox) {
      recent_inbox_only.push(row);
    }
  }

  receives.sort((a, b) => a.title.localeCompare(b.title, "es"));
  does_not_receive.sort((a, b) => a.title.localeCompare(b.title, "es"));
  recent_inbox_only.sort((a, b) => a.title.localeCompare(b.title, "es"));

  const situational = does_not_receive.filter((row) => row.conditional);

  return { receives, does_not_receive, situational, recent_inbox_only };
}

export type SubscriptionGroupBucket = {
  group_id: NotificationCatalogGroupId;
  label: string;
  receives: UserEventSubscriptionRow[];
  does_not_receive: UserEventSubscriptionRow[];
};

export function group_subscription_partition(
  partition: UserSubscriptionPartition,
): SubscriptionGroupBucket[] {
  const buckets = new Map<NotificationCatalogGroupId, SubscriptionGroupBucket>();

  const ensure = (row: UserEventSubscriptionRow) => {
    const group_id = resolve_catalog_group(row);
    if (!buckets.has(group_id)) {
      buckets.set(group_id, {
        group_id,
        label: get_catalog_group_meta(group_id).label,
        receives: [],
        does_not_receive: [],
      });
    }
    return buckets.get(group_id)!;
  };

  for (const row of partition.receives) {
    ensure(row).receives.push(row);
  }
  for (const row of partition.does_not_receive) {
    ensure(row).does_not_receive.push(row);
  }

  return Array.from(buckets.values())
    .filter((b) => b.receives.length > 0 || b.does_not_receive.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function subscribed_titles(rows: UserEventSubscriptionRow[]): string[] {
  return rows.filter((row) => row.subscribed).map((row) => row.title);
}
