"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import type { Cita } from "@/types/agenda";
import { estadoCitaVars, ESTADO_CITA_LABEL } from "@/lib/colors";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { fmtFechaLarga, toDateStr, type DoctorMap } from "./agendaUtils";

export function CronogramaView({ citas, today, onEventClick, doctorMap }: {
  citas: Cita[];
  today: Date;
  onEventClick: (c: Cita) => void;
  doctorMap?: DoctorMap;
}) {
  const todayStr = toDateStr(today);
  const { getVars } = useTipoConsultaVars();

  const grupos = new Map<string, Cita[]>();
  for (const c of citas) {
    if (!grupos.has(c.fecha)) grupos.set(c.fecha, []);
    grupos.get(c.fecha)!.push(c);
  }
  const fechas = Array.from(grupos.keys()).sort();
  for (const f of fechas) grupos.get(f)!.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  if (fechas.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
        <Icon name="schedule_view" size={34} className="text-slate-200 dark:text-slate-700" />
        <p className="text-[13px] text-slate-400 dark:text-slate-500">Sin citas registradas</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-3 md:px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
      <motion.div variants={staggerContainer(0.04)} initial="hidden" animate="visible" className="flex flex-col gap-6">
        {fechas.map(fecha => {
          const isToday = fecha === todayStr;
          return (
            <motion.div key={fecha} variants={staggerItem} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 py-1">
                <span className={`text-[12.5px] font-bold capitalize ${isToday ? "text-cyan-700 dark:text-cyan-400" : "text-slate-700 dark:text-slate-300"}`}>
                  {fmtFechaLarga(fecha)}
                </span>
                {isToday && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400">Hoy</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2.5">
                {grupos.get(fecha)!.map(c => {
                  const tipoVars = getVars(c.tipo_consulta_id);
                  const estVars = estadoCitaVars(c.estado);
                  const doc = doctorMap?.[c.doctor_id];
                  return (
                    <button
                      key={c.id}
                      onClick={() => onEventClick(c)}
                      className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/40 dark:hover:bg-cyan-900/20 transition-colors px-3.5 py-3 flex items-center gap-3"
                    >
                      <div className="flex flex-col items-center justify-center w-12 shrink-0">
                        <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-none">{c.hora_inicio}</span>
                        <span className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5">{c.hora_fin}</span>
                      </div>
                      <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: tipoVars.solid }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">{c.paciente_nombre}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: tipoVars.bg, color: tipoVars.text }}>
                            {tipoVars.label}
                          </span>
                          <span className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: estVars.bg, color: estVars.text }}>
                            {ESTADO_CITA_LABEL[c.estado]}
                          </span>
                          {doc && (
                            <span className="flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: doc.vars.bg, color: doc.vars.text }}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: doc.vars.solid }} />
                              {doc.nombre}
                            </span>
                          )}
                        </div>
                      </div>
                      <Icon name="chevron_right" size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
