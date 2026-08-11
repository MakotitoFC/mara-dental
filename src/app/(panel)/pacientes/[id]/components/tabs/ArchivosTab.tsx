"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { 
  getArchivosPacienteAction, 
  deleteArchivoClinicoAction, 
  getTiposArchivoAction, 
  updateArchivoClinicoAction 
} from "../../consulta.actions";
import { VisorModal } from "../consulta/VisorModal";

interface Archivo {
  id: number | string;
  nombre_archivo: string;
  url: string;
  tipo_archivo: string;
  tipo_archivo_id?: number;
  categoria: string;
  descripcion?: string | null;
  fecha_subida: string;
  tam_bytes: number | null;
  anotaciones?: any[];
  displayUrl?: string;
  personal?: { nombre: string; apellido: string; url_firma_digital?: string | null; especialidad?: { especialidad: string } | null } | null;
}

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtFecha(iso: string) {
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function isImagen(a: Archivo) {
  return a.tipo_archivo === "image" || /\.(jpg|jpeg|png|gif|webp)$/i.test(a.nombre_archivo);
}

function EditarArchivoModal({
  archivo,
  pacienteId,
  onClose,
  onSaved,
}: {
  archivo: Archivo;
  pacienteId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombreArchivo, setNombreArchivo] = useState(archivo.nombre_archivo || "");
  const [tipoArchivoId, setTipoArchivoId] = useState<string>(String(archivo.tipo_archivo_id || 1));
  const [descripcion, setDescripcion] = useState(archivo.descripcion || "");
  const [tipos, setTipos] = useState<any[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    getTiposArchivoAction().then((data) => {
      setTipos(data || []);
      setLoadingTipos(false);
      if (archivo.tipo_archivo_id) {
        setTipoArchivoId(String(archivo.tipo_archivo_id));
      } else if (data && data.length > 0) {
        const found = data.find((t: any) => (t.tipo_archivo || t.Tipo_archivo)?.toLowerCase() === archivo.tipo_archivo?.toLowerCase());
        if (found) setTipoArchivoId(String(found.id));
        else setTipoArchivoId(String(data[0].id));
      }
    });
  }, [archivo]);

  async function handleSave() {
    if (!nombreArchivo.trim()) {
      toast.error("El nombre del archivo es obligatorio");
      return;
    }
    setSaving(true);
    const res = await updateArchivoClinicoAction({
      id: String(archivo.id),
      nombre_archivo: nombreArchivo.trim(),
      tipo_archivo_id: parseInt(tipoArchivoId),
      descripcion: descripcion.trim() || null,
      pacienteId,
    });
    setSaving(false);

    if (res?.error) {
      toast.error(res.error || "No se pudo actualizar el archivo");
    } else {
      toast.success("Archivo actualizado correctamente");
      onSaved();
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-150 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 max-w-md w-full border border-slate-100 dark:border-slate-700 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Icon name="edit" size={18} />
            </div>
            <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Editar Archivo Clínico</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Nombre del archivo*</label>
            <input
              type="text"
              value={nombreArchivo}
              onChange={(e) => setNombreArchivo(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
              placeholder="Nombre del archivo..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Tipo de archivo*</label>
            {loadingTipos ? (
              <div className="h-9 w-full bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
            ) : (
              <Select
                value={tipoArchivoId}
                onChange={(v) => setTipoArchivoId(v)}
                options={tipos.map((t: any) => ({
                  value: String(t.id),
                  label: t.tipo_archivo || t.Tipo_archivo || "Sin nombre",
                }))}
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Descripción (Opcional)</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
              placeholder="Descripción del archivo..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Icon name="check" size={14} /> {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function ArchivosTab({ paciente, consultaId, onNavigateTab }: { 
  paciente: any; 
  consultaId?: string | null;
  onNavigateTab?: (t: string) => void;
}) {
  const pacienteId = String(paciente.id);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [visor, setVisor] = useState<Archivo | null>(null);
  const [editingArchivo, setEditingArchivo] = useState<Archivo | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  async function fetchArchivos() {
    setLoading(true);
    try {
      const data = await getArchivosPacienteAction(String(pacienteId));
      setArchivos(data as Archivo[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchArchivos(); }, [pacienteId]);

  async function handleDelete(a: Archivo) {
    const ok = await confirm({
      title: "¿Eliminar archivo?",
      message: `Se eliminará "${a.nombre_archivo}" permanentemente. Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar definitivamente",
    });
    if (!ok) return;
    const res = await deleteArchivoClinicoAction(String(a.id), a.url, String(pacienteId));
    if (res?.error) {
      toast.error("No se pudo eliminar el archivo. Intenta nuevamente.");
      return;
    }
    toast.success(`"${a.nombre_archivo}" fue eliminado.`);
    fetchArchivos();
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <Icon name="photo_library" size={18} />
            </div>
            <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Galería Clínica y Radiografía</h2>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button onClick={() => setView("grid")} className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${view === "grid" ? "bg-white dark:bg-slate-800 shadow-sm text-cyan-600 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500"}`}>
              <Icon name="space_dashboard" size={15} />
            </button>
            <button onClick={() => setView("list")} className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${view === "list" ? "bg-white dark:bg-slate-800 shadow-sm text-cyan-600 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500"}`}>
              <Icon name="notes" size={15} />
            </button>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="py-10 flex justify-center">
              <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : view === "grid" ? (
            <motion.div variants={staggerContainer(0.04)} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {archivos.map((a) => (
                <motion.div key={a.id} variants={staggerItem} className="group relative border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                  <button onClick={() => setVisor(a)} className="w-full text-left">
                    <div className="h-24 bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                      {isImagen(a) ? (
                        <img src={a.displayUrl || a.url} alt={a.nombre_archivo} className="w-full h-full object-cover" />
                      ) : (
                        <Icon name="description" size={28} className="text-red-400 dark:text-red-500" />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate" title={a.nombre_archivo}>{a.nombre_archivo}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{fmtFecha(a.fecha_subida)}{a.tam_bytes ? ` · ${fmtSize(a.tam_bytes)}` : ""}</p>
                      {a.descripcion && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic truncate mt-0.5" title={a.descripcion}>
                          {a.descripcion}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Acciones flotantes en tarjeta Grid */}
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingArchivo(a); }}
                      className="w-6 h-6 rounded-lg bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm"
                      title="Editar archivo"
                    >
                      <Icon name="edit" size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(a); }}
                      className="w-6 h-6 rounded-lg bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-red-500 dark:text-red-400 flex items-center justify-center shadow-sm"
                      title="Eliminar archivo"
                    >
                      <Icon name="delete" size={13} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div variants={staggerContainer(0.04)} initial="hidden" animate="visible" className="flex flex-col gap-2">
              {archivos.map((a) => (
                <motion.div key={a.id} variants={staggerItem} className="flex items-center gap-3 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <button onClick={() => setVisor(a)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isImagen(a) ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-500 dark:text-cyan-400" : "bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400"}`}>
                      <Icon name={isImagen(a) ? "image" : "description"} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-slate-800 dark:text-slate-100 truncate">{a.nombre_archivo}</p>
                      <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
                        {typeof a.tipo_archivo === "object" ? (a.tipo_archivo as any)?.tipo_archivo : a.tipo_archivo} · {fmtFecha(a.fecha_subida)}{a.tam_bytes ? ` · ${fmtSize(a.tam_bytes)}` : ""}
                      </p>
                      {a.descripcion && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate" title={a.descripcion}>
                          {a.descripcion}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Acciones en Vista Lista */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingArchivo(a)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors"
                      title="Editar archivo"
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(a)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Eliminar archivo"
                    >
                      <Icon name="delete" size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {!loading && archivos.length === 0 && (
            <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center py-4">Aún no hay archivos clínicos registrados.</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {visor && (
          <VisorModal 
            archivo={visor as any} 
            todos={archivos as any[]} 
            paciente={paciente} 
            onClose={() => setVisor(null)} 
            onNav={(a) => setVisor(a as Archivo)} 
            onNavigateTab={onNavigateTab}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingArchivo && (
          <EditarArchivoModal
            archivo={editingArchivo}
            pacienteId={pacienteId}
            onClose={() => setEditingArchivo(null)}
            onSaved={fetchArchivos}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
