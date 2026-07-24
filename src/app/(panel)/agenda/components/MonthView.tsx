"use client";

import { motion } from "framer-motion";
import type { Cita } from "@/types/agenda";
import { resolveTipoCita, tipoCitaVars } from "@/lib/colors";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { DAY_SHORT, getMonthGrid, timeToMin, toDateStr } from "./agendaUtils";

const MAX_CHIPS = 2;

export function MonthView({
  year, month, citas, today, onDayClick, onEventClick,
}: {
  year: number;
  month: number;
  citas: Cita[];
  today: Date;
  onDayClick: (d: Date) => void;
  onEventClick: (c: Cita) => void;
}) {
  const grid = getMonthGrid(year, month);
  const todayStr = toDateStr(today);

  const citasByDay = (d: Date) =>
    citas
      .filter(c => c.fecha === toDateStr(d))
      .sort((a, b) => timeToMin(a.hora_inicio) - timeToMin(b.hora_inicio));

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-800">
      {/* Encabezado LUN..DOM */}
      <div className="grid grid-cols-7 shrink-0 border-b border-slate-100 dark:border-slate-700">
        {DAY_SHORT.map(d => (
          <div key={d} className="py-2.5 text-center">
            <span className="text-[10.5px] md:text-[11px] font-medium text-slate-400 dark:text-slate-500 tracking-wide uppercase">{d}</span>
          </div>
        ))}
      </div>

      {/* Cuadrícula — grid continuo con líneas finas compartidas, igual que Día/Semana */}
      <motion.div
        variants={staggerContainer(0.03)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-7 auto-rows-fr flex-1 overflow-y-auto border-t border-l border-slate-100 dark:border-slate-700"
      >
        {grid.flat().map((day, i) => {
          const ds = toDateStr(day);
          const inMonth = day.getMonth() === month;
          const isToday = ds === todayStr;
          const dayCitas = citasByDay(day);
          const shown = dayCitas.slice(0, MAX_CHIPS);
          const overflow = dayCitas.length - shown.length;

          return (
            <motion.button
              key={i}
              variants={staggerItem}
              onClick={() => onDayClick(day)}
              className={`text-left border-r border-b border-slate-100 dark:border-slate-700 transition-colors min-h-[72px] md:min-h-[104px] flex flex-col gap-1 p-1.5 md:p-2 hover:bg-slate-50 dark:hover:bg-slate-700 ${
                inMonth ? "bg-white dark:bg-slate-800" : "bg-slate-50/60 dark:bg-slate-900/40"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full text-[11px] md:text-[12px] font-semibold shrink-0 ${
                  isToday ? "bg-cyan-600 text-white" : inMonth ? "text-slate-500 dark:text-slate-400" : "text-slate-300 dark:text-slate-600"
                }`}
              >
                {day.getDate()}
              </span>

              {inMonth && shown.length > 0 && (
                <div className="flex flex-col gap-1 min-w-0">
                  {shown.map(c => {
                    const vars = tipoCitaVars(resolveTipoCita(c.tipo_consulta));
                    return (
                      <span
                        key={c.id}
                        onClick={e => { e.stopPropagation(); onEventClick(c); }}
                        className="flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[10px] md:text-[10.5px] font-semibold truncate cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ background: vars.bg, color: vars.text }}
                      >
                        <span className="shrink-0 opacity-70">{c.hora_inicio}</span>
                        <span className="truncate">{c.paciente_nombre.split(" ")[0]}</span>
                      </span>
                    );
                  })}
                  {overflow > 0 && (
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 px-1.5">+{overflow} más</span>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
