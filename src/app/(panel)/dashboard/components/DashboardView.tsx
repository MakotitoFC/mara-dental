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

function WaveEmoji() {
  return (
    <motion.span
      className="inline-block origin-[70%_70%] text-[28px] sm:text-[32px] leading-none"
      animate={{ rotate: [0, 16, -8, 16, -4, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
    >
      👋
    </motion.span>
  );
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
    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4">
      <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon name={icon} size={17} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
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
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="self-end -mt-2 -mr-2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <Icon name="close" size={18} />
        </button>
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center -mt-4"
        >
          <Icon name="cake" size={26} className="text-rose-500 dark:text-rose-400" />
        </motion.div>
        <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100">¡Hoy cumple años!</p>

        <div className="w-16 h-16 rounded-full bg-cyan-50 dark:bg-cyan-900/30 border-2 border-cyan-200 dark:border-cyan-800 flex items-center justify-center font-bold text-[18px] text-cyan-700 dark:text-cyan-400">
          {initials(p.nombre)}
        </div>
        <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">{p.nombre} · {p.edad} años</p>

        {pacientes.length > 1 && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
            <button onClick={() => setIdx((i) => (i - 1 + pacientes.length) % pacientes.length)} className="hover:text-slate-700 dark:hover:text-slate-300">
              <Icon name="chevron_left" size={16} />
            </button>
            {idx + 1} de {pacientes.length}
            <button onClick={() => setIdx((i) => (i + 1) % pacientes.length)} className="hover:text-slate-700 dark:hover:text-slate-300">
              <Icon name="chevron_right" size={16} />
            </button>
          </div>
        )}

        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={3}
          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[16px] sm:text-[13px] text-left outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 resize-none"
        />

        <div className="flex items-center gap-2.5 w-full">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-[13px] font-medium transition-colors">
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

const fmtFechaCorta = (d: string) => {
  try { return new Date(d + "T12:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "short" }); }
  catch { return d; }
};

export function DashboardView({ data }: { data: DashboardData }) {
  const { citas, cumpleañosHoy, statsCitasHoy, statsCompletas, statsPendientes, recordatoriosPendientes } = data;
  const { user } = useAuth();
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const { getVars } = useTipoConsultaVars();

  const STATS = [
    { label: "Citas hoy", value: statsCitasHoy, icon: "calendar_month", color: "text-cyan-600", bg: "bg-cyan-50" },
    { label: "Completas", value: statsCompletas, icon: "check_circle", color: "text-green-600", bg: "bg-green-50" },
    { label: "Pendientes", value: statsPendientes, icon: "schedule", color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const sinAlertas = statsPendientes === 0 && recordatoriosPendientes === 0 && cumpleañosHoy.length === 0;

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
      className="p-4 sm:p-6 flex flex-col gap-5 sm:gap-7"
    >
      {/* Bienvenida */}
      <motion.div variants={staggerItem} className="flex items-center gap-2">
        <WaveEmoji />
        <p className="text-[15px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100">
          {saludoDelDia()}{user?.name ? `, ${user.name}` : ""}
        </p>
      </motion.div>

      {/* Alertas */}
      <motion.div variants={staggerItem} className="flex flex-col gap-2">
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
              icon="cake" iconBg="bg-rose-50" iconColor="text-rose-600"
              title={`${cumpleañosHoy.length} cumpleaños hoy`}
              subtitle={cumpleañosHoy.map((p) => p.nombre).join(", ")}
              actionLabel="Saludar"
              onAction={() => setBirthdayOpen(true)}
            />
          )}
          {sinAlertas && <p className="text-[12.5px] text-slate-400 py-1">Sin alertas por ahora</p>}
        </div>
      </motion.div>

      <AnimatePresence>
        {birthdayOpen && cumpleañosHoy.length > 0 && (
          <BirthdayModal pacientes={cumpleañosHoy} onClose={() => setBirthdayOpen(false)} />
        )}
      </AnimatePresence>

      {/* Stats */}
      <motion.div variants={staggerItem} className="grid grid-cols-3 gap-3 sm:gap-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
              <Icon name={stat.icon} size={20} className={stat.color} />
            </div>
            <div>
              <p className="text-[22px] font-bold text-slate-900 dark:text-slate-100 leading-none">
                <AnimatedNumber value={stat.value} />
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Acceso rápido */}
      <motion.div variants={staggerItem} className="grid grid-cols-3 gap-3">
        {QUICK_ACCESS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-4 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/40 dark:hover:bg-cyan-900/20 active:scale-[0.98] transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
              <Icon name={item.icon} size={18} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 text-center px-1">{item.label}</span>
          </Link>
        ))}
      </motion.div>

      {/* Todas las citas del médico */}
      <motion.div variants={staggerItem} className="flex flex-col gap-3">
        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Todas las citas</p>

        {citas.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center gap-2 text-center">
            <Icon name="event" size={28} className="text-slate-300 dark:text-slate-600" />
            <p className="text-[13px] text-slate-500 dark:text-slate-400">No tienes citas registradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {citas.map((cita, i) => {
              const vars = getVars(cita.tipo_consulta_id);
              return (
                <motion.div
                  key={cita.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.05, ease: [0.4, 0, 0.2, 1] }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-2"
                  style={{ borderLeftWidth: 3, borderLeftColor: vars.solid }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{cita.hora_inicio}</span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: vars.bg, color: vars.text }}
                    >
                      {vars.label}
                    </span>
                  </div>
                  <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">{fmtFechaCorta(cita.fecha)}</span>
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">{cita.paciente_nombre}</p>
                  {cita.telefono && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                      <Icon name="phone" size={12} />
                      {cita.telefono}
                    </div>
                  )}
                  <Link
                    href={`/pacientes/${cita.paciente_id}`}
                    className="mt-1 text-[11px] font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-0.5"
                  >
                    Ver paciente <Icon name="chevron_right" size={12} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
