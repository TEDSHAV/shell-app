import type { UserEventSubscriptionRow } from "@/lib/notification-recipient/types";

export type InboxEventAggregate = {
  app_slug: string;
  event_key: string;
  count: number;
  last_received_at: string;
  title_sample: string | null;
};

export type UserInboxSummary = {
  total: number;
  events: InboxEventAggregate[];
};

export type InboxSummariesByAuthId = Map<string, UserInboxSummary>;

const INBOX_LOOKBACK_DAYS = 90;

export function inbox_lookback_iso(): string {
  const date = new Date();
  date.setDate(date.getDate() - INBOX_LOOKBACK_DAYS);
  return date.toISOString();
}

export function aggregate_inbox_rows(
  rows: Array<{
    recipient_id_auth: string;
    app_slug: string;
    event_key: string;
    title: string;
    created_at: string;
  }>,
): InboxSummariesByAuthId {
  const by_auth = new Map<string, Map<string, InboxEventAggregate>>();

  for (const row of rows) {
    const auth_id = row.recipient_id_auth;
    const event_key = `${row.app_slug}:${row.event_key}`;
    if (!by_auth.has(auth_id)) {
      by_auth.set(auth_id, new Map());
    }
    const events = by_auth.get(auth_id)!;
    const current = events.get(event_key) ?? {
      app_slug: row.app_slug,
      event_key: row.event_key,
      count: 0,
      last_received_at: row.created_at,
      title_sample: row.title,
    };
    current.count += 1;
    if (row.created_at > current.last_received_at) {
      current.last_received_at = row.created_at;
      current.title_sample = row.title;
    }
    events.set(event_key, current);
  }

  const out: InboxSummariesByAuthId = new Map();
  for (const [auth_id, events] of by_auth) {
    const list = Array.from(events.values()).sort((a, b) =>
      b.last_received_at.localeCompare(a.last_received_at),
    );
    out.set(auth_id, {
      total: list.reduce((sum, item) => sum + item.count, 0),
      events: list,
    });
  }
  return out;
}

export function merge_inbox_into_subscription_rows(
  rows: UserEventSubscriptionRow[],
  inbox: UserInboxSummary | undefined,
): UserEventSubscriptionRow[] {
  if (!inbox || inbox.events.length === 0) return rows;

  const by_key = new Map(rows.map((row) => [`${row.app_slug}:${row.event_key}`, row]));
  const merged = rows.map((row) => {
    const hit = inbox.events.find(
      (item) => item.app_slug === row.app_slug && item.event_key === row.event_key,
    );
    if (!hit) return row;
    return {
      ...row,
      received_in_inbox: true,
      inbox_count: hit.count,
    };
  });

  for (const item of inbox.events) {
    const key = `${item.app_slug}:${item.event_key}`;
    if (by_key.has(key)) continue;
    merged.push({
      app_slug: item.app_slug,
      event_key: item.event_key,
      title: item.title_sample ?? item.event_key,
      description: null,
      is_active: true,
      subscribed: false,
      conditional: false,
      received_in_inbox: true,
      inbox_count: item.count,
      condition_labels: [`Recibida en bandeja (${item.count} en 90 días)`],
    });
  }

  return merged;
}

export function inbox_display_titles(
  summary: UserInboxSummary | undefined,
  max = 5,
): string[] {
  if (!summary) return [];
  return summary.events
    .map((item) => item.title_sample ?? item.event_key)
    .slice(0, max);
}
