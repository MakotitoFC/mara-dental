"use client";

import { motion } from "framer-motion";
import type { Cita, EstadoCita } from "@/types/agenda";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { estadoCitaVars, ESTADO_CITA_LABEL } from "@/lib/colors";
import { DAY_SHORT, MONTHS_L, getMonthGrid, toDateStr } from "./agendaUtils";

// Prioridad cuando un día tiene citas en más de un estado: Cancelada primero
// (necesita atención), luego Hecho, y por último Programada. Mismos colores
// que ya usa el resto del calendario (estadoCitaVars, en DayView/WeekView/
// AppointmentDetailSheet) — no se inventan colores nuevos acá.
const ESTADO_PRIORIDAD: EstadoCita[] = ["cancelada", "hecho", "programada"];

function estadoDominante(citasDelDia: Cita[]): EstadoCita | null {
  if (citasDelDia.length === 0) return null;
  for (const estado of ESTADO_PRIORIDAD) {
    if (citasDelDia.some((c) => c.estado === estado)) return estado;
  }
  return null;
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

  const citasByDay = new Map<string, Cita[]>();
  for (const c of citas) {
    const list = citasByDay.get(c.fecha);
    if (list) list.push(c);
    else citasByDay.set(c.fecha, [c]);
  }

  return (
    <motion.div
      variants={staggerContainer(0.03)}
      initial="hidden"
      animate="visible"
      className="h-full overflow-y-auto no-scrollbar p-3 md:p-5 flex flex-col gap-3"
    >
      {/* Leyenda por estado — mismos colores que Día/Semana/Cronograma */}
 <div className="flex items-center gap-3 self-start bg-white border border-slate-200 rounded-full px-3 py-1.5">
        {ESTADO_PRIORIDAD.map((estado) => (
          <span key={estado} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: estadoCitaVars(estado).solid }} />
 <span className="text-[10.5px] font-semibold text-slate-500">{ESTADO_CITA_LABEL[estado]}</span>
          </span>
        ))}
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
 className={`text-left bg-white rounded-xl border p-3 cursor-pointer hover:border-cyan-300 hover:shadow-sm transition-all ${
 isCurrentMonth ? "border-cyan-400 ring-1 ring-cyan-100" : "border-slate-200"
              }`}
            >
 <p className={`text-[12.5px] font-bold mb-2 capitalize ${isCurrentMonth ? "text-cyan-700" : "text-slate-800"}`}>
                {monthLabel}
              </p>

              <div className="grid grid-cols-7 gap-y-0.5">
                {DAY_SHORT.map((d) => (
 <span key={d} className="text-[8px] font-medium text-slate-300 text-center">
                    {d[0]}
                  </span>
                ))}
                {grid.flat().map((day, i) => {
                  const ds = toDateStr(day);
                  const inMonth = day.getMonth() === month;
                  const isToday = ds === todayStr;
                  const citasDelDia = inMonth ? citasByDay.get(ds) ?? [] : [];
                  const estado = estadoDominante(citasDelDia);
                  const vars = estado ? estadoCitaVars(estado) : null;

                  const tooltip = citasDelDia.length === 0
                    ? undefined
                    : ESTADO_PRIORIDAD
                        .map((e) => {
                          const n = citasDelDia.filter((c) => c.estado === e).length;
                          return n > 0 ? `${n} ${ESTADO_CITA_LABEL[e].toLowerCase()}${n !== 1 ? "s" : ""}` : null;
                        })
                        .filter(Boolean)
                        .join(" · ");

                  return (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); if (inMonth) onDayClick(day); }}
                      disabled={!inMonth}
                      title={tooltip}
                      className={`relative flex items-center justify-center aspect-square rounded-[3px] text-[9px] leading-none border-0 shadow-none transition-colors ${
                        !inMonth
                          ? "text-transparent cursor-default"
                          : isToday
                          ? "bg-cyan-600 text-white font-bold rounded-full"
                          : vars
                          ? "font-semibold"
 :"text-slate-600 hover:ring-1 hover:ring-cyan-300"
                      }`}
                      style={inMonth && !isToday && vars ? { background: vars.bg, color: vars.text } : undefined}
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
