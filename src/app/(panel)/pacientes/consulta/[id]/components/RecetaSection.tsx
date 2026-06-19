"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { saveRecetaAction } from "../actions";

interface Medicamento {
  id: number;
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

const empty = () => ({ medicamento_nombre: "", dosis: "", frecuencia: "", indicaciones: "" });

export function RecetaSection({
  diagnosticoId,
  consultaId,
  initial,
}: { diagnosticoId: number; consultaId: number; initial: Receta | null }) {
  const [receta, setReceta] = useState<Receta | null>(initial);
  const [creating, setCreating] = useState(false);
  const [meds, setMeds] = useState([empty()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addMed() { setMeds(p => [...p, empty()]); }
  function removeMed(i: number) { setMeds(p => p.filter((_, j) => j !== i)); }
  function setField(i: number, field: string, value: string) {
    setMeds(p => p.map((m, j) => j === i ? { ...m, [field]: value } : m));
  }

  async function handleSave() {
    const valid = meds.filter(m => m.medicamento_nombre.trim());
    if (valid.length === 0) { setError("Agrega al menos un medicamento"); return; }
    setSaving(true); setError("");
    const res = await saveRecetaAction({ diagnostico_id: diagnosticoId, consulta_id: consultaId, medicamentos: valid });
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    setReceta({
      id: Date.now(),
      fecha_emision: new Date().toISOString(),
      estado: "vigente",
      receta_medicamento: valid.map((m, i) => ({ id: i, ...m })),
    });
    setCreating(false);
    setMeds([empty()]);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <Icon name="medication" size={18} />
          </div>
          <h2 className="text-[14px] font-semibold text-slate-800">Receta Médica</h2>
        </div>
        {!receta && (
          <button onClick={() => setCreating(v => !v)}
            className="flex items-center gap-1 text-[12px] font-medium text-cyan-600 hover:text-cyan-700 transition-colors border-0">
            <Icon name={creating ? "remove" : "add"} size={16} />
            {creating ? "Cancelar" : "Nueva receta"}
          </button>
        )}
      </div>

      <div className="p-5 flex flex-col gap-3">
        {/* Receta existente */}
        {receta && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
              <Icon name="calendar_today" size={12} />
              Emitida el {new Date(receta.fecha_emision).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">{receta.estado}</span>
            </div>
            {receta.receta_medicamento.map((m, i) => (
              <div key={m.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-[13px] font-semibold text-slate-800">{m.medicamento_nombre}</span>
                </div>
                <div className="ml-7 mt-1 text-[11px] text-slate-500 space-y-0.5">
                  {m.dosis && <p><span className="font-medium text-slate-600">Dosis:</span> {m.dosis}</p>}
                  {m.frecuencia && <p><span className="font-medium text-slate-600">Frecuencia:</span> {m.frecuencia}</p>}
                  {m.indicaciones && <p><span className="font-medium text-slate-600">Indicaciones:</span> {m.indicaciones}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario nueva receta */}
        {creating && !receta && (
          <div className="flex flex-col gap-3">
            {meds.map((m, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2 relative">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-slate-500">MEDICAMENTO {i + 1}</span>
                  {meds.length > 1 && (
                    <button onClick={() => removeMed(i)} className="ml-auto text-slate-400 hover:text-red-500 border-0 transition-colors">
                      <Icon name="delete" size={14} />
                    </button>
                  )}
                </div>
                <input value={m.medicamento_nombre} onChange={e => setField(i, "medicamento_nombre", e.target.value)}
                  placeholder="Nombre del medicamento *"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-cyan-400 bg-white" />
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
              className="flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 rounded-xl text-[12px] text-slate-500 hover:border-cyan-400 hover:text-cyan-600 border-0 transition-colors w-full">
              <Icon name="add" size={14} /> Agregar otro medicamento
            </button>
            {error && <p className="text-[12px] text-red-500 px-1">{error}</p>}
            <div className="flex justify-end">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[12px] font-semibold border-0 transition-colors">
                <Icon name="check" size={14} /> {saving ? "Guardando…" : "Emitir receta"}
              </button>
            </div>
          </div>
        )}

        {!receta && !creating && (
          <div className="py-8 text-center text-slate-400">
            <Icon name="medication" size={28} className="opacity-30 mx-auto mb-2" />
            <p className="text-[12px]">Sin receta emitida</p>
          </div>
        )}
      </div>
    </div>
  );
}
