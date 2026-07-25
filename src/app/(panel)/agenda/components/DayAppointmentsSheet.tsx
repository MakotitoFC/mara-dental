"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import type { Cita } from "@/types/agenda";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { estadoCitaVars, ESTADO_CITA_LABEL } from "@/lib/colors";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { staggerContainer, staggerItem } from "@/lib/animations";

export function DayAppointmentsSheet({
  date, citas, onClose, onSelectCita, onNewCita,
}: {
  date: Date;
  citas: Cita[];
  onClose: () => void;
  onSelectCita: (c: Cita) => void;
  onNewCita: () => void;
}) {
  const { getVars } = useTipoConsultaVars();
  const raw = date.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
  const label = raw.charAt(0).toUpperCase() + raw.slice(1);

  return (
    <ResponsiveSheet
      onClose={onClose}
      title={label}
      footer={
        <button
          onClick={onNewCita}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[13px] font-semibold transition-colors"
        >
          <Icon name="add" size={17} />
          Nueva cita este día
        </button>
      }
    >
      {citas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <Icon name="calendar_month" size={34} className="text-slate-200 dark:text-slate-700" />
          <p className="text-[13px] text-slate-400 dark:text-slate-500">Sin citas programadas</p>
        </div>
      ) : (
        <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="visible" className="flex flex-col gap-2 py-1">
          {citas.map(c => {
            const tipoVars = getVars(c.tipo_consulta_id);
            const estVars = estadoCitaVars(c.estado);
            return (
              <motion.button
                key={c.id}
                variants={staggerItem}
                onClick={() => onSelectCita(c)}
                className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/40 dark:hover:bg-cyan-900/20 transition-colors px-3.5 py-3 flex items-center gap-3"
              >
                <div className="flex flex-col items-center justify-center w-12 shrink-0">
                  <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-none">{c.hora_inicio}</span>
                  <span className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5">{c.hora_fin}</span>
                </div>
                <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: tipoVars.solid }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">{c.paciente_nombre}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: tipoVars.bg, color: tipoVars.text }}>
                      {tipoVars.label}
                    </span>
                    <span className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: estVars.bg, color: estVars.text }}>
                      {ESTADO_CITA_LABEL[c.estado]}
                    </span>
                  </div>
                </div>
                <Icon name="chevron_right" size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </ResponsiveSheet>
  );
}
