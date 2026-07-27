"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";
import { saveTratamientoAction, deleteTratamientoAction, editTratamientoAction } from "../../consulta.actions";

interface Tratamiento {
  id: number;
  notas: string;
}

export function TratamientoSection({
  diagnosticoId,
  consultaId,
  pacienteId,
  initial,
  enabled = true,
  onItemsChange,
}: { diagnosticoId: string; consultaId: string; pacienteId: string; initial: Tratamiento[]; enabled?: boolean; onItemsChange?: (items: Tratamiento[]) => void }) {
  const [items, setItems] = useState<Tratamiento[]>(initial);
  const [adding, setAdding] = useState(false);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotas, setEditNotas] = useState("");

  function updateItems(next: Tratamiento[]) {
    setItems(next);
    onItemsChange?.(next);
  }

  function startEdit(item: Tratamiento) {
    setEditingId(item.id);
    setEditNotas(item.notas);
  }

  async function handleEdit() {
    if (!editingId || !editNotas.trim()) return;
    setSaving(true);
    const res = await editTratamientoAction({ id: String(editingId), notas: editNotas, paciente_id: String(pacienteId) });
    setSaving(false);
    if (!res?.error) {
      updateItems(items.map(i => i.id === editingId ? { ...i, notas: editNotas } : i));
      setEditingId(null);
    }
  }

  async function handleAdd() {
    if (!notas.trim()) return;
    setSaving(true);
    const res = await saveTratamientoAction({ diagnostico_id: String(diagnosticoId), consulta_id: String(consultaId), notas, paciente_id: String(pacienteId) });
    setSaving(false);
    if (!res?.error) {
      updateItems([...items, { id: Date.now(), notas }]);
      setAdding(false); setNotas("");
    }
  }

  async function handleDelete(id: number) {
    await deleteTratamientoAction(String(id), String(pacienteId));
    updateItems(items.filter(i => i.id !== id));
  }

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
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Icon name="healing" size={18} />
          </div>
          <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Tratamientos</h2>
        </div>
        <button onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1 text-[12px] font-medium text-cyan-600 hover:text-cyan-700 transition-colors border-0">
          <Icon name={adding ? "remove" : "add"} size={16} />
          {adding ? "Cancelar" : "Agregar"}
        </button>
      </div>

      <div className="p-5 flex flex-col gap-3">
        {adding && (
          <div className="border border-cyan-200 dark:border-cyan-800 bg-cyan-50/40 dark:bg-cyan-950/20 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Descripción del tratamiento *</label>
              <textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej. Extracción de pieza 36, endodoncia…"
                className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-400 resize-none bg-white dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <div className="flex justify-end">
              <button onClick={handleAdd} disabled={saving || !notas.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[12px] font-semibold border-0 transition-colors">
                <Icon name="check" size={14} /> {saving ? "Guardando…" : "Agregar tratamiento"}
              </button>
            </div>
          </div>
        )}

        {items.length === 0 && !adding ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500">
            <Icon name="healing" size={28} className="opacity-30 mx-auto mb-2" />
            <p className="text-[12px]">Sin tratamientos registrados</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="flex flex-col gap-3">
          {items.map(item => (
            <motion.div key={item.id} variants={staggerItem} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                <Icon name="check_circle" size={16} />
              </div>

              {editingId === item.id ? (
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  <textarea rows={2} value={editNotas} onChange={e => setEditNotas(e.target.value)} placeholder="Descripción del tratamiento"
                    className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-400 resize-none bg-white dark:bg-slate-800 dark:text-slate-100" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} disabled={saving} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium text-[12px] px-2 py-1 transition-colors">Cancelar</button>
                    <button onClick={handleEdit} disabled={saving || !editNotas.trim()} className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors">
                      <Icon name="check" size={13} /> Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">{item.notas}</p>
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
                </>
              )}
            </motion.div>
          ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
