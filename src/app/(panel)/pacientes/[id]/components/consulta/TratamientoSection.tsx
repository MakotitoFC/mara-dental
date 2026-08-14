"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { 
  saveTratamientoAction, 
  deleteTratamientoAction, 
  editTratamientoAction, 
  savePlanTrabajoAction, 
  deletePlanTrabajoAction, 
  editPlanTrabajoAction, 
  searchCatalogoAction, 
  getCatalogoTratamientosAction,
  getTiposArchivoAction
} from "../../consulta.actions";

interface ArchivoFase {
  id: string;
  nombre_archivo: string;
  url: string;
  displayUrl?: string;
  categoria?: string;
  descripcion?: string;
  tipo_archivo?: any;
  tipo_archivo_id?: number;
}

interface PlanTratamiento {
  id: string;
  fase: string;
  orden: number;
  descripcion: string;
  tiempo_estimado: string;
  estado: string; // 'pendiente' | 'en proceso' | 'hecho'
  archivos?: ArchivoFase[];
}

interface Tratamiento {
  id: string;
  notas: string;
  catalogo_id: number;
  catalogo_nombre: string;
  plan: PlanTratamiento[];
}

/** Combobox / Select filtrable de Tratamientos del Catálogo (Muestra máximo 4 ítems a la vez con scroll) */
function TratamientoSelectCombobox({
  onSelect,
}: {
  onSelect: (catalogoItem: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [catalogoList, setCatalogoList] = useState<any[]>([]);
  const [filterText, setFilterText] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    getCatalogoTratamientosAction().then((data) => {
      setCatalogoList(data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = catalogoList.filter((item) =>
    item.nombre.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
        Seleccionar Tratamiento del Catálogo*
      </label>

      {/* Control desplegable con input para filtrar */}
      <div
        onClick={() => setOpen(true)}
        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-[13px] flex items-center justify-between gap-2 cursor-pointer focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-100 dark:focus-within:ring-cyan-900/40 shadow-sm"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon name="search" size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => {
              setFilterText(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Selecciona o escribe para buscar tratamiento..."
            className="w-full bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none text-[13px]"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {loading && <div className="w-3.5 h-3.5 border-2 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />}
          <Icon name={open ? "expand_less" : "expand_more"} size={18} />
        </div>
      </div>

      {/* Menú flotante (Límite visual de 4 elementos con scroll vertical) */}
      {open && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl max-h-42 overflow-y-auto no-scrollbar py-1"
        >
          {loading ? (
            <div className="px-3 py-4 text-center text-[12px] text-slate-400 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-cyan-600 rounded-full animate-spin" />
              Cargando catálogo...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-3 text-center text-[12px] text-slate-400">
              No se encontraron tratamientos
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                  setFilterText("");
                }}
                className="w-full text-left px-3 py-2 hover:bg-cyan-50 dark:hover:bg-slate-700/60 border-b border-slate-100 dark:border-slate-700/50 last:border-0 flex items-center justify-between gap-2 transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">
                    {item.nombre}
                  </p>
                  {item.descripcion && (
                    <p className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate">
                      {item.descripcion}
                    </p>
                  )}
                </div>
                {item.precio != null && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full shrink-0">
                    {item.moneda || "S/"} {item.precio}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Componente Checkbox Tristate (3 Estados: pendiente -> en proceso -> hecho -> pendiente) */
function TristateCheckbox({
  estado,
  onChange,
}: {
  estado: string;
  onChange: (nuevoEstado: string) => void;
}) {
  const normEstado = estado === "hecho" ? "hecho" : estado === "en proceso" ? "en proceso" : "pendiente";

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    let next = "pendiente";
    if (normEstado === "pendiente") next = "en proceso";
    else if (normEstado === "en proceso") next = "hecho";
    else next = "pendiente";
    onChange(next);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Estado: ${normEstado}. Haz clic para cambiar`}
      className="flex items-center gap-1.5 focus:outline-none border-0 bg-transparent p-0 cursor-pointer select-none group/tri"
    >
      <div
        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border ${
          normEstado === "hecho"
            ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
            : normEstado === "en proceso"
            ? "bg-amber-500 border-amber-500 text-white shadow-sm"
            : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
        }`}
      >
        {normEstado === "hecho" && <Icon name="check" size={14} className="stroke-3" />}
        {normEstado === "en proceso" && <Icon name="remove" size={14} className="stroke-3" />}
      </div>
      <span
        className={`text-[11px] font-semibold transition-colors capitalize ${
          normEstado === "hecho"
            ? "text-emerald-700 dark:text-emerald-400"
            : normEstado === "en proceso"
            ? "text-amber-700 dark:text-amber-400"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {normEstado}
      </span>
    </button>
  );
}

export function TratamientoSection({
  diagnosticoId,
  consultaId,
  pacienteId,
  initial,
  enabled = true,
  onItemsChange,
  scrollBody = false,
}: { 
  diagnosticoId: string; 
  consultaId: string; 
  pacienteId: string; 
  initial: Tratamiento[]; 
  enabled?: boolean; 
  onItemsChange?: (items: Tratamiento[]) => void; 
  scrollBody?: boolean 
}) {
  const [items, setItems] = useState<Tratamiento[]>(initial);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setItems(initial || []);
  }, [initial]);
  
  // Agregar tratamiento
  const [selectedCatalogo, setSelectedCatalogo] = useState<any>(null);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  function updateItems(next: Tratamiento[]) {
    setItems(next);
    onItemsChange?.(next);
  }

  const toast = useToast();

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
      toast.success("Tratamiento agregado correctamente");
    } else if (res?.error) {
      toast.error(res.error);
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
    toast.success("Tratamiento eliminado");
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className={`bg-white dark:bg-slate-800 rounded-2xl border relative ${scrollBody ? "flex flex-col h-full overflow-hidden" : ""} ${enabled ? "border-slate-200 dark:border-slate-700" : "border-slate-200 dark:border-slate-700 opacity-60"}`}>
      {!enabled && (
        <div className="absolute inset-0 z-10 bg-white/70 dark:bg-slate-800/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-2xl">
          <Icon name="lock" size={22} className="text-slate-400 dark:text-slate-500" />
          <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Disponible con diagnóstico definitivo</p>
        </div>
      )}

      <div className={`${scrollBody ? "shrink-0" : ""} flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Icon name="account_tree" size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Tratamientos y Plan</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">Define los tratamientos y sus fases</p>
          </div>
        </div>
        <button onClick={() => setAdding(v => !v)}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cyan-200 dark:border-cyan-800 text-[12px] font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors">
          <Icon name={adding ? "remove" : "add"} size={16} />
          {adding ? "Cancelar" : "Agregar"}
        </button>
      </div>

      <div className={`p-5 flex flex-col gap-5 ${scrollBody ? "flex-1 min-h-0 overflow-y-auto no-scrollbar" : ""}`}>
        {adding && (
          <div className="border border-cyan-200 dark:border-cyan-800 bg-cyan-50/40 dark:bg-cyan-950/20 rounded-xl p-4 flex flex-col gap-4">
            
            {!selectedCatalogo ? (
              <TratamientoSelectCombobox onSelect={(item) => setSelectedCatalogo(item)} />
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
              <TratamientoCard
                key={t.id}
                tratamiento={t}
                pacienteId={pacienteId}
                consultaId={consultaId}
                onDelete={() => handleDelete(t.id)}
                onPlanChange={(plan) => updateItems(items.map(i => i.id === t.id ? { ...i, plan } : i))}
              />
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function TratamientoCard({ tratamiento, pacienteId, consultaId, onDelete, onPlanChange }: { tratamiento: Tratamiento; pacienteId: string; consultaId: string; onDelete: () => void; onPlanChange?: (plan: PlanTratamiento[]) => void }) {
  const [addingFase, setAddingFase] = useState(false);
  const [faseForm, setFaseForm] = useState({ etapa: "", descripcion: "", tiempo_pronostico: "", estado: "pendiente" });
  const [savingFase, setSavingFase] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [localPlan, setLocalPlan] = useState<PlanTratamiento[]>(tratamiento.plan || []);
  const toast = useToast();

  function updatePlan(next: PlanTratamiento[]) {
    setLocalPlan(next);
    onPlanChange?.(next);
  }

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
      updatePlan([...localPlan, {
        id: res.id,
        fase: faseForm.etapa,
        orden: localPlan.length + 1,
        descripcion: faseForm.descripcion,
        tiempo_estimado: faseForm.tiempo_pronostico,
        estado: faseForm.estado,
        archivos: []
      }]);
      setFaseForm({ etapa: "", descripcion: "", tiempo_pronostico: "", estado: "pendiente" });
      toast.success("Fase agregada correctamente");
    } else {
      toast.error(res.error);
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
          <a href={`/agenda?paciente=${pacienteId}&tratamiento_id=${tratamiento.id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-cyan-600 dark:border-cyan-500 text-cyan-600 dark:text-cyan-400 text-[11px] font-semibold hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors">
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
                    <FaseCard key={fase.id} fase={fase} pacienteId={pacienteId} consultaId={consultaId} onDeleted={(id) => updatePlan(localPlan.filter(x => x.id !== id))} onUpdated={(id, updated) => updatePlan(localPlan.map(x => x.id === id ? { ...x, ...updated } : x))} />
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

function FaseCard({ 
  fase, 
  pacienteId, 
  consultaId, 
  onDeleted, 
  onUpdated 
}: { 
  fase: PlanTratamiento; 
  pacienteId: string; 
  consultaId: string; 
  onDeleted?: (id: string) => void; 
  onUpdated?: (id: string, data: any) => void 
}) {
  const [localEstado, setLocalEstado] = useState(fase.estado || "pendiente");
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ etapa: fase.fase, descripcion: fase.descripcion, tiempo_pronostico: fase.tiempo_estimado, estado: fase.estado });
  const [savingEdit, setSavingEdit] = useState(false);

  // Estados para Archivos Adjuntos a esta fase
  const [localArchivos, setLocalArchivos] = useState<ArchivoFase[]>(fase.archivos || []);
  const [addingArchivo, setAddingArchivo] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [selectedTipoId, setSelectedTipoId] = useState<string>("");
  const [archivoDescripcion, setArchivoDescripcion] = useState("");
  const [uploadingArchivo, setUploadingArchivo] = useState(false);
  const [tiposArchivo, setTiposArchivo] = useState<any[]>([]);
  const faseFileRef = useRef<HTMLInputElement>(null);

  const confirmModal = useConfirm();
  const toast = useToast();

  useEffect(() => {
    setLocalArchivos(fase.archivos || []);
  }, [fase.archivos]);

  useEffect(() => {
    setLocalEstado(fase.estado || "pendiente");
  }, [fase.estado]);

  useEffect(() => {
    if (addingArchivo && tiposArchivo.length === 0) {
      getTiposArchivoAction().then(data => {
        setTiposArchivo(data);
        if (data.length > 0) setSelectedTipoId(String(data[0].id));
      });
    }
  }, [addingArchivo, tiposArchivo.length]);

  // Manejar el cambio de estado Tristate (Optimistic UI + API PATCH)
  async function handleEstadoChange(nuevoEstado: string) {
    const estadoPrevio = localEstado;
    setLocalEstado(nuevoEstado);
    onUpdated?.(fase.id, { estado: nuevoEstado });

    try {
      const res = await fetch(`/api/plan-tratamiento/${fase.id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLocalEstado(estadoPrevio);
        onUpdated?.(fase.id, { estado: estadoPrevio });
        toast.error(data.error || "No se pudo actualizar el estado");
      }
    } catch (err) {
      setLocalEstado(estadoPrevio);
      onUpdated?.(fase.id, { estado: estadoPrevio });
      toast.error("Error de conexión al actualizar el estado");
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      setFileToUpload(f);
      if (f.type.startsWith("image/")) {
        setFilePreviewUrl(URL.createObjectURL(f));
      } else {
        setFilePreviewUrl(null);
      }
    }
  }

  async function handleUploadArchivo() {
    if (!fileToUpload || !selectedTipoId) {
      toast.error("Selecciona un archivo y su tipo");
      return;
    }
    setUploadingArchivo(true);

    try {
      const fd = new FormData();
      fd.append("archivo", fileToUpload);
      fd.append("tipo_archivo_id", selectedTipoId);
      fd.append("descripcion", archivoDescripcion);

      const res = await fetch(`/api/plan-tratamiento/${fase.id}/archivos`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      setUploadingArchivo(false);

      if (res.ok && data.archivo) {
        setLocalArchivos(prev => [data.archivo, ...prev]);
        setAddingArchivo(false);
        setFileToUpload(null);
        setFilePreviewUrl(null);
        setArchivoDescripcion("");
        toast.success("Archivo adjuntado correctamente");
      } else {
        toast.error(data.error || "No se pudo subir el archivo");
      }
    } catch (err: any) {
      setUploadingArchivo(false);
      toast.error("Error al subir el archivo");
    }
  }

  async function handleDeleteArchivo(archivoId: string) {
    const ok = await confirmModal({
      title: "Eliminar Archivo Clínico",
      message: "Se eliminará permanentemente este archivo del plan de tratamiento. Para confirmar, escribe ELIMINAR:",
      requireText: "ELIMINAR",
      danger: true,
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/archivos-clinicos/${archivoId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok) {
        setLocalArchivos(prev => prev.filter(a => String(a.id) !== String(archivoId)));
        toast.success("Archivo eliminado permanentemente");
      } else {
        toast.error(data.error || "No se pudo eliminar el archivo");
      }
    } catch (err: any) {
      toast.error("Error al eliminar el archivo");
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
      setLocalEstado(editForm.estado);
      onUpdated?.(fase.id, { fase: editForm.etapa, descripcion: editForm.descripcion, tiempo_estimado: editForm.tiempo_pronostico, estado: editForm.estado });
      toast.success("Fase actualizada correctamente");
    } else {
      toast.error(res.error);
    }
  }

  async function handleDelete() {
    const ok = await confirmModal({
      title: "Eliminar Fase",
      message: "Se eliminará esta fase permanentemente. ¿Estás seguro?",
      requireText: "ELIMINAR"
    });
    if(!ok) return;
    await deletePlanTrabajoAction(fase.id, pacienteId);
    onDeleted?.(fase.id);
    toast.success("Fase eliminada");
  }

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 relative flex flex-col gap-2">
        <div className="absolute -left-4.75 top-4 w-3 h-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-full" />
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
    <div className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 relative flex flex-col gap-2.5 shadow-sm">
      <div className="absolute -left-4.75 top-4 w-3 h-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-full" />
      
      {/* Cabecera de Fase: Checkbox Tristate + Título + Acciones */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TristateCheckbox estado={localEstado} onChange={handleEstadoChange} />
          <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded shrink-0">{fase.orden}</span>
          <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{fase.fase}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity max-lg:hidden">
            <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-cyan-600 p-1" title="Editar fase">
              <Icon name="edit" size={14} />
            </button>
            <button onClick={handleDelete} className="text-slate-400 hover:text-red-500 p-1" title="Eliminar fase">
              <Icon name="delete" size={14} />
            </button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-6">{fase.descripcion}</p>

      {/* Botones móviles flotantes */}
      <div className="absolute right-3 top-3 lg:hidden flex gap-2 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 px-1.5 py-1 rounded-md">
        <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-cyan-600">
          <Icon name="edit" size={14} />
        </button>
        <button onClick={handleDelete} className="text-slate-400 hover:text-red-500">
          <Icon name="delete" size={14} />
        </button>
      </div>

      {/* SECCIÓN DE ARCHIVOS ADJUNTOS A LA FASE */}
      <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Icon name="attach_file" size={13} className="text-slate-400" /> Archivos ({localArchivos.length})
          </span>
          <button
            onClick={() => setAddingArchivo(v => !v)}
            className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5"
          >
            <Icon name={addingArchivo ? "close" : "add"} size={13} />
            {addingArchivo ? "Cancelar" : "Adjuntar archivo"}
          </button>
        </div>

        {/* Formulario de carga de archivo para el paso del plan */}
        {addingArchivo && (
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-cyan-100 dark:border-cyan-900/40 rounded-xl p-3 flex flex-col gap-2.5 mt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400">Seleccionar archivo*</label>
              <div 
                onClick={() => faseFileRef.current?.click()}
                className="border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer hover:border-cyan-400 transition-colors"
              >
                <Icon name="cloud_upload" size={16} className="text-cyan-500" />
                <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                  {fileToUpload ? fileToUpload.name : "Haz clic para seleccionar..."}
                </span>
                <input 
                  ref={faseFileRef}
                  type="file" 
                  accept="image/*,application/pdf"
                  className="hidden" 
                  onChange={handleFileSelect} 
                />
              </div>
            </div>

            {/* Previsualización en miniatura si es imagen */}
            {filePreviewUrl && (
              <div className="relative h-20 w-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 self-center">
                <img src={filePreviewUrl} alt="Vista previa" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400">Tipo de archivo*</label>
                <Select
                  value={selectedTipoId}
                  onChange={(v) => setSelectedTipoId(v)}
                  options={tiposArchivo.map((t: any) => ({
                    value: String(t.id),
                    label: t.tipo_archivo || t.Tipo_archivo || "Sin nombre",
                  }))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400">Descripción (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Rx de avance..."
                  value={archivoDescripcion}
                  onChange={(e) => setArchivoDescripcion(e.target.value)}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-[12px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => { setAddingArchivo(false); setFileToUpload(null); setFilePreviewUrl(null); }}
                className="px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUploadArchivo}
                disabled={uploadingArchivo || !fileToUpload}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <Icon name="check" size={13} /> {uploadingArchivo ? "Subiendo..." : "Guardar archivo"}
              </button>
            </div>
          </div>
        )}

        {/* Listado de archivos ya cargados en esta fase */}
        {localArchivos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {localArchivos.map(arch => {
              const isImg = arch.categoria === "img" || arch.nombre_archivo.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              const tipoLabel = typeof arch.tipo_archivo === "object" ? arch.tipo_archivo?.tipo_archivo : (arch.tipo_archivo || "Archivo");
              return (
                <div key={arch.id} className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200/80 dark:border-slate-700/70 overflow-hidden">
                  <div className="w-9 h-9 shrink-0 rounded bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    {isImg ? (
                      <img src={arch.displayUrl || arch.url} alt={arch.nombre_archivo} className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="description" size={18} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate" title={arch.nombre_archivo}>
                      {arch.nombre_archivo}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-medium truncate max-w-25">
                        {tipoLabel}
                      </span>
                      {arch.descripcion && (
                        <span className="text-[9px] text-slate-400 truncate" title={arch.descripcion}>
                          • {arch.descripcion}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteArchivo(arch.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shrink-0"
                    title="Eliminar archivo"
                  >
                    <Icon name="delete" size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
