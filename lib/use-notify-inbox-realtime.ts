"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { InboxNotification } from "@/types";

const POLL_MS = 45_000;
const RECONNECT_MS = 2_000;

type UseNotifyInboxRealtimeParams = {
  userId: string | null;
  channelName: string;
  /** Full refresh from DB (source of truth after reconnect / focus). */
  onRefresh: () => void | Promise<void>;
  onInsert?: (row: InboxNotification) => void;
  onUpdate?: (row: InboxNotification) => void;
  /** Soft poll while the tab is visible. Default true. */
  enablePoll?: boolean;
};

/**
 * Keep notify.inbox in sync: Realtime + reconnect + focus refetch + light poll.
 * Relies on RLS (own rows only); also guards by recipient_id_auth client-side.
 */
export function useNotifyInboxRealtime({
  userId,
  channelName,
  onRefresh,
  onInsert,
  onUpdate,
  enablePoll = true,
}: UseNotifyInboxRealtimeParams): void {
  const onRefreshRef = useRef(onRefresh);
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
    onInsertRef.current = onInsert;
    onUpdateRef.current = onUpdate;
  }, [onRefresh, onInsert, onUpdate]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const clearReconnect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const isOwnRow = (row: InboxNotification | null | undefined): boolean => {
      if (!row?.id) return false;
      // Realtime payload may omit recipient when filter/RLS already scoped it.
      if (!row.recipient_id_auth) return true;
      return row.recipient_id_auth === userId;
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      clearReconnect();
      reconnectTimer = setTimeout(() => {
        void startChannel();
      }, RECONNECT_MS);
    };

    const tearDownChannel = async () => {
      if (!channel) return;
      const current = channel;
      channel = null;
      try {
        await supabase.removeChannel(current);
      } catch {
        // ignore cleanup races
      }
    };

    const startChannel = async () => {
      if (disposed) return;
      await tearDownChannel();

      // Ensure Realtime socket has a fresh JWT (avoids silent auth drops).
      try {
        await supabase.auth.getSession();
      } catch {
        scheduleReconnect();
        return;
      }

      const next = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "notify",
            table: "inbox",
            filter: `recipient_id_auth=eq.${userId}`,
          },
          (payload: { new: InboxNotification }) => {
            const row = payload.new;
            if (!isOwnRow(row)) return;
            onInsertRef.current?.(row);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "notify",
            table: "inbox",
            filter: `recipient_id_auth=eq.${userId}`,
          },
          (payload: { new: InboxNotification }) => {
            const row = payload.new;
            if (!isOwnRow(row)) return;
            onUpdateRef.current?.(row);
          },
        )
        .subscribe((status: string, err?: Error) => {
          if (disposed) return;
          if (status === "SUBSCRIBED") {
            clearReconnect();
            return;
          }
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            if (err) {
              console.warn(
                `[useNotifyInboxRealtime] ${channelName} ${status}:`,
                err,
              );
            }
            scheduleReconnect();
          }
        });

      channel = next;
    };

    void startChannel();

    const refreshIfVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void onRefreshRef.current();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Tab woke up: socket may be stale — resubscribe + refetch.
        void startChannel();
        refreshIfVisible();
      }
    };

    const onFocus = () => {
      refreshIfVisible();
    };

    const onOnline = () => {
      void startChannel();
      refreshIfVisible();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    if (enablePoll) {
      pollTimer = setInterval(() => {
        refreshIfVisible();
      }, POLL_MS);
    }

    return () => {
      disposed = true;
      clearReconnect();
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      void tearDownChannel();
    };
  }, [userId, channelName, enablePoll]);
}
