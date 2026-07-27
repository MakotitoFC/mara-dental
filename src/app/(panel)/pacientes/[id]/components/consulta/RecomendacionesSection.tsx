"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";
import { saveRecomendacionAction, editRecomendacionAction, deleteRecomendacionAction } from "../../consulta.actions";

interface Recomendacion {
  id: number;
  contenido: string;
  created_at: string;
}

export function RecomendacionesSection({
  consultaId,
  pacienteId,
  initial,
  enabled = true,
  onSaved,
}: { consultaId: string; pacienteId: string; initial: Recomendacion[]; enabled?: boolean; onSaved?: () => void }) {
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>(initial || []);
  const [creating, setCreating] = useState(false);
  const [contenido, setContenido] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContenido, setEditContenido] = useState("");

  function startEdit(item: Recomendacion) {
    setEditingId(item.id);
    setEditContenido(item.contenido);
  }

  async function handleAdd() {
    if (!contenido.trim()) return;
    setSaving(true);
    const res = await saveRecomendacionAction({ consulta_id: String(consultaId), contenido, paciente_id: String(pacienteId) });
    setSaving(false);
    if (!res?.error) {
      setContenido(""); setCreating(false);
      onSaved?.();
    }
  }

  async function handleEdit() {
    if (!editingId || !editContenido.trim()) return;
    setSaving(true);
    const res = await editRecomendacionAction({ id: String(editingId), contenido: editContenido, paciente_id: String(pacienteId) });
    setSaving(false);
    if (!res?.error) {
      setRecomendaciones(prev => prev.map(r => r.id === editingId ? { ...r, contenido: editContenido } : r));
      setEditingId(null);
    }
  }

  // Confirm Modal State
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  async function confirmDelete() {
    if (!itemToDelete) return;
    await deleteRecomendacionAction(String(itemToDelete), String(pacienteId));
    setRecomendaciones(prev => prev.filter(r => r.id !== itemToDelete));
    setItemToDelete(null);
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
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
            <Icon name="tips_and_updates" size={18} />
          </div>
          <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Recomendaciones</h2>
        </div>
        <button onClick={() => enabled && setCreating(v => !v)} disabled={!enabled}
          className="flex items-center gap-1 text-[12px] font-medium text-cyan-600 hover:text-cyan-700 transition-colors border-0">
          <Icon name={creating ? "remove" : "add"} size={16} />
          {creating ? "Cancelar" : "Nueva recomendación"}
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {creating && (
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-3">
            <textarea
              value={contenido}
              onChange={e => setContenido(e.target.value)}
              placeholder="Escribe la recomendación para el paciente..."
              rows={3}
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-400 resize-none bg-white dark:bg-slate-800 dark:text-slate-100 w-full"
            />
            <div className="flex justify-end">
              <button onClick={handleAdd} disabled={saving || !contenido.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[12px] font-semibold border-0 transition-colors">
                <Icon name="check" size={14} /> Guardar
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {recomendaciones.length === 0 && !creating ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500">
              <Icon name="tips_and_updates" size={28} className="opacity-30 mx-auto mb-2" />
              <p className="text-[12px]">Sin recomendaciones</p>
            </div>
          ) : (
            <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="flex flex-col gap-3">
            {recomendaciones.map((item, idx) => (
              <motion.div key={item.id} variants={staggerItem} className="flex items-start gap-3 p-4 bg-orange-50/30 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-800">
                <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>

                {editingId === item.id ? (
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <textarea
                      value={editContenido}
                      onChange={e => setEditContenido(e.target.value)}
                      rows={3}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-400 resize-none bg-white dark:bg-slate-800 dark:text-slate-100 w-full"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingId(null)} disabled={saving} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium text-[12px] px-2 py-1 transition-colors border-0">Cancelar</button>
                      <button onClick={handleEdit} disabled={saving || !editContenido.trim()} className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors border-0">
                        <Icon name="check" size={13} /> Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{item.contenido}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => startEdit(item)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-400 dark:text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 border-0 transition-colors">
                        <Icon name="edit" size={14} />
                      </button>
                      <button onClick={() => setItemToDelete(item.id)}
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
      </div>

      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-5 max-w-sm w-full text-center">
            <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-2">¿Eliminar recomendación?</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setItemToDelete(null)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-[12px] font-bold border-0">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
