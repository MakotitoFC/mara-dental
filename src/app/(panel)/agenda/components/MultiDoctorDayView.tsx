"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Cita } from "@/types/agenda";
import { ESTADO_CITA_LABEL } from "@/lib/colors";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { getDoctorVars } from "./doctorColors";
import { HOURS, SLOT_H, FIRST_H, calcHoraFin, initials, timeToMin, toDateStr, type DoctorLite } from "./agendaUtils";

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
      <span className="w-2 h-2 rounded-full bg-cyan-600 shrink-0 -ml-1 border-2 border-white dark:border-slate-800" />
      <div className="flex-1 h-px bg-cyan-500/70" />
    </div>
  );
}

export function MultiDoctorDayView({
  date, citas, doctores, today, onEventClick, onCellClick,
}: {
  date: Date;
  citas: Cita[];
  doctores: DoctorLite[];
  today: Date;
  onEventClick: (c: Cita) => void;
  onCellClick: (doctorId: string, d: Date, hora: string) => void;
}) {
  const ds = toDateStr(date);
  const isToday = ds === toDateStr(today);
  const dayCitas = citas.filter(c => c.fecha === ds);
  const getCitasDoctor = (doctorId: string) => dayCitas.filter(c => c.doctor_id === doctorId);
  const getSlotCitas = (doctorId: string, hr: string) => {
    const s = timeToMin(hr);
    return getCitasDoctor(doctorId).filter(c => { const t = timeToMin(c.hora_inicio); return t >= s && t < s + 60; });
  };
  const { getVars } = useTipoConsultaVars();

  if (doctores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <Icon name="person_off" size={32} className="text-slate-300 dark:text-slate-600 mb-2" />
        <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Sin médicos para mostrar</p>
        <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-1">Ajusta los filtros para ver la agenda de tus médicos.</p>
      </div>
    );
  }

  const gridCols = `44px repeat(${doctores.length}, minmax(200px, 1fr))`;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-800">
      <div className="overflow-x-auto overflow-y-auto no-scrollbar flex-1 min-h-0">
        <div style={{ minWidth: 44 + doctores.length * 200 }}>
          {/* Encabezado de médicos */}
          <div className="grid sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700" style={{ gridTemplateColumns: gridCols }}>
            <div />
            {doctores.map(doc => {
              const vars = getDoctorVars(doc.id);
              const nombreCompleto = `${doc.nombre} ${doc.apellido}`.trim();
              const cnt = getCitasDoctor(doc.id).length;
              return (
                <div key={doc.id} className="py-2.5 px-2 flex flex-col items-center gap-1 border-l border-slate-100 dark:border-slate-700 min-w-0">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: vars.solid }}>
                    {initials(nombreCompleto) || "Dr"}
                  </span>
                  <span className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-100 truncate max-w-full">Dr. {doc.apellido}</span>
                  {doc.especialidad && (
                    <span className="text-[9.5px] text-slate-400 dark:text-slate-500 truncate max-w-full -mt-0.5">{doc.especialidad}</span>
                  )}
                  <span className={`text-[9px] font-medium ${cnt > 0 ? "text-cyan-600" : "text-transparent"}`}>
                    {cnt > 0 ? `${cnt} cita${cnt !== 1 ? "s" : ""}` : "·"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Timeline */}
          <div className="relative">
            {isToday && <NowLine />}
            {HOURS.map(hr => (
              <div key={hr} className="grid" style={{ gridTemplateColumns: gridCols, height: SLOT_H, borderBottom: "1px solid #f1f5f9" }}>
                <div className="pt-1 pr-1.5 text-right shrink-0">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">{hr}</span>
                </div>
                {doctores.map(doc => {
                  const blocks = getSlotCitas(doc.id, hr);
                  return (
                    <div
                      key={doc.id}
                      onClick={(e) => {
                        if (blocks.length !== 0) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const fraccion = Math.min(Math.max((e.clientY - rect.top) / SLOT_H, 0), 1);
                        const minutosExtra = Math.round((fraccion * 60) / 30) * 30;
                        onCellClick(doc.id, date, calcHoraFin(hr, minutosExtra));
                      }}
                      className={`border-l border-slate-100 dark:border-slate-700 p-1 overflow-hidden ${blocks.length === 0 ? "cursor-pointer hover:bg-cyan-50/40 dark:hover:bg-cyan-900/20" : ""}`}
                    >
                      {blocks.map(c => {
                        const tipoVars = getVars(c.tipo_consulta_id);
                        return (
                          <div
                            key={c.id}
                            onClick={e => { e.stopPropagation(); onEventClick(c); }}
                            className="rounded-lg mb-1 px-2 py-1.5 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                            style={{ background: tipoVars.bg, borderLeft: `3px solid ${tipoVars.solid}` }}
                            title={ESTADO_CITA_LABEL[c.estado]}
                          >
                            <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: tipoVars.text }}>
                              {c.paciente_nombre}
                            </p>
                            <p className="text-[9.5px] leading-none opacity-75 truncate mt-0.5" style={{ color: tipoVars.text }}>
                              {c.hora_inicio} – {c.hora_fin}
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
