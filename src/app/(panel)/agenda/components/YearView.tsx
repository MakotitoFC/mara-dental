"use client";

import { motion } from "framer-motion";
import type { Cita } from "@/types/agenda";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { DAY_SHORT, MONTHS_L, getMonthGrid, toDateStr } from "./agendaUtils";

export function YearView({
  year, citas, today, onMonthClick, onDayClick,
}: {
  year: number;
  citas: Cita[];
  today: Date;
  onMonthClick: (month: number) => void;
  onDayClick: (d: Date) => void;
}) {
  const todayStr = toDateStr(today);
  const { getVars } = useTipoConsultaVars();

  const firstCitaByDay = new Map<string, Cita>();
  const countByDay = new Map<string, number>();
  for (const c of citas) {
    if (!firstCitaByDay.has(c.fecha)) firstCitaByDay.set(c.fecha, c);
    countByDay.set(c.fecha, (countByDay.get(c.fecha) ?? 0) + 1);
  }

  return (
    <motion.div
      variants={staggerContainer(0.03)}
      initial="hidden"
      animate="visible"
      className="h-full overflow-y-auto p-3 md:p-5"
    >
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
                  const firstCita = firstCitaByDay.get(ds);
                  const vars = firstCita ? getVars(firstCita.tipo_consulta_id) : null;

                  return (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); if (inMonth) onDayClick(day); }}
                      disabled={!inMonth}
                      className={`relative flex items-center justify-center aspect-square rounded-full text-[9px] leading-none ${
                        !inMonth
                          ? "text-transparent cursor-default"
                          : isToday
                          ? "bg-cyan-600 text-white font-bold"
                          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {inMonth ? day.getDate() : ""}
                      {inMonth && count > 0 && !isToday && (
                        <span
                          className="absolute bottom-[1px] w-[3px] h-[3px] rounded-full"
                          style={{ background: vars ? vars.solid : "var(--tipo-otros-solid)" }}
                        />
                      )}
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
