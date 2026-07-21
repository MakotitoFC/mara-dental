"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "./AuthProvider";
import { getAlertasAction, type AlertasData } from "./alertas.actions";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface HeaderProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

/** Sede del usuario actual (usuarios.sede_id → sede.nombre_clinica) — 1 por usuario, sin selección. */
function SedeDisplay({ sede }: { sede?: string }) {
  if (!sede) return null;
  return (
    <div
      className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] font-medium text-slate-700 dark:text-slate-200"
      title={sede}
    >
      <Icon name="location_on" size={15} className="text-slate-400 shrink-0" />
      <span className="truncate max-w-[140px]">{sede}</span>
    </div>
  );
}

const DISMISSED_KEY = "maradental:alertas-dismissed";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function writeDismissed(set: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
}

const fmtHoraCita = (fecha: string, hora: string) => {
  const hoyStr = new Date().toISOString().split("T")[0];
  const dia = fecha === hoyStr ? "Hoy" : new Date(fecha + "T12:00:00").toLocaleDateString("es-PE", { weekday: "short", day: "numeric" });
  return `${dia} · ${hora}`;
};

interface AlertRowDef { key: string; icon: string; iconColor: string; iconBg: string; title: string; subtitle: string; }

/** Alertas inteligentes: citas próximas (24-48h), cumpleaños de la semana, alergias con cita hoy, tratamientos pendientes. */
function AlertasButton() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AlertasData | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(readDismissed());
    getAlertasAction().then(setData).catch(() => setData({ citasProximas: [], cumpleanos: [], alergias: [], tratamientosPendientes: [] }));
  }, []);

  function dismiss(key: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      writeDismissed(next);
      return next;
    });
  }

  const rows: AlertRowDef[] = [];
  if (data) {
    for (const c of data.citasProximas) {
      rows.push({
        key: `cita:${c.id}`, icon: "schedule", iconColor: "text-cyan-600 dark:text-cyan-400", iconBg: "bg-cyan-50 dark:bg-cyan-900/30",
        title: c.pacienteNombre || "Paciente", subtitle: `Cita próxima · ${fmtHoraCita(c.fecha, c.horaInicio)}`,
      });
    }
    for (const b of data.cumpleanos) {
      rows.push({
        key: `cumple:${b.id}`, icon: "cake", iconColor: "text-[#E91E63]", iconBg: "bg-[#E91E63]/10",
        title: b.nombre, subtitle: b.esHoy ? `Cumple años hoy · ${b.edad} años` : `Cumple años pronto · ${b.edad} años`,
      });
    }
    for (const a of data.alergias) {
      rows.push({
        key: `alergia:${a.id}`, icon: "warning_amber", iconColor: "text-red-600 dark:text-red-400", iconBg: "bg-red-50 dark:bg-red-900/30",
        title: a.pacienteNombre, subtitle: `Alergias: ${a.alergias.join(", ")} · Cita hoy ${a.horaInicio}`,
      });
    }
    for (const t of data.tratamientosPendientes) {
      rows.push({
        key: `tratamiento:${t.id}`, icon: "medical_services", iconColor: "text-amber-600 dark:text-amber-400", iconBg: "bg-amber-50 dark:bg-amber-900/30",
        title: t.pacienteNombre, subtitle: `${t.fase} · ${t.estado}`,
      });
    }
  }

  const visibleRows = rows.filter((r) => !dismissed.has(r.key));
  const count = visibleRows.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="Alertas"
        className="relative w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <Icon name="notifications" size={18} />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-9 z-30 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
              <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">Alertas</p>
              {count > 0 && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); const next = new Set(dismissed); visibleRows.forEach((r) => next.add(r.key)); setDismissed(next); writeDismissed(next); }}
                  className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto no-scrollbar">
              {!data ? (
                <div className="py-8 flex justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-cyan-500 animate-spin" />
                </div>
              ) : count === 0 ? (
                <div className="flex flex-col items-center text-center gap-2 py-6 px-4">
                  <Icon name="notifications" size={22} className="text-slate-300 dark:text-slate-600" />
                  <p className="text-[12.5px] text-slate-500 dark:text-slate-400">Sin alertas por ahora</p>
                </div>
              ) : (
                visibleRows.map((r) => (
                  <div key={r.key} className="flex items-start gap-2.5 px-4 py-2.5 border-b border-slate-50 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors group">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${r.iconBg} ${r.iconColor}`}>
                      <Icon name={r.icon} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{r.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{r.subtitle}</p>
                    </div>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); dismiss(r.key); }}
                      aria-label="Descartar"
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Header({ title, breadcrumbs, actions }: HeaderProps) {
  const { user, logout } = useAuth();

  const backHref = breadcrumbs && breadcrumbs.length >= 2 ? (breadcrumbs[breadcrumbs.length - 2].href ?? "/") : "/";
  const currentLabel = breadcrumbs?.[breadcrumbs.length - 1]?.label ?? "";

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="sticky top-0 z-20 h-[52px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-6 shrink-0 gap-3"
    >
      {/* Lado izquierdo */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <SedeDisplay sede={user?.sede} />

        {breadcrumbs && (
          <>
            <Icon name="chevron_right" size={16} className="text-slate-300 dark:text-slate-600 shrink-0 hidden sm:block" />
            <Link
              href={backHref}
              aria-label="Volver"
              className="sm:hidden w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
            >
              <Icon name="chevron_left" size={18} />
            </Link>

            <span className="sm:hidden text-[14px] font-semibold text-slate-900 dark:text-slate-100 truncate ml-0.5">
              {currentLabel}
            </span>

            <nav className="hidden sm:flex items-center min-w-0">
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <span key={i} className="flex items-center min-w-0">
                    {i > 0 && <Icon name="chevron_right" size={16} className="text-slate-300 dark:text-slate-600 shrink-0 mx-0.5" />}
                    {isLast ? (
                      <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px] lg:max-w-sm">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href ?? "#"}
                        className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shrink-0 whitespace-nowrap"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>
          </>
        )}
      </div>

      {/* Lado derecho */}
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        <AlertasButton />

        <button
          onClick={logout}
          className="md:hidden w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
          title="Cerrar sesión"
        >
          <Icon name="logout" size={17} />
        </button>

        <div className="hidden md:flex items-center gap-2" title={user?.name ?? ""}>
          <div className="w-8 h-8 rounded-full bg-cyan-50 dark:bg-cyan-900/40 border-2 border-cyan-200 dark:border-cyan-800 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400">{user?.initials ?? "…"}</span>
          </div>
          {user?.name && (
            <div className="min-w-0 leading-tight">
              <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">{user.name}</p>
              {user.especialidad && (
                <p className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate max-w-[140px]">{user.especialidad}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
