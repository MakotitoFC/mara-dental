"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { 
  saveRecetaAction, 
  toggleEstadoRecetaAction, 
  deleteRecetaAction,
  deleteMedicamentoAction,
  searchMedicamentosAction 
} from "../actions";

interface Medicamento {
  id: number;
  medicamento_id?: number | null;
  medicamento_nombre: string;
  dosis: string;
  frecuencia: string;
  indicaciones: string;
}

interface Receta {
  id: number;
  fecha_emision: string;
  estado: string;
  receta_medicamento: Medicamento[];
}

const emptyMed = () => ({ medicamento_nombre: "", dosis: "", frecuencia: "", indicaciones: "", medicamento_id: null });

export function RecetaSection({
  diagnosticoId,
  consultaId,
  initial,
  enabled = true,
}: { diagnosticoId: number; consultaId: number; initial: Receta[]; enabled?: boolean }) {
  const [recetas, setRecetas] = useState<Receta[]>(initial || []);
  const [creating, setCreating] = useState(false);
  const [meds, setMeds] = useState<any[]>([emptyMed()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);

  async function handleSearchMed(q: string, idx: number) {
    setField(idx, "medicamento_nombre", q);
    setField(idx, "medicamento_id", null);
    if (q.length < 2) { setSearchResults([]); return; }
    setActiveSearchIndex(idx);
    const res = await searchMedicamentosAction(q);
    setSearchResults(res);
  }

  function selectCatalogoMed(idx: number, med: any) {
    const name = med.nombre_comercial 
      ? `${med.nombre_comercial} (${med.nombre_generico}) - ${med.concentracion}`
      : `${med.nombre_generico} - ${med.concentracion}`;
    setField(idx, "medicamento_nombre", name);
    setField(idx, "medicamento_id", med.id);
    setSearchResults([]);
    setActiveSearchIndex(null);
  }

  function addMed() { setMeds(p => [...p, emptyMed()]); }
  function removeMed(i: number) { setMeds(p => p.filter((_, j) => j !== i)); }
  function setField(i: number, field: string, value: any) {
    setMeds(p => p.map((m, j) => j === i ? { ...m, [field]: value } : m));
  }

  async function handleSaveNew() {
    const valid = meds.filter(m => m.medicamento_nombre.trim());
    if (valid.length === 0) { setError("Agrega al menos un medicamento"); return; }
    setSaving(true); setError("");
    const res = await saveRecetaAction({ diagnostico_id: diagnosticoId, consulta_id: consultaId, medicamentos: valid });
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    window.location.reload();
  }

  async function handleToggleEstado(r: Receta) {
    const newEst = r.estado === "activa" ? "cancelada" : "activa";
    await toggleEstadoRecetaAction(r.id, newEst, consultaId);
    setRecetas(prev => prev.map(x => x.id === r.id ? { ...x, estado: newEst } : x));
  }

  const [recetaToDelete, setRecetaToDelete] = useState<number | null>(null);
  async function confirmDeleteReceta() {
    if (!recetaToDelete) return;
    await deleteRecetaAction(recetaToDelete, consultaId);
    setRecetas(p => p.filter(x => x.id !== recetaToDelete));
    setRecetaToDelete(null);
  }

  const [medToDelete, setMedToDelete] = useState<number | null>(null);
  async function confirmDeleteMed() {
    if (!medToDelete) return;
    await deleteMedicamentoAction(medToDelete, consultaId);
    setRecetas(p => p.map(r => ({ ...r, receta_medicamento: r.receta_medicamento.filter(m => m.id !== medToDelete) })));
    setMedToDelete(null);
  }

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden relative ${enabled ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
      {!enabled && (
        <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-2xl">
          <Icon name="lock" size={22} className="text-slate-400" />
          <p className="text-[12px] font-semibold text-slate-500">Disponible con diagnóstico definitivo</p>
        </div>
      )}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <Icon name="medication" size={18} />
          </div>
          <h2 className="text-[14px] font-semibold text-slate-800">Recetas Médicas</h2>
        </div>
        <button onClick={() => enabled && setCreating(v => !v)} disabled={!enabled}
          className="flex items-center gap-1 text-[12px] font-medium text-cyan-600 hover:text-cyan-700 transition-colors border-0">
          <Icon name={creating ? "remove" : "add"} size={16} />
          {creating ? "Cancelar" : "Nueva receta"}
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Formulario nueva receta */}
        {creating && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-[12px] font-bold text-slate-700 mb-1">Escribir Receta</h3>
            {meds.map((m, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 relative">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-slate-500">MEDICAMENTO {i + 1}</span>
                  {meds.length > 1 && (
                    <button onClick={() => removeMed(i)} className="ml-auto text-slate-400 hover:text-red-500 border-0 transition-colors">
                      <Icon name="delete" size={14} />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input value={m.medicamento_nombre} onChange={e => handleSearchMed(e.target.value, i)}
                    placeholder="Buscar o escribir medicamento *"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-cyan-400 bg-white" />
                  {activeSearchIndex === i && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-[100%] mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-44 overflow-y-auto">
                      {searchResults.map(r => (
                        <button key={r.id} onClick={() => selectCatalogoMed(i, r)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                          <p className="text-[12px] font-semibold text-slate-800">{r.nombre_comercial || r.nombre_generico}</p>
                          <p className="text-[10px] text-slate-500">{r.concentracion} - {r.forma_farmaceutica}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={m.dosis} onChange={e => setField(i, "dosis", e.target.value)}
                    placeholder="Dosis (ej. 500mg)"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-cyan-400 bg-white" />
                  <input value={m.frecuencia} onChange={e => setField(i, "frecuencia", e.target.value)}
                    placeholder="Frecuencia (ej. cada 8 horas)"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-cyan-400 bg-white" />
                </div>
                <input value={m.indicaciones} onChange={e => setField(i, "indicaciones", e.target.value)}
                  placeholder="Indicaciones adicionales"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-cyan-400 bg-white" />
              </div>
            ))}
            <button onClick={addMed}
              className="flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 rounded-xl text-[12px] text-slate-500 hover:border-cyan-400 hover:text-cyan-600 border-0 transition-colors w-full bg-white">
              <Icon name="add" size={14} /> Agregar otro medicamento
            </button>
            {error && <p className="text-[12px] text-red-500 px-1">{error}</p>}
            <div className="flex justify-end mt-2">
              <button onClick={handleSaveNew} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[12px] font-semibold border-0 transition-colors">
                <Icon name="check" size={14} /> {saving ? "Guardando…" : "Emitir receta"}
              </button>
            </div>
          </div>
        )}

        {/* Lista de recetas */}
        {recetas.length === 0 && !creating ? (
          <div className="py-8 text-center text-slate-400">
            <Icon name="medication" size={28} className="opacity-30 mx-auto mb-2" />
            <p className="text-[12px]">Sin recetas emitidas</p>
          </div>
        ) : (
          recetas.map(r => (
            <div key={r.id} className={`flex flex-col gap-2 p-4 rounded-xl border ${r.estado === 'activa' ? 'border-rose-200 bg-white shadow-sm' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500" suppressHydrationWarning>
                  <Icon name="calendar_today" size={12} />
                  <span suppressHydrationWarning>{new Date(r.fecha_emision).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-600">
                    <input type="checkbox" checked={r.estado === 'activa'} onChange={() => handleToggleEstado(r)} className="accent-cyan-600" />
                    Activa
                  </label>
                  <button onClick={() => setRecetaToDelete(r.id)} className="text-slate-400 hover:text-red-500 transition-colors border-0">
                    <Icon name="delete" size={15} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {r.receta_medicamento.map((m, i) => (
                  <div key={m.id} className="p-3 bg-rose-50/40 rounded-lg border border-rose-100 flex gap-3 relative group">
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-rose-100 text-rose-600 text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-semibold text-slate-800 block mb-1">{m.medicamento_nombre}</span>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        {m.dosis && <p><span className="font-medium text-slate-600">Dosis:</span> {m.dosis}</p>}
                        {m.frecuencia && <p><span className="font-medium text-slate-600">Frecuencia:</span> {m.frecuencia}</p>}
                        {m.indicaciones && <p><span className="font-medium text-slate-600">Indicaciones:</span> {m.indicaciones}</p>}
                      </div>
                    </div>
                    <button onClick={() => setMedToDelete(m.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all border-0">
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Confirmar Borrar Receta */}
      {recetaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-5 max-w-sm w-full text-center">
            <h3 className="text-[16px] font-bold text-slate-800 mb-2">¿Eliminar receta completa?</h3>
            <p className="text-[13px] text-slate-500 mb-5">Esta acción eliminará la receta y todos sus medicamentos asociados.</p>
            <div className="flex gap-2">
              <button onClick={() => setRecetaToDelete(null)} className="flex-1 py-2 border rounded-xl text-[12px] font-bold text-slate-600 bg-white">Cancelar</button>
              <button onClick={confirmDeleteReceta} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-[12px] font-bold border-0">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Borrar Medicamento */}
      {medToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-5 max-w-sm w-full text-center">
            <h3 className="text-[16px] font-bold text-slate-800 mb-2">¿Quitar medicamento?</h3>
            <p className="text-[13px] text-slate-500 mb-5">El medicamento será removido de esta receta médica.</p>
            <div className="flex gap-2">
              <button onClick={() => setMedToDelete(null)} className="flex-1 py-2 border rounded-xl text-[12px] font-bold text-slate-600 bg-white">Cancelar</button>
              <button onClick={confirmDeleteMed} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-[12px] font-bold border-0">Sí, quitar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
