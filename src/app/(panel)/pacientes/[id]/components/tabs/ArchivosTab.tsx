"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { getArchivosPacienteAction, subirArchivoGeneralAction, deleteArchivoClinicoAction } from "../../consulta.actions";
import { VisorModal } from "../consulta/VisorModal";

const CATEGORIAS = [
  { value: "Rx panoramica", label: "Rx panorámica" },
  { value: "Rx periapical", label: "Rx periapical" },
  { value: "Foto intraoral", label: "Foto intraoral" },
  { value: "Tomografia", label: "Tomografía" },
  { value: "otros", label: "Otros" },
];

interface Archivo {
  id: number;
  nombre_archivo: string;
  url: string;
  tipo_archivo: string;
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

function UploadModal({ consultaId, pacienteId, onClose, onUploaded }: {
  consultaId: string; pacienteId: string; onClose: () => void; onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [categoria, setCategoria] = useState("otros");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubir() {
    if (!file) return;
    setSaving(true); setError("");
    const fd = new FormData();
    fd.append("archivo", file);
    fd.append("categoria", categoria);
    fd.append("descripcion", descripcion.trim());
    fd.append("consulta_id", String(consultaId));
    fd.append("paciente_id", String(pacienteId));
    const res = await subirArchivoGeneralAction(fd);
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    onUploaded();
  }

  return (
    <ResponsiveSheet
      onClose={onClose}
      title="Subir archivo"
      maxWidthDesktop="400px"
      footer={
        <button onClick={handleSubir} disabled={!file || saving}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-xl text-[13px] font-semibold transition-colors">
          <Icon name="cloud_upload" size={15} /> {saving ? "Subiendo…" : "Subir archivo"}
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        {file ? (
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl">
            <Icon name={file.type.startsWith("image/") ? "image" : "description"} size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="text-[12px] text-slate-700 dark:text-slate-300 flex-1 truncate">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 shrink-0">
              <Icon name="close" size={13} />
            </button>
          </div>
        ) : (
          <label className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-6 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
            <Icon name="cloud_upload" size={24} className="mb-2 opacity-50" />
            <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">Haz clic para elegir un archivo</p>
            <p className="text-[10px]">Radiografías, fotos, PDF</p>
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Categoría</label>
          <Select value={categoria} onChange={setCategoria} options={CATEGORIAS} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Descripción (opcional)</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            placeholder="Hallazgos, zona, notas clínicas…"
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-xl text-[12px] text-red-600 dark:text-red-400">
            <Icon name="warning" size={14} className="shrink-0" /> {error}
          </div>
        )}
      </div>
    </ResponsiveSheet>
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
  const [showUpload, setShowUpload] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  async function fetchArchivos() {
    setLoading(true);
    const data = await getArchivosPacienteAction(String(pacienteId));
    setArchivos(data as Archivo[]);
    setLoading(false);
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
                <motion.div key={a.id} variants={staggerItem} className="group relative border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <button onClick={() => setVisor(a)} className="w-full text-left">
                    <div className="h-24 bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                      {isImagen(a) ? (
                        <img src={a.displayUrl || a.url} alt={a.nombre_archivo} className="w-full h-full object-cover" />
                      ) : (
                        <Icon name="description" size={28} className="text-red-400 dark:text-red-500" />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{a.nombre_archivo}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{fmtFecha(a.fecha_subida)}{a.tam_bytes ? ` · ${fmtSize(a.tam_bytes)}` : ""}</p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(a); }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-red-500 dark:text-red-400 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="delete" size={13} />
                  </button>
                </motion.div>
              ))}

              <button
                onClick={() => consultaId && setShowUpload(true)}
                disabled={!consultaId}
                title={!consultaId ? "Sube archivos durante una consulta activa" : undefined}
                className="h-full min-h-[104px] border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="add_circle" size={22} />
                <span className="text-[11px] font-medium">Subir Archivo</span>
              </button>
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
                      <p className="text-[10.5px] text-slate-400 dark:text-slate-500">{a.categoria} · {fmtFecha(a.fecha_subida)}{a.tam_bytes ? ` · ${fmtSize(a.tam_bytes)}` : ""}</p>
                    </div>
                  </button>
                  <button onClick={() => handleDelete(a)} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                    <Icon name="delete" size={14} />
                  </button>
                </motion.div>
              ))}
              <button
                onClick={() => consultaId && setShowUpload(true)}
                disabled={!consultaId}
                title={!consultaId ? "Sube archivos durante una consulta activa" : undefined}
                className="flex items-center justify-center gap-1.5 p-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="add_circle" size={16} /> <span className="text-[12px] font-medium">Subir Archivo</span>
              </button>
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
            archivo={visor} 
            todos={archivos} 
            paciente={paciente} 
            onClose={() => setVisor(null)} 
            onNav={(a) => setVisor(a as Archivo)} 
            onNavigateTab={onNavigateTab}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpload && consultaId && (
          <UploadModal
            consultaId={consultaId}
            pacienteId={pacienteId}
            onClose={() => setShowUpload(false)}
            onUploaded={() => { setShowUpload(false); fetchArchivos(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
