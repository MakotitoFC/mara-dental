"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/components/layout/AuthProvider";
import { staggerContainer, staggerItem, fadeIn, scaleIn } from "@/lib/animations";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import type { CumpleañosHoy, DashboardData } from "../actions";

function saludoDelDia() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function initials(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

function AlertRow({
  icon, iconBg, iconColor, title, subtitle, href, actionLabel, onAction,
}: {
  icon: string; iconBg: string; iconColor: string; title: string; subtitle: string;
  href?: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
 <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
      <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon name={icon} size={17} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
 <p className="text-[13px] font-semibold text-slate-900 truncate">{title}</p>
 <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
      </div>
      {href ? (
        <Link href={href} className="shrink-0 text-[12px] font-semibold text-cyan-600 hover:text-cyan-700">
          Ver
        </Link>
      ) : (
        <button onClick={onAction} className="shrink-0 text-[12px] font-semibold text-cyan-600 hover:text-cyan-700">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function BirthdayModal({ pacientes, onClose }: { pacientes: CumpleañosHoy[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const p = pacientes[idx];
  const [mensaje, setMensaje] = useState(`¡Feliz cumpleaños ${p.nombre}! 🎉 Le deseamos un excelente día. — MaraDental`);

  useEffect(() => {
    setMensaje(`¡Feliz cumpleaños ${pacientes[idx].nombre}! 🎉 Le deseamos un excelente día. — MaraDental`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  return (
    <motion.div
      variants={fadeIn} initial="hidden" animate="visible" exit="exit"
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        variants={scaleIn} initial="hidden" animate="visible" exit="exit"
 className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
 <button onClick={onClose} className="self-end -mt-2 -mr-2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <Icon name="close" size={18} />
        </button>
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
 className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center -mt-4"
        >
 <Icon name="cake" size={26} className="text-red-500"/>
        </motion.div>
 <p className="text-[15px] font-bold text-slate-900">¡Hoy cumple años!</p>

 <div className="w-16 h-16 rounded-full bg-cyan-50 border-2 border-cyan-200 flex items-center justify-center font-bold text-[18px] text-cyan-700">
          {initials(p.nombre)}
        </div>
 <p className="text-[14px] font-semibold text-slate-800">{p.nombre} · {p.edad} años</p>

        {pacientes.length > 1 && (
 <div className="flex items-center gap-2 text-[11px] text-slate-400">
 <button onClick={() => setIdx((i) => (i - 1 + pacientes.length) % pacientes.length)} className="hover:text-slate-700">
              <Icon name="chevron_left" size={16} />
            </button>
            {idx + 1} de {pacientes.length}
 <button onClick={() => setIdx((i) => (i + 1) % pacientes.length)} className="hover:text-slate-700">
              <Icon name="chevron_right" size={16} />
            </button>
          </div>
        )}

        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={3}
 className="w-full border border-slate-200 bg-white text-slate-800 rounded-xl px-3 py-2.5 text-[16px] sm:text-[13px] text-left outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 resize-none"
        />

        <div className="flex items-center gap-2.5 w-full">
 <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-[13px] font-medium transition-colors">
            Más tarde
          </button>
          <button
            disabled
            title="Próximamente disponible"
            className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600/40 text-white text-[13px] font-medium cursor-not-allowed"
          >
            <Icon name="chat" size={15} />
            Enviar Telegram
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 800;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display}</>;
}

const QUICK_ACCESS = [
  { href: "/agenda", icon: "add_circle", label: "Nueva cita" },
  { href: "/pacientes", icon: "person_search", label: "Buscar paciente" },
  { href: "/agenda", icon: "calendar_month", label: "Ver calendario" },
];

const ESTADO_CITA_CFG: Record<string, { label: string; bg: string; text: string }> = {
 hecho: { label: "Completada", bg: "bg-emerald-50", text: "text-emerald-700"},
 programada: { label: "Pendiente", bg: "bg-amber-50", text: "text-amber-700"},
 cancelada: { label: "Cancelada", bg: "bg-slate-100", text: "text-slate-500"},
};

function duracionMin(inicio: string, fin: string): number | null {
  const [h1, m1] = inicio.split(" : ").map(Number);
  const [h2, m2] = fin.split(" : ").map(Number);
  if ([h1, m1, h2, m2].some((n) => Number.isNaN(n))) return null;
  const diff = h2 * 60 + m2 - (h1 * 60 + m1);
  return diff > 0 ? diff : null;
}

export function DashboardView({ data }: { data: DashboardData }) {
  const { citas, cumpleañosHoy, statsCitasHoy, statsCompletas, statsPendientes, statsPacientesMes, recordatoriosPendientes } = data;
  const { user } = useAuth();
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const { getVars } = useTipoConsultaVars();

  const STATS = [
    { label: "Citas hoy", value: statsCitasHoy, icon: "calendar_month" },
    { label: "Completadas", value: statsCompletas, icon: "check_circle" },
    { label: "Pacientes este mes", value: statsPacientesMes, icon: "groups" },
  ];

  const sinAlertas = statsPendientes === 0 && recordatoriosPendientes === 0 && cumpleañosHoy.length === 0;
  const hoyStr = new Date().toISOString().split("T")[0];
  const citasHoy = citas.filter((c) => c.fecha === hoyStr);
  const fechaLarga = new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
      className="w-full max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-5 sm:gap-6"
    >
      {/* Bienvenida — el saludo personalizado es exclusivo del rol doctor;
          otros roles que también llegan a este dashboard (admin, contador)
          solo ven el encabezado genérico. */}
      <motion.div variants={staggerItem} className="flex items-center gap-2.5 min-w-0">
        <div className="min-w-0">
 <p className="text-[15px] sm:text-[17px] font-semibold text-slate-900 leading-tight truncate">
            {user?.rol === "doctor" ? `${saludoDelDia()}${user?.name ? `, ${user.name}` : ""}` : "Resumen del día"}
          </p>
 <p className="text-[11px] sm:text-[12px] text-slate-400 capitalize truncate">
            {fechaLarga}{user?.sede ? ` · ${user.sede}` : ""}
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={staggerItem} className="grid grid-cols-3 gap-2 sm:gap-4">
        {STATS.map((stat) => (
 <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
 <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
 <Icon name={stat.icon} size={16} className="sm:hidden text-cyan-600"/>
 <Icon name={stat.icon} size={20} className="hidden sm:block text-cyan-600"/>
            </div>
            <div className="min-w-0">
 <p className="text-[16px] sm:text-[22px] font-bold text-slate-900 leading-none">
                <AnimatedNumber value={stat.value} />
              </p>
 <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-5 sm:gap-6">
        {/* Columna principal — Agenda de hoy */}
        <motion.div variants={staggerItem} className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
 <p className="text-[13px] font-semibold text-slate-900">Agenda de hoy</p>
            {statsCitasHoy > 0 && (
 <span className="text-[11px] font-medium text-slate-400">{statsCompletas}/{statsCitasHoy} completadas</span>
            )}
          </div>

          {citasHoy.length === 0 ? (
 <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center gap-2 text-center">
 <Icon name="event" size={28} className="text-slate-300"/>
 <p className="text-[13px] text-slate-500">No tienes citas programadas para hoy</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {citasHoy.map((cita, i) => {
                const vars = getVars(cita.tipo_consulta_id);
                const estadoCfg = ESTADO_CITA_CFG[cita.estado] ?? ESTADO_CITA_CFG.programada;
                const dur = duracionMin(cita.hora_inicio, cita.hora_fin);
                return (
                  <motion.div
                    key={cita.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.04, ease: [0.4, 0, 0.2, 1] }}
 className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex items-center gap-3"
                    style={{ borderLeftWidth: 3, borderLeftColor: vars.solid }}
                  >
                    <div className="w-14 sm:w-16 shrink-0 text-center">
 <p className="text-[13px] sm:text-[14px] font-bold text-slate-900 leading-none">{cita.hora_inicio}</p>
 {dur != null && <p className="text-[10px] text-slate-400 mt-1">{dur} min</p>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: vars.bg, color: vars.text }}
                        >
                          {vars.label}
                        </span>
                      </div>
                      <Link
                        href={`/pacientes/${cita.paciente_id}`}
 className="text-[13px] font-semibold text-slate-800 truncate hover:text-cyan-700 block"
                      >
                        {cita.paciente_nombre}
                      </Link>
                      {cita.telefono && (
 <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Icon name="phone" size={11} />
                          {cita.telefono}
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full ${estadoCfg.bg} ${estadoCfg.text}`}>
                      {estadoCfg.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Columna lateral — Acceso rápido + Alertas */}
        <motion.div variants={staggerItem} className="dashboard-sidebar-width shrink-0 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Acceso rápido</p>
            {/* grid-cols-3 en todos los breakpoints — mismo diseño que
                mobile. Con lg:grid-cols-2 los 3 items quedaban 2+1, con el
                tercero solo en su fila (deformado) en vez de parejo. */}
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACCESS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
 className="flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl py-4 hover:border-cyan-300 hover:bg-cyan-50/40 active:scale-[0.98] transition-all"
                >
 <div className="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center">
 <Icon name={item.icon} size={18} className="text-cyan-600"/>
                  </div>
 <span className="text-[11px] font-medium text-slate-700 text-center px-1">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Alertas</p>
            <div className="flex flex-col gap-2">
              {statsPendientes > 0 && (
                <AlertRow
                  icon="schedule" iconBg="bg-amber-50" iconColor="text-amber-600"
                  title={`${statsPendientes} cita${statsPendientes !== 1 ? "s" : ""} sin confirmar`}
                  subtitle="Requieren confirmación"
                  href="/agenda?view=day&action=scroll-pending"
                />
              )}
              {recordatoriosPendientes > 0 && (
                <AlertRow
                  icon="notifications" iconBg="bg-cyan-50" iconColor="text-cyan-600"
                  title={`${recordatoriosPendientes} recordatorio${recordatoriosPendientes !== 1 ? "s" : ""} programado${recordatoriosPendientes !== 1 ? "s" : ""}`}
                  subtitle="Mensajes pendientes de envío"
                  href="/agenda"
                />
              )}
              {cumpleañosHoy.length > 0 && (
                <AlertRow
                  icon="cake" iconBg="bg-red-50" iconColor="text-red-600"
                  title={`${cumpleañosHoy.length} cumpleaños hoy`}
                  subtitle={cumpleañosHoy.map((p) => p.nombre).join(", ")}
                  actionLabel="Saludar"
                  onAction={() => setBirthdayOpen(true)}
                />
              )}
              {sinAlertas && <p className="text-[12.5px] text-slate-400 py-1">Sin alertas por ahora</p>}
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {birthdayOpen && cumpleañosHoy.length > 0 && (
          <BirthdayModal pacientes={cumpleañosHoy} onClose={() => setBirthdayOpen(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
