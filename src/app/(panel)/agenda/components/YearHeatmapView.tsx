"use client";

import { motion } from "framer-motion";
import type { Cita } from "@/types/agenda";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { DAY_SHORT, MONTHS_L, getMonthGrid, toDateStr } from "./agendaUtils";

// Escala de intensidad — una sola familia de color (cyan) a distinta
// opacidad, en vez del punto de color por tipo de consulta que usa
// YearView.tsx. No hay datos de festivos en la BD, así que a diferencia del
// mockup de referencia no se resaltan feriados.
const NIVELES = ["transparent", "#0891b226", "#0891b255", "#0891b28c", "#0891b2"];

function nivelPorConteo(count: number): string {
  if (count === 0) return NIVELES[0];
  if (count <= 2) return NIVELES[1];
  if (count <= 4) return NIVELES[2];
  if (count <= 6) return NIVELES[3];
  return NIVELES[4];
}

export function YearHeatmapView({
  year, citas, today, onMonthClick, onDayClick,
}: {
  year: number;
  citas: Cita[];
  today: Date;
  onMonthClick: (month: number) => void;
  onDayClick: (d: Date) => void;
}) {
  const todayStr = toDateStr(today);

  const countByDay = new Map<string, number>();
  for (const c of citas) {
    countByDay.set(c.fecha, (countByDay.get(c.fecha) ?? 0) + 1);
  }

  return (
    <motion.div
      variants={staggerContainer(0.03)}
      initial="hidden"
      animate="visible"
      className="h-full overflow-y-auto no-scrollbar p-3 md:p-5 flex flex-col gap-3"
    >
      {/* Leyenda de intensidad */}
      <div className="flex items-center gap-2 self-start bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5">
        <span className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">Baja</span>
        <div className="flex items-center gap-0.5">
          {NIVELES.map((n, i) => (
            <span key={i} className="w-3.5 h-3.5 rounded-sm border border-slate-100 dark:border-slate-700" style={{ background: n }} />
          ))}
        </div>
        <span className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">Alta</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {MONTHS_L.map((monthLabel, month) => {
          const grid = getMonthGrid(year, month);
          const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

          return (
            <motion.div
              key={month}
              variants={staggerItem}
              onClick={() => onMonthClick(month)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onMonthClick(month); }}
              className={`text-left bg-white dark:bg-slate-800 rounded-xl border p-3 cursor-pointer hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-sm transition-all ${
                isCurrentMonth ? "border-cyan-400 dark:border-cyan-600 ring-1 ring-cyan-100 dark:ring-cyan-900/40" : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <p className={`text-[12.5px] font-bold mb-2 capitalize ${isCurrentMonth ? "text-cyan-700 dark:text-cyan-400" : "text-slate-800 dark:text-slate-100"}`}>
                {monthLabel}
              </p>

              <div className="grid grid-cols-7 gap-y-0.5">
                {DAY_SHORT.map((d) => (
                  <span key={d} className="text-[8px] font-medium text-slate-300 dark:text-slate-600 text-center">
                    {d[0]}
                  </span>
                ))}
                {grid.flat().map((day, i) => {
                  const ds = toDateStr(day);
                  const inMonth = day.getMonth() === month;
                  const isToday = ds === todayStr;
                  const count = countByDay.get(ds) ?? 0;

                  return (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); if (inMonth) onDayClick(day); }}
                      disabled={!inMonth}
                      title={inMonth && count > 0 ? `${count} cita${count !== 1 ? "s" : ""}` : undefined}
                      className={`relative flex items-center justify-center aspect-square rounded-[3px] text-[9px] leading-none transition-colors ${
                        !inMonth
                          ? "text-transparent cursor-default"
                          : isToday
                          ? "bg-cyan-600 text-white font-bold rounded-full"
                          : "text-slate-600 dark:text-slate-300 hover:ring-1 hover:ring-cyan-300 dark:hover:ring-cyan-700"
                      }`}
                      style={inMonth && !isToday ? { background: nivelPorConteo(count) } : undefined}
                    >
                      {inMonth ? day.getDate() : ""}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
