
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, LoaderCircle, X } from "lucide-react";
import { djangoApi } from "../services/api";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [listResponse, countResponse] = await Promise.all([
        djangoApi.get("/notifications/"),
        djangoApi.get("/notifications/unread-count/"),
      ]);

      const listData = listResponse.data;
      const items = Array.isArray(listData)
        ? listData
        : listData?.results ||
          listData?.notifications ||
          listData?.data ||
          [];

      setNotifications(items);

      const countData = countResponse.data;
      const count = Number(
        countData?.unread_count ??
          countData?.count ??
          countData?.unread ??
          0
      );

      setUnreadCount(
        Number.isFinite(count)
          ? Math.max(0, count)
          : items.filter((item) => !item.is_read).length
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load notifications. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const interval = window.setInterval(loadNotifications, 30000);

    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function markAsRead(notification) {
    if (notification.is_read) return;

    try {
      await djangoApi.post(
        `/notifications/${notification.id}/read/`
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );

      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to mark this notification as read."
      );
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0) return;

    try {
      await djangoApi.post("/notifications/mark-all-read/");

      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      );

      setUnreadCount(0);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to mark all notifications as read."
      );
    }
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          if (!open) loadNotifications();
        }}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
      >
        <Bell size={21} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
            <div>
              <h2 className="font-bold text-slate-900">
                Notifications
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {unreadCount} unread
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                title="Mark all as read"
                aria-label="Mark all as read"
                className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCheck size={18} />
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700"
            >
              {error}
            </div>
          )}

          <div className="max-h-[26rem] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
                <LoaderCircle size={18} className="animate-spin" />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Bell size={22} />
                </div>
                <p className="mt-3 font-semibold text-slate-800">
                  You're all caught up
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  New notifications will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`border-b border-slate-100 px-4 py-4 last:border-b-0 ${
                    notification.is_read
                      ? "bg-white"
                      : "bg-indigo-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        notification.is_read
                          ? "bg-slate-300"
                          : "bg-indigo-600"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-sm font-semibold text-slate-900">
                        {notification.title || "Notification"}
                      </h3>

                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-600">
                        {notification.message || notification.body || ""}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">
                          {formatDate(
                            notification.created_at ||
                              notification.timestamp
                          )}
                        </span>

                        {!notification.is_read && (
                          <button
                            type="button"
                            onClick={() => markAsRead(notification)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            <Check size={14} />
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
            <button
              type="button"
              onClick={loadNotifications}
              disabled={loading}
              className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh notifications"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}