"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
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

// Paginación de los archivos en mobile — mismo tamaño de página (5) y misma
// ventana compacta de 2 números para la píldora flotante que ya usan
// Diagnóstico/Presupuesto y las vistas de asistente (Turnos de Caja, Personal, etc.).
const MOBILE_PAGE_SIZE = 4;
function getMobilePageWindow(current: number, total: number): number[] {
  if (total <= 1) return [1];
  if (current >= total) return [total - 1, total];
  return [current, current + 1];
}

function EditarArchivoModal({
  archivo,
  pacienteId,
  consultaId,
  onClose,
  onSaved,
}: {
  archivo: Archivo;
  pacienteId: string;
  /** Con consulta activa, el sheet gana el arrastre peek(70%)/full(100%). */
  consultaId?: string | null;
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
    <ResponsiveSheet
      onClose={onClose}
      title="Editar Archivo Clínico"
      snapPoints={consultaId ? [0.7, 1] : undefined}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
 className="px-3.5 py-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-800"
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
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
 <label className="text-[11px] font-semibold text-slate-600">Nombre del archivo*</label>
          <input
            type="text"
            value={nombreArchivo}
            onChange={(e) => setNombreArchivo(e.target.value)}
 className="w-full border border-slate-200 bg-white text-slate-800 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            placeholder="Nombre del archivo..."
          />
        </div>

        <div className="flex flex-col gap-1">
 <label className="text-[11px] font-semibold text-slate-600">Tipo de archivo*</label>
          {loadingTipos ? (
 <div className="h-9 w-full bg-slate-100 rounded-xl animate-pulse"/>
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
 <label className="text-[11px] font-semibold text-slate-600">Descripción (Opcional)</label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
 className="w-full border border-slate-200 bg-white text-slate-800 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            placeholder="Descripción del archivo..."
          />
        </div>
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
  const [search, setSearch] = useState("");
  const [visor, setVisor] = useState<Archivo | null>(null);
  const [editingArchivo, setEditingArchivo] = useState<Archivo | null>(null);
  const confirm = useConfirm();
  const toast = useToast();
  const isMobile = useIsMobile();
  // Paginación mobile — se reinicia al cambiar de vista (grid/lista) o si
  // cambia la cantidad de archivos (tras subir/eliminar uno), para no quedar
  // en una página que ya no existe.
  const [mobilePage, setMobilePage] = useState(1);
  useEffect(() => { setMobilePage(1); }, [view, archivos.length, search]);

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
      title: "¿Eliminar archivo? ",
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

  const q = search.trim().toLowerCase();
  const archivosFiltrados = q
    ? archivos.filter(a => a.nombre_archivo?.toLowerCase().includes(q) || (a.descripcion ?? "").toLowerCase().includes(q))
    : archivos;
  const mobileTotalPages = Math.max(1, Math.ceil(archivosFiltrados.length / MOBILE_PAGE_SIZE));
  const archivosMobilePag = archivosFiltrados.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE);
  const archivosVisibles = isMobile ? archivosMobilePag : archivosFiltrados;

  return (
    <div className="flex flex-col gap-4 px-4 sm:px-6 md:px-8 pt-4 pb-6 bg-white">
      {/* Sin tarjeta/contenedor propio — los archivos quedan directamente
          sobre el fondo de la vista (blanco), como una sola hoja (mismo
          patrón que Odontograma/Timeline). El buscador vive a la misma
          altura que el selector grid/lista. */}
 <div className="flex items-center justify-between gap-3">
 <div className="relative w-full max-w-xs">
 <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar archivo…"
 className="w-full border border-slate-200 bg-white text-slate-800 rounded-xl pl-9 pr-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </div>
 <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 shrink-0">
 <button onClick={() => setView("grid")} className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${view === "grid" ? "bg-white shadow-sm text-cyan-600" : "text-slate-400"}`}>
              <Icon name="space_dashboard" size={15} />
            </button>
 <button onClick={() => setView("list")} className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${view === "list" ? "bg-white shadow-sm text-cyan-600" : "text-slate-400"}`}>
              <Icon name="notes" size={15} />
            </button>
          </div>
        </div>

        <div>
          {loading ? (
            <div className="py-10 flex justify-center">
 <div className="w-8 h-8 border-2 border-slate-200 border-t-cyan-500 rounded-full animate-spin"/>
            </div>
          ) : view === "grid" ? (
            <motion.div variants={staggerContainer(0.04)} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {archivosVisibles.map((a) => (
 <motion.div key={a.id} variants={staggerItem} className="group relative border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <button onClick={() => setVisor(a)} className="w-full text-left">
 <div className="h-24 bg-slate-100 flex items-center justify-center overflow-hidden">
                      {isImagen(a) ? (
                        <img src={a.displayUrl || a.url} alt={a.nombre_archivo} className="w-full h-full object-cover" />
                      ) : (
 <Icon name="description" size={28} className="text-red-400"/>
                      )}
                    </div>
                    <div className="p-2">
 <p className="text-[11px] font-medium text-slate-700 truncate" title={a.nombre_archivo}>{a.nombre_archivo}</p>
 <p className="text-[10px] text-slate-400">{fmtFecha(a.fecha_subida)}{a.tam_bytes ?`· ${fmtSize(a.tam_bytes)}`:""}</p>
                      {a.descripcion && (
 <p className="text-[10px] text-slate-500 italic truncate mt-0.5" title={a.descripcion}>
                          {a.descripcion}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Acciones flotantes en tarjeta Grid */}
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingArchivo(a); }}
 className="w-6 h-6 rounded-lg bg-white/90 hover:bg-white text-cyan-600 flex items-center justify-center shadow-sm"
                      title="Editar archivo"
                    >
                      <Icon name="edit" size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(a); }}
 className="w-6 h-6 rounded-lg bg-white/90 hover:bg-white active:bg-red-600 text-red-500 active:text-white flex items-center justify-center shadow-sm transition-colors"
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
              {archivosVisibles.map((a) => (
 <motion.div key={a.id} variants={staggerItem} className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <button onClick={() => setVisor(a)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
 <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isImagen(a) ? "bg-cyan-50 text-cyan-500" : "bg-red-50 text-red-500"}`}>
                      <Icon name={isImagen(a) ? "image" : "description"} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
 <p className="text-[12.5px] font-medium text-slate-800 truncate">{a.nombre_archivo}</p>
 <p className="text-[10.5px] text-slate-400">
                        {typeof a.tipo_archivo === "object" ? (a.tipo_archivo as any)?.tipo_archivo : a.tipo_archivo} · {fmtFecha(a.fecha_subida)}{a.tam_bytes ? ` · ${fmtSize(a.tam_bytes)}` : ""}
                      </p>
                      {a.descripcion && (
 <p className="text-[11px] text-slate-500 italic truncate" title={a.descripcion}>
                          {a.descripcion}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Acciones en Vista Lista */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingArchivo(a)}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                      title="Editar archivo"
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(a)}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 active:bg-red-600 active:text-white transition-colors"
                      title="Eliminar archivo"
                    >
                      <Icon name="delete" size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Paginación mobile — píldora flotante, igual que en Diagnóstico/
              Presupuesto y en las vistas de asistente (Turnos de Caja,
              Personal, etc.). Desde tablet/desktop se ven todos los archivos
              sin paginar. */}
          {!loading && mobileTotalPages > 1 && (
 <div className="md:hidden mt-3 sticky bottom-3 self-center z-10 flex items-center gap-1 bg-white/70 backdrop-blur-md border border-slate-200 rounded-full shadow-lg px-1.5 py-1.5 mx-auto w-fit">
              <button
                disabled={mobilePage === 1}
                onClick={() => setMobilePage(p => p - 1)}
 className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-0 bg-transparent"
              >
                <Icon name="chevron_left" size={16} />
              </button>
              {getMobilePageWindow(mobilePage, mobileTotalPages).map((p) => (
                <button
                  key={p}
                  onClick={() => setMobilePage(p)}
 className={`w-7 h-7 rounded-full text-[12px] font-semibold transition-colors border-0 ${p === mobilePage ? "bg-cyan-600 text-white" : "bg-transparent text-slate-600 hover:bg-slate-100"}`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={mobilePage === mobileTotalPages}
                onClick={() => setMobilePage(p => p + 1)}
 className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-0 bg-transparent"
              >
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          )}

          {!loading && archivosFiltrados.length === 0 && (
 <p className="text-[12px] text-slate-400 text-center py-4">
              {q ? "Ningún archivo coincide con tu búsqueda." : "Aún no hay archivos clínicos registrados."}
            </p>
          )}
        </div>

      <AnimatePresence>
        {visor && (
          <VisorModal
            archivo={visor as any}
            todos={archivos as any[]}
            paciente={paciente}
            consultaId={consultaId}
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
            consultaId={consultaId}
            onClose={() => setEditingArchivo(null)}
            onSaved={fetchArchivos}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
