"use client";

import { motion } from "framer-motion";
import type { Cita } from "@/types/agenda";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { DAY_SHORT, getMonthGrid, timeToMin, toDateStr, type DoctorMap } from "./agendaUtils";

const MAX_CHIPS_MOBILE = 5;
const MAX_CHIPS_DESKTOP = 3;

export function MonthView({
  year, month, citas, today, onDayClick, onEventClick, doctorMap,
}: {
  year: number;
  month: number;
  citas: Cita[];
  today: Date;
  onDayClick: (d: Date) => void;
  onEventClick: (c: Cita) => void;
  doctorMap?: DoctorMap;
}) {
  const grid = getMonthGrid(year, month);
  const todayStr = toDateStr(today);
  const { getVars } = useTipoConsultaVars();
  const isMobile = useIsMobile();
  const maxChips = isMobile ? MAX_CHIPS_MOBILE : MAX_CHIPS_DESKTOP;

  const citasByDay = (d: Date) =>
    citas
      .filter(c => c.fecha === toDateStr(d))
      .sort((a, b) => timeToMin(a.hora_inicio) - timeToMin(b.hora_inicio));

  return (
 <div className="flex flex-col h-full overflow-y-auto no-scrollbar bg-white">
      {/* Encabezado LUN..DOM — fijo arriba: la cuadrícula scrollea debajo */}
 <div className="grid grid-cols-7 shrink-0 sticky top-0 z-10 bg-white border-b border-slate-100">
        {DAY_SHORT.map(d => (
          <div key={d} className="py-2.5 text-center">
 <span className="text-[10.5px] md:text-[11px] font-medium text-slate-400 tracking-wide uppercase">{d}</span>
          </div>
        ))}
      </div>

      {/* Cuadrícula — grid continuo con líneas finas compartidas, igual que Día/Semana.
          Las filas se reparten en la altura disponible (auto-rows-fr en desktop),
          pero cada celda conserva su min-height mínimo para mostrar sus citas sin
          recortarlas — si no entran todas las semanas, la vista entera scrollea
          (overflow-y-auto en el contenedor raíz) en vez de recortar contenido. */}
      <motion.div
        variants={staggerContainer(0.03)}
        initial="hidden"
        animate="visible"
 className="grid grid-cols-7 auto-rows-min md:auto-rows-fr md:flex-1 border-t border-l border-slate-100"
      >
        {grid.flat().map((day, i) => {
          const ds = toDateStr(day);
          const inMonth = day.getMonth() === month;
          const isToday = ds === todayStr;
          const dayCitas = citasByDay(day);
          const shown = dayCitas.slice(0, maxChips);
          const overflow = dayCitas.length - shown.length;

          return (
            <motion.button
              key={i}
              variants={staggerItem}
              onClick={() => onDayClick(day)}
 className={`text-left border-r border-b border-slate-100 transition-colors h-full min-h-[160px] md:min-h-[184px] flex flex-col gap-1 p-1.5 md:p-2 overflow-hidden hover:bg-slate-50 ${
 inMonth ? "bg-white" : "bg-slate-50/60"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full text-[11px] md:text-[12px] font-semibold shrink-0 ${
 isToday ? "bg-cyan-600 text-white": inMonth ? "text-slate-500" : "text-slate-300"
                }`}
              >
                {day.getDate()}
              </span>

              {inMonth && shown.length > 0 && (
                <div className="flex flex-col gap-1 min-w-0">
                  {shown.map(c => {
                    const vars = getVars(c.tipo_consulta_id);
                    const doc = doctorMap?.[c.doctor_id];
                    return (
                      <span
                        key={c.id}
                        onClick={e => { e.stopPropagation(); onEventClick(c); }}
                        className="flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[10px] md:text-[10.5px] font-semibold truncate cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                        style={{ background: vars.bg, color: vars.text }}
                      >
                        {doc && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: doc.vars.solid }} title={doc.nombre} />}
                        <span className="shrink-0 opacity-70">{c.hora_inicio}</span>
                        <span className="truncate">{c.paciente_nombre.split(" ")[0]}</span>
                      </span>
                    );
                  })}
                  {overflow > 0 && (
 <span className="text-[10px] font-medium text-slate-400 px-1.5 shrink-0">+{overflow} más</span>
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
