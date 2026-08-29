"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import type { Cita } from "@/types/agenda";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { updateCitaAction } from "../actions";
import { getDoctorVars } from "./doctorColors";
import { initials, toDateStr, type CalView, type DoctorLite } from "./agendaUtils";

const DIA_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
function fmtDiaCorto(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return `${DIA_CORTO[(d.getDay() + 6) % 7]} ${d.getDate()}`;
}

/** Agrupación por período para el acordeón de cada doctor: "none" (vista
    Día, ya es un solo día), "date" (Semana/Mes, un encabezado por fecha) o
    "relative" (Cronograma: Hoy/Mañana/Esta semana/Más adelante). */
export type SidebarGroupMode = "none" | "date" | "relative";

function bucketRelativo(fecha: string, todayStr: string, today: Date): string {
  if (fecha < todayStr) return "Atrasadas";
  if (fecha === todayStr) return "Hoy";
  const mañana = new Date(today); mañana.setDate(mañana.getDate() + 1);
  if (fecha === toDateStr(mañana)) return "Mañana";
  const finSemana = new Date(today); finSemana.setDate(finSemana.getDate() + (7 - today.getDay()));
  if (new Date(fecha + "T12:00:00") <= finSemana) return "Esta semana";
  return "Más adelante";
}
const ORDEN_BUCKET = ["Atrasadas", "Hoy", "Mañana", "Esta semana", "Más adelante"];

function CitaRow({ c, onChanged }: { c: Cita; onChanged: () => void }) {
  const { getVars } = useTipoConsultaVars();
  const tipoVars = getVars(c.tipo_consulta_id);
  const done = c.estado === "hecho";
  const cancelada = c.estado === "cancelada";
  const muted = done || cancelada;

  async function toggleHecha() {
    const nuevoEstado = done ? "programada" : "hecho";
    await updateCitaAction(c.id, { estado: nuevoEstado });
    onChanged();
  }

  return (
    <label
      className={`flex items-center gap-2 py-1 px-2 rounded-md text-xs transition-colors ${cancelada ? "cursor-default" : "cursor-pointer"} ${
 muted ? "text-slate-400" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <input
        type="checkbox"
        checked={done}
        disabled={cancelada}
        onChange={toggleHecha}
 className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 shrink-0 disabled:opacity-50"
      />
 <span className={`shrink-0 font-semibold ${muted ? "line-through" : "text-cyan-700"}`}>{c.hora_inicio}</span>
      <span className={`truncate ${muted ? "line-through" : ""}`} style={!muted ? { color: tipoVars.text } : undefined}>
        {tipoVars.label}
      </span>
    </label>
  );
}

function DoctorItem({
  doctor, citas, groupMode, today, expanded, onToggleExpand, collapsed, onChanged,
}: {
  doctor: DoctorLite;
  citas: Cita[];
  groupMode: SidebarGroupMode;
  today: Date;
  expanded: boolean;
  onToggleExpand: () => void;
  collapsed: boolean;
  onChanged: () => void;
}) {
  const vars = getDoctorVars(doctor.id);
  const nombreCompleto = `${doctor.nombre} ${doctor.apellido}`.trim();
  const citasOrdenadas = [...citas].sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio));
  const count = citasOrdenadas.length;

  let grupos: { label: string; citas: Cita[] }[] = [];
  if (groupMode === "none") {
    grupos = [{ label: "", citas: citasOrdenadas }];
  } else {
    const map = new Map<string, Cita[]>();
    const todayStr = toDateStr(today);
    for (const c of citasOrdenadas) {
      const label = groupMode === "relative" ? bucketRelativo(c.fecha, todayStr, today) : fmtDiaCorto(c.fecha);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(c);
    }
    const labels = groupMode === "relative"
      ? ORDEN_BUCKET.filter((l) => map.has(l))
      : Array.from(map.keys()).sort((a, b) => (map.get(a)![0].fecha).localeCompare(map.get(b)![0].fecha));
    grupos = labels.map((label) => ({ label, citas: map.get(label)! }));
  }

  return (
    <div>
      <button
        onClick={onToggleExpand}
        title={collapsed ? nombreCompleto : undefined}
 className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors ${collapsed ? "justify-center" : ""}`}
      >
        <span className="relative shrink-0">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-bold text-white"
            style={{ background: vars.solid }}
          >
            {initials(nombreCompleto) || "Dr"}
          </span>
          {collapsed && count > 0 && (
 <span className="absolute -bottom-1 -right-1 min-w-[15px] h-[15px] px-[3px] rounded-full bg-cyan-500/10 border border-white text-cyan-700 text-[9px] font-bold flex items-center justify-center">
              {count}
            </span>
          )}
        </span>
        {!collapsed && (
          <>
 <span className="text-[12.5px] font-semibold text-slate-800 truncate flex-1 text-left">
              Dr. {doctor.apellido}
            </span>
 <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600">
              {count}
            </span>
            <Icon
              name="expand_more"
              size={14}
 className={`shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {!collapsed && expanded && (
        <div className="pl-11 pr-3 pb-2 flex flex-col gap-1.5">
          {citasOrdenadas.length === 0 ? (
 <p className="text-[11px] text-slate-400 py-1">Sin citas en este período</p>
          ) : (
            grupos.map((g) => (
              <div key={g.label || "unico"} className="flex flex-col gap-0.5">
                {g.label && (
 <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1 first:mt-0">{g.label}</p>
                )}
                {g.citas.map((c) => (
                  <CitaRow key={c.id} c={c} onChanged={onChanged} />
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Sidebar izquierdo de doctores para el calendario de asistente — mismo
    fondo blanco que el header/grid (no un panel gris aparte), con acordeón
    por doctor cuyas citas se agrupan según el período de la vista activa
    (día/semana/mes/año/cronograma, ver `groupMode`). Todos los doctores
    arrancan expandidos al entrar a una vista; colapsa a solo avatares con
    un badge de cantidad de citas si el usuario cierra el sidebar entero. */
export function DoctorSidebar({
  doctores, periodCitas, groupMode, today, collapsed, onToggleCollapse, onChanged, view,
  variant = "sidebar", onClose,
}: {
  doctores: DoctorLite[];
  periodCitas: Cita[];
  groupMode: SidebarGroupMode;
  today: Date;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onChanged: () => void;
  view: CalView;
  /** "sidebar" (default): panel fijo de desktop dentro del flujo flex, sin
      cambios. "accordion": tablet/mobile — bloque horizontal en el flujo
      normal del documento (no overlay, no fixed), ubicado entre el header y
      el calendario; al expandir/colapsar anima su propia altura y empuja el
      calendario hacia abajo/arriba. */
  variant?: "sidebar" | "accordion";
  onClose?: () => void;
}) {
  // Set de IDs COLAPSADOS individualmente. En el sidebar de desktop el set
  // arranca VACÍO (todos expandidos). En el acordeón de tablet/mobile arranca
  // con TODOS los IDs (todos colapsados) — ahí el usuario despliega cada
  // doctor a mano, no vienen todos abiertos de entrada.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => (variant === "accordion" ? new Set(doctores.map((d) => d.id)) : new Set())
  );

  // Al cambiar de vista/período se reinicia al mismo estado por defecto de
  // cada variante (todos expandidos en sidebar, todos colapsados en acordeón).
  useEffect(() => {
    setCollapsedIds(variant === "accordion" ? new Set(doctores.map((d) => d.id)) : new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  function toggleDoctorExpand(doctorId: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(doctorId)) next.delete(doctorId); else next.add(doctorId);
      return next;
    });
  }

  function handleAvatarClick(doctorId: string) {
    if (collapsed) {
      onToggleCollapse();
      setCollapsedIds((prev) => { const next = new Set(prev); next.delete(doctorId); return next; });
    } else {
      toggleDoctorExpand(doctorId);
    }
  }

  if (variant === "accordion") {
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
 className="shrink-0 overflow-hidden bg-white border-b border-slate-200"
      >
 <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
 <span className="text-[13px] font-bold text-slate-700">Doctores</span>
          <button
            onClick={onClose}
            aria-label="Cerrar lista de doctores"
 className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        {/* ~35-40% del alto visible, NO un max-height fijo en px: en
            pantallas chicas un valor fijo (ej. 384px) puede consumir casi
            toda la altura restante y dar la sensación de que "tapa" el
            calendario. Con scroll propio si la lista no entra. */}
        <div className="max-h-[38vh] overflow-y-auto no-scrollbar px-2 py-1.5">
          {doctores.length === 0 ? (
 <p className="text-[11.5px] text-slate-400 px-2 py-2">Sin médicos para mostrar.</p>
          ) : (
            doctores.map((doc) => (
              <DoctorItem
                key={doc.id}
                doctor={doc}
                citas={periodCitas.filter((c) => c.doctor_id === doc.id)}
                groupMode={groupMode}
                today={today}
                expanded={!collapsedIds.has(doc.id)}
                onToggleExpand={() => toggleDoctorExpand(doc.id)}
                collapsed={false}
                onChanged={onChanged}
              />
            ))
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <aside
 className={`${collapsed ? "w-14" : "w-60"} shrink-0 h-full flex flex-col bg-white border-r border-slate-200 overflow-hidden transition-all duration-300`}
    >
 <div className={`flex items-center shrink-0 h-12 border-b border-slate-100 ${collapsed ? "justify-center" : "justify-between px-3"}`}>
 {!collapsed && <span className="text-[13px] font-bold text-slate-700">Doctores</span>}
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expandir doctores" : "Colapsar doctores"}
 className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
        >
          <Icon name={collapsed ? "chevron_right" : "chevron_left"} size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-1.5">
        {doctores.length === 0 ? (
 !collapsed && <p className="text-[11.5px] text-slate-400 px-3 py-2">Sin médicos para mostrar.</p>
        ) : (
          doctores.map((doc) => (
            <DoctorItem
              key={doc.id}
              doctor={doc}
              citas={periodCitas.filter((c) => c.doctor_id === doc.id)}
              groupMode={groupMode}
              today={today}
              expanded={!collapsedIds.has(doc.id)}
              onToggleExpand={() => handleAvatarClick(doc.id)}
              collapsed={collapsed}
              onChanged={onChanged}
            />
          ))
        )}
      </div>
    </aside>
  );
}
