"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { savePlanTrabajoAction, deletePlanTrabajoAction, editPlanTrabajoAction } from "../actions";

const ESTADOS = ["hacer", "haciendo", "hecho"] as const;
const ESTADO_CFG: Record<string, { bg: string; text: string }> = {
  "hacer": { bg: "#f1f5f9", text: "#64748b" },
  "haciendo": { bg: "#fffbeb", text: "#d97706" },
  "hecho": { bg: "#ecfdf5", text: "#059669" },
};

interface PlanItem {
  id: number;
  etapa: string;
  descripcion: string;
  tiempo_pronostico: string;
  estado: string;
}

export function PlanTrabajoSection({
  diagnosticoId,
  consultaId,
  initial,
  enabled = true,
}: { diagnosticoId: number; consultaId: number; initial: PlanItem[]; enabled?: boolean }) {
  const [items, setItems] = useState<PlanItem[]>(initial);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [etapa, setEtapa] = useState("");
  const [desc, setDesc] = useState("");
  const [tiempo, setTiempo] = useState("");
  const [estado, setEstado] = useState("hacer");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEtapa, setEditEtapa] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTiempo, setEditTiempo] = useState("");
  const [editEstado, setEditEstado] = useState("");

  function startEdit(item: PlanItem) {
    setEditingId(item.id);
    setEditEtapa(item.etapa);
    setEditDesc(item.descripcion);
    setEditTiempo(item.tiempo_pronostico || "");
    setEditEstado(item.estado);
  }

  async function handleEdit() {
    if (!editingId || !editEtapa.trim()) return;
    setSaving(true);
    const res = await editPlanTrabajoAction({
      id: editingId,
      etapa: editEtapa,
      descripcion: editDesc,
      tiempo_pronostico: editTiempo,
      estado: editEstado,
      consulta_id: consultaId
    });
    setSaving(false);
    if (!res?.error) {
      setItems(prev => prev.map(i => i.id === editingId ? { ...i, etapa: editEtapa, descripcion: editDesc, tiempo_pronostico: editTiempo, estado: editEstado } : i));
      setEditingId(null);
    }
  }

  async function handleAdd() {
    if (!etapa.trim()) return;
    setSaving(true);
    const res = await savePlanTrabajoAction({ diagnostico_id: diagnosticoId, etapa, descripcion: desc, tiempo_pronostico: tiempo, estado, consulta_id: consultaId });
    setSaving(false);
    if (!res?.error) {
      setItems(prev => [...prev, { id: Date.now(), etapa, descripcion: desc, tiempo_pronostico: tiempo, estado }]);
      setAdding(false); setEtapa(""); setDesc(""); setTiempo(""); setEstado("pendiente");
    }
  }

  async function handleDelete(id: number) {
    await deletePlanTrabajoAction(id, consultaId);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const cfg = (e: string) => ESTADO_CFG[e] ?? { bg: "#f1f5f9", text: "#475569" };

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
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
            <Icon name="assignment" size={18} />
          </div>
          <h2 className="text-[14px] font-semibold text-slate-800">Plan de Trabajo</h2>
        </div>
        <button onClick={() => enabled && setAdding(v => !v)} disabled={!enabled}
          className="flex items-center gap-1 text-[12px] font-medium text-cyan-600 hover:text-cyan-700 transition-colors border-0">
          <Icon name={adding ? "remove" : "add"} size={16} />
          {adding ? "Cancelar" : "Agregar etapa"}
        </button>
      </div>

      <div className="p-5 flex flex-col gap-3">
        {/* Form nueva etapa */}
        {adding && (
          <div className="border border-cyan-200 bg-cyan-50/40 rounded-xl p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Etapa *</label>
                <input value={etapa} onChange={e => setEtapa(e.target.value)} placeholder="Ej. Extracción"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-cyan-400 bg-white" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tiempo estimado</label>
                <input value={tiempo} onChange={e => setTiempo(e.target.value)} placeholder="Ej. 2 semanas"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-cyan-400 bg-white" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Descripción</label>
              <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción del procedimiento..."
                className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-cyan-400 resize-none bg-white" />
            </div>
            <div className="flex items-center justify-between">
              <select value={estado} onChange={e => setEstado(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-400 bg-white">
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <button onClick={handleAdd} disabled={saving || !etapa.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[12px] font-semibold border-0 transition-colors">
                <Icon name="check" size={14} /> {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        )}

        {/* Lista de etapas */}
        {items.length === 0 && !adding ? (
          <div className="py-8 text-center text-slate-400">
            <Icon name="assignment" size={28} className="opacity-30 mx-auto mb-2" />
            <p className="text-[12px]">Sin etapas definidas aún</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0 mt-0.5">
                {idx + 1}
              </div>
              
              {editingId === item.id ? (
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                   <div className="grid grid-cols-2 gap-2">
                      <input value={editEtapa} onChange={e => setEditEtapa(e.target.value)} placeholder="Etapa" className="border border-slate-200 rounded-lg px-2 py-1 text-[13px] outline-none focus:border-cyan-400 bg-white" />
                      <input value={editTiempo} onChange={e => setEditTiempo(e.target.value)} placeholder="Tiempo" className="border border-slate-200 rounded-lg px-2 py-1 text-[13px] outline-none focus:border-cyan-400 bg-white" />
                   </div>
                   <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descripción" className="border border-slate-200 rounded-lg px-2 py-1 text-[13px] outline-none focus:border-cyan-400 resize-none bg-white" rows={2} />
                   <div className="flex justify-between items-center">
                     <select value={editEstado} onChange={e => setEditEstado(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-[12px] outline-none focus:border-cyan-400 bg-white">
                        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                     </select>
                     <div className="flex gap-2">
                       <button onClick={() => setEditingId(null)} disabled={saving} className="text-slate-500 hover:text-slate-700 font-medium text-[12px] px-2 py-1 transition-colors">Cancelar</button>
                       <button onClick={handleEdit} disabled={saving || !editEtapa.trim()} className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors">
                         <Icon name="check" size={13} /> Guardar
                       </button>
                     </div>
                   </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-slate-800">{item.etapa}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: cfg(item.estado).bg, color: cfg(item.estado).text }}>
                        {item.estado}
                      </span>
                      {item.tiempo_pronostico && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Icon name="schedule" size={11} /> {item.tiempo_pronostico}
                        </span>
                      )}
                    </div>
                    {item.descripcion && (
                      <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">{item.descripcion}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => startEdit(item)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200 text-slate-400 hover:text-slate-600 border-0 transition-colors">
                      <Icon name="edit" size={14} />
                    </button>
                    <button onClick={() => handleDelete(item.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500 border-0 transition-colors">
                      <Icon name="delete" size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
