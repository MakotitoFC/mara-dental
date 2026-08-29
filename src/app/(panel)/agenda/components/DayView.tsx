"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Cita } from "@/types/agenda";
import { estadoCitaVars, ESTADO_CITA_LABEL } from "@/lib/colors";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { useSearchParams } from "next/navigation";
import { HOURS, SLOT_H, FIRST_H, timeToMin, toDateStr } from "./agendaUtils";

function NowLine() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const mins = now.getHours() * 60 + now.getMinutes() - FIRST_H * 60;
  if (mins < 0 || mins > 14 * 60) return null;
  const top = (mins / 60) * SLOT_H;
  const label = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return (
    <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center" style={{ top }}>
      <span className="text-[9.5px] font-bold text-cyan-600 w-12 text-right pr-1.5 shrink-0 leading-none">{label}</span>
 <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 shrink-0 -ml-1.5 border-2 border-white"/>
      <div className="flex-1 h-px bg-cyan-500/70" />
    </div>
  );
}

export function DayView({
  date, citas, today, onEventClick, onCellClick,
}: {
  date: Date;
  citas: Cita[];
  today: Date;
  onEventClick: (c: Cita) => void;
  onCellClick: (d: Date, hora: string) => void;
}) {
  const ds = toDateStr(date);
  const isToday = ds === toDateStr(today);
  const dayCitas = citas.filter(c => c.fecha === ds);
  const getSlotCitas = (hr: string) => {
    const s = timeToMin(hr);
    return dayCitas.filter(c => { const t = timeToMin(c.hora_inicio); return t >= s && t < s + 60; });
  };
  const dateLabel = date.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const { getVars } = useTipoConsultaVars();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get("action") === "scroll-pending") {
      const firstPending = dayCitas.find(c => c.estado === "programada");
      if (firstPending) {
        const hr = firstPending.hora_inicio.slice(0, 2) + " :00";
        setTimeout(() => {
          const el = document.getElementById(`hour-${hr}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 200);
      }
    }
  }, [searchParams, dayCitas]);

  return (
 <div className="flex flex-col h-full overflow-hidden bg-white">
 <div className="shrink-0 px-4 md:px-6 py-3 border-b border-slate-100 flex items-center gap-3">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[17px] font-bold shrink-0 ${isToday ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-800"}`}>
          {date.getDate()}
        </div>
        <div>
 <p className="text-[14px] font-semibold text-slate-900 capitalize leading-tight">{dateLabel}</p>
 <p className="text-[11px] text-slate-400">{dayCitas.length} cita{dayCitas.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="relative">
          {isToday && <NowLine />}
          {HOURS.map(hr => {
            const blocks = getSlotCitas(hr);
            return (
 <div id={`hour-${hr}`} key={hr} className="flex border-b border-slate-100" style={{ height: SLOT_H }}>
                <div className="w-14 shrink-0 pt-1 pr-3 text-right">
 <span className="text-[10px] text-slate-400 font-medium">{hr}</span>
                </div>
                <div
                  onClick={() => { if (blocks.length === 0) onCellClick(date, hr); }}
 className={`flex-1 p-1 overflow-hidden ${blocks.length === 0 ? "cursor-pointer hover:bg-cyan-50/40" : ""}`}
                >
                  {blocks.map(c => {
                    const tipoVars = getVars(c.tipo_consulta_id);
                    const estVars = estadoCitaVars(c.estado);
                    return (
                      <div
                        key={c.id}
                        onClick={e => { e.stopPropagation(); onEventClick(c); }}
                        className="rounded-xl mb-1 px-3 py-2 cursor-pointer hover:opacity-90 transition-opacity max-w-lg flex items-center justify-between gap-2"
                        style={{ background: tipoVars.bg, borderLeft: `3px solid ${tipoVars.solid}` }}
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: tipoVars.text }}>{c.paciente_nombre}</p>
                          <p className="text-[11px] mt-0.5 opacity-75" style={{ color: tipoVars.text }}>{c.hora_inicio} – {c.hora_fin}</p>
                        </div>
                        <span
                          className="shrink-0 flex items-center gap-1 text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: estVars.solid, color: "white" }}
                        >
                          <Icon name="schedule" size={10} />
                          {ESTADO_CITA_LABEL[c.estado]}
                        </span>
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
