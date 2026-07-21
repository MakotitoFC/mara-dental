"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";
import { savePlanTrabajoAction, deletePlanTrabajoAction, editPlanTrabajoAction } from "../../consulta.actions";

const ESTADOS = ["No iniciado", "En proceso", "Terminado"] as const;
const ESTADO_OPTIONS = ESTADOS.map((e) => ({ value: e, label: e }));
const ESTADO_CFG: Record<string, { bg: string; text: string }> = {
  "No iniciado": { bg: "#f1f5f9", text: "#64748b" },
  "En proceso": { bg: "#fffbeb", text: "#d97706" },
  "Terminado": { bg: "#ecfdf5", text: "#059669" },
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
  pacienteId,
  initial,
  enabled = true,
  onItemsChange,
}: { diagnosticoId: number; pacienteId: number; initial: PlanItem[]; enabled?: boolean; onItemsChange?: (items: PlanItem[]) => void }) {
  const [items, setItems] = useState<PlanItem[]>(initial);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [etapa, setEtapa] = useState("");
  const [desc, setDesc] = useState("");
  const [tiempo, setTiempo] = useState("");
  const [estado, setEstado] = useState("No iniciado");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEtapa, setEditEtapa] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTiempo, setEditTiempo] = useState("");
  const [editEstado, setEditEstado] = useState("");

  function updateItems(next: PlanItem[]) {
    setItems(next);
    onItemsChange?.(next);
  }

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
      paciente_id: pacienteId,
    });
    setSaving(false);
    if (!res?.error) {
      updateItems(items.map(i => i.id === editingId ? { ...i, etapa: editEtapa, descripcion: editDesc, tiempo_pronostico: editTiempo, estado: editEstado } : i));
      setEditingId(null);
    }
  }

  async function handleAdd() {
    if (!etapa.trim()) return;
    setSaving(true);
    const res = await savePlanTrabajoAction({ diagnostico_id: diagnosticoId, etapa, descripcion: desc, tiempo_pronostico: tiempo, estado, paciente_id: pacienteId });
    setSaving(false);
    if (!res?.error) {
      updateItems([...items, { id: Date.now(), etapa, descripcion: desc, tiempo_pronostico: tiempo, estado }]);
      setAdding(false); setEtapa(""); setDesc(""); setTiempo(""); setEstado("No iniciado");
    }
  }

  async function handleDelete(id: number) {
    await deletePlanTrabajoAction(id, pacienteId);
    updateItems(items.filter(i => i.id !== id));
  }

  const cfg = (e: string) => ESTADO_CFG[e] ?? { bg: "#f1f5f9", text: "#475569" };

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className={`bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden relative ${enabled ? "border-slate-200 dark:border-slate-700" : "border-slate-200 dark:border-slate-700 opacity-60"}`}>
      {!enabled && (
        <div className="absolute inset-0 z-10 bg-white/70 dark:bg-slate-800/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-2xl">
          <Icon name="lock" size={22} className="text-slate-400 dark:text-slate-500" />
          <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Disponible con diagnóstico definitivo</p>
        </div>
      )}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
            <Icon name="assignment" size={18} />
          </div>
          <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Plan de Trabajo</h2>
        </div>
        <button onClick={() => enabled && setAdding(v => !v)} disabled={!enabled}
          className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[12px] font-semibold transition-colors border-0">
          <Icon name={adding ? "remove" : "add"} size={15} />
          {adding ? "Cancelar" : "Nueva Fase"}
        </button>
      </div>

      <div className="p-5 flex flex-col gap-3">
        {/* Form nueva etapa */}
        {adding && (
          <div className="border border-cyan-200 dark:border-cyan-800 bg-cyan-50/40 dark:bg-cyan-950/20 rounded-xl p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Etapa *</label>
                <input value={etapa} onChange={e => setEtapa(e.target.value)} placeholder="Ej. Extracción"
                  className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-400 bg-white dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tiempo estimado</label>
                <input value={tiempo} onChange={e => setTiempo(e.target.value)} placeholder="Ej. 2 semanas"
                  className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-400 bg-white dark:bg-slate-800 dark:text-slate-100" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Descripción</label>
              <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción del procedimiento..."
                className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-400 resize-none bg-white dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Select value={estado} onChange={setEstado} options={ESTADO_OPTIONS} className="w-36" />
              <button onClick={handleAdd} disabled={saving || !etapa.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[12px] font-semibold border-0 transition-colors">
                <Icon name="check" size={14} /> {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        )}

        {/* Timeline de fases */}
        {items.length === 0 && !adding ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500">
            <Icon name="assignment" size={28} className="opacity-30 mx-auto mb-2" />
            <p className="text-[12px]">Sin etapas definidas aún</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="flex flex-col">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            const isDone = item.estado === "Terminado";
            const isActive = item.estado === "En proceso";
            const railIcon = isDone ? "check" : isActive ? "schedule" : "event";
            const railCls = isDone
              ? "bg-emerald-500 text-white"
              : isActive
                ? "bg-cyan-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600";
            return (
              <motion.div key={item.id} variants={staggerItem} className="flex gap-3">
                {/* Riel vertical */}
                <div className="flex flex-col items-center shrink-0">
                  <motion.div
                    animate={isActive ? { scale: [1, 1.08, 1] } : undefined}
                    transition={isActive ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${railCls}`}
                  >
                    <Icon name={railIcon} size={16} />
                  </motion.div>
                  {!isLast && <div className={`w-0.5 flex-1 my-1 ${isDone ? "bg-emerald-300 dark:bg-emerald-700" : "bg-slate-200 dark:bg-slate-700"}`} style={{ minHeight: 24 }} />}
                </div>

                <div className={`flex-1 min-w-0 ${isLast ? "pb-1" : "pb-4"}`}>
                  {editingId === item.id ? (
                    <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-cyan-200 dark:border-cyan-800 p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={editEtapa} onChange={e => setEditEtapa(e.target.value)} placeholder="Etapa" className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[16px] sm:text-[13px] outline-none focus:border-cyan-400 bg-white dark:bg-slate-800 dark:text-slate-100" />
                        <input value={editTiempo} onChange={e => setEditTiempo(e.target.value)} placeholder="Tiempo" className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[16px] sm:text-[13px] outline-none focus:border-cyan-400 bg-white dark:bg-slate-800 dark:text-slate-100" />
                      </div>
                      <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descripción" className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[16px] sm:text-[13px] outline-none focus:border-cyan-400 resize-none bg-white dark:bg-slate-800 dark:text-slate-100" rows={2} />
                      <div className="flex justify-between items-center gap-2">
                        <Select value={editEstado} onChange={setEditEstado} options={ESTADO_OPTIONS} className="w-32" />
                        <div className="flex gap-2">
                          <button onClick={() => setEditingId(null)} disabled={saving} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium text-[12px] px-2 py-1 transition-colors">Cancelar</button>
                          <button onClick={handleEdit} disabled={saving || !editEtapa.trim()} className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors">
                            <Icon name="check" size={13} /> Guardar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`rounded-xl border p-3.5 flex items-start gap-2 transition-colors ${isActive ? "border-cyan-200 dark:border-cyan-800 bg-cyan-50/40 dark:bg-cyan-950/20" : "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"}`}>
                      <div className="flex-1 min-w-0">
                        <span className="text-[14px] font-bold text-slate-800 dark:text-slate-100 leading-tight">{item.etapa}</span>
                        {item.descripcion && (
                          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{item.descripcion}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: cfg(item.estado).bg, color: cfg(item.estado).text }}>
                            {item.estado}
                          </span>
                          {item.tiempo_pronostico && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Icon name="schedule" size={11} /> {item.tiempo_pronostico}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => startEdit(item)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 border-0 transition-colors">
                          <Icon name="edit" size={14} />
                        </button>
                        <button onClick={() => handleDelete(item.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 dark:text-slate-500 hover:text-red-500 border-0 transition-colors">
                          <Icon name="delete" size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
