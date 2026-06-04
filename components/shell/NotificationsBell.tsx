"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { InboxNotification } from "@/types";
import { markAsRead, markAllAsRead } from "@/actions/notifications";
import { getAppByDbSlug } from "@/config/apps";
import { get_app_dot_style, get_app_pill_style } from "@/lib/app-theme";

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const fetchNotifications = useCallback(async (uid: string) => {
    const supabase = createClient();

    // Get total count
    const { count } = await supabase
      .schema("notify")
      .from("inbox")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id_auth", uid);

    if (count !== null) setTotalCount(count);

    // Fetch limited notifications
    const { data } = await supabase
      .schema("notify")
      .from("inbox")
      .select(
        "id, title, body, link_path, read_at, created_at, priority, app_slug, event_key",
      )
      .eq("recipient_id_auth", uid)
      .order("read_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) setNotifications(data as InboxNotification[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await fetchNotifications(user.id);
    };
    init();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("notify-inbox-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "notify",
          table: "inbox",
          filter: `recipient_id_auth=eq.${userId}`,
        },
        (payload: { new: InboxNotification }) => {
          setNotifications((prev) => [payload.new, ...prev]);
          setTotalCount((prev) => prev + 1);
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
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const mouseHandler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", mouseHandler);
    return () => document.removeEventListener("mousedown", mouseHandler);
  }, []);

  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  const handleNotificationClick = async (notification: InboxNotification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, read_at: new Date().toISOString() }
            : n,
        ),
      );
    }
    if (notification.link_path) {
      const app = getAppByDbSlug(notification.app_slug);
      let target = notification.link_path;

      if (app && !target.startsWith(app.basePath)) {
        target = `${app.basePath}${target}`;
      }

      // Special case: Notifications that point to scapacitacion through the shell
      // should always use the /negocios prefix to ensure correct iframe routing
      if (target.includes("/capacitacion/scapacitacion")) {
        target = target.replace(
          "/capacitacion/scapacitacion",
          "/negocios/scapacitacion",
        );
      }

      router.push(target);
      setOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? now })),
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative p-2 rounded-md transition-colors text-slate-500 hover:text-slate-900 hover:bg-slate-100",
          open && "bg-slate-100 text-slate-900",
        )}
        aria-label="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="absolute right-0 mt-1 w-[340px] rounded-xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">
                Notificaciones
              </span>
              {unreadCount > 0 && (
                <span
                  className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: "var(--primary-blue)" }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Marcar leídas
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[440px] overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <span className="text-xs text-gray-400">Cargando...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="p-3 rounded-full bg-gray-100">
                  <Bell className="h-5 w-5 text-gray-300" />
                </div>
                <span className="text-xs text-gray-400">
                  Sin notificaciones
                </span>
              </div>
            ) : (
              notifications.map((n) => {
                const originApp = getAppByDbSlug(n.app_slug);
                const isUnread = !n.read_at;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors hover:bg-gray-50 flex items-start gap-3",
                      isUnread && "bg-blue-50/40",
                    )}
                  >
                    {/* Left: app color bar */}
                    <div
                      className="mt-1 flex-shrink-0 w-1 self-stretch rounded-full bg-gray-200"
                      style={
                        originApp
                          ? get_app_dot_style(originApp.brandColor)
                          : undefined
                      }
                    />

                    <div className="flex-1 min-w-0">
                      {/* App pill + timestamp row */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        {originApp ? (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border"
                            style={get_app_pill_style(originApp.brandColor)}
                          >
                            <originApp.icon className="h-2.5 w-2.5" />
                            {originApp.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                            {n.app_slug}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-300 shrink-0">
                          {new Date(n.created_at).toLocaleString("es-VE", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Title */}
                      <p
                        className={cn(
                          "text-xs leading-snug",
                          isUnread
                            ? "font-semibold text-gray-800"
                            : "font-medium text-gray-500",
                        )}
                      >
                        {n.title}
                      </p>

                      {/* Body */}
                      {n.body && (
                        <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {n.body}
                        </p>
                      )}
                    </div>

                    {/* Unread dot */}
                    {isUnread && (
                      <span
                        className={cn(
                          "mt-1.5 flex-shrink-0 h-1.5 w-1.5 rounded-full",
                          !originApp && "bg-blue-500",
                        )}
                        style={
                          originApp
                            ? get_app_dot_style(originApp.brandColor)
                            : undefined
                        }
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {!loading && notifications.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
              <button
                onClick={() => {
                  router.push("/notifications");
                  setOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors py-1.5"
              >
                {totalCount > 10
                  ? `Ver ${totalCount} notificaciones`
                  : "Ver todas las notificaciones"}
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
