"use client";

import { useEffect, useState } from "react";
import type { Cita } from "@/types/agenda";
import { estadoCitaVars } from "@/lib/colors";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { DAY_SHORT, HOURS, SLOT_H, FIRST_H, shortName, timeToMin, toDateStr, type DoctorMap } from "./agendaUtils";

function NowLine() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const mins = now.getHours() * 60 + now.getMinutes() - FIRST_H * 60;
  if (mins < 0 || mins > 14 * 60) return null;
  const top = (mins / 60) * SLOT_H;
  return (
    <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center" style={{ top }}>
      <span className="w-2 h-2 rounded-full bg-cyan-600 shrink-0 -ml-1 border-2 border-white dark:border-slate-800" />
      <div className="flex-1 h-px bg-cyan-500/70" />
    </div>
  );
}

export function WeekView({
  weekDays, citas, today, onDayClick, onEventClick, onCellClick, doctorMap,
}: {
  weekDays: Date[];
  citas: Cita[];
  today: Date;
  onDayClick: (d: Date) => void;
  onEventClick: (c: Cita) => void;
  onCellClick: (d: Date, hora: string) => void;
  doctorMap?: DoctorMap;
}) {
  const todayStr = toDateStr(today);
  const getCitas = (d: Date) => citas.filter(c => c.fecha === toDateStr(d));
  const getSlotCitas = (d: Date, hr: string) => {
    const s = timeToMin(hr);
    return getCitas(d).filter(c => { const t = timeToMin(c.hora_inicio); return t >= s && t < s + 60; });
  };
  const { getVars } = useTipoConsultaVars();

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-800">
      <div className="overflow-x-auto overflow-y-auto no-scrollbar flex-1 min-h-0">
        <div style={{ minWidth: 640 }}>
          {/* Encabezado de días */}
          <div className="grid sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700" style={{ gridTemplateColumns: "44px repeat(7, 1fr)" }}>
            <div />
            {weekDays.map((d, i) => {
              const isToday = toDateStr(d) === todayStr;
              const cnt = getCitas(d).length;
              return (
                <button
                  key={i}
                  onClick={() => onDayClick(d)}
                  className="py-2 flex flex-col items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-l border-slate-100 dark:border-slate-700"
                >
                  <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide">{DAY_SHORT[i]}</span>
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold transition-colors ${
                      isToday ? "bg-cyan-600 text-white" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  <span className={`text-[9px] font-medium ${cnt > 0 ? "text-cyan-600" : "text-transparent"}`}>
                    {cnt > 0 ? `${cnt} cita${cnt !== 1 ? "s" : ""}` : "·"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Timeline */}
          <div className="relative">
            {weekDays.some(d => toDateStr(d) === todayStr) && <NowLine />}
            {HOURS.map(hr => (
              <div key={hr} className="grid" style={{ gridTemplateColumns: "44px repeat(7, 1fr)", height: SLOT_H, borderBottom: "1px solid #f1f5f9" }}>
                <div className="pt-1 pr-1.5 text-right shrink-0">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">{hr}</span>
                </div>
                {weekDays.map((d, i) => {
                  const blocks = getSlotCitas(d, hr);
                  return (
                    <div
                      key={i}
                      onClick={() => { if (blocks.length === 0) onCellClick(d, hr); }}
                      className={`border-l border-slate-100 dark:border-slate-700 p-0.5 overflow-hidden ${blocks.length === 0 ? "cursor-pointer hover:bg-cyan-50/40 dark:hover:bg-cyan-900/20" : ""}`}
                    >
                      {blocks.map(c => {
                        const tipoVars = getVars(c.tipo_consulta_id);
                        const estVars = estadoCitaVars(c.estado);
                        const doc = doctorMap?.[c.doctor_id];
                        return (
                          <div
                            key={c.id}
                            onClick={e => { e.stopPropagation(); onEventClick(c); }}
                            className="relative rounded-lg mb-0.5 px-1.5 py-1 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                            style={{ background: tipoVars.bg, borderLeft: `3px solid ${tipoVars.solid}` }}
                          >
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: estVars.solid }} />
                            {doc && (
                              <span
                                className="absolute top-1 left-1 w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold text-white"
                                style={{ background: doc.vars.solid }}
                                title={doc.nombre}
                              >
                                {doc.initials}
                              </span>
                            )}
                            <p className={`text-[10.5px] font-semibold leading-tight truncate pr-2 ${doc ? "pl-3.5" : ""}`} style={{ color: tipoVars.text }}>
                              {shortName(c.paciente_nombre)}
                            </p>
                            <p className="text-[9px] leading-none mt-0.5 opacity-75 truncate" style={{ color: tipoVars.text }}>
                              {c.hora_inicio}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
