"use client";

import { useState, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { uploadPlantillaAction, deletePlantillaAction } from "./plantillas.actions";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { AnimatePresence, motion } from "framer-motion";

interface Plantilla {
  id: number;
  nombre_archivo: string;
  url: string;
  displayUrl: string;
  downloadUrl: string;
  categoria: string;
  descripcion: string;
  anotaciones_extras: string;
  fecha_subida: string;
  sede_id: number | null;
  subido_por_nombre: string;
}

interface PlantillasClientProps {
  plantillas: Plantilla[];
  userRole: string;
}

function VisorPlantillaModal({
  plantilla,
  onClose,
}: {
  plantilla: Plantilla;
  onClose: () => void;
}) {
  const isImage = plantilla.categoria === "image";

  const handlePrint = () => {
    const w = window.open(plantilla.displayUrl, "_blank");
    w?.addEventListener("load", () => {
      w.print();
    });
  };

  const handleDownload = () => {
    // Redirigir al enlace de descarga que tiene el Content-Disposition: attachment
    const link = document.createElement("a");
    link.href = plantilla.downloadUrl;
    link.download = plantilla.nombre_archivo; // redundante pero util
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isImage ? "bg-blue-50 text-blue-500" : "bg-red-50 text-red-500"
              }`}
            >
              <Icon name={isImage ? "image" : "picture_as_pdf"} size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-bold text-slate-800 dark:text-slate-200 truncate">
                {plantilla.nombre_archivo}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Subido por {plantilla.subido_por_nombre}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pl-4">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Icon name="print" size={16} /> <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold text-cyan-700 bg-cyan-100 hover:bg-cyan-200 dark:text-cyan-300 dark:bg-cyan-900/50 dark:hover:bg-cyan-900 rounded-lg transition-colors"
            >
              <Icon name="download" size={16} /> <span className="hidden sm:inline">Descargar</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 ml-2 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto bg-slate-100/50 dark:bg-black/20 flex items-center justify-center p-4">
          {isImage ? (
            <img
              src={plantilla.displayUrl}
              alt={plantilla.nombre_archivo}
              className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
            />
          ) : (
            <iframe
              src={plantilla.displayUrl}
              className="w-full h-full rounded-lg bg-white"
              title={plantilla.nombre_archivo}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function PlantillasClient({ plantillas, userRole }: PlantillasClientProps) {
  const [filter, setFilter] = useState<"all" | "image" | "pdf">("all");
  const [isUploading, setIsUploading] = useState(false);
  const [visorPlantilla, setVisorPlantilla] = useState<Plantilla | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const confirm = useConfirm();
  
  const canUploadDelete = userRole === "admin" || userRole === "superadmin";

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canUploadDelete) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file") as File;
    if (!file || file.size === 0) {
      toast.error("Selecciona un archivo");
      return;
    }

    setIsUploading(true);
    try {
      await uploadPlantillaAction(formData);
      toast.success("Plantilla subida con éxito");
      form.reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast.error(err.message || "Error al subir la plantilla");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number, url: string) => {
    if (!canUploadDelete) return;
    
    const ok = await confirm({
      title: "Eliminar plantilla",
      message: "Esta acción no se puede deshacer. El archivo será eliminado del servidor permanentemente.",
      requireText: "ELIMINAR",
      confirmLabel: "Eliminar plantilla"
    });
    if (!ok) return;

    try {
      await deletePlantillaAction(id, url);
      toast.success("Plantilla eliminada");
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  const handleDownloadDirect = async (p: Plantilla) => {
    try {
      const link = document.createElement("a");
      link.href = p.downloadUrl;
      link.download = p.nombre_archivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error("Error al descargar el archivo");
    }
  };

  const handlePrintPdf = (url: string) => {
    const w = window.open(url, "_blank");
    if (w) {
      w.onload = () => {
        w.print();
      };
    }
  };

  const filteredPlantillas = plantillas.filter((p) => {
    if (filter === "all") return true;
    return p.categoria === filter;
  });

  return (
    <div className="flex flex-col gap-6 w-full relative">
      <AnimatePresence>
        {visorPlantilla && (
          <VisorPlantillaModal 
            plantilla={visorPlantilla} 
            onClose={() => setVisorPlantilla(null)} 
          />
        )}
      </AnimatePresence>

      {/* HEADER & FILTROS */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Icon name="article" size={28} className="text-cyan-600" />
            Formatos y Plantillas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Archivos internos del hospital disponibles para el personal.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${filter === 'all' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilter("image")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${filter === 'image' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Imágenes
          </button>
          <button 
            onClick={() => setFilter("pdf")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${filter === 'pdf' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
          >
            PDFs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LISTA DE ARCHIVOS (Ocupa 2 columnas en lg si hay form, o 3 si no lo hay) */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${canUploadDelete ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {filteredPlantillas.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300">
              <Icon name="folder_open" size={48} className="mb-2 opacity-50" />
              <p>No hay plantillas disponibles.</p>
            </div>
          ) : (
            filteredPlantillas.map((p) => (
              <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow group relative">
                
                {p.sede_id === null && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 px-2 py-0.5 rounded-full">
                    GLOBAL
                  </span>
                )}

                <div className="flex gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${p.categoria === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                    <Icon name={p.categoria === 'pdf' ? 'picture_as_pdf' : 'image'} size={24} />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 pr-8">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate" title={p.nombre_archivo}>
                      {p.nombre_archivo}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">{p.descripcion || "Sin descripción"}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Subido por: {p.subido_por_nombre}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => setVisorPlantilla(p)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors">
                    <Icon name="visibility" size={14} /> Ver
                  </button>
                  <button onClick={() => handleDownloadDirect(p)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors" title="Descargar">
                    <Icon name="download" size={16} />
                  </button>
                  {p.categoria === 'pdf' && (
                    <button onClick={() => handlePrintPdf(p.displayUrl)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors" title="Imprimir">
                      <Icon name="print" size={16} />
                    </button>
                  )}
                  {canUploadDelete && (
                    <button onClick={() => handleDelete(p.id, p.url)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors ml-auto" title="Eliminar">
                      <Icon name="delete" size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* FORMULARIO UPLOAD (Solo admin/superadmin) */}
        {canUploadDelete && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm sticky top-24">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <Icon name="upload_file" size={20} className="text-cyan-600" />
              Subir Nueva Plantilla
            </h2>
            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Archivo (PDF o Imagen)</label>
                <input 
                  type="file" 
                  name="file" 
                  accept=".pdf, image/*" 
                  ref={fileInputRef}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Descripción corta</label>
                <input 
                  type="text" 
                  name="descripcion" 
                  placeholder="Ej: Consentimiento Informado General"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Anotaciones (opcional)</label>
                <textarea 
                  name="anotaciones" 
                  rows={2}
                  placeholder="Instrucciones sobre cuándo usar este formato..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-cyan-500 transition-colors resize-none"
                ></textarea>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <input type="checkbox" name="isGlobal" value="true" className="w-4 h-4 text-cyan-600 rounded" />
                  Hacer visible para TODAS las sedes (Global)
                </label>
                <p className="text-[10px] text-slate-400 mt-1 pl-1">Si no se marca, solo será visible para tu sede.</p>
              </div>

              <button 
                type="submit" 
                disabled={isUploading}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm"
              >
                {isUploading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Icon name="cloud_upload" size={18} /> Subir Plantilla
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
