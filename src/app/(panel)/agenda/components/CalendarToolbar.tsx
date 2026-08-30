"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { SmartPopover } from "@/components/ui/SmartPopover";
import { FilterTag } from "@/components/ui/FilterTag";
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

function ViewSelector({
  view, onViewChange, joined, onRemove,
}: {
  view: CalView;
  onViewChange: (v: CalView) => void;
  joined?: boolean;
  /** Modo tag (mismo patrón dual que TipoFiltroSelector): se renderiza como
      FilterTag con chevron + X en vez de botón suelto — usado en la fila de
      filtros activos del Calendario del doctor, donde "Vista" es una
      categoría más del picker maestro (junto a "Tipo"). */
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={onRemove ? "shrink-0" : joined ? "shrink-0" : "flex-1 md:flex-none"}>
      <SmartPopover
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        renderTrigger={(ref) =>
          onRemove ? (
            <FilterTag ref={ref as any} onClick={() => setOpen((o) => !o)} onRemove={onRemove} icon={VIEW_ICONS[view]} label={`Vista: ${VIEW_LABELS[view]}`} />
          ) : joined ? (
            // Modo icon-only de tamaño fijo w-9 h-9, sin animación de
            // expansión: clic para abrir el menú, clic afuera cierra (ver
            // useClickOutside dentro de SmartPopover), y el botón nunca
            // cambia de tamaño ni en hover ni en tablet/mobile.
            <button
              ref={ref}
              onClick={() => setOpen((o) => !o)}
              title={VIEW_LABELS[view]}
              aria-label={VIEW_LABELS[view]}
 className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors shrink-0"
            >
 <Icon name={VIEW_ICONS[view]} size={16} className="text-slate-500 shrink-0"/>
            </button>
          ) : (
            <button
              ref={ref}
              onClick={() => setOpen((o) => !o)}
 className="w-full md:w-[130px] flex items-center justify-between gap-2 h-9 pl-3 pr-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[12.5px] font-semibold text-slate-800 transition-colors shrink-0"
            >
              <span className="flex items-center gap-1.5 min-w-0 truncate">
 <Icon name={VIEW_ICONS[view]} size={15} className="text-slate-500 shrink-0"/>
                <span className="truncate">{VIEW_LABELS[view]}</span>
              </span>
 <Icon name="expand_more" size={16} className="text-slate-400"/>
            </button>
          )
        }
      >
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
 className="min-w-[170px] bg-white border border-slate-200 rounded-lg shadow-lg py-1"
        >
          {VIEWS.map((v) => (
            <button
              key={v}
              onMouseDown={() => { onViewChange(v); setOpen(false); }}
 className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${v === view ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
            >
 <Icon name={VIEW_ICONS[v]} size={15} className={v === view ? "text-cyan-600" : "text-slate-400"} />
              {VIEW_LABELS[v]}
            </button>
          ))}
        </motion.div>
      </SmartPopover>
    </div>
  );
}

function TipoFiltroSelector({ value, onChange, onRemove }: { value: TipoFiltro; onChange: (v: TipoFiltro) => void; onRemove?: () => void }) {
  const [open, setOpen] = useState(false);
  const { getVars, tipos } = useTipoConsultaVars();

  const vars = value !== "todos" ? getVars(value as string) : null;
  const label = value === "todos" ? "Todos los tipos" : (vars?.label || "Desconocido");

  // Como chip (onRemove): tamaño natural, nunca estira — así queda pegado a
  // los demás tags y a "+ Filtro" en la fila de filtros activos. Como select
  // suelto (toolbar genérico de doctor/admin): flex-1 en mobile para ocupar
  // el ancho completo apilado.
  return (
    <div className={onRemove ? "shrink-0" : "flex-1 md:flex-none"}>
      <SmartPopover
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        renderTrigger={(ref) =>
          onRemove ? (
            <FilterTag ref={ref as any} onClick={() => setOpen((o) => !o)} onRemove={onRemove} icon="category" label={label} />
          ) : (
            <button
              ref={ref}
              onClick={() => setOpen((o) => !o)}
 className="w-full md:w-[168px] flex items-center justify-between gap-2 h-9 pl-3 pr-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[12.5px] font-semibold text-slate-800 transition-colors shrink-0"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: vars ? vars.solid : "#94a3b8" }} />
                <span className="truncate">{label}</span>
              </span>
 <Icon name="expand_more" size={16} className="text-slate-400 shrink-0"/>
            </button>
          )
        }
      >
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
 className="min-w-[180px] bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 px-1.5 flex flex-col gap-1"
        >
          <button
            onMouseDown={() => { onChange("todos"); setOpen(false); }}
 className={`text-left px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${value === "todos" ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
          >
            Todos los tipos
          </button>
          {tipos.map((tipo) => {
            const v = getVars(tipo.id);
            const active = value === tipo.id;
            return (
              <button
                key={tipo.id}
                onMouseDown={() => { onChange(tipo.id); setOpen(false); }}
                className="text-left px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                style={active ? { background: v.solid, color: "white" } : { background: `${v.solid}1a`, color: v.solid }}
              >
                {tipo.tipo_consulta}
              </button>
            );
          })}
        </motion.div>
      </SmartPopover>
    </div>
  );
}

function DoctorFiltroSelector({ doctores, value, onChange, onRemove }: { doctores: DoctorLite[]; value: DoctorFiltro; onChange: (v: DoctorFiltro) => void; onRemove?: () => void }) {
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
    <div className={onRemove ? "shrink-0" : "flex-1 md:flex-none"}>
      <SmartPopover
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        renderTrigger={(ref) =>
          onRemove ? (
            <FilterTag ref={ref as any} onClick={() => setOpen((o) => !o)} onRemove={onRemove} icon="stethoscope" label={label} />
          ) : (
            <button
              ref={ref}
              onClick={() => setOpen((o) => !o)}
 className="w-full md:w-[160px] flex items-center justify-between gap-2 h-9 pl-3 pr-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[12.5px] font-semibold text-slate-800 transition-colors shrink-0"
            >
              <span className="flex items-center gap-1.5 min-w-0">
 <Icon name="stethoscope" size={14} className="text-slate-500 shrink-0"/>
                <span className="truncate">{label}</span>
              </span>
 <Icon name="expand_more" size={16} className="text-slate-400 shrink-0"/>
            </button>
          )
        }
      >
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
 className="min-w-[220px] max-h-72 overflow-y-auto no-scrollbar bg-white border border-slate-200 rounded-lg shadow-lg py-1"
        >
          <button
            onMouseDown={() => { onChange("todos"); setOpen(false); }}
 className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${allSelected ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
          >
 <span className={`w-5 h-5 rounded-md shrink-0 border-2 flex items-center justify-center ${allSelected ? "bg-cyan-600 border-cyan-600" : "border-slate-300"}`}>
              {allSelected && <Icon name="check" size={13} className="text-white" />}
            </span>
            Todos los médicos
          </button>
 {doctores.length > 0 && <div className="my-1 border-t border-slate-100"/>}
          {doctores.map((doc) => {
            const vars = getDoctorVars(doc.id);
            const checked = selectedIds.includes(doc.id);
            return (
              <button
                key={doc.id}
                onMouseDown={() => { toggleDoctor(doc.id); setOpen(false); }}
 className="w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 text-slate-600"
              >
                <span
 className={`w-5 h-5 rounded-md shrink-0 border-2 flex items-center justify-center ${checked ? "" : "border-slate-300"}`}
                  style={checked ? { background: vars.solid, borderColor: vars.solid } : undefined}
                >
                  {checked && <Icon name="check" size={13} className="text-white" />}
                </span>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: vars.solid }} />
                <span className="truncate">Dr. {doc.apellido}</span>
              </button>
            );
          })}
        </motion.div>
      </SmartPopover>
    </div>
  );
}

function EstadoFiltroSelector({ value, onChange, onRemove }: { value: EstadoFiltro; onChange: (v: EstadoFiltro) => void; onRemove?: () => void }) {
  const [open, setOpen] = useState(false);
  const vars = value !== "todos" ? estadoCitaVars(value) : null;
  const label = value === "todos" ? "Todos los estados" : ESTADO_CITA_LABEL[value];

  return (
    <div className={onRemove ? "shrink-0" : "flex-1 md:flex-none"}>
      <SmartPopover
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        renderTrigger={(ref) =>
          onRemove ? (
            <FilterTag ref={ref as any} onClick={() => setOpen((o) => !o)} onRemove={onRemove} icon={value !== "todos" ? ESTADO_ICON[value] : "check_circle"} label={label} />
          ) : (
          <button
            ref={ref}
            onClick={() => setOpen((o) => !o)}
 className="w-full md:w-[160px] flex items-center justify-between gap-2 h-9 pl-3 pr-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[12.5px] font-semibold text-slate-800 transition-colors shrink-0"
          >
            <span className="flex items-center gap-1.5 min-w-0">
 <Icon name={value !== "todos" ? ESTADO_ICON[value] :"category"} size={14} className="text-slate-500 shrink-0" style={vars ? { color: vars.solid } : undefined} />
              <span className="truncate">{label}</span>
            </span>
 <Icon name="expand_more" size={16} className="text-slate-400 shrink-0"/>
          </button>
          )
        }
      >
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
 className="min-w-[180px] bg-white border border-slate-200 rounded-lg shadow-lg py-1"
        >
          <button
            onMouseDown={() => { onChange("todos"); setOpen(false); }}
 className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${value === "todos" ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
          >
            <Icon name="category" size={14} className="shrink-0" />
            Todos los estados
          </button>
          {ESTADO_ORDER.map((e) => {
            const v = estadoCitaVars(e);
            return (
              <button
                key={e}
                onMouseDown={() => { onChange(e); setOpen(false); }}
 className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${value === e ? "font-semibold" : "text-slate-600"}`}
                style={value === e ? { color: v.text } : undefined}
              >
                <Icon name={ESTADO_ICON[e]} size={14} style={{ color: v.solid }} />
                {ESTADO_CITA_LABEL[e]}
              </button>
            );
          })}
        </motion.div>
      </SmartPopover>
    </div>
  );
}

function EspecialidadFiltroSelector({ especialidades, value, onChange, onRemove }: { especialidades: string[]; value: string; onChange: (v: string) => void; onRemove?: () => void }) {
  const [open, setOpen] = useState(false);
  const label = value === "todas" ? "Todas las especialidades" : value;

  if (especialidades.length === 0) return null;

  return (
    <div className={onRemove ? "shrink-0" : "flex-1 md:flex-none"}>
      <SmartPopover
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        renderTrigger={(ref) =>
          onRemove ? (
            <FilterTag ref={ref as any} onClick={() => setOpen((o) => !o)} onRemove={onRemove} icon="medical_information" label={label} />
          ) : (
            <button
              ref={ref}
              onClick={() => setOpen((o) => !o)}
 className="w-full md:w-[170px] flex items-center justify-between gap-2 h-9 pl-3 pr-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[12.5px] font-semibold text-slate-800 transition-colors shrink-0"
            >
              <span className="flex items-center gap-1.5 min-w-0">
 <Icon name="medical_information" size={14} className="text-slate-500 shrink-0"/>
                <span className="truncate">{label}</span>
              </span>
 <Icon name="expand_more" size={16} className="text-slate-400 shrink-0"/>
            </button>
          )
        }
      >
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
 className="min-w-[190px] max-h-64 overflow-y-auto no-scrollbar bg-white border border-slate-200 rounded-lg shadow-lg py-1"
        >
          <button
            onMouseDown={() => { onChange("todas"); setOpen(false); }}
 className={`w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${value === "todas" ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
          >
            Todas las especialidades
          </button>
          {especialidades.map((esp) => (
            <button
              key={esp}
              onMouseDown={() => { onChange(esp); setOpen(false); }}
 className={`w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${value === esp ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
            >
              {esp}
            </button>
          ))}
        </motion.div>
      </SmartPopover>
    </div>
  );
}

type FilterKey = "tipo" | "medico" | "especialidad" | "estado" | "vista";

const FILTER_LABELS: Record<FilterKey, string> = {
  tipo: "Tipo de consulta",
  medico: "Médico",
  especialidad: "Especialidad",
  estado: "Estado",
  vista: "Vista",
};

const FILTER_ICONS: Record<FilterKey, string> = {
  tipo: "category",
  medico: "stethoscope",
  especialidad: "medical_information",
  estado: "check_circle",
  vista: "calendar_month",
};

/** Selector de filtros en 2 pasos (paso 1: elegir qué dimensión filtrar).
    Se usa tanto como el botón-ícono principal como el "+ Filtro" que
    acompaña a los chips ya activos — ambos operan sobre el mismo estado
    `activeKeys` que vive en CalendarToolbar. */
function FiltroPickerButton({
  variant, availableKeys, activeKeys, onToggle,
}: {
  variant: "icon" | "chip";
  availableKeys: FilterKey[];
  activeKeys: Set<FilterKey>;
  onToggle: (k: FilterKey) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <SmartPopover
      open={open}
      onClose={() => setOpen(false)}
      placement="bottom-start"
      renderTrigger={(ref) =>
        variant === "icon" ? (
          <button
            ref={ref}
            onClick={() => setOpen((o) => !o)}
            title="Filtros"
            aria-label="Filtros"
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors shrink-0 ${
              open || activeKeys.size > 0 ? "bg-cyan-50 text-cyan-600" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            <Icon name="filter_lines" size={17} />
          </button>
        ) : (
          // Mismo diseño de píldora que Dashboard Directivo/Personal/
          // Auditoría: trazo + fondo sutil, bordes redondeados.
          <button
            ref={ref}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium bg-cyan-500/5 text-cyan-600 border border-cyan-500/40 hover:bg-cyan-500/10 transition-colors shrink-0"
          >
            <Icon name="add" size={14} className="shrink-0" />
            Filtro
          </button>
        )
      }
    >
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
 className="min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg py-1.5"
      >
 <p className="px-3 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Filtrar por</p>
        {availableKeys.map((k) => {
          const active = activeKeys.has(k);
          return (
            <button
              key={k}
              onMouseDown={() => { onToggle(k); setOpen(false); }}
 className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${active ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
            >
 <Icon name={FILTER_ICONS[k]} size={15} className={active ? "text-cyan-600" : "text-slate-400"} />
              <span className="flex-1">{FILTER_LABELS[k]}</span>
 {active && <Icon name="check" size={14} className="text-cyan-600"/>}
            </button>
          );
        })}
      </motion.div>
    </SmartPopover>
  );
}

export function CalendarToolbar({
  view, onViewChange, label, onPrev, onNext, onToday, onNewCita, tipoFiltro, onTipoFiltroChange,
  role, doctores, doctorFiltro, onDoctorFiltroChange,
  especialidadFiltro, onEspecialidadFiltroChange,
  estadoFiltro, onEstadoFiltroChange,
  onOpenDoctorPanel,
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
  onOpenDoctorPanel?: () => void;
}) {
  const isCronograma = view === "cronograma";
  const isAsistente = role === "asistente";
  const especialidades = Array.from(new Set((doctores ?? []).map(d => d.especialidad).filter(Boolean))) as string[];

  const [activeFilterKeys, setActiveFilterKeys] = useState<Set<FilterKey>>(new Set());

  // Quita SOLO ese filtro: lo saca de `activeFilterKeys` (oculta su chip) Y
  // resetea su valor real a "todos" — si solo se ocultara el chip, el
  // filtro seguiría aplicándose de forma invisible sobre los resultados.
  function removeFilter(k: FilterKey) {
    setActiveFilterKeys((prev) => {
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
    if (k === "tipo") onTipoFiltroChange("todos");
    else if (k === "medico") onDoctorFiltroChange?.("todos");
    else if (k === "especialidad") onEspecialidadFiltroChange?.("todas");
    else if (k === "estado") onEstadoFiltroChange?.("todos");
    else if (k === "vista") onViewChange("day");
  }

  function toggleFilterKey(k: FilterKey) {
    if (activeFilterKeys.has(k)) {
      removeFilter(k);
    } else {
      setActiveFilterKeys((prev) => new Set(prev).add(k));
    }
  }

  if (isAsistente) {
    const showMedico = !!doctores && !!onDoctorFiltroChange;
    const showEspecialidad = view !== "week" && !!onEspecialidadFiltroChange;
    const showEstado = !!onEstadoFiltroChange;

    const availableKeys: FilterKey[] = [
      "tipo",
      ...(showMedico ? (["medico"] as FilterKey[]) : []),
      ...(showEspecialidad ? (["especialidad"] as FilterKey[]) : []),
      ...(showEstado ? (["estado"] as FilterKey[]) : []),
    ];

    const hasActiveChips = availableKeys.some((k) => activeFilterKeys.has(k));

    return (
 <div className="shrink-0 bg-white border-b border-slate-100 px-3 py-2.5 md:px-5 md:py-4 flex flex-col gap-2.5">
        {/* En mobile (<md) cada cluster ocupa su propia fila completa,
            alineado a la izquierda; en md+ vuelven a compartir una sola fila
            con justify-between, igual que siempre. */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          {/* Cluster izquierdo: hoy + fecha + navegación */}
          {!isCronograma ? (
            <div className="flex items-center gap-1 md:gap-1.5 min-w-0">
              <button
                onClick={onToday}
 className="h-7 px-2.5 rounded-md text-[11.5px] font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 transition-colors shrink-0 flex items-center justify-center"
              >
                Hoy
              </button>
 <h1 className="text-[15px] md:text-[17px] font-bold text-slate-900 capitalize truncate px-1">{label}</h1>
              <div className="flex items-center shrink-0">
                <button
                  aria-label="Periodo anterior"
                  onClick={onPrev}
 className="w-9 h-9 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                >
                  <Icon name="chevron_left" size={20} />
                </button>
                <button
                  aria-label="Periodo siguiente"
                  onClick={onNext}
 className="w-9 h-9 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                >
                  <Icon name="chevron_right" size={20} />
                </button>
              </div>
            </div>
          ) : (
 <h1 className="text-[15px] md:text-[17px] font-bold text-slate-900 truncate px-1">{label}</h1>
          )}

          {/* Cluster derecho: nueva cita + doctores (solo tablet/mobile) +
              filtro + vista. En desktop no hay columna de avatares que
              tapar/mostrar, así que el botón "Doctores" ni se renderiza ahí
              (lg:hidden). justify-end: en mobile este cluster ocupa su
              propia fila completa (ver flex-col del contenedor padre) y debe
              quedar pegado al extremo derecho, no a la izquierda. */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={onNewCita}
              className="flex items-center justify-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[12.5px] font-semibold transition-colors shrink-0"
            >
              <Icon name="add" size={16} />
              <span className="hidden sm:inline">Nueva cita</span>
            </button>
            {onOpenDoctorPanel && (
              // Botón de acción simple (como "Nueva cita" pero secundario):
              // NO debe parecer un filtro/tag activo — sin chevron, sin
              // borde ni fondo cian, sin apariencia de pill seleccionable.
              <button
                onClick={onOpenDoctorPanel}
                title="Doctores"
                aria-label="Ver doctores"
 className="lg:hidden flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11.5px] font-semibold transition-colors shrink-0"
              >
                <Icon name="stethoscope" size={16} />
                <span className="hidden sm:inline">Doctores</span>
              </button>
            )}
            <FiltroPickerButton variant="icon" availableKeys={availableKeys} activeKeys={activeFilterKeys} onToggle={toggleFilterKey} />
            <ViewSelector view={view} onViewChange={onViewChange} joined />
          </div>
        </div>

        {/* Fila 2: filtros activados (vacía si no se eligió ninguno) */}
        {hasActiveChips && (
          <div className="flex items-center gap-2 flex-wrap">
            {activeFilterKeys.has("tipo") && (
              <TipoFiltroSelector value={tipoFiltro} onChange={onTipoFiltroChange} onRemove={() => removeFilter("tipo")} />
            )}
            {activeFilterKeys.has("medico") && showMedico && (
              view !== "week" ? (
                <DoctorFiltroSelector doctores={doctores!} value={doctorFiltro ?? "todos"} onChange={onDoctorFiltroChange!} onRemove={() => removeFilter("medico")} />
              ) : (
                <div className="md:hidden">
                  <DoctorFiltroSelector doctores={doctores!} value={doctorFiltro ?? "todos"} onChange={onDoctorFiltroChange!} onRemove={() => removeFilter("medico")} />
                </div>
              )
            )}
            {activeFilterKeys.has("especialidad") && showEspecialidad && (
              <EspecialidadFiltroSelector especialidades={especialidades} value={especialidadFiltro ?? "todas"} onChange={onEspecialidadFiltroChange!} onRemove={() => removeFilter("especialidad")} />
            )}
            {activeFilterKeys.has("estado") && showEstado && (
              <EstadoFiltroSelector value={estadoFiltro ?? "todos"} onChange={onEstadoFiltroChange!} onRemove={() => removeFilter("estado")} />
            )}
            <FiltroPickerButton variant="chip" availableKeys={availableKeys} activeKeys={activeFilterKeys} onToggle={toggleFilterKey} />
          </div>
        )}
      </div>
    );
  }

  // Vista Doctor: los 2 selects sueltos que había (Vista, Tipo) se
  // consolidan detrás de un único botón de filtro (mismo picker de 2 pasos
  // que usa el asistente) — reutiliza `activeFilterKeys`/`toggleFilterKey`/
  // `removeFilter` ya declarados arriba, con "vista" como categoría extra.
  const doctorAvailableKeys: FilterKey[] = ["vista", "tipo"];
  const hasActiveChipsDoctor = doctorAvailableKeys.some((k) => activeFilterKeys.has(k));

  return (
 <div className="shrink-0 bg-white border-b border-slate-100 px-3 py-2.5 md:px-5 md:py-4 flex flex-col gap-2.5">
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
        {/* Título + navegación */}
        <div className="flex items-center gap-1 md:gap-1.5 min-w-0">
          {!isCronograma && (
            <>
              <button
                aria-label="Periodo anterior"
                onClick={onPrev}
 className="w-11 h-11 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
              >
                <Icon name="chevron_left" size={20} />
              </button>
 <h1 className="text-[15px] md:text-[17px] font-bold text-slate-900 capitalize truncate px-1">{label}</h1>
              <button
                aria-label="Periodo siguiente"
                onClick={onNext}
 className="w-11 h-11 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
              >
                <Icon name="chevron_right" size={20} />
              </button>
              <button
                onClick={onToday}
 className="hidden sm:inline-flex ml-1 h-7 px-2.5 rounded-md text-[11.5px] font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 transition-colors shrink-0 items-center justify-center"
              >
                Hoy
              </button>
            </>
          )}
          {isCronograma && (
 <h1 className="text-[15px] md:text-[17px] font-bold text-slate-900 truncate px-1">{label}</h1>
          )}
          <button
            onClick={onNewCita}
            className="sm:hidden ml-auto flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[12px] font-semibold transition-colors shrink-0"
          >
            <Icon name="add" size={16} />
            Nueva cita
          </button>
        </div>

        {/* Botón de filtro (icon-only, mismo estilo que FiltroPickerButton
            usa en asistente — sin fondo/borde cian, se ve como acción del
            header, no como un tag) + nueva cita */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:ml-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <FiltroPickerButton variant="icon" availableKeys={doctorAvailableKeys} activeKeys={activeFilterKeys} onToggle={toggleFilterKey} />
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

      {/* Fila de tags activos — Vista/Tipo aparecen solo si se eligieron
          desde el picker; "+ Filtro" al final los reabre. */}
      {hasActiveChipsDoctor && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilterKeys.has("vista") && (
            <ViewSelector view={view} onViewChange={onViewChange} onRemove={() => removeFilter("vista")} />
          )}
          {activeFilterKeys.has("tipo") && (
            <TipoFiltroSelector value={tipoFiltro} onChange={onTipoFiltroChange} onRemove={() => removeFilter("tipo")} />
          )}
          <FiltroPickerButton variant="chip" availableKeys={doctorAvailableKeys} activeKeys={activeFilterKeys} onToggle={toggleFilterKey} />
        </div>
      )}
    </div>
  );
}
