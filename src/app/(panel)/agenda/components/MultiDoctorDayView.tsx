"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Cita } from "@/types/agenda";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { getDoctorVars } from "./doctorColors";
import { HOURS, SLOT_H, FIRST_H, initials, timeToMin, toDateStr, type DoctorLite } from "./agendaUtils";

export type { DoctorLite };

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
 <span className="w-2 h-2 rounded-full bg-cyan-600 shrink-0 -ml-1 border-2 border-white"/>
      <div className="flex-1 h-px bg-cyan-500/70" />
    </div>
  );
}

/** Vista Día del asistente — una sola columna con las citas de TODOS los
    médicos visibles (la lista de médicos ahora vive en el DoctorSidebar de
    la izquierda, ver AgendaView). Cada cita lleva un avatar chico con las
    iniciales del médico (coloreado igual que en el sidebar) para poder
    distinguir de quién es sin necesidad de columnas separadas. */
export function MultiDoctorDayView({
  date, citas, doctores, today, onEventClick, onCellClick,
}: {
  date: Date;
  citas: Cita[];
  doctores: DoctorLite[];
  today: Date;
  onEventClick: (c: Cita) => void;
  onCellClick: (d: Date, hora: string) => void;
}) {
  const ds = toDateStr(date);
  const isToday = ds === toDateStr(today);
  const doctorIds = new Set(doctores.map(d => d.id));
  const dayCitas = citas.filter(c => c.fecha === ds && doctorIds.has(c.doctor_id));
  const getSlotCitas = (hr: string) => {
    const s = timeToMin(hr);
    return dayCitas.filter(c => { const t = timeToMin(c.hora_inicio); return t >= s && t < s + 60; });
  };
  const { getVars } = useTipoConsultaVars();

  if (doctores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
 <Icon name="person_off" size={32} className="text-slate-300 mb-2"/>
 <p className="text-[13px] font-semibold text-slate-500">Sin médicos para mostrar</p>
 <p className="text-[11.5px] text-slate-400 mt-1">Ajusta los filtros para ver la agenda de tus médicos.</p>
      </div>
    );
  }

  return (
 <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="relative">
          {isToday && <NowLine />}
          {HOURS.map(hr => {
            const blocks = getSlotCitas(hr);
            return (
 <div key={hr} className="flex border-b border-slate-100" style={{ height: SLOT_H }}>
                <div className="w-14 shrink-0 pt-1 pr-3 text-right">
 <span className="text-[10px] text-slate-400 font-medium">{hr}</span>
                </div>
                <div
                  onClick={() => { if (blocks.length === 0) onCellClick(date, hr); }}
 className={`flex-1 p-1 overflow-hidden ${blocks.length === 0 ? "cursor-pointer hover:bg-cyan-50/40" : ""}`}
                >
                  {blocks.map(c => {
                    const tipoVars = getVars(c.tipo_consulta_id);
                    const docVars = getDoctorVars(c.doctor_id);
                    const doc = doctores.find(d => d.id === c.doctor_id);
                    return (
                      <div
                        key={c.id}
                        onClick={e => { e.stopPropagation(); onEventClick(c); }}
                        className="rounded-xl mb-1 px-2.5 py-1.5 cursor-pointer hover:opacity-90 transition-opacity max-w-lg flex items-center gap-2"
                        style={{ background: tipoVars.bg, borderLeft: `3px solid ${tipoVars.solid}` }}
                      >
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[9.5px] font-bold text-white shrink-0"
                          style={{ background: docVars.solid }}
                          title={doc ? `Dr. ${doc.apellido}` : undefined}
                        >
                          {doc ? initials(`${doc.nombre} ${doc.apellido}`) : "Dr"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-semibold leading-tight truncate" style={{ color: tipoVars.text }}>{c.paciente_nombre}</p>
                          <p className="text-[10.5px] mt-0.5 opacity-75 truncate" style={{ color: tipoVars.text }}>
                            {c.hora_inicio} – {c.hora_fin} · Dr. {doc?.apellido ?? "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
