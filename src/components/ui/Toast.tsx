"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastOptions {
  title?: string;
  /** ms antes de auto-cerrar. Por defecto según tipo (error nunca auto-cierra). */
  duration?: number;
}

interface ToastContextValue {
  success: (message: string, opts?: ToastOptions) => string;
  error: (message: string, opts?: ToastOptions) => string;
  warning: (message: string, opts?: ToastOptions) => string;
  info: (message: string, opts?: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const DEFAULT_DURATION: Record<ToastType, number | null> = {
  success: 4000,
  warning: 6000,
  info: 4000,
  error: null, // persiste hasta que el usuario lo cierre
};

const TOAST_CFG: Record<ToastType, { icon: string; accent: string; iconBg: string }> = {
  success: { icon: "check_circle", accent: "#27AE60", iconBg: "#27AE601a" },
  error:   { icon: "cancel",       accent: "#E74C3C", iconBg: "#E74C3C1a" },
  warning: { icon: "warning",      accent: "#F39C12", iconBg: "#F39C121a" },
  info:    { icon: "info",         accent: "#3498DB", iconBg: "#3498DB1a" },
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const push = useCallback((type: ToastType, message: string, opts?: ToastOptions) => {
    const id = uid();
    setToasts((prev) => [...prev, { id, type, message, title: opts?.title }]);
    const duration = opts?.duration ?? DEFAULT_DURATION[type];
    if (duration !== null) {
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    }
    return id;
  }, [dismiss]);

  const value: ToastContextValue = {
    success: (m, o) => push("success", m, o),
    error: (m, o) => push("error", m, o),
    warning: (m, o) => push("warning", m, o),
    info: (m, o) => push("info", m, o),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2.5 w-[calc(100vw-2rem)] sm:w-[360px] pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const cfg = TOAST_CFG[toast.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
      transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
 className="pointer-events-auto flex items-start gap-3 bg-white rounded-xl shadow-lg border border-slate-200 p-3.5 pr-3"
      style={{ borderLeftWidth: 3, borderLeftColor: cfg.accent }}
      role="alert"
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: cfg.iconBg, color: cfg.accent }}
      >
        <Icon name={cfg.icon} size={17} />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
 {toast.title && <p className="text-[13px] font-bold text-slate-900 leading-snug">{toast.title}</p>}
 <p className="text-[12.5px] text-slate-600 leading-snug">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        aria-label="Cerrar notificación"
 className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
      >
        <Icon name="close" size={13} />
      </button>
    </motion.div>
  );
}
