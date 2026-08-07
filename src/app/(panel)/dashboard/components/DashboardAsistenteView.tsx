"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/components/layout/AuthProvider";
import { staggerContainer, staggerItem, fadeIn, scaleIn } from "@/lib/animations";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { estadoCitaVars, ESTADO_CITA_LABEL } from "@/lib/colors";
import { getDoctorVars } from "../../agenda/components/doctorColors";
import type { EstadoCita } from "@/types/agenda";
import type { DashboardAsistenteData, CumpleañosHoyConTelegram } from "../actions";
import { enviarSaludoCumpleañosAction } from "../actions";

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

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 700;
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

const DISPONIBILIDAD_DOT: Record<string, string> = {
  en_consulta: "bg-red-500",
  libre: "bg-emerald-500",
  ausente: "bg-slate-300 dark:bg-slate-600",
};

function BirthdayModal({ pacientes, onClose }: { pacientes: CumpleañosHoyConTelegram[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const p = pacientes[idx];
  const [mensaje, setMensaje] = useState(`¡Feliz cumpleaños ${p.nombre}! 🎉 Le deseamos un excelente día. — MaraDental`);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<"ok" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMensaje(`¡Feliz cumpleaños ${pacientes[idx].nombre}! 🎉 Le deseamos un excelente día. — MaraDental`);
    setResultado(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  async function enviar() {
    setEnviando(true);
    setResultado(null);
    const res = await enviarSaludoCumpleañosAction(p.id, p.telegram_chat_id, mensaje);
    setEnviando(false);
    if (res?.error) { setResultado("error"); setErrorMsg(res.error); return; }
    setResultado("ok");
  }

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

        {resultado === "ok" && (
          <p className="text-[11.5px] text-emerald-600 dark:text-emerald-400 font-medium self-start">Saludo enviado por Telegram.</p>
        )}
        {resultado === "error" && (
          <p className="text-[11.5px] text-red-600 dark:text-red-400 font-medium self-start">{errorMsg}</p>
        )}
        {!p.telegram_chat_id && (
          <p className="text-[11.5px] text-slate-400 dark:text-slate-500 self-start">Este paciente no tiene Telegram configurado.</p>
        )}

        <div className="flex items-center gap-2.5 w-full">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-[13px] font-medium transition-colors">
            Más tarde
          </button>
          <button
            onClick={enviar}
            disabled={enviando || !p.telegram_chat_id}
            className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-medium transition-colors"
          >
            <Icon name="chat" size={15} />
            {enviando ? "Enviando…" : "Enviar Telegram"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function DashboardAsistenteView({ data }: { data: DashboardAsistenteData }) {
  const { citasHoy, statsCitasHoy, statsProgramadas, statsCanceladas, statsHuecosLibres, disponibilidad, alertas, cumpleañosHoy } = data;
  const { user } = useAuth();
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const { getVars } = useTipoConsultaVars();

  const fechaLarga = data.fechaHoy
    ? new Date(data.fechaHoy + "T12:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "long" })
    : "";

  const STATS = [
    { label: "Citas hoy", value: statsCitasHoy, icon: "calendar_month", color: "text-cyan-600", bg: "bg-cyan-50" },
    { label: "Programadas", value: statsProgramadas, icon: "schedule", color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Canceladas", value: statsCanceladas, icon: "cancel", color: "text-red-500", bg: "bg-red-50" },
    { label: "Huecos libres", value: statsHuecosLibres, icon: "event_available", color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="visible" className="p-4 sm:p-6 flex flex-col gap-5 sm:gap-7">
      {/* Bienvenida */}
      <motion.div variants={staggerItem} className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <WaveEmoji />
          <p className="text-[15px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100">
            {saludoDelDia()}{user?.name ? `, ${user.name}` : ""}
          </p>
        </div>
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400">Resumen operativo para hoy{fechaLarga ? `, ${fechaLarga}` : ""}</p>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 sm:p-4 flex flex-col gap-2 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate">{s.label}</span>
              <div className={`w-7 h-7 rounded-lg ${s.bg} dark:bg-opacity-10 flex items-center justify-center shrink-0`}>
                <Icon name={s.icon} size={14} className={s.color} />
              </div>
            </div>
            <p className="text-[22px] sm:text-[26px] font-bold text-slate-900 dark:text-slate-100 leading-none">
              <AnimatedNumber value={s.value} />
            </p>
          </div>
        ))}
      </motion.div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Flujo de Pacientes Hoy */}
        <motion.div variants={staggerItem} className="xl:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Flujo de Pacientes Hoy</h2>
          </div>
          {citasHoy.length === 0 ? (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500">
              <Icon name="calendar_month" size={26} className="opacity-30 mx-auto mb-2" />
              <p className="text-[12px]">Sin citas registradas hoy</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="px-4 sm:px-5 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Hora</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Paciente</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Doctor</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Tipo</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Estado</th>
                    <th className="px-4 sm:px-5 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {citasHoy.map((c) => {
                    const tipoVars = getVars(c.tipo_consulta_id);
                    const estado = c.estado as EstadoCita;
                    const estVars = estadoCitaVars(estado);
                    return (
                      <tr key={c.id} className="border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 sm:px-5 py-3 align-top whitespace-nowrap">
                          <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{c.hora_inicio}</span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <p className="text-[12.5px] font-medium text-slate-800 dark:text-slate-100 truncate max-w-[160px]">{c.paciente_nombre}</p>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">{c.doctor_nombre}</p>
                        </td>
                        <td className="px-3 py-3 align-top whitespace-nowrap">
                          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tipoVars.bg, color: tipoVars.text }}>
                            {tipoVars.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: estVars.bg, color: estVars.text }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: estVars.solid }} />
                            {ESTADO_CITA_LABEL[estado]}
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3 align-top text-right">
                          <Link
                            href={`/pacientes/${c.paciente_id}`}
                            title="Ver ficha del paciente"
                            className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                          >
                            <Icon name="description" size={15} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Panel lateral */}
        <motion.div variants={staggerItem} className="flex flex-col gap-4">
          {/* Disponibilidad médica */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="stethoscope" size={16} className="text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Disponibilidad Médica</h3>
            </div>
            {disponibilidad.length === 0 ? (
              <p className="text-[11.5px] text-slate-400 dark:text-slate-500">Sin médicos para mostrar.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {disponibilidad.map((d) => {
                  const vars = getDoctorVars(d.id);
                  return (
                    <div key={d.id} className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-bold text-white shrink-0" style={{ background: vars.solid }}>
                        {initials(`${d.nombre} ${d.apellido}`)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">Dr. {d.apellido}</p>
                        <p className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate">{d.detalle}</p>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DISPONIBILIDAD_DOT[d.estado]}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Alertas logísticas */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="warning_amber" size={16} className="text-amber-500" />
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Alertas Logísticas</h3>
            </div>
            {alertas.length === 0 ? (
              <p className="text-[11.5px] text-slate-400 dark:text-slate-500">Sin alertas por ahora.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {alertas.map((a) => (
                  <p key={a.id} className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-snug">{a.texto}</p>
                ))}
              </div>
            )}
          </div>

          {/* Cumpleaños */}
          {cumpleañosHoy.length > 0 && (
            <button
              onClick={() => setBirthdayOpen(true)}
              className="flex items-center gap-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl p-4 text-left hover:bg-rose-100/70 dark:hover:bg-rose-900/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shrink-0">
                <Icon name="cake" size={18} className="text-rose-500 dark:text-rose-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-rose-700 dark:text-rose-400">Cumpleaños del Día</p>
                <p className="text-[11px] text-rose-500 dark:text-rose-500 truncate">
                  {cumpleañosHoy[0].nombre}{cumpleañosHoy.length > 1 ? ` y ${cumpleañosHoy.length - 1} más` : ""}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-white bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-lg">Enviar Saludo</span>
            </button>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {birthdayOpen && <BirthdayModal pacientes={cumpleañosHoy} onClose={() => setBirthdayOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
