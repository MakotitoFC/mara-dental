"use client";

import { useState, useMemo, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { getOdontogramasAction, addFindingAction, updateFindingAction, deleteFindingAction } from "../odontograma.actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Convention = "caries" | "lesion" | "preexistencia" | "hallazgo";
type Surface = "oclusal" | "vestibular" | "mesial" | "distal" | "palatino";
type Service = "medico" | "cosmetico";

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
  dentista: string; service: Service;
  findings: SessionFinding[];
}

type SurfaceConventions = Partial<Record<Surface, Convention>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const CONVENTIONS = [
  { key: "caries" as Convention, label: "Lesión / Caries", color: "#ef4444" },
  { key: "lesion" as Convention, label: "Lesión", color: "#f97316" },
  { key: "preexistencia" as Convention, label: "Preexistencia", color: "#3b82f6" },
  { key: "hallazgo" as Convention, label: "Otro Hallazgo", color: "#a855f7" },
];

const SURFACES: { key: Surface; label: string }[] = [
  { key: "vestibular", label: "Vestibular" },
  { key: "palatino", label: "Palatino/Lingual" },
  { key: "mesial", label: "Mesial" },
  { key: "distal", label: "Distal" },
  { key: "oclusal", label: "Oclusal/Incisal" },
];

const CHART_ROWS = [
  { left: [18, 17, 16, 15, 14, 13, 12, 11], right: [21, 22, 23, 24, 25, 26, 27, 28] },
  { left: [55, 54, 53, 52, 51], right: [61, 62, 63, 64, 65] },
  { left: [85, 84, 83, 82, 81], right: [71, 72, 73, 74, 75] },
  { left: [48, 47, 46, 45, 44, 43, 42, 41], right: [31, 32, 33, 34, 35, 36, 37, 38] },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function convColor(c: Convention): string {
  return CONVENTIONS.find(x => x.key === c)?.color ?? "#94a3b8";
}

function fmtDate(d: string): { day: string; month: string } {
  const dt = new Date(d + "T12:00:00");
  return {
    day: dt.getDate().toString().padStart(2, "0"),
    month: dt.toLocaleDateString("es-PE", { month: "short" }).replace(".", "").toUpperCase(),
  };
}

// ─── Chart tooth ──────────────────────────────────────────────────────────────

const GSZ = 34; const GCX = 17; const GCY = 17; const GR = 15; const GIR = 5;

function toothZoneFills(toothNumber: number, findings: SessionFinding[]) {
  const tf = findings.filter(f => f.toothNumber === toothNumber);
  const zones: Partial<Record<Surface, string>> = {};
  for (const f of tf) {
    if (f.isAll && f.allConvention) {
      const col = convColor(f.allConvention) + "bb";
      return { v: col, d: col, p: col, m: col, o: col };
    }
    for (const sc of f.surfaceConditions) {
      if (!zones[sc.surface]) zones[sc.surface] = convColor(sc.convention) + "bb";
    }
  }
  return {
    v: zones.vestibular ?? "transparent",
    d: zones.distal ?? "transparent",
    p: zones.palatino ?? "transparent",
    m: zones.mesial ?? "transparent",
    o: zones.oclusal ?? "transparent",
  };
}

function GridTooth({ number, findings, selected, onSelect }: {
  number: number; findings: SessionFinding[];
  selected: boolean; onSelect: (n: number) => void;
}) {
  const z = toothZoneFills(number, findings);
  const cid = `tc${number}`;
  return (
    <div className="flex flex-col items-center gap-0.5 cursor-pointer" onClick={() => onSelect(number)}>
      <span className={`text-[8px] font-mono leading-none ${selected ? "text-cyan-600 font-bold" : "text-slate-400"}`}>
        {number}
      </span>
      <svg viewBox={`0 0 ${GSZ} ${GSZ}`} width={GSZ} height={GSZ}>
        <defs>
          <clipPath id={`${cid}-c`}>
            <circle cx={GCX} cy={GCY} r={GR} />
          </clipPath>
        </defs>
        <circle cx={GCX} cy={GCY} r={GR} fill="white" />
        <g clipPath={`url(#${cid}-c)`}>
          <polygon points={`0,0 ${GSZ},0 ${GCX},${GCY}`} fill={z.v} />
          <polygon points={`${GSZ},0 ${GSZ},${GSZ} ${GCX},${GCY}`} fill={z.d} />
          <polygon points={`${GSZ},${GSZ} 0,${GSZ} ${GCX},${GCY}`} fill={z.p} />
          <polygon points={`0,${GSZ} 0,0 ${GCX},${GCY}`} fill={z.m} />
        </g>
        <g clipPath={`url(#${cid}-c)`} stroke="#cbd5e1" strokeWidth="0.7" pointerEvents="none">
          <line x1="0" y1="0" x2={GSZ} y2={GSZ} />
          <line x1={GSZ} y1="0" x2="0" y2={GSZ} />
        </g>
        <circle cx={GCX} cy={GCY} r={GIR} fill={z.o} stroke="#cbd5e1" strokeWidth="0.7" />
        <circle cx={GCX} cy={GCY} r={GR} fill="none"
          stroke={selected ? "#0891b2" : "#cbd5e1"}
          strokeWidth={selected ? 2 : 1} />
      </svg>
    </div>
  );
}

function FlatChart({ findings, selectedTooth, onSelect }: {
  findings: SessionFinding[]; selectedTooth: number | null;
  onSelect: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 mx-auto">
      {CHART_ROWS.map((row, ri) => (
        <div key={ri}>
          {ri === 2 && <div className="h-px bg-slate-200 my-1.5" />}
          <div className="flex justify-center gap-1">
            <div className="flex gap-1">
              {row.left.map(tn => (
                <GridTooth key={tn} number={tn} findings={findings}
                  selected={selectedTooth === tn} onSelect={onSelect} />
              ))}
            </div>
            <div className="w-3 shrink-0" />
            <div className="flex gap-1">
              {row.right.map(tn => (
                <GridTooth key={tn} number={tn} findings={findings}
                  selected={selectedTooth === tn} onSelect={onSelect} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Surface diagram ──────────────────────────────────────────────────────────

const DS = 68; const DC = 34; const DR = 30; const DIR = 10;

function SurfaceDiagram({ surfaceConventions, activeSurface, isAll, allConvention, onSelectSurface }: {
  surfaceConventions: SurfaceConventions; activeSurface: Surface | null;
  isAll: boolean; allConvention: Convention | null;
  onSelectSurface: (s: Surface) => void;
}) {
  function zFill(s: Surface): string {
    if (isAll && allConvention) return convColor(allConvention) + "cc";
    if (surfaceConventions[s]) return convColor(surfaceConventions[s]!) + "cc";
    if (activeSurface === s) return "#bfdbfe";
    return "#e2e8f0";
  }
  return (
    <div className="flex flex-col items-center gap-1 shrink-0 mx-auto sm:mx-0">
      <svg viewBox={`0 0 ${DS} ${DS}`} width={DS} height={DS}>
        <defs><clipPath id="diag-clip"><circle cx={DC} cy={DC} r={DR} /></clipPath></defs>
        <g clipPath="url(#diag-clip)">
          <polygon points={`0,0 ${DS},0 ${DC},${DC}`} fill={zFill("vestibular")}
            onClick={() => !isAll && onSelectSurface("vestibular")} style={{ cursor: isAll ? "default" : "pointer" }} />
          <polygon points={`${DS},0 ${DS},${DS} ${DC},${DC}`} fill={zFill("distal")}
            onClick={() => !isAll && onSelectSurface("distal")} style={{ cursor: isAll ? "default" : "pointer" }} />
          <polygon points={`${DS},${DS} 0,${DS} ${DC},${DC}`} fill={zFill("palatino")}
            onClick={() => !isAll && onSelectSurface("palatino")} style={{ cursor: isAll ? "default" : "pointer" }} />
          <polygon points={`0,${DS} 0,0 ${DC},${DC}`} fill={zFill("mesial")}
            onClick={() => !isAll && onSelectSurface("mesial")} style={{ cursor: isAll ? "default" : "pointer" }} />
        </g>
        <g clipPath="url(#diag-clip)" stroke="#94a3b8" strokeWidth="0.6" pointerEvents="none">
          <line x1="0" y1="0" x2={DS} y2={DS} />
          <line x1={DS} y1="0" x2="0" y2={DS} />
        </g>
        <circle cx={DC} cy={DC} r={DIR} fill={zFill("oclusal")} stroke="#94a3b8" strokeWidth="0.6"
          onClick={() => !isAll && onSelectSurface("oclusal")} style={{ cursor: isAll ? "default" : "pointer" }} />
        <circle cx={DC} cy={DC} r={DR} fill="none" stroke="#94a3b8" strokeWidth="1" pointerEvents="none" />
        {activeSurface && !isAll && (
          <circle cx={DC} cy={DC} r={DR - 1} fill="none" stroke="#0891b2"
            strokeWidth="1.5" strokeDasharray="4 3" pointerEvents="none" />
        )}
      </svg>
      <p className="h-6 text-[10px] text-slate-400 text-center leading-tight flex items-start justify-center pt-0.5">
        {isAll ? "Todo el diente" : activeSurface ? SURFACES.find(s => s.key === activeSurface)?.label : "Toca una zona"}
      </p>
    </div>
  );
}

// ─── Session finding row (HISTORIAL) ──────────────────────────────────────────

function SessionFindingRow({ finding, isPast, highlighted, onUpdateObs, onDelete }: {
  finding: SessionFinding; isPast: boolean;
  highlighted: boolean;
  onUpdateObs: (obs: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingObs, setEditingObs] = useState(finding.observaciones);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className={`bg-white rounded-xl p-3 border transition-all ${highlighted ? "border-cyan-200 shadow-sm" : "border-slate-100"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon name="dentistry" size={13} className="text-slate-500 shrink-0" />
          <span className="text-[10px] font-bold text-slate-500">#{finding.toothNumber}</span>
          <span className="text-[11px] font-medium text-slate-700 truncate">
            {TOOTH_NAMES[finding.toothNumber]}
          </span>
        </div>
        {!isPast && (
          <button onClick={() => onDelete(finding.id)} className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border-0">
            <Icon name="delete" size={13} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {finding.isAll && finding.allConvention ? (() => {
          const conv = CONVENTIONS.find(c => c.key === finding.allConvention)!;
          return (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
              style={{ background: conv.color + "12", borderColor: conv.color + "40", color: conv.color }}>
              Completo · {conv.label}
            </span>
          );
        })() : finding.surfaceConditions.map(sc => {
          const conv = CONVENTIONS.find(c => c.key === sc.convention)!;
          const surf = SURFACES.find(x => x.key === sc.surface);
          return (
            <span key={sc.surface} className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
              style={{ background: conv.color + "12", borderColor: conv.color + "40", color: conv.color }}>
              {surf?.label} · {conv.label}
            </span>
          );
        })}
      </div>

      {isPast ? (
        finding.observaciones ? (
          <p className="text-[11px] italic text-slate-400 pl-2 border-l-2 border-slate-200">
            {finding.observaciones}
          </p>
        ) : null
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className={`bg-slate-50 rounded-lg border px-2.5 py-1.5 flex items-start gap-1.5 transition-colors ${isEditing ? "border-cyan-300 ring-1 ring-cyan-100" : "border-slate-100"}`}>
            <Icon name="edit_note" size={12} className="text-slate-400 mt-0.5 shrink-0" />
            <textarea
              rows={1} value={editingObs}
              onChange={e => { setEditingObs(e.target.value); setIsEditing(true); }}
              placeholder="Sin observaciones…"
              className="flex-1 bg-transparent text-[11px] italic text-slate-600 outline-none resize-none placeholder:text-slate-300"
            />
          </div>
          {isEditing && (
            <div className="flex justify-end gap-1">
              <button onClick={() => { setEditingObs(finding.observaciones); setIsEditing(false); }} className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 border-0">Cancelar</button>
              <button onClick={() => { onUpdateObs(editingObs); setIsEditing(false); }} className="text-[10px] font-bold bg-cyan-600 text-white rounded-md px-2.5 py-1 border-0 hover:bg-cyan-700">Guardar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OdontogramaTab({ paciente }: { paciente: any }) {
  const [service, setService] = useState<Service>("medico");
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  const [surfaceConventions, setSurfaceConventions] = useState<SurfaceConventions>({});
  const [activeSurface, setActiveSurface] = useState<Surface | null>(null);
  const [isAll, setIsAll] = useState(false);
  const [allConvention, setAllConvention] = useState<Convention | null>(null);
  const [newObs, setNewObs] = useState("");

  const [findingToDelete, setFindingToDelete] = useState<SessionFinding | null>(null);

  const fetchOdontogramas = async () => {
    setLoading(true);
    const data = await getOdontogramasAction(String(paciente.id));
    setSessions(data as ExamSession[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchOdontogramas();
  }, [paciente.id]);

  const isViewingSession = !!expandedSessionId;
  const selectedSession = sessions.find(s => s.id === expandedSessionId) ?? null;
  const isPastSession = selectedSession ? selectedSession.fecha < TODAY : false;

  const serviceSessions = useMemo(
    () => sessions.filter(s => s.service === service),
    [sessions, service],
  );

  const combinedFindings = useMemo(
    () => [...serviceSessions].reverse().flatMap(s => s.findings),
    [serviceSessions],
  );

  const chartFindings = selectedSession ? selectedSession.findings : combinedFindings;

  const sessionsSorted = useMemo(
    () => [...serviceSessions].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [serviceSessions],
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
  }

  function selectTooth(num: number) {
    setSelectedTooth(p => (p === num ? null : num));
    if (!isViewingSession) resetForm();
  }

  function resetForm() {
    setSurfaceConventions({}); setActiveSurface(null);
    setIsAll(false); setAllConvention(null); setNewObs("");
  }

  function toggleAll() {
    setIsAll(p => { if (!p) { setSurfaceConventions({}); setActiveSurface(null); } return !p; });
  }

  function handleSelectSurface(s: Surface) {
    setActiveSurface(p => (p === s ? null : s));
  }

  function assignConvention(conv: Convention) {
    if (isAll) { setAllConvention(conv); return; }
    if (!activeSurface) return;
    setSurfaceConventions(p => ({ ...p, [activeSurface]: conv }));
    setActiveSurface(null);
  }

  function removeSurfaceConvention(s: Surface) {
    setSurfaceConventions(p => { const n = { ...p }; delete n[s]; return n; });
    if (activeSurface === s) setActiveSurface(null);
  }

  async function addRecord() {
    if (isViewingSession || !selectedTooth) return;
    if (isAll && !allConvention) return;
    if (!isAll && Object.keys(surfaceConventions).length === 0) return;

    setSaving(true);
    const res = await addFindingAction({
      paciente_id: Number(paciente.id),
      tipo_tratamiento: service,
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
      fetchOdontogramas(); // Recargar datos
    } else {
      alert("Error al guardar: " + res.error);
    }
  }

  async function handleUpdateFindingObs(finding: SessionFinding, obs: string) {
    setSaving(true);
    const res = await updateFindingAction(finding.db_ids, obs);
    setSaving(false);
    if (!res?.error) {
      fetchOdontogramas();
    }
  }

  async function confirmDeleteFinding() {
    if (!findingToDelete) return;
    setSaving(true);
    const res = await deleteFindingAction(findingToDelete.db_ids);
    setSaving(false);
    setFindingToDelete(null);
    if (!res?.error) {
      fetchOdontogramas();
    }
  }

  const canAdd = isAll ? !!allConvention : Object.keys(surfaceConventions).length > 0;
  const canPickConv = isAll || !!activeSurface;

  const convPickerLabel = isAll
    ? "Condición — diente completo"
    : activeSurface
      ? `Condición — ${SURFACES.find(s => s.key === activeSurface)?.label}`
      : "Condición";

  return (
    <div className="flex flex-col gap-4 w-full relative">
      
      {/* Modal de confirmación de eliminación */}
      {findingToDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px] rounded-2xl">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 w-full max-w-[320px] text-center">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon name="warning" size={24} />
            </div>
            <h3 className="text-[16px] font-bold text-slate-800 mb-1">Eliminar hallazgo</h3>
            <p className="text-[13px] text-slate-500 mb-5 leading-relaxed">¿Seguro que deseas eliminar el registro del diente <b>#{findingToDelete.toothNumber}</b>? Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setFindingToDelete(null)} disabled={saving} className="flex-1 py-2 border rounded-xl text-[12px] font-bold text-slate-600 bg-white border-slate-200">Cancelar</button>
              <button onClick={confirmDeleteFinding} disabled={saving} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[12px] font-bold border-0 transition-colors">{saving ? "Borrando..." : "Sí, eliminar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Selector de Servicio */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(["medico", "cosmetico"] as Service[]).map(s => (
          <button key={s}
            onClick={() => { setService(s); setExpandedSessionId(null); setSelectedTooth(null); resetForm(); }}
            className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-colors outline-none ${service === s ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >{s === "medico" ? "Odontología Médica" : "Odontología Cosmética"}</button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">

        {/* LADO HISTORIAL */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 order-last lg:order-first flex flex-col gap-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Historial de Exámenes</p>

          <div className="flex flex-col gap-2 w-full max-h-[400px] lg:max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-10 flex justify-center">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-cyan-500 rounded-full animate-spin" />
              </div>
            ) : sessionsSorted.length === 0 ? (
              <div className="text-center p-6 border border-dashed rounded-xl border-slate-200">
                <Icon name="history" size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-[12px] text-slate-400 italic">Sin registros en este servicio</p>
              </div>
            ) : sessionsSorted.map(s => {
              const isExpanded = expandedSessionId === s.id;
              const fdate = fmtDate(s.fecha);
              return (
                <div key={s.id} className={`border rounded-xl transition-all ${isExpanded ? "border-cyan-500 bg-cyan-50/20 shadow-sm" : "border-slate-200 bg-white"}`}>
                  {/* Header de la Sesión */}
                  <div className="flex items-center gap-3 p-3 cursor-pointer select-none" onClick={() => toggleSession(s.id)}>
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex flex-col items-center justify-center border shrink-0">
                      <span className="text-[14px] font-bold text-slate-700 leading-none">{fdate.day}</span>
                      <span className="text-[8px] font-bold text-slate-400 mt-0.5">{fdate.month}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-800 leading-tight truncate">{s.tipo}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{s.dentista}</p>
                    </div>
                    <Icon name={isExpanded ? "expand_less" : "expand_more"} size={16} className="text-slate-400" />
                  </div>

                  {/* Hallazgos dentro de la Sesión */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-slate-100 pt-2 flex flex-col gap-2 bg-slate-50/50 rounded-b-xl">
                      {s.findings.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic p-2 text-center">No se registraron anomalías</p>
                      ) : s.findings.map(f => (
                        <SessionFindingRow
                          key={f.id} finding={f} isPast={s.fecha < TODAY}
                          highlighted={selectedTooth === f.toothNumber}
                          onUpdateObs={(obs) => handleUpdateFindingObs(f, obs)}
                          onDelete={() => setFindingToDelete(f)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* LADO REGISTRO + ODONTOGRAMA */}
        <div className="flex-1 w-full min-w-0 flex flex-col gap-4">

          {isViewingSession ? (
            <div className="bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-3 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center">
                  <Icon name="history" size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">Modo revisión {isPastSession && "· Solo lectura"}</p>
                  <p className="text-[14px] font-bold text-cyan-800 leading-tight">{selectedSession?.tipo}</p>
                </div>
              </div>
              <button onClick={() => { setExpandedSessionId(null); setSelectedTooth(null); }} className="text-[11px] text-white bg-cyan-600 hover:bg-cyan-700 px-3 py-1.5 rounded-lg font-bold transition-colors border-0">Salir de revisión</button>
            </div>
          ) : (
            <>
              {/* Tooth Indicator */}
              <div className="h-12 flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${selectedTooth ? "bg-cyan-50" : "bg-slate-100"}`}>
                  <Icon name="dentistry" size={18} className={selectedTooth ? "text-cyan-600" : "text-slate-400"} />
                </div>
                <div className="min-w-0">
                  {selectedTooth ? (
                    <>
                      <p className="text-[10px] text-slate-400 font-bold leading-none mb-0.5">Diente {selectedTooth}</p>
                      <p className="text-[13px] font-bold text-slate-800 leading-tight truncate">{TOOTH_NAMES[selectedTooth]}</p>
                    </>
                  ) : (
                    <p className="text-[13px] font-medium text-slate-400 leading-tight">Haz clic en un diente del odontograma inferior para registrar</p>
                  )}
                </div>
              </div>

              {/* Formulario de Registro */}
              <div className={`transition-opacity duration-200 ${!selectedTooth ? "opacity-30 pointer-events-none select-none" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registro de Superficies</p>
                  <button onClick={toggleAll} className={`text-[11px] font-bold px-3 py-1.5 rounded-md border ${isAll ? "bg-cyan-600 text-white border-cyan-600" : "border-slate-200 text-slate-500 bg-white"}`}>Diente completo</button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row gap-4 shrink-0 items-center sm:items-start">
                    <SurfaceDiagram
                      surfaceConventions={surfaceConventions} activeSurface={activeSurface}
                      isAll={isAll} allConvention={allConvention} onSelectSurface={handleSelectSurface}
                    />

                    <div className="flex flex-col gap-1 w-full sm:w-40">
                      {SURFACES.map(s => {
                        const assignedConv = isAll ? allConvention : surfaceConventions[s.key];
                        const conv = assignedConv ? CONVENTIONS.find(c => c.key === assignedConv) : null;
                        const isActv = !isAll && activeSurface === s.key;
                        return (
                          <div key={s.key}
                            className={`flex items-center justify-between sm:justify-start gap-2 px-2.5 py-1.5 sm:py-1 rounded-lg bg-white sm:bg-transparent border sm:border-transparent ${isActv ? "bg-cyan-50 ring-1 ring-cyan-300" : ""} ${isAll ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                            onClick={() => !isAll && handleSelectSurface(s.key)}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-2.5 h-2.5 rounded-full border-[1.5px] shrink-0" style={conv ? { background: conv.color, borderColor: "transparent" } : isActv ? { borderColor: "#22d3ee" } : { borderColor: "#cbd5e1" }} />
                              <span className="text-[12px] font-medium text-slate-600 truncate">{s.label}</span>
                            </div>
                            {conv && !isAll && (
                              <button onClick={e => { e.stopPropagation(); removeSurfaceConvention(s.key); }} className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center hover:bg-red-200 hover:text-red-600 border-0">×</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sección de Etiquetas / Condiciones */}
                  <div className="flex-1 flex flex-col gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{convPickerLabel}</p>

                      <div className={`grid grid-cols-2 sm:flex sm:flex-wrap gap-2 ${!canPickConv ? "opacity-30 pointer-events-none" : ""}`}>
                        {CONVENTIONS.map(c => {
                          const isActive = isAll ? allConvention === c.key : activeSurface ? surfaceConventions[activeSurface] === c.key : false;
                          return (
                            <button key={c.key} onClick={() => assignConvention(c.key)}
                              className="px-3 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-[12px] font-bold border transition-all text-center"
                              style={isActive
                                ? { background: c.color, borderColor: c.color, color: "white" }
                                : { background: c.color + "12", borderColor: c.color + "30", color: c.color }
                              }
                            >{c.label}</button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Observaciones</p>
                      <textarea rows={2} value={newObs} onChange={e => setNewObs(e.target.value)}
                        placeholder="Escribe detalles del hallazgo clínico…"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] bg-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <button onClick={addRecord} disabled={!canAdd || saving} className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-xl text-[13px] font-bold transition-colors w-full sm:w-fit sm:self-end border-0 shadow-sm">
                      <Icon name="add" size={15} />
                      {saving ? "Guardando..." : "Agregar registro"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Canvas o Contenedor del Odontograma */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto w-full shadow-sm">
            <div className="p-4 sm:p-5 w-[620px] mx-auto shrink-0" style={{ minWidth: "620px" }}>
              <FlatChart findings={chartFindings} selectedTooth={selectedTooth} onSelect={selectTooth} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}