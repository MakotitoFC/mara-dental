"use client";

import { useState, useMemo, useEffect } from "react";
import { Odontogram, type ToothDetail } from "react-odontogram";
import "react-odontogram/style.css";
import { Icon } from "@/components/ui/Icon";
import { calcEdad } from "@/lib/date-utils";
import { OdontogramaSkeleton } from "@/components/ui/ConsultaSkeletons";
import { getOdontogramasAction, addFindingAction, updateFindingAction, deleteFindingAction, getCondicionesOdontogramaAction } from "../odontograma.actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Convention = string;
type Surface = "oclusal" | "vestibular" | "mesial" | "distal" | "palatino";
type Dentition = "adulto" | "infantil";

interface SurfaceCondition { surface: Surface; convention: Convention; }

interface SessionFinding {
  id: string;
  db_ids: number[]; // Added to map back to DB
  toothNumber: number;
  isAll: boolean; allConvention?: Convention;
  surfaceConditions: SurfaceCondition[];
  observaciones: string;
}

interface ExamSession {
  id: string; fecha: string; tipo: string;
  dentista: string;
  findings: SessionFinding[];
}

type SurfaceConventions = Partial<Record<Surface, Convention>>;

// ─── Constants ────────────────────────────────────────────────────────────────



// Orden de prioridad visual cuando un diente tiene más de una condición: se
// pinta con la más urgente clínicamente.


const SURFACES: { key: Surface; label: string }[] = [
  { key: "vestibular", label: "Vestibular" },
  { key: "palatino", label: "Palatino/Lingual" },
  { key: "mesial", label: "Mesial" },
  { key: "distal", label: "Distal" },
  { key: "oclusal", label: "Oclusal/Incisal" },
];

const TOOTH_NAMES: Record<number, string> = {
  18: "3er Molar Sup. Der.", 17: "2do Molar Sup. Der.", 16: "1er Molar Sup. Der.",
  15: "2do Premolar Sup. Der.", 14: "1er Premolar Sup. Der.", 13: "Canino Sup. Der.",
  12: "Inc. Lateral Sup. Der.", 11: "Inc. Central Sup. Der.",
  21: "Inc. Central Sup. Izq.", 22: "Inc. Lateral Sup. Izq.", 23: "Canino Sup. Izq.",
  24: "1er Premolar Sup. Izq.", 25: "2do Premolar Sup. Izq.", 26: "1er Molar Sup. Izq.",
  27: "2do Molar Sup. Izq.", 28: "3er Molar Sup. Izq.",
  31: "Inc. Central Inf. Izq.", 32: "Inc. Lateral Inf. Izq.", 33: "Canino Inf. Izq.",
  34: "1er Premolar Inf. Izq.", 35: "2do Premolar Inf. Izq.", 36: "1er Molar Inf. Izq.",
  37: "2do Molar Inf. Izq.", 38: "3er Molar Inf. Izq.",
  41: "Inc. Central Inf. Der.", 42: "Inc. Lateral Inf. Der.", 43: "Canino Inf. Der.",
  44: "1er Premolar Inf. Der.", 45: "2do Premolar Inf. Der.", 46: "1er Molar Inf. Der.",
  47: "2do Molar Inf. Der.", 48: "3er Molar Inf. Der.",
  55: "2do Molar Pri. Sup. Der.", 54: "1er Molar Pri. Sup. Der.", 53: "Canino Pri. Sup. Der.",
  52: "Inc. Lat. Pri. Sup. Der.", 51: "Inc. Cen. Pri. Sup. Der.",
  61: "Inc. Cen. Pri. Sup. Izq.", 62: "Inc. Lat. Pri. Sup. Izq.", 63: "Canino Pri. Sup. Izq.",
  64: "1er Molar Pri. Sup. Izq.", 65: "2do Molar Pri. Sup. Izq.",
  71: "Inc. Cen. Pri. Inf. Izq.", 72: "Inc. Lat. Pri. Inf. Izq.", 73: "Canino Pri. Inf. Izq.",
  74: "1er Molar Pri. Inf. Izq.", 75: "2do Molar Pri. Inf. Izq.",
  81: "Inc. Cen. Pri. Inf. Der.", 82: "Inc. Lat. Pri. Inf. Der.", 83: "Canino Pri. Inf. Der.",
  84: "1er Molar Pri. Inf. Der.", 85: "2do Molar Pri. Inf. Der.",
};

const TODAY = new Date().toISOString().split("T")[0];

// ─── Helpers de notación FDI adulto ↔ infantil ─────────────────────────────────
// FDI: cuadrantes 1-4 = dentición permanente, 5-8 = dentición decidua (misma
// posición + 40, ej. permanente 11 ↔ decidua 51). react-odontogram sólo conoce
// la numeración permanente (11-48) y su prop `maxTeeth` recorta a N piezas por
// cuadrante — la usamos como "vista infantil" (5 piezas) y traducimos los ids
// a la notación decidua real en nuestra capa de datos/tooltip.

const isAdultCode = (n: number) => n < 50;

function toLibraryId(toothNumber: number, dentition: Dentition): string {
  const permanent = dentition === "infantil" ? toothNumber - 40 : toothNumber;
  return `teeth-${permanent}`;
}

function fromLibraryFdi(fdi: string, dentition: Dentition): number {
  const permanent = Number(fdi);
  return dentition === "infantil" ? permanent + 40 : permanent;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// La condición se guarda como texto libre en la tabla `condicion` de BD — si
// hay datos previos con un valor que no coincide con ninguna de nuestras 4
// claves internas, no se debe romper la vista: se cae a "Otro" en vez de
// crashear (antes usaba `.find(...)!` sin respaldo).
const UNKNOWN_CONVENTION = { key: "hallazgo" as Convention, label: "Otro", color: "#94a3b8" };

function findConvention(key: string | undefined, conventions: any[]) {
  return conventions.find(c => c.key === key) ?? UNKNOWN_CONVENTION;
}

function dominantConvention(f: SessionFinding, conventions: any[]): Convention {
  if (f.isAll && f.allConvention) return findConvention(f.allConvention, conventions).key;
  const set = new Set(f.surfaceConditions.map(sc => sc.convention));
  const priority = conventions.find(c => set.has(c.key))?.key;
  return findConvention(priority ?? f.surfaceConditions[0]?.convention, conventions).key;
}

// El color de `condicion.color` puede ser muy claro (pasteles) — usarlo tal
// cual como texto sobre su propio fondo tintado lo vuelve casi ilegible. Se
// oscurece para el texto/ícono, manteniendo el tono original solo en fondo/borde.
function darkenForText(hex: string): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
  const r = parseInt(full.slice(0, 2), 16), g = parseInt(full.slice(2, 4), 16), b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return "#334155";
  const mix = (c: number) => Math.round(c * 0.55);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function fmtDate(d: string): { day: string; month: string } {
  const dt = new Date(d + "T12:00:00");
  return {
    day: dt.getDate().toString().padStart(2, "0"),
    month: dt.toLocaleDateString("es-PE", { month: "short" }).replace(".", "").toUpperCase(),
  };
}

// ─── Session finding row (HISTORIAL) ──────────────────────────────────────────

function SessionFindingRow({ finding, isPast, highlighted, onUpdateObs, onDelete, conventions }: {
  finding: SessionFinding; isPast: boolean;
  highlighted: boolean;
  onUpdateObs: (obs: string) => void;
  onDelete: (id: string) => void;
  conventions: any[];
}) {
  const [editingObs, setEditingObs] = useState(finding.observaciones);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-3 border transition-all ${highlighted ? "border-cyan-200 dark:border-cyan-800 shadow-sm" : "border-slate-100 dark:border-slate-700"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon name="dentistry" size={13} className="text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">#{finding.toothNumber}</span>
          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
            {TOOTH_NAMES[finding.toothNumber]}
          </span>
        </div>
        {!isPast && (
          <button onClick={() => onDelete(finding.id)} className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors border-0">
            <Icon name="delete" size={13} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {finding.isAll && finding.allConvention ? (() => {
          const conv = findConvention(finding.allConvention, conventions);
          return (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
              style={{ background: conv.color + "55", borderColor: conv.color + "cc", color: darkenForText(conv.color), minWidth: 120 }}>
              completo · {conv.label}
            </span>
          );
        })() : finding.surfaceConditions.map(sc => {
          const conv = findConvention(sc.convention, conventions);
          const surf = SURFACES.find(x => x.key === sc.surface);
          return (
            <span key={sc.surface} className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
              style={{ background: conv.color + "55", borderColor: conv.color + "cc", color: darkenForText(conv.color), minWidth: 120 }}>
              {surf?.label.toLowerCase()} · {conv.label}
            </span>
          );
        })}
      </div>

      {isPast ? (
        finding.observaciones ? (
          <p className="text-[11px] italic text-slate-400 dark:text-slate-500 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
            {finding.observaciones}
          </p>
        ) : null
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className={`bg-slate-50 dark:bg-slate-900/50 rounded-lg border px-2.5 py-1.5 flex items-start gap-1.5 transition-colors ${isEditing ? "border-cyan-300 dark:border-cyan-700 ring-1 ring-cyan-100 dark:ring-cyan-900/40" : "border-slate-100 dark:border-slate-700"}`}>
            <Icon name="edit_note" size={12} className="text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
            <textarea
              rows={1} value={editingObs}
              onChange={e => { setEditingObs(e.target.value); setIsEditing(true); }}
              placeholder="Sin observaciones…"
              className="flex-1 bg-transparent text-[11px] italic text-slate-600 dark:text-slate-300 outline-none resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>
          {isEditing && (
            <div className="flex justify-end gap-1">
              <button onClick={() => { setEditingObs(finding.observaciones); setIsEditing(false); }} className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 border-0">Cancelar</button>
              <button onClick={() => { onUpdateObs(editingObs); setIsEditing(false); }} className="text-[10px] font-bold bg-cyan-600 text-white rounded-md px-2.5 py-1 border-0 hover:bg-cyan-700">Guardar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OdontogramaTab({ paciente, consultaId }: { paciente: any; consultaId?: string }) {
  // El registro de hallazgos solo ocurre dentro de una consulta activa; la
  // Ficha del Paciente (sin consultaId) es de solo lectura del historial.
  const isEditable = !!consultaId;

  // La dentición no es una elección libre: depende de la edad real del
  // paciente. Sólo se ofrece el selector en la ventana de dentición mixta
  // (~6-13 años, donde de verdad puede haber piezas permanentes y deciduas
  // a la vez); fuera de ese rango se muestra directamente la que corresponde.
  const edadPaciente = paciente?.fecha_nacimiento ? calcEdad(paciente.fecha_nacimiento) : null;
  const defaultDentition: Dentition = edadPaciente !== null && edadPaciente < 12 ? "infantil" : "adulto";
  const showDentitionToggle = edadPaciente !== null && edadPaciente >= 6 && edadPaciente <= 13;

  const [conventions, setConventions] = useState<{key:string, label:string, color:string}[]>([]);
  const [dentition, setDentition] = useState<Dentition>(defaultDentition);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [chartResetKey, setChartResetKey] = useState(0);

  const [surfaceConventions, setSurfaceConventions] = useState<SurfaceConventions>({});
  const [activeSurfaces, setActiveSurfaces] = useState<Set<Surface>>(new Set());
  const [isAll, setIsAll] = useState(false);
  const [allConvention, setAllConvention] = useState<Convention | null>(null);
  const [newObs, setNewObs] = useState("");

  const [findingToDelete, setFindingToDelete] = useState<SessionFinding | null>(null);

  const fetchOdontogramas = async () => {
    setLoading(true);
    const data = await getOdontogramasAction(String(paciente.id));
    const conds = await getCondicionesOdontogramaAction();
    const mappedConds = conds.map((c: any) => {
      const raw = String(c.condicion || "").toLowerCase();
      const label = raw.replace(/\b\w/g, (match) => match.toUpperCase());
      return {
        key: String(c.id),
        label,
        color: c.color || "#94a3b8" // Default slate-400 if no color
      };
    });
    setConventions(mappedConds);
    setSessions(data as ExamSession[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchOdontogramas();
  }, [paciente.id]);

  const isViewingSession = !!expandedSessionId;
  const selectedSession = sessions.find(s => s.id === expandedSessionId) ?? null;

  const combinedFindings = useMemo(
    () => [...sessions].reverse().flatMap(s => s.findings),
    [sessions],
  );

  const chartFindings = selectedSession ? selectedSession.findings : combinedFindings;

  // Sólo se muestran en el odontograma los hallazgos de la dentición activa
  // (permanente 11-48 vs decidua 51-85) — un paciente en transición puede
  // tener registros de ambas.
  const visibleFindings = useMemo(
    () => chartFindings.filter(f => (dentition === "adulto" ? isAdultCode(f.toothNumber) : !isAdultCode(f.toothNumber))),
    [chartFindings, dentition],
  );

  const teethConditions = useMemo(() => {
    const byConv = new Map<Convention, string[]>();
    for (const f of visibleFindings) {
      const conv = dominantConvention(f, conventions);
      const libId = toLibraryId(f.toothNumber, dentition);
      const list = byConv.get(conv) ?? [];
      if (!list.includes(libId)) list.push(libId);
      byConv.set(conv, list);
    }
    return conventions.filter(c => byConv.has(c.key)).map(c => ({
      label: c.label,
      teeth: byConv.get(c.key)!,
      fillColor: c.color,
      outlineColor: c.color,
    }));
  }, [visibleFindings, dentition, conventions]);

  const sessionsSorted = useMemo(
    () => [...sessions].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [sessions],
  );

  function toggleSession(id: string) {
    if (expandedSessionId === id) {
      setExpandedSessionId(null);
      setSelectedTooth(null);
    } else {
      setExpandedSessionId(id);
      setSelectedTooth(null);
      resetForm();
    }
    setChartResetKey(k => k + 1);
  }

  function handleOdontogramChange(selected: ToothDetail[]) {
    // react-odontogram llama a onChange desde dentro del updater de su propio
    // setState interno (no desde el evento de clic directamente), lo que dispara
    // "Cannot update a component while rendering a different component" si
    // actualizamos nuestro estado de forma síncrona. setTimeout(0) lo saca por
    // completo del ciclo de render/commit actual (más confiable que un microtask,
    // que aún puede correr antes de que React termine de confirmar la actualización).
    //
    // Importante: la librería puede reinvocar onChange más de una vez para el
    // MISMO diente ya seleccionado (no solo al cambiar de diente). Antes,
    // resetForm() se llamaba en cada invocación sin importar si el diente
    // cambiaba — eso borraba la superficie/condición/observaciones que el
    // usuario ya había elegido casi de inmediato, dando la sensación de que
    // "no se puede registrar nada". Ahora solo reseteamos el formulario cuando
    // el diente seleccionado realmente cambia.
    setTimeout(() => {
      const first = selected[0];
      if (!first) {
        setSelectedTooth(null);
        if (!isViewingSession) resetForm();
        return;
      }
      const num = fromLibraryFdi(first.notations.fdi, dentition);
      setSelectedTooth(prev => {
        if (prev !== num && !isViewingSession) resetForm();
        return num;
      });
    }, 0);
  }

  function changeDentition(next: Dentition) {
    setDentition(next);
    setSelectedTooth(null);
    resetForm();
    setChartResetKey(k => k + 1);
  }

  function resetForm() {
    setSurfaceConventions({}); setActiveSurfaces(new Set());
    setIsAll(false); setAllConvention(null); setNewObs("");
  }

  function toggleAll() {
    setIsAll(p => { if (!p) { setSurfaceConventions({}); setActiveSurfaces(new Set()); } return !p; });
  }

  function handleSelectSurface(s: Surface) {
    setActiveSurfaces(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  // Aplica la condición elegida a todas las superficies seleccionadas a la vez
  // (antes solo se podía asignar de a una superficie por vez).
  function assignConvention(conv: Convention) {
    if (isAll) { setAllConvention(conv); return; }
    if (activeSurfaces.size === 0) return;
    setSurfaceConventions(p => {
      const next = { ...p };
      activeSurfaces.forEach(s => { next[s] = conv; });
      return next;
    });
    setActiveSurfaces(new Set());
  }

  function removeSurfaceConvention(s: Surface) {
    setSurfaceConventions(p => { const n = { ...p }; delete n[s]; return n; });
    setActiveSurfaces(prev => {
      if (!prev.has(s)) return prev;
      const next = new Set(prev);
      next.delete(s);
      return next;
    });
  }

  async function addRecord() {
    if (!isEditable || isViewingSession || !selectedTooth) return;
    if (isAll && !allConvention) return;
    if (!isAll && Object.keys(surfaceConventions).length === 0) return;

    setSaving(true);
    const res = await addFindingAction({
      consulta_id: String(consultaId),
      diente: selectedTooth,
      isAll,
      allConvention: isAll ? (allConvention ?? undefined) : undefined,
      surfaceConditions: isAll ? [] : Object.entries(surfaceConventions).map(([s, c]) => ({
        surface: s as string, convention: c as string,
      })),
      observaciones: newObs
    });
    setSaving(false);

    if (!res?.error) {
      resetForm();
      setSelectedTooth(null);
      setChartResetKey(k => k + 1);
      fetchOdontogramas(); // Recargar datos
    } else {
      alert("Error al guardar: " + res.error);
    }
  }

  async function handleUpdateFindingObs(finding: SessionFinding, obs: string) {
    setSaving(true);
    const res = await updateFindingAction(finding.db_ids.map(String), obs);
    setSaving(false);
    if (!res?.error) {
      fetchOdontogramas();
    }
  }

  async function confirmDeleteFinding() {
    if (!findingToDelete) return;
    setSaving(true);
    const res = await deleteFindingAction(findingToDelete.db_ids.map(String));
    setSaving(false);
    setFindingToDelete(null);
    if (!res?.error) {
      fetchOdontogramas();
    }
  }

  const canAdd = isAll ? !!allConvention : Object.keys(surfaceConventions).length > 0;
  const canPickConv = isAll || activeSurfaces.size > 0;

  const convPickerLabel = isAll
    ? "Condición — diente completo"
    : activeSurfaces.size === 1
      ? `Condición — ${SURFACES.find(s => s.key === [...activeSurfaces][0])?.label}`
      : activeSurfaces.size > 1
        ? `Condición — ${activeSurfaces.size} superficies`
        : "Condición";

  if (loading) return <OdontogramaSkeleton />;

  return (
    <div className="flex flex-col gap-4 w-full relative">

      {/* Modal de confirmación de eliminación */}
      {findingToDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px] rounded-2xl">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-5 w-full max-w-[320px] text-center">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon name="warning" size={24} />
            </div>
            <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-1">Eliminar hallazgo</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">¿Seguro que deseas eliminar el registro del diente <b>#{findingToDelete.toothNumber}</b>? Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setFindingToDelete(null)} disabled={saving} className="flex-1 py-2 border rounded-xl text-[12px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">Cancelar</button>
              <button onClick={confirmDeleteFinding} disabled={saving} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[12px] font-bold border-0 transition-colors">{saving ? "Borrando..." : "Sí, eliminar"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">

        {/* COLUMNA 1 — Odontograma: dentición + leyenda arriba, indicador flotante abajo */}
        <div className="w-full lg:flex-1 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {showDentitionToggle ? (
              // Dentición mixta (~6-13 años): el doctor puede necesitar alternar entre
              // piezas permanentes y deciduas en la misma visita.
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1 w-fit shrink-0">
                {(["adulto", "infantil"] as Dentition[]).map(d => (
                  <button key={d}
                    onClick={() => changeDentition(d)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12px] font-bold transition-colors outline-none ${dentition === d ? "bg-cyan-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                  >
                    <Icon name={d === "adulto" ? "person" : "cake"} size={13} />
                    {d === "adulto" ? "Adulto" : "Infantil"}
                  </button>
                ))}
              </div>
            ) : (
              // Fuera de la ventana de transición: la dentición se determina sola por edad.
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-[12px] font-bold text-slate-600 dark:text-slate-300 w-fit shrink-0">
                <Icon name={dentition === "adulto" ? "person" : "cake"} size={13} className="text-slate-400 dark:text-slate-500" />
                {dentition === "adulto" ? "Dentición adulta" : "Dentición infantil"}
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-6 flex flex-col items-center gap-4">
            <div className="w-full max-w-55">
              <Odontogram
                key={`${dentition}-${chartResetKey}`}
                theme="light"
                layout="circle"
                maxTeeth={dentition === "adulto" ? 8 : 5}
                singleSelect
                readOnly={!isEditable || isViewingSession}
                showTooltip
                showLabels={false}
                teethConditions={teethConditions}
                onChange={handleOdontogramChange}
                tooltip={{
                  placement: "top",
                  content: (payload) => {
                    if (!payload) return null;
                    const num = fromLibraryFdi(payload.notations.fdi, dentition);
                    return (
                      <div className="text-[11px] leading-tight">
                        <strong className="block text-slate-900 font-bold">Diente {num}</strong>
                        <span className="text-slate-500">{TOOTH_NAMES[num] ?? payload.type}</span>
                      </div>
                    );
                  },
                }}
              />
            </div>

            {/* Indicador — solo tiene sentido en modo editable (dentro de una consulta) */}
            {isEditable && (
              <div className={`flex items-center gap-2 rounded-full pl-2.5 pr-3.5 py-2 border max-w-full ${selectedTooth ? "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${selectedTooth ? "bg-cyan-100 dark:bg-cyan-900/50" : "bg-slate-100 dark:bg-slate-700"}`}>
                  <Icon name="dentistry" size={13} className={selectedTooth ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500"} />
                </div>
                <span className={`text-[12px] font-semibold truncate ${selectedTooth ? "text-cyan-800 dark:text-cyan-300" : "text-slate-500 dark:text-slate-400"}`}>
                  {selectedTooth ? `Diente ${selectedTooth} · ${TOOTH_NAMES[selectedTooth]}` : "Toca un diente para registrar"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 2 — Formulario de registro e historial */}
        <div className="w-full lg:flex-1 min-w-0 flex flex-col gap-4">

          {!isEditable ? null : isViewingSession ? null : (
            <div className={`transition-opacity duration-200 ${!selectedTooth ? "opacity-40 pointer-events-none select-none" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Registro de superficies</p>
                <button onClick={toggleAll} className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${isAll ? "bg-cyan-600 text-white border-cyan-600" : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800"}`}>
                  <Icon name="tooth" size={13} className={isAll ? "text-white" : "text-slate-400 dark:text-slate-500"} />
                  Diente completo
                </button>
              </div>

              <div className="flex flex-col gap-3 bg-slate-50/80 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Superficie */}
                  <div className={isAll ? "opacity-40 pointer-events-none" : ""}>
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Superficie</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SURFACES.map(s => {
                        const conv = surfaceConventions[s.key] ? conventions.find(c => c.key === surfaceConventions[s.key]) : null;
                        const isActv = activeSurfaces.has(s.key);
                        return (
                          <button key={s.key} type="button" onClick={() => handleSelectSurface(s.key)}
                            className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-xl text-[11.5px] font-semibold border transition-all ${
                              isActv && !conv ? "border-cyan-400 dark:border-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400" : !conv ? "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800" : ""
                            } ${isActv && conv ? "ring-2 ring-cyan-500 ring-offset-1 ring-offset-slate-50 dark:ring-offset-slate-900" : ""}`}
                            style={conv ? { background: conv.color + "1a", color: darkenForText(conv.color), borderColor: isActv ? conv.color : conv.color + "55" } : undefined}
                          >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: conv ? conv.color : "#cbd5e1" }} />
                            {s.label}
                            {conv && (
                              <span onClick={e => { e.stopPropagation(); removeSurfaceConvention(s.key); }}
                                className="w-3.5 h-3.5 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-[9px] ml-0.5">×</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {activeSurfaces.size > 1 && (
                      <p className="text-[10.5px] text-cyan-600 dark:text-cyan-400 font-medium mt-1.5">
                        {activeSurfaces.size} superficies seleccionadas — elige una condición para aplicarla a todas.
                      </p>
                    )}
                  </div>

                  {/* Condición — el color de cada opción es la única leyenda */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{convPickerLabel.toLowerCase()}</p>
                    <div className={`flex flex-wrap gap-1.5 ${!canPickConv ? "opacity-30 pointer-events-none" : ""}`}>
                      {conventions.map(c => {
                        const isActive = isAll ? allConvention === c.key : false;
                        return (
                          <button key={c.key} onClick={() => assignConvention(c.key)}
                            className={`px-3 py-2 rounded-full text-[12px] font-semibold border transition-all shadow-sm ${isActive ? "ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900 ring-cyan-500" : ""}`}
                            style={{ background: c.color + "66", borderColor: c.color + "cc", color: darkenForText(c.color) }}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Observaciones</p>
                  <textarea rows={3} value={newObs} onChange={e => setNewObs(e.target.value)}
                    placeholder="Escribe detalles del hallazgo clínico…"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none text-[16px] sm:text-[13px]"
                  />
                </div>

                <button onClick={addRecord} disabled={!canAdd || saving} className="flex items-center justify-center gap-1.5 py-2 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[12.5px] font-bold transition-colors w-full sm:w-fit sm:self-end border-0">
                  <Icon name="add" size={14} />
                  {saving ? "Guardando..." : "Agregar registro"}
                </button>
              </div>
            </div>
          )}

          {/* Historial de Exámenes */}
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Historial de Exámenes</p>

            <div className="flex flex-col gap-2 w-full max-h-100 overflow-y-auto pr-1">
              {sessionsSorted.length === 0 ? (
                <div className="text-center p-6 border border-dashed rounded-xl border-slate-200 dark:border-slate-700">
                  <Icon name="history" size={24} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-[12px] text-slate-400 dark:text-slate-500 italic">Sin registros aún</p>
                </div>
              ) : sessionsSorted.map(s => {
                const isExpanded = expandedSessionId === s.id;
                const fdate = fmtDate(s.fecha);
                return (
                  <div key={s.id} className={`border rounded-xl transition-all ${isExpanded ? "border-cyan-500 dark:border-cyan-600 bg-cyan-50/20 dark:bg-cyan-900/10 shadow-sm" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"}`}>
                    {/* Header de la Sesión */}
                    <div className="flex items-center gap-3 p-3 cursor-pointer select-none" onClick={() => toggleSession(s.id)}>
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex flex-col items-center justify-center border dark:border-slate-600 shrink-0">
                        <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200 leading-none">{fdate.day}</span>
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{fdate.month}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">{s.tipo}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{s.dentista}</p>
                      </div>
                      <Icon name={isExpanded ? "expand_less" : "expand_more"} size={16} className="text-slate-400 dark:text-slate-500" />
                    </div>

                    {/* Hallazgos dentro de la Sesión */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700 pt-2 flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-900/30 rounded-b-xl">
                        {s.findings.length === 0 ? (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic p-2 text-center">No se registraron anomalías</p>
                        ) : s.findings.map(f => (
                          <SessionFindingRow
                            key={f.id} finding={f} isPast={!isEditable || s.fecha < TODAY}
                            highlighted={selectedTooth === f.toothNumber}
                            onUpdateObs={(obs) => handleUpdateFindingObs(f, obs)}
                            onDelete={() => setFindingToDelete(f)}
                            conventions={conventions}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
