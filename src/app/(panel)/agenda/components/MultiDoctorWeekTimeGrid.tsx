"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Cita } from "@/types/agenda";
import { estadoCitaVars } from "@/lib/colors";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { getDoctorVars } from "./doctorColors";
import type { DoctorLite } from "./MultiDoctorDayView";
import type { DoctorFiltro } from "./CalendarToolbar";
import {
  DAY_SHORT, HOURS, SLOT_H, FIRST_H, MONTHS_L,
  getMonthGrid, initials, pxTop, pxHeight, timeToMin, toDateStr,
} from "./agendaUtils";

const GRID_H = HOURS.length * SLOT_H;

function layoutDia(citasDia: Cita[]): { cita: Cita; col: number; cols: number }[] {
  const ordenadas = [...citasDia].sort((a, b) => timeToMin(a.hora_inicio) - timeToMin(b.hora_inicio));
  const activos: { col: number; fin: number }[] = [];
  const resultado: { cita: Cita; col: number }[] = [];
  let maxCols = 1;

  for (const c of ordenadas) {
    const inicio = timeToMin(c.hora_inicio);
    for (let i = activos.length - 1; i >= 0; i--) {
      if (activos[i].fin <= inicio) activos.splice(i, 1);
    }
    const usados = new Set(activos.map((a) => a.col));
    let col = 0;
    while (usados.has(col)) col++;
    activos.push({ col, fin: timeToMin(c.hora_fin) });
    resultado.push({ cita: c, col });
    maxCols = Math.max(maxCols, activos.length);
  }

  return resultado.map((r) => ({ ...r, cols: maxCols }));
}

/** Convierte un offset Y (px, relativo al tope de la grilla) en "HH:MM",
 * redondeado al bloque de 30min más cercano y acotado al rango visible. */
function yToHora(offsetY: number): string {
  const minutos = FIRST_H * 60 + (offsetY / SLOT_H) * 60;
  const redondeado = Math.round(minutos / 30) * 30;
  const min = Math.max(FIRST_H * 60, Math.min(redondeado, FIRST_H * 60 + HOURS.length * 60 - 30));
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function NowLine() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes() - FIRST_H * 60;
  if (mins < 0 || mins > HOURS.length * 60) return null;
  const top = (mins / 60) * SLOT_H;
  return (
    <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center" style={{ top }}>
      <span className="w-2 h-2 rounded-full bg-cyan-600 shrink-0 -ml-1 border-2 border-white dark:border-slate-800" />
      <div className="flex-1 h-px bg-cyan-500/70" />
    </div>
  );
}

function MiniCalendario({ referencia, weekDays, today, onDateJump }: { referencia: Date; weekDays: Date[]; today: Date; onDateJump: (d: Date) => void }) {
  const [mes, setMes] = useState({ year: referencia.getFullYear(), month: referencia.getMonth() });
  const grid = getMonthGrid(mes.year, mes.month);
  const todayStr = toDateStr(today);
  const weekSet = new Set(weekDays.map(toDateStr));

  return (
    <div className="p-3 border-b border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMes((m) => (m.month === 0 ? { year: m.year - 1, month: 11 } : { ...m, month: m.month - 1 }))} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
          <Icon name="chevron_left" size={14} />
        </button>
        <span className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{MONTHS_L[mes.month]} {mes.year}</span>
        <button onClick={() => setMes((m) => (m.month === 11 ? { year: m.year + 1, month: 0 } : { ...m, month: m.month + 1 }))} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
          <Icon name="chevron_right" size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {DAY_SHORT.map((d) => (
          <span key={d} className="text-[8.5px] font-semibold text-slate-300 dark:text-slate-600 text-center">{d[0]}</span>
        ))}
        {grid.flat().map((day, i) => {
          const ds = toDateStr(day);
          const inMonth = day.getMonth() === mes.month;
          const isToday = ds === todayStr;
          const inWeek = weekSet.has(ds);
          return (
            <button
              key={i}
              onClick={() => onDateJump(day)}
              className={`w-full aspect-square rounded-full text-[10px] flex items-center justify-center transition-colors ${
                isToday ? "bg-cyan-600 text-white font-bold" : inWeek ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 font-semibold" : inMonth ? "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" : "text-slate-300 dark:text-slate-600"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MultiDoctorWeekTimeGrid({
  weekDays, citas, doctoresTodos, doctoresVisibles, today,
  doctorFiltro, onDoctorFiltroChange,
  onEventClick, onCellClick, onDayClick, onDateJump,
}: {
  weekDays: Date[];
  citas: Cita[];
  doctoresTodos: DoctorLite[];
  doctoresVisibles: DoctorLite[];
  today: Date;
  doctorFiltro: DoctorFiltro;
  onDoctorFiltroChange: (v: DoctorFiltro) => void;
  onEventClick: (c: Cita) => void;
  onCellClick: (d: Date, hora: string) => void;
  onDayClick: (d: Date) => void;
  onDateJump: (d: Date) => void;
}) {
  const todayStr = toDateStr(today);
  const { getVars, tipos } = useTipoConsultaVars();
  const doctorIdsVisibles = new Set(doctoresVisibles.map((d) => d.id));
  const allSelected = doctorFiltro === "todos";

  function toggleDoctor(id: string) {
    const current = allSelected ? doctoresTodos.map((d) => d.id) : doctorFiltro;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onDoctorFiltroChange(next.length === doctoresTodos.length ? "todos" : next);
  }

  const getCitasDia = (d: Date) => citas.filter((c) => c.fecha === toDateStr(d) && doctorIdsVisibles.has(c.doctor_id));

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-slate-800">
      {/* Panel lateral */}
      <div className="w-56 shrink-0 border-r border-slate-100 dark:border-slate-700 overflow-y-auto no-scrollbar hidden md:flex md:flex-col">
        <MiniCalendario referencia={weekDays[0]} weekDays={weekDays} today={today} onDateJump={onDateJump} />

        <div className="p-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Médicos</p>
            <button onClick={() => onDoctorFiltroChange("todos")} className={`text-[10px] font-semibold ${allSelected ? "text-cyan-600" : "text-slate-400 hover:text-slate-600"}`}>
              Todos
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {doctoresTodos.map((doc) => {
              const vars = getDoctorVars(doc.id);
              const checked = allSelected || doctorFiltro.includes(doc.id);
              return (
                <label key={doc.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={() => toggleDoctor(doc.id)} className="sr-only" />
                  <span
                    className={`w-3.5 h-3.5 rounded shrink-0 border-2 flex items-center justify-center ${checked ? "" : "border-slate-300 dark:border-slate-600"}`}
                    style={checked ? { background: vars.solid, borderColor: vars.solid } : undefined}
                  >
                    {checked && <Icon name="check" size={10} className="text-white" />}
                  </span>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: vars.solid }} />
                  <span className="text-[11.5px] text-slate-700 dark:text-slate-200 truncate">Dr. {doc.apellido}</span>
                </label>
              );
            })}
          </div>
        </div>

        {tipos.length > 0 && (
          <div className="p-3">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Tratamientos</p>
            <div className="flex flex-wrap gap-1.5">
              {tipos.map((t) => {
                const v = getVars(t.id);
                return (
                  <span
                    key={t.id}
                    className="text-[10.5px] font-bold px-2 py-1 rounded-lg truncate max-w-full"
                    style={{ background: `${v.solid}1a`, color: v.solid }}
                  >
                    {t.tipo_consulta}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Grilla de tiempo */}
      <div className="flex-1 min-w-0 overflow-auto no-scrollbar">
        <div style={{ minWidth: 640 }}>
          <div className="grid sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700" style={{ gridTemplateColumns: "44px repeat(7, 1fr)" }}>
            <div />
            {weekDays.map((d, i) => {
              const isToday = toDateStr(d) === todayStr;
              const cnt = getCitasDia(d).length;
              return (
                <button
                  key={i}
                  onClick={() => onDayClick(d)}
                  className="py-2 flex flex-col items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-l border-slate-100 dark:border-slate-700"
                >
                  <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide">{DAY_SHORT[i]}</span>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold transition-colors ${isToday ? "bg-cyan-600 text-white" : "text-slate-700 dark:text-slate-300"}`}>
                    {d.getDate()}
                  </span>
                  <span className={`text-[9px] font-medium ${cnt > 0 ? "text-cyan-600" : "text-transparent"}`}>{cnt > 0 ? `${cnt} cita${cnt !== 1 ? "s" : ""}` : "·"}</span>
                </button>
              );
            })}
          </div>

          <div className="grid" style={{ gridTemplateColumns: "44px repeat(7, 1fr)" }}>
            {/* Columna de horas */}
            <div className="relative" style={{ height: GRID_H }}>
              {HOURS.map((hr) => (
                <div key={hr} className="pr-1.5 text-right" style={{ height: SLOT_H }}>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">{hr}</span>
                </div>
              ))}
            </div>

            {weekDays.map((d, i) => {
              const layout = layoutDia(getCitasDia(d));
              const isToday = toDateStr(d) === todayStr;
              return (
                <div
                  key={i}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onCellClick(d, yToHora(e.clientY - rect.top));
                  }}
                  className="relative border-l border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-cyan-50/30 dark:hover:bg-cyan-900/10 transition-colors"
                  style={{ height: GRID_H }}
                >
                  {HOURS.map((hr, hi) => (
                    <div key={hr} className="absolute left-0 right-0 border-b border-slate-100 dark:border-slate-700 pointer-events-none" style={{ top: hi * SLOT_H, height: SLOT_H }} />
                  ))}
                  {isToday && <NowLine />}
                  {layout.map(({ cita: c, col, cols }) => {
                    const tipoVars = getVars(c.tipo_consulta_id);
                    const docVars = getDoctorVars(c.doctor_id);
                    const estVars = estadoCitaVars(c.estado);
                    const doc = doctoresTodos.find((x) => x.id === c.doctor_id);
                    const alto = Math.max(pxHeight(c.hora_inicio, c.hora_fin) - 2, 22);
                    // Bajo ~34px (una cita de 30min) no entran 3 líneas de texto —
                    // se cae a un formato compacto de 2 líneas sin la hora suelta.
                    const compacto = alto < 40;
                    return (
                      <div
                        key={c.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick(c); }}
                        className="absolute rounded-md px-1.5 py-0.5 cursor-pointer hover:z-30 hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-center"
                        style={{
                          top: pxTop(c.hora_inicio) + 1,
                          height: alto,
                          left: `${(col / cols) * 100}%`,
                          width: `${(1 / cols) * 100}%`,
                          background: tipoVars.bg,
                          borderLeft: `3px solid ${docVars.solid}`,
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold shrink-0" style={{ color: docVars.solid }}>
                            {doc ? initials(`${doc.nombre} ${doc.apellido}`) : "Dr"}
                          </span>
                          {!compacto && <span className="text-[8.5px] opacity-75 shrink-0" style={{ color: tipoVars.text }}>{c.hora_inicio}</span>}
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto" style={{ background: estVars.solid }} />
                        </div>
                        <p className="text-[10px] font-semibold leading-tight truncate" style={{ color: tipoVars.text }}>{c.paciente_nombre}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
