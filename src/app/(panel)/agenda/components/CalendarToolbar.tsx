"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import type { CalView } from "./agendaUtils";
import { VIEW_LABELS, VIEW_ICONS } from "./agendaUtils";
import { type TipoCita, TIPO_CITA_LABEL, TIPO_CITA_ORDER, tipoCitaVars } from "@/lib/colors";

const VIEWS: CalView[] = ["day", "week", "month", "year", "cronograma"];

export type TipoFiltro = TipoCita | "todos";

function ViewSelector({ view, onViewChange }: { view: CalView; onViewChange: (v: CalView) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-1 md:flex-none">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 h-9 pl-3 pr-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Icon name={VIEW_ICONS[view]} size={15} className="text-slate-500 dark:text-slate-400" />
          {VIEW_LABELS[view]}
        </span>
        <Icon name="expand_more" size={16} className="text-slate-400 dark:text-slate-500" />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 md:left-auto md:right-0 top-10 z-30 min-w-[170px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1"
        >
          {VIEWS.map((v) => (
            <button
              key={v}
              onMouseDown={() => onViewChange(v)}
              className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700 ${v === view ? "text-cyan-700 dark:text-cyan-400 font-semibold" : "text-slate-600 dark:text-slate-300"}`}
            >
              <Icon name={VIEW_ICONS[v]} size={15} className={v === view ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500"} />
              {VIEW_LABELS[v]}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function TipoFiltroSelector({ value, onChange }: { value: TipoFiltro; onChange: (v: TipoFiltro) => void }) {
  const [open, setOpen] = useState(false);
  const vars = value !== "todos" ? tipoCitaVars(value) : null;
  const label = value === "todos" ? "Todos los tipos" : TIPO_CITA_LABEL[value];

  return (
    <div className="relative flex-1 md:flex-none">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 h-9 pl-3 pr-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 transition-colors"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: vars ? vars.solid : "#94a3b8" }} />
          <span className="truncate">{label}</span>
        </span>
        <Icon name="expand_more" size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 md:left-auto md:right-0 top-10 z-30 min-w-[180px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1"
        >
          <button
            onMouseDown={() => onChange("todos")}
            className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700 ${value === "todos" ? "text-cyan-700 dark:text-cyan-400 font-semibold" : "text-slate-600 dark:text-slate-300"}`}
          >
            <span className="w-2 h-2 rounded-full shrink-0 bg-slate-400 dark:bg-slate-500" />
            Todos los tipos
          </button>
          {TIPO_CITA_ORDER.map((tipo) => {
            const v = tipoCitaVars(tipo);
            return (
              <button
                key={tipo}
                onMouseDown={() => onChange(tipo)}
                className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700 ${value === tipo ? "font-semibold" : "text-slate-600 dark:text-slate-300"}`}
                style={value === tipo ? { color: v.text } : undefined}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: v.solid }} />
                {TIPO_CITA_LABEL[tipo]}
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

export function CalendarToolbar({
  view, onViewChange, label, onPrev, onNext, onToday, onNewCita, tipoFiltro, onTipoFiltroChange,
}: {
  view: CalView;
  onViewChange: (v: CalView) => void;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewCita: () => void;
  tipoFiltro: TipoFiltro;
  onTipoFiltroChange: (v: TipoFiltro) => void;
}) {
  const isCronograma = view === "cronograma";

  return (
    <div className="shrink-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-3 py-2.5 md:px-5 md:py-4 flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
      {/* Título + navegación */}
      <div className="flex items-center gap-1 md:gap-1.5 min-w-0">
        {!isCronograma && (
          <>
            <button
              aria-label="Periodo anterior"
              onClick={onPrev}
              className="w-11 h-11 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 transition-colors shrink-0"
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <h1 className="text-[15px] md:text-[17px] font-bold text-slate-900 dark:text-slate-100 capitalize truncate px-1">{label}</h1>
            <button
              aria-label="Periodo siguiente"
              onClick={onNext}
              className="w-11 h-11 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 transition-colors shrink-0"
            >
              <Icon name="chevron_right" size={20} />
            </button>
            <button
              onClick={onToday}
              className="hidden sm:inline-flex ml-1 h-7 px-2.5 rounded-md text-[11.5px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors shrink-0 items-center justify-center"
            >
              Hoy
            </button>
          </>
        )}
        {isCronograma && (
          <h1 className="text-[15px] md:text-[17px] font-bold text-slate-900 dark:text-slate-100 truncate px-1">{label}</h1>
        )}
        <button
          onClick={onNewCita}
          className="sm:hidden ml-auto flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[12px] font-semibold transition-colors shrink-0"
        >
          <Icon name="add" size={16} />
          Nueva cita
        </button>
      </div>

      {/* Selectores de vista + tipo + nueva cita */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:ml-auto">
        <div className="flex items-center gap-2">
          <ViewSelector view={view} onViewChange={onViewChange} />
          <TipoFiltroSelector value={tipoFiltro} onChange={onTipoFiltroChange} />
        </div>
        <button
          onClick={onNewCita}
          className="hidden sm:flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[12.5px] font-semibold transition-colors shrink-0"
        >
          <Icon name="add" size={16} />
          Nueva cita
        </button>
      </div>
    </div>
  );
}
