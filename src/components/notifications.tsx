"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { Bell, Phone, Check, X } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CallbackNotification {
  id: string;
  contactId: string;
  contactName: string;
  date: string;
  time: string;
  note: string;
  agentName?: string;
}

type ToastType = "info" | "success" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  createdAt: number;
}

interface NotificationContextValue {
  notifications: CallbackNotification[];
  unreadCount: number;
  dismiss: (id: string) => void;
  addToast: (type: ToastType, title: string, message?: string) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

export function useToast() {
  const { addToast } = useNotifications();
  return addToast;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<CallbackNotification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const browserNotifiedRef = useRef<Set<string>>(new Set());
  const toastIdRef = useRef(0);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Poll for upcoming callbacks every 60s
  const fetchUpcoming = useCallback(async () => {
    try {
      const res = await fetch("/api/callbacks?upcoming=true");
      if (!res.ok) return;
      const data = await res.json();
      const cbs: CallbackNotification[] = (data.callbacks || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cb: any) => ({
          id: cb.id,
          contactId: cb.contactId,
          contactName: [cb.contactFirstName, cb.contactLastName].filter(Boolean).join(" ") || "Neznámý",
          date: cb.date,
          time: cb.time,
          note: cb.note || "",
          agentName: cb.agentName,
        })
      );
      setNotifications(cbs);

      // Cleanup: remove entries from browserNotifiedRef that are no longer active
      const activeIds = new Set(cbs.map((cb: CallbackNotification) => cb.id));
      for (const id of browserNotifiedRef.current) {
        if (!activeIds.has(id)) browserNotifiedRef.current.delete(id);
      }

      // Check for callbacks within 15 minutes and trigger browser + toast
      const now = new Date();
      for (const cb of cbs) {
        if (!cb.time || browserNotifiedRef.current.has(cb.id)) continue;
        const cbDate = new Date(cb.date + "T" + cb.time);
        if (isNaN(cbDate.getTime())) continue;
        const diffMs = cbDate.getTime() - now.getTime();
        if (diffMs >= 0 && diffMs <= 15 * 60 * 1000) {
          browserNotifiedRef.current.add(cb.id);
          // Browser notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Callback za 15 minut", {
              body: `${cb.contactName} v ${cb.time}${cb.note ? " - " + cb.note : ""}`,
              icon: "/favicon.ico",
            });
          }
          // In-app toast
          addToastInternal(
            "warning",
            `Callback za ${Math.ceil(diffMs / 60000)} min`,
            `${cb.contactName} v ${cb.time}`
          );
        }
      }
    } catch {
      // silently ignore fetch errors
    }
  }, []);

  useEffect(() => {
    fetchUpcoming();
    const interval = setInterval(fetchUpcoming, 60_000);
    return () => clearInterval(interval);
  }, [fetchUpcoming]);

  // Internal toast adder (no deps on context)
  const addToastInternal = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = `toast_${++toastIdRef.current}_${Date.now()}`;
      setToasts((prev) => [...prev, { id, type, title, message, createdAt: Date.now() }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismiss = useCallback((callbackId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(callbackId);
      return next;
    });
    // Mark as completed on the server
    fetch(`/api/callbacks/${callbackId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    }).catch(() => {});
  }, []);

  const visibleNotifications = notifications.filter((n) => !dismissed.has(n.id));

  const value: NotificationContextValue = {
    notifications: visibleNotifications,
    unreadCount: visibleNotifications.length,
    dismiss,
    addToast: addToastInternal,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </NotificationContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// NotificationBell
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const { notifications, unreadCount, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-xl bg-surface2 flex items-center justify-center text-txt3 hover:text-txt transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[420px] glass rounded-2xl border border-border shadow-2xl z-50 overflow-hidden animate-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">Oznámení</span>
            <span className="text-[10px] text-txt3 uppercase tracking-wider">
              {unreadCount} callback{unreadCount !== 1 ? "ů" : ""}
            </span>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[340px]">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-txt3 text-sm">
                Žádné nadcházející callbacky
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b border-border/50 hover:bg-surface2/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <Phone size={12} className="text-accent" />
                        </div>
                        <span className="text-sm font-medium truncate">{n.contactName}</span>
                      </div>
                      <div className="mt-1 ml-8">
                        <span className="text-[11px] text-accent font-medium">{n.time}</span>
                        {n.note && (
                          <p className="text-xs text-txt3 mt-0.5 line-clamp-2">{n.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                      <Link
                        href={`/contacts/${n.contactId}`}
                        onClick={() => setOpen(false)}
                        className="w-7 h-7 rounded-lg bg-accent/10 hover:bg-accent/20 flex items-center justify-center text-accent transition-colors"
                        title="Zavolat"
                      >
                        <Phone size={13} />
                      </Link>
                      <button
                        onClick={() => dismiss(n.id)}
                        className="w-7 h-7 rounded-lg bg-green/10 hover:bg-green/20 flex items-center justify-center text-green transition-colors"
                        title="Označit jako hotové"
                      >
                        <Check size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast Container
// ---------------------------------------------------------------------------

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  info: { bg: "bg-accent/10", border: "border-accent/20", icon: "text-accent" },
  success: { bg: "bg-green/10", border: "border-green/20", icon: "text-green" },
  warning: { bg: "bg-yellow/10", border: "border-yellow/20", icon: "text-yellow" },
};

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = TOAST_COLORS[toast.type];

  return (
    <div
      className={`pointer-events-auto w-[340px] rounded-xl ${colors.bg} border ${colors.border} backdrop-blur-xl px-4 py-3 shadow-2xl animate-in`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${colors.icon}`}>{toast.title}</div>
          {toast.message && (
            <p className="text-xs text-txt2 mt-0.5">{toast.message}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-txt3 hover:text-txt transition-colors flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
