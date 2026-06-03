"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Filter,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { InboxNotification } from "@/types";
import { markAsRead, markAllAsRead } from "@/actions/notifications";
import { getAppByDbSlug } from "@/config/apps";

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] =
    useState<InboxNotification | null>(null);
  const router = useRouter();

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const fetchNotifications = useCallback(
    async (uid: string, pageNum: number, unreadOnly: boolean) => {
      try {
        const supabase = createClient();
        setError(null);
        console.log(
          "Fetching notifications for user:",
          uid,
          "page:",
          pageNum,
          "unreadOnly:",
          unreadOnly,
        );

        // Build the query
        let countQuery = supabase
          .schema("notify")
          .from("inbox")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id_auth", uid);

        let dataQuery = supabase
          .schema("notify")
          .from("inbox")
          .select(
            "id, title, body, link_path, read_at, created_at, priority, app_slug, event_key",
          )
          .eq("recipient_id_auth", uid);

        // Add read_at filter only if unreadOnly is true
        if (unreadOnly) {
          countQuery = countQuery.is("read_at", null);
          dataQuery = dataQuery.is("read_at", null);
        }

        // Add ordering
        dataQuery = dataQuery
          .order("read_at", { ascending: true, nullsFirst: true })
          .order("created_at", { ascending: false })
          .limit(50);

        // Get total count
        const { count, error: countError } = await countQuery;

        if (countError) {
          console.error("Error fetching count:", countError);
          setError("Error al cargar notificaciones");
          setLoading(false);
          return;
        }

        console.log("Total count:", count);
        if (count !== null) setTotalCount(count);

        // Fetch notifications data
        const { data, error: dataError } = await dataQuery;

        if (dataError) {
          console.error("Error fetching notifications:", dataError);
          setError("Error al cargar notificaciones");
        } else {
          console.log("Fetched notifications:", data?.length);
          if (data) setNotifications(data as InboxNotification[]);
        }
        setLoading(false);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("Error al cargar notificaciones");
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      await fetchNotifications(user.id, page, filterUnreadOnly);
    };
    init();
  }, [fetchNotifications, page, filterUnreadOnly]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("notify-inbox-changes-page")
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

  const handleNotificationClick = async (notification: InboxNotification) => {
    setSelectedNotification(notification);
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
  };

  const handleNotificationAction = async (notification: InboxNotification) => {
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
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? now })),
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Notificaciones
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Check className="h-4 w-4" />
              Marcar todas como leídas
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? "No tienes notificaciones"
            : `${totalCount} notificación${totalCount !== 1 ? "es" : ""} en total`}
        </p>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 bg-white px-8 py-3 flex items-center gap-4">
        <button
          onClick={() => setFilterUnreadOnly(false)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            !filterUnreadOnly
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50",
          )}
        >
          Todas
        </button>
        <button
          onClick={() => setFilterUnreadOnly(true)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            filterUnreadOnly
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50",
          )}
        >
          <Filter className="h-4 w-4" />
          No leídas
        </button>
        {unreadCount > 0 && !filterUnreadOnly && (
          <span className="text-sm text-gray-500 ml-auto">
            {unreadCount} sin leer
          </span>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column - Notification list */}
        <div className="w-96 border-r border-gray-200 bg-white overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="text-sm text-gray-400">
                Cargando notificaciones...
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="p-4 rounded-full bg-red-100">
                <Bell className="h-8 w-8 text-red-300" />
              </div>
              <span className="text-sm text-gray-500">{error}</span>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  if (userId)
                    fetchNotifications(userId, page, filterUnreadOnly);
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Reintentar
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="p-4 rounded-full bg-gray-100">
                <Bell className="h-8 w-8 text-gray-300" />
              </div>
              <span className="text-sm text-gray-400">
                {filterUnreadOnly
                  ? "No hay notificaciones sin leer"
                  : "Sin notificaciones"}
              </span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((n) => {
                const originApp = getAppByDbSlug(n.app_slug);
                const isUnread = !n.read_at;
                const isSelected = selectedNotification?.id === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors hover:bg-gray-50 flex items-start gap-3",
                      isUnread && "bg-blue-50/30",
                      isSelected && "bg-blue-50 border-l-4 border-blue-500",
                    )}
                  >
                    {/* Left: app color bar */}
                    <div
                      className={cn(
                        "mt-1 flex-shrink-0 w-1 self-stretch rounded-full",
                        originApp ? originApp.badge.dot : "bg-gray-200",
                      )}
                    />

                    <div className="flex-1 min-w-0">
                      {/* App pill + timestamp row */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        {originApp ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border",
                              originApp.badge.bg,
                              originApp.badge.text,
                              originApp.badge.border,
                            )}
                          >
                            <originApp.icon className="h-2.5 w-2.5" />
                            {originApp.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                            {n.app_slug}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 shrink-0">
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
                          "text-xs leading-snug mb-0.5",
                          isUnread
                            ? "font-semibold text-gray-900"
                            : "font-medium text-gray-600",
                        )}
                      >
                        {n.title}
                      </p>

                      {/* Body */}
                      {n.body && (
                        <p className="text-[11px] text-gray-500 line-clamp-1 leading-relaxed">
                          {n.body}
                        </p>
                      )}
                    </div>

                    {/* Unread dot */}
                    {isUnread && (
                      <span
                        className={cn(
                          "mt-1.5 flex-shrink-0 h-1.5 w-1.5 rounded-full",
                          originApp ? originApp.badge.dot : "bg-blue-500",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && notifications.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                Página {page} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className={cn(
                    "p-1.5 rounded border transition-colors",
                    page === 1
                      ? "border-gray-200 text-gray-300 cursor-not-allowed"
                      : "border-gray-300 text-gray-600 hover:bg-gray-100",
                  )}
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <span className="text-xs text-gray-600 px-2">{page}</span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className={cn(
                    "p-1.5 rounded border transition-colors",
                    page === totalPages
                      ? "border-gray-200 text-gray-300 cursor-not-allowed"
                      : "border-gray-300 text-gray-600 hover:bg-gray-100",
                  )}
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column - Notification details */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {selectedNotification ? (
            <div className="p-8 max-w-3xl mx-auto">
              {/* Header */}
              <div className="mb-6">
                {(() => {
                  const originApp = getAppByDbSlug(
                    selectedNotification.app_slug,
                  );
                  return originApp ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold border mb-4",
                        originApp.badge.bg,
                        originApp.badge.text,
                        originApp.badge.border,
                      )}
                    >
                      <originApp.icon className="h-4 w-4" />
                      {originApp.name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold bg-gray-100 text-gray-500 border border-gray-200 mb-4">
                      {selectedNotification.app_slug}
                    </span>
                  );
                })()}

                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {selectedNotification.title}
                </h2>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>
                    {new Date(selectedNotification.created_at).toLocaleString(
                      "es-VE",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </span>
                  {!selectedNotification.read_at && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                      No leída
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              {selectedNotification.body && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedNotification.body}
                  </p>
                </div>
              )}

              {/* Action button */}
              {selectedNotification.link_path && (
                <button
                  onClick={() => handleNotificationAction(selectedNotification)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ir a la notificación
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-400">
              <Bell className="h-12 w-12" />
              <p className="text-sm">
                Selecciona una notificación para ver los detalles
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
