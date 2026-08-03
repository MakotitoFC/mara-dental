"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { saveTratamientoAction, deleteTratamientoAction, editTratamientoAction, savePlanTrabajoAction, deletePlanTrabajoAction, editPlanTrabajoAction, searchCatalogoAction, saveAvanceAction } from "../../consulta.actions";

interface Avance {
  id: string;
  notas: string;
  fecha: string;
  consulta_id: string;
}

interface PlanTratamiento {
  id: string;
  fase: string;
  orden: number;
  descripcion: string;
  tiempo_estimado: string;
  estado: string;
  avances: Avance[];
}

interface Tratamiento {
  id: string;
  notas: string;
  catalogo_id: number;
  catalogo_nombre: string;
  plan: PlanTratamiento[];
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
  
  // Agregar tratamiento
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selectedCatalogo, setSelectedCatalogo] = useState<any>(null);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  function updateItems(next: Tratamiento[]) {
    setItems(next);
    onItemsChange?.(next);
  }

  async function buscar(q: string) {
    setQuery(q);
    if (q.trim().length < 2) { setResultados([]); return; }
    setBuscando(true);
    const res = await searchCatalogoAction(q);
    setResultados(res);
    setBuscando(false);
  }

  async function handleAdd() {
    if (!selectedCatalogo) return;
    setSaving(true);
    const res = await saveTratamientoAction({
      diagnostico_id: String(diagnosticoId),
      consulta_id: String(consultaId),
      notas,
      paciente_id: String(pacienteId),
      catalogo_tratamiento_id: selectedCatalogo.id
    });
    setSaving(false);
    if (!res?.error && res.id) {
      updateItems([...items, {
        id: res.id,
        notas,
        catalogo_id: selectedCatalogo.id,
        catalogo_nombre: selectedCatalogo.nombre,
        plan: []
      }]);
      setAdding(false);
      setNotas("");
      setSelectedCatalogo(null);
      setQuery("");
    }
  }

  const confirmModal = useConfirm();

  async function handleDelete(id: string) {
    const ok = await confirmModal({
      title: "Eliminar Tratamiento",
      message: "Esto eliminará el tratamiento y todo su plan de trabajo. Esta acción no se puede deshacer.",
      requireText: "ELIMINAR"
    });
    if(!ok) return;
    await deleteTratamientoAction(id, String(pacienteId));
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
            <Icon name="account_tree" size={18} />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Tratamientos y Plan</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Define los tratamientos y sus fases</p>
          </div>
        </div>
        <button onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1 text-[12px] font-medium text-cyan-600 hover:text-cyan-700 transition-colors border-0">
          <Icon name={adding ? "remove" : "add"} size={16} />
          {adding ? "Cancelar" : "Agregar"}
        </button>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {adding && (
          <div className="border border-cyan-200 dark:border-cyan-800 bg-cyan-50/40 dark:bg-cyan-950/20 rounded-xl p-4 flex flex-col gap-4">
            
            {!selectedCatalogo ? (
              <div className="relative">
                <Icon name="search" size={16} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                <input value={query} onChange={e => buscar(e.target.value)}
                  placeholder="Buscar tratamiento del catálogo para agregar…"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-[14px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 bg-white dark:bg-slate-900 dark:text-slate-100" />
                {buscando && <div className="absolute right-3 top-2.5 w-4 h-4 rounded-full border-2 border-cyan-200 border-t-cyan-600 animate-spin" />}
                {resultados.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl max-h-52 overflow-y-auto z-10">
                    {resultados.map(r => (
                      <button key={r.id} onClick={() => { setSelectedCatalogo(r); setQuery(""); setResultados([]); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 last:border-0 flex items-center justify-between gap-2">
                        <span className="text-[13px] text-slate-700 dark:text-slate-300 truncate">{r.nombre}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Icon name="check_circle" size={16} className="text-emerald-500" />
                    <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100">{selectedCatalogo.nombre}</span>
                  </div>
                  <button onClick={() => setSelectedCatalogo(null)} className="text-[11px] text-slate-400 hover:text-red-500">Cambiar</button>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notas del tratamiento (Opcional)</label>
                  <textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej. Extracción de pieza 36…"
                    className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-cyan-400 resize-none bg-white dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div className="flex justify-end mt-1">
                  <button onClick={handleAdd} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[12px] font-semibold transition-colors">
                    <Icon name="check" size={14} /> {saving ? "Guardando…" : "Agregar tratamiento"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {items.length === 0 && !adding ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500">
            <Icon name="account_tree" size={28} className="opacity-30 mx-auto mb-2" />
            <p className="text-[12px]">Sin tratamientos registrados</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="flex flex-col gap-5">
            {items.map(t => (
              <TratamientoCard key={t.id} tratamiento={t} pacienteId={pacienteId} consultaId={consultaId} onDelete={() => handleDelete(t.id)} />
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function TratamientoCard({ tratamiento, pacienteId, consultaId, onDelete }: { tratamiento: Tratamiento; pacienteId: string; consultaId: string; onDelete: () => void }) {
  const [addingFase, setAddingFase] = useState(false);
  const [faseForm, setFaseForm] = useState({ etapa: "", descripcion: "", tiempo_pronostico: "", estado: "pendiente" });
  const [savingFase, setSavingFase] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [localPlan, setLocalPlan] = useState<PlanTratamiento[]>(tratamiento.plan || []);

  async function handleAddFase() {
    if (!faseForm.etapa || !faseForm.descripcion) return;
    setSavingFase(true);
    const res = await savePlanTrabajoAction({
      tratamiento_id: tratamiento.id,
      ...faseForm,
      paciente_id: pacienteId
    });
    setSavingFase(false);
    if (!res?.error) {
      setAddingFase(false);
      setLocalPlan([...localPlan, {
        id: res.id,
        fase: faseForm.etapa,
        orden: localPlan.length + 1,
        descripcion: faseForm.descripcion,
        tiempo_estimado: faseForm.tiempo_pronostico,
        estado: faseForm.estado,
        avances: []
      }]);
      setFaseForm({ etapa: "", descripcion: "", tiempo_pronostico: "", estado: "pendiente" });
    }
  }

  return (
    <motion.div variants={staggerItem} className="bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => setExpanded(!expanded)}>
          <Icon name={expanded ? "expand_more" : "chevron_right"} size={18} className="text-slate-400" />
          <div className="flex-1">
            <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{tratamiento.catalogo_nombre}</h3>
            {tratamiento.notas && <p className="text-[11px] text-slate-500">{tratamiento.notas}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 pl-2">
          <a href={`/agenda?paciente=${pacienteId}&tratamiento_id=${tratamiento.id}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
            <Icon name="event" size={14} /> Agendar Cita
          </a>
          <button onClick={onDelete} className="text-slate-400 hover:text-red-500 ml-2">
            <Icon name="delete" size={16} />
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Fases del Plan</p>
                <button onClick={() => setAddingFase(v => !v)} className="text-[11px] text-cyan-600 font-medium">
                  {addingFase ? "Cancelar" : "+ Agregar Fase"}
                </button>
              </div>

              {addingFase && (
                <div className="bg-white dark:bg-slate-800 border border-cyan-100 dark:border-cyan-900/50 p-3 rounded-xl flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={faseForm.etapa} onChange={e => setFaseForm({...faseForm, etapa: e.target.value})} placeholder="Fase / Etapa" className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[12px] bg-transparent outline-none focus:border-cyan-400" />
                    <input value={faseForm.tiempo_pronostico} onChange={e => setFaseForm({...faseForm, tiempo_pronostico: e.target.value})} placeholder="Tiempo est. (Ej. 2 sem)" className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[12px] bg-transparent outline-none focus:border-cyan-400" />
                  </div>
                  <textarea value={faseForm.descripcion} onChange={e => setFaseForm({...faseForm, descripcion: e.target.value})} placeholder="Descripción de la fase" rows={2} className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[12px] bg-transparent outline-none focus:border-cyan-400 resize-none" />
                  <div className="flex justify-end mt-1">
                    <button onClick={handleAddFase} disabled={savingFase} className="bg-cyan-600 text-white px-3 py-1 text-[11px] font-semibold rounded-lg">Guardar Fase</button>
                  </div>
                </div>
              )}

              {localPlan.length === 0 ? (
                <p className="text-[12px] text-slate-400 text-center py-4">Sin fases. Agrega una fase para iniciar el plan.</p>
              ) : (
                <div className="flex flex-col gap-2 border-l-2 border-slate-200 dark:border-slate-700 pl-3 ml-1">
                  {localPlan.map(fase => (
                    <FaseCard key={fase.id} fase={fase} pacienteId={pacienteId} consultaId={consultaId} onDeleted={(id) => setLocalPlan(p => p.filter(x => x.id !== id))} onUpdated={(id, updated) => setLocalPlan(p => p.map(x => x.id === id ? { ...x, ...updated } : x))} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FaseCard({ fase, pacienteId, consultaId, onDeleted, onUpdated }: { fase: PlanTratamiento; pacienteId: string; consultaId: string; onDeleted?: (id: string) => void; onUpdated?: (id: string, data: any) => void }) {
  const [addingAvance, setAddingAvance] = useState(false);
  const [avanceNotas, setAvanceNotas] = useState("");
  const [savingAvance, setSavingAvance] = useState(false);
  const [localAvances, setLocalAvances] = useState<Avance[]>(fase.avances || []);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ etapa: fase.fase, descripcion: fase.descripcion, tiempo_pronostico: fase.tiempo_estimado, estado: fase.estado });
  const [savingEdit, setSavingEdit] = useState(false);
  const confirmModal = useConfirm();

  async function handleAddAvance() {
    if (!avanceNotas.trim()) return;
    setSavingAvance(true);
    const res = await saveAvanceAction({
      plan_tratamiento_id: fase.id,
      consulta_id: consultaId,
      notas: avanceNotas,
      paciente_id: pacienteId
    });
    setSavingAvance(false);
    if (!res?.error) {
      setAddingAvance(false);
      setLocalAvances([...localAvances, {
        id: res.id,
        notas: avanceNotas,
        fecha: res.fecha || new Date().toISOString(),
        consulta_id: consultaId
      }]);
      setAvanceNotas("");
    }
  }

  async function handleEdit() {
    setSavingEdit(true);
    const res = await editPlanTrabajoAction({
      id: fase.id,
      etapa: editForm.etapa,
      descripcion: editForm.descripcion,
      tiempo_pronostico: editForm.tiempo_pronostico,
      estado: editForm.estado,
      paciente_id: pacienteId
    });
    setSavingEdit(false);
    if (!res?.error) {
      setIsEditing(false);
      onUpdated?.(fase.id, { fase: editForm.etapa, descripcion: editForm.descripcion, tiempo_estimado: editForm.tiempo_pronostico, estado: editForm.estado });
    }
  }

  async function handleDelete() {
    const ok = await confirmModal({
      title: "Eliminar Fase",
      message: "Se eliminará esta fase y todos sus avances permanentemente. ¿Estás seguro?",
      requireText: "ELIMINAR"
    });
    if(!ok) return;
    await deletePlanTrabajoAction(fase.id, pacienteId);
    onDeleted?.(fase.id);
  }

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 relative flex flex-col gap-2">
        <div className="absolute -left-[19px] top-4 w-3 h-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-full" />
        <div className="grid grid-cols-2 gap-2">
          <input value={editForm.etapa} onChange={e => setEditForm({...editForm, etapa: e.target.value})} placeholder="Fase / Etapa" className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[12px] bg-transparent outline-none focus:border-cyan-400" />
          <input value={editForm.tiempo_pronostico} onChange={e => setEditForm({...editForm, tiempo_pronostico: e.target.value})} placeholder="Tiempo est." className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[12px] bg-transparent outline-none focus:border-cyan-400" />
        </div>
        <textarea value={editForm.descripcion} onChange={e => setEditForm({...editForm, descripcion: e.target.value})} placeholder="Descripción" rows={2} className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[12px] bg-transparent outline-none focus:border-cyan-400 resize-none" />
        <div className="flex justify-end gap-2 mt-1">
          <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700">Cancelar</button>
          <button onClick={handleEdit} disabled={savingEdit} className="bg-cyan-600 text-white px-3 py-1 text-[11px] font-semibold rounded-lg">Guardar Cambios</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 relative flex flex-col gap-2">
      <div className="absolute -left-[19px] top-4 w-3 h-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-full" />
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded mr-2">{fase.orden}</span>
          <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{fase.fase}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">{fase.estado}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity max-lg:hidden">
            <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-cyan-600">
              <Icon name="edit" size={14} />
            </button>
            <button onClick={handleDelete} className="text-slate-400 hover:text-red-500">
              <Icon name="delete" size={14} />
            </button>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-600 dark:text-slate-400">{fase.descripcion}</p>
      
      {/* Botones de fase flotantes para móviles (siempre visibles) o mostrados al hover */}
      <div className="absolute right-3 top-3 lg:hidden flex gap-2 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 px-1.5 py-1 rounded-md">
          <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-cyan-600">
              <Icon name="edit" size={14} />
          </button>
          <button onClick={handleDelete} className="text-slate-400 hover:text-red-500">
              <Icon name="delete" size={14} />
          </button>
      </div>
      
      {/* Avances */}
      {localAvances && localAvances.length > 0 && (
        <div className="mt-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Avances</p>
          {localAvances.map(av => (
            <div key={av.id} className="flex gap-2 items-start">
              <Icon name="subdirectory_arrow_right" size={12} className="text-slate-400 mt-0.5" />
              <div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300">{av.notas}</p>
                <p className="text-[9px] text-slate-400">{new Date(av.fecha).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {addingAvance ? (
        <div className="mt-2 flex gap-2">
          <input value={avanceNotas} onChange={e => setAvanceNotas(e.target.value)} placeholder="¿Qué se avanzó hoy?" className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] bg-transparent outline-none focus:border-cyan-400" />
          <button onClick={handleAddAvance} disabled={savingAvance} className="bg-cyan-600 text-white px-2 py-1 text-[11px] rounded-lg">✓</button>
          <button onClick={() => setAddingAvance(false)} className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 text-[11px] rounded-lg">✕</button>
        </div>
      ) : (
        <div className="flex justify-end mt-1">
          <button onClick={() => setAddingAvance(true)} className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-md">
            + Registrar Avance
          </button>
        </div>
      )}
    </div>
  );
}
