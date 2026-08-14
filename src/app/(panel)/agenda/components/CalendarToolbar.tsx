"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import type { CalView, DoctorLite } from "./agendaUtils";
import { VIEW_LABELS, VIEW_ICONS, ESTADO_ORDER, ESTADO_ICON } from "./agendaUtils";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { estadoCitaVars, ESTADO_CITA_LABEL } from "@/lib/colors";
import type { EstadoCita } from "@/types/agenda";
import { getDoctorVars } from "./doctorColors";

const VIEWS: CalView[] = ["day", "week", "month", "year", "cronograma"];

export type TipoFiltro = string | "todos"; // string is tipo_consulta_id
export type EstadoFiltro = EstadoCita | "todos";
export type DoctorFiltro = string[] | "todos"; // array de doctor ids seleccionados

function ViewSelector({ view, onViewChange }: { view: CalView; onViewChange: (v: CalView) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-1 md:flex-none">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="w-full md:w-[130px] flex items-center justify-between gap-2 h-9 pl-3 pr-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 transition-colors shrink-0"
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          <Icon name={VIEW_ICONS[view]} size={15} className="text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="truncate">{VIEW_LABELS[view]}</span>
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
  const { getVars, tipos } = useTipoConsultaVars();
  
  const vars = value !== "todos" ? getVars(value as string) : null;
  const label = value === "todos" ? "Todos los tipos" : (vars?.label || "Desconocido");

  return (
    <div className="relative flex-1 md:flex-none">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="w-full md:w-[168px] flex items-center justify-between gap-2 h-9 pl-3 pr-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 transition-colors shrink-0"
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
          className="absolute left-0 md:left-auto md:right-0 top-10 z-30 min-w-[180px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1.5 px-1.5 flex flex-col gap-1"
        >
          <button
            onMouseDown={() => onChange("todos")}
            className={`text-left px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${value === "todos" ? "bg-cyan-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"}`}
          >
            Todos los tipos
          </button>
          {tipos.map((tipo) => {
            const v = getVars(tipo.id);
            const active = value === tipo.id;
            return (
              <button
                key={tipo.id}
                onMouseDown={() => onChange(tipo.id)}
                className="text-left px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                style={active ? { background: v.solid, color: "white" } : { background: `${v.solid}1a`, color: v.solid }}
              >
                {tipo.tipo_consulta}
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function DoctorFiltroSelector({ doctores, value, onChange }: { doctores: DoctorLite[]; value: DoctorFiltro; onChange: (v: DoctorFiltro) => void }) {
  const [open, setOpen] = useState(false);
  const allSelected = value === "todos";
  const selectedIds = allSelected ? doctores.map(d => d.id) : value;
  const label = allSelected
    ? "Todos los médicos"
    : selectedIds.length === 0
      ? "Ningún médico"
      : selectedIds.length === 1
        ? `Dr. ${doctores.find(d => d.id === selectedIds[0])?.apellido ?? "—"}`
        : `${selectedIds.length} médicos`;

  function toggleDoctor(id: string) {
    const current = allSelected ? doctores.map(d => d.id) : value;
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    onChange(next.length === doctores.length ? "todos" : next);
  }

  return (
    <div className="relative flex-1 md:flex-none">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full md:w-[160px] flex items-center justify-between gap-2 h-9 pl-3 pr-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 transition-colors shrink-0"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Icon name="stethoscope" size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <Icon name="expand_more" size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 md:left-auto md:right-0 top-10 z-30 min-w-[220px] max-h-72 overflow-y-auto no-scrollbar bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1"
        >
          <button
            onMouseDown={() => onChange("todos")}
            className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700 ${allSelected ? "text-cyan-700 dark:text-cyan-400 font-semibold" : "text-slate-600 dark:text-slate-300"}`}
          >
            <span className={`w-3.5 h-3.5 rounded shrink-0 border-2 flex items-center justify-center ${allSelected ? "bg-cyan-600 border-cyan-600" : "border-slate-300 dark:border-slate-600"}`}>
              {allSelected && <Icon name="check" size={10} className="text-white" />}
            </span>
            Todos los médicos
          </button>
          {doctores.length > 0 && <div className="my-1 border-t border-slate-100 dark:border-slate-700" />}
          {doctores.map((doc) => {
            const vars = getDoctorVars(doc.id);
            const checked = selectedIds.includes(doc.id);
            return (
              <button
                key={doc.id}
                onMouseDown={() => toggleDoctor(doc.id)}
                className="w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                <span
                  className={`w-3.5 h-3.5 rounded shrink-0 border-2 flex items-center justify-center ${checked ? "" : "border-slate-300 dark:border-slate-600"}`}
                  style={checked ? { background: vars.solid, borderColor: vars.solid } : undefined}
                >
                  {checked && <Icon name="check" size={10} className="text-white" />}
                </span>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: vars.solid }} />
                <span className="truncate">Dr. {doc.apellido}</span>
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function EstadoFiltroSelector({ value, onChange }: { value: EstadoFiltro; onChange: (v: EstadoFiltro) => void }) {
  const [open, setOpen] = useState(false);
  const vars = value !== "todos" ? estadoCitaVars(value) : null;
  const label = value === "todos" ? "Todos los estados" : ESTADO_CITA_LABEL[value];

  return (
    <div className="relative flex-1 md:flex-none">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full md:w-[160px] flex items-center justify-between gap-2 h-9 pl-3 pr-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 transition-colors shrink-0"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Icon name={value !== "todos" ? ESTADO_ICON[value] : "category"} size={14} className="text-slate-500 dark:text-slate-400 shrink-0" style={vars ? { color: vars.solid } : undefined} />
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
            <Icon name="category" size={14} className="shrink-0" />
            Todos los estados
          </button>
          {ESTADO_ORDER.map((e) => {
            const v = estadoCitaVars(e);
            return (
              <button
                key={e}
                onMouseDown={() => onChange(e)}
                className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700 ${value === e ? "font-semibold" : "text-slate-600 dark:text-slate-300"}`}
                style={value === e ? { color: v.text } : undefined}
              >
                <Icon name={ESTADO_ICON[e]} size={14} style={{ color: v.solid }} />
                {ESTADO_CITA_LABEL[e]}
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function EspecialidadFiltroSelector({ especialidades, value, onChange }: { especialidades: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const label = value === "todas" ? "Todas las especialidades" : value;

  if (especialidades.length === 0) return null;

  return (
    <div className="relative flex-1 md:flex-none">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full md:w-[170px] flex items-center justify-between gap-2 h-9 pl-3 pr-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 transition-colors shrink-0"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Icon name="medical_information" size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <Icon name="expand_more" size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 md:left-auto md:right-0 top-10 z-30 min-w-[190px] max-h-64 overflow-y-auto no-scrollbar bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1"
        >
          <button
            onMouseDown={() => onChange("todas")}
            className={`w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700 ${value === "todas" ? "text-cyan-700 dark:text-cyan-400 font-semibold" : "text-slate-600 dark:text-slate-300"}`}
          >
            Todas las especialidades
          </button>
          {especialidades.map((esp) => (
            <button
              key={esp}
              onMouseDown={() => onChange(esp)}
              className={`w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700 ${value === esp ? "text-cyan-700 dark:text-cyan-400 font-semibold" : "text-slate-600 dark:text-slate-300"}`}
            >
              {esp}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export function CalendarToolbar({
  view, onViewChange, label, onPrev, onNext, onToday, onNewCita, tipoFiltro, onTipoFiltroChange,
  role, doctores, doctorFiltro, onDoctorFiltroChange,
  especialidadFiltro, onEspecialidadFiltroChange,
  estadoFiltro, onEstadoFiltroChange,
  soloConCitasHoy, onSoloConCitasHoyChange,
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
  role?: string;
  doctores?: DoctorLite[];
  doctorFiltro?: DoctorFiltro;
  onDoctorFiltroChange?: (v: DoctorFiltro) => void;
  especialidadFiltro?: string;
  onEspecialidadFiltroChange?: (v: string) => void;
  estadoFiltro?: EstadoFiltro;
  onEstadoFiltroChange?: (v: EstadoFiltro) => void;
  soloConCitasHoy?: boolean;
  onSoloConCitasHoyChange?: (v: boolean) => void;
}) {
  const isCronograma = view === "cronograma";
  const isAsistente = role === "asistente";
  const especialidades = Array.from(new Set((doctores ?? []).map(d => d.especialidad).filter(Boolean))) as string[];

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
        <div className="flex items-center gap-2 flex-wrap">
          <ViewSelector view={view} onViewChange={onViewChange} />
          <TipoFiltroSelector value={tipoFiltro} onChange={onTipoFiltroChange} />
          {/* En Semana el panel lateral de la grilla de tiempo (MultiDoctorWeekTimeGrid)
              ya trae su propio checklist de médicos, así que en desktop este
              selector se oculta para no duplicar el control — pero ese panel
              lateral es `hidden md:flex`, así que en mobile no había ninguna
              forma de filtrar por médico en Semana. Ahí se muestra igual,
              pero solo en mobile (`md:hidden`). */}
          {isAsistente && doctores && onDoctorFiltroChange && (
            view !== "week" ? (
              <DoctorFiltroSelector doctores={doctores} value={doctorFiltro ?? "todos"} onChange={onDoctorFiltroChange} />
            ) : (
              <div className="md:hidden">
                <DoctorFiltroSelector doctores={doctores} value={doctorFiltro ?? "todos"} onChange={onDoctorFiltroChange} />
              </div>
            )
          )}
          {isAsistente && view !== "week" && onEspecialidadFiltroChange && (
            <EspecialidadFiltroSelector especialidades={especialidades} value={especialidadFiltro ?? "todas"} onChange={onEspecialidadFiltroChange} />
          )}
          {isAsistente && onEstadoFiltroChange && (
            <EstadoFiltroSelector value={estadoFiltro ?? "todos"} onChange={onEstadoFiltroChange} />
          )}
          {isAsistente && view === "day" && onSoloConCitasHoyChange && (
            <button
              onClick={() => onSoloConCitasHoyChange(!soloConCitasHoy)}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-semibold transition-colors shrink-0 ${
                soloConCitasHoy ? "bg-cyan-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              <Icon name="event_available" size={15} />
              Solo con citas
            </button>
          )}
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
