"use client";

import type { Cita } from "@/types/agenda";
import { estadoCitaVars } from "@/lib/colors";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { getDoctorVars } from "./doctorColors";
import type { DoctorLite } from "./MultiDoctorDayView";
import {
  DAY_SHORT, HOURS, SLOT_H, FIRST_H,
  initials, pxTop, pxHeight, timeToMin, toDateStr,
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
 <span className="w-2 h-2 rounded-full bg-cyan-600 shrink-0 -ml-1 border-2 border-white"/>
      <div className="flex-1 h-px bg-cyan-500/70" />
    </div>
  );
}

/** Vista Semana del asistente — grilla de 7 días a todo el ancho. La lista
    de médicos y el filtro de tratamientos ya viven en el DoctorSidebar y en
    la barra de filtros globales (ver AgendaView/CalendarToolbar); este
    componente ya no trae su propio panel lateral duplicado. */
export function MultiDoctorWeekTimeGrid({
  weekDays, citas, doctores, today,
  onEventClick, onCellClick, onDayClick,
}: {
  weekDays: Date[];
  citas: Cita[];
  doctores: DoctorLite[];
  today: Date;
  onEventClick: (c: Cita) => void;
  onCellClick: (d: Date, hora: string) => void;
  onDayClick: (d: Date) => void;
}) {
  const todayStr = toDateStr(today);
  const { getVars } = useTipoConsultaVars();
  const doctorIds = new Set(doctores.map((d) => d.id));

  const getCitasDia = (d: Date) => citas.filter((c) => c.fecha === toDateStr(d) && doctorIds.has(c.doctor_id));

  return (
 <div className="flex h-full overflow-hidden bg-white">
      <div className="flex-1 min-w-0 overflow-auto no-scrollbar">
        <div style={{ minWidth: 640 }}>
 <div className="grid sticky top-0 z-20 bg-white border-b border-slate-100" style={{ gridTemplateColumns: "44px repeat(7, 1fr)" }}>
            <div />
            {weekDays.map((d, i) => {
              const isToday = toDateStr(d) === todayStr;
              const cnt = getCitasDia(d).length;
              return (
                <button
                  key={i}
                  onClick={() => onDayClick(d)}
 className="py-2 flex flex-col items-center gap-1 hover:bg-slate-50 transition-colors border-l border-slate-100"
                >
 <span className="text-[9.5px] font-semibold text-slate-400 tracking-wide">{DAY_SHORT[i]}</span>
 <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold transition-colors ${isToday ? "bg-cyan-600 text-white" : "text-slate-700"}`}>
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
 <span className="text-[9px] text-slate-400 font-medium">{hr}</span>
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
 className="relative border-l border-slate-100 cursor-pointer hover:bg-cyan-50/30 transition-colors"
                  style={{ height: GRID_H }}
                >
                  {HOURS.map((hr, hi) => (
 <div key={hr} className="absolute left-0 right-0 border-b border-slate-100 pointer-events-none" style={{ top: hi * SLOT_H, height: SLOT_H }} />
                  ))}
                  {isToday && <NowLine />}
                  {layout.map(({ cita: c, col, cols }) => {
                    const tipoVars = getVars(c.tipo_consulta_id);
                    const docVars = getDoctorVars(c.doctor_id);
                    const estVars = estadoCitaVars(c.estado);
                    const doc = doctores.find((x) => x.id === c.doctor_id);
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
