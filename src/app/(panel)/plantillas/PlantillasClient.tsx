"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { uploadPlantillaAction, deletePlantillaAction } from "./plantillas.actions";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
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
              <h2 className="text-[13px] md:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                {plantilla.nombre_archivo}
              </h2>
              <p className="text-[10px] md:text-[11px] text-slate-500 truncate">
                Subido por {plantilla.subido_por_nombre}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pl-4">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-3 py-1.5 text-[11px] md:text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Icon name="print" size={16} /> <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-3 py-1.5 text-[11px] md:text-xs font-semibold text-cyan-700 bg-cyan-100 hover:bg-cyan-200 dark:text-cyan-300 dark:bg-cyan-900/50 dark:hover:bg-cyan-900 rounded-lg transition-colors"
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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [visorPlantilla, setVisorPlantilla] = useState<Plantilla | null>(null);
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
      setIsUploadModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al subir la plantilla");
    } finally {
      setIsUploading(false);
    }
  };

  // Campos del formulario de subida, usados dentro del modal que abre el
  // botón "Subir" (mismo en desktop, tablet y mobile).
  function renderUploadFormFields(formId: string) {
    return (
      <form id={formId} onSubmit={handleUpload} className="flex flex-col gap-4">
        <div>
          <label className="block text-[11px] md:text-xs font-semibold text-slate-500 mb-1">Archivo (PDF o Imagen)</label>
          <input
            type="file"
            name="file"
            accept=".pdf, image/*"
            className="w-full text-[13px] md:text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[11px] md:file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50 dark:bg-slate-800"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] md:text-xs font-semibold text-slate-500 mb-1">Descripción corta</label>
          <input
            type="text"
            name="descripcion"
            placeholder="Ej: Consentimiento Informado General"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] md:text-sm outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] md:text-xs font-semibold text-slate-500 mb-1">Anotaciones (opcional)</label>
          <textarea
            name="anotaciones"
            rows={2}
            placeholder="Instrucciones sobre cuándo usar este formato..."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] md:text-sm outline-none focus:border-cyan-500 transition-colors resize-none"
          ></textarea>
        </div>

        <div>
          <label className="flex items-center gap-2 text-[13px] md:text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
            <input type="checkbox" name="isGlobal" value="true" className="w-4 h-4 text-cyan-600 rounded" />
            Hacer visible para TODAS las sedes (Global)
          </label>
          <p className="text-[10px] md:text-[11px] text-slate-400 mt-1 pl-1">Si no se marca, solo será visible para tu sede.</p>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white h-9 sm:h-10 px-3 sm:px-4 rounded-lg text-[13px] md:text-sm font-medium shadow-sm transition-colors"
        >
          {isUploading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Icon name="cloud_upload" size={18} />
          )}
          <span>Subir plantilla</span>
        </button>
      </form>
    );
  }

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
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50 relative">
      <AnimatePresence>
        {visorPlantilla && (
          <VisorPlantillaModal
            plantilla={visorPlantilla}
            onClose={() => setVisorPlantilla(null)}
          />
        )}
      </AnimatePresence>

      {/* Mismo esqueleto que ConfiguracionTiposClient.tsx: <header> fijo
          (bg-white, solo border-b, sin rounded ni sombra) — ícono + título +
          filtro por tipo, todo fuera del área que scrollea. La subida de
          archivos se hace desde su propio formulario en la barra lateral. */}
      <header className="shrink-0 flex flex-col gap-4 bg-white dark:bg-slate-900 px-4 sm:px-6 pt-4 sm:pt-6 border-b border-slate-200 dark:border-slate-800">
      {/* En mobile solo el título — ícono y descripción se ocultan. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <Icon name="article" size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] md:text-base font-bold text-slate-800 dark:text-slate-100">Formatos y Plantillas</h1>
            <p className="hidden sm:block text-[13px] md:text-sm text-slate-500 mt-1">
              Archivos internos del hospital disponibles para el personal.
            </p>
          </div>
        </div>
        {/* El formulario de subida vive siempre en un modal — este botón lo
            abre, visible en desktop, tablet y mobile por igual. */}
        {canUploadDelete && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="shrink-0 flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white h-9 sm:h-10 px-3 sm:px-4 rounded-lg text-[13px] md:text-sm font-medium shadow-sm transition-colors"
          >
            <Icon name="cloud_upload" size={18} />
            <span>Subir</span>
          </button>
        )}
      </div>

      {/* Filtro por tipo — mismo estilo de tabs subrayados que
          ConfiguracionTiposClient.tsx (antes era una píldora
          segmented-control con fondo bg-slate-50). */}
      <div className="flex gap-5">
        {([
          { id: "all", label: "Todos" },
          { id: "image", label: "Imágenes" },
          { id: "pdf", label: "PDFs" },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`pb-3 border-b-2 text-[12.5px] font-medium transition-colors whitespace-nowrap ${
              filter === tab.id
                ? "border-cyan-600 text-cyan-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 sm:p-6">
        {/* LISTA DE ARCHIVOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlantillas.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300">
              <Icon name="folder_open" size={48} className="mb-2 opacity-50" />
              <p>No hay plantillas disponibles.</p>
            </div>
          ) : (
            filteredPlantillas.map((p) => {
              const isImage = p.categoria === 'image';
              return (
                <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col hover:shadow-md transition-shadow group relative overflow-hidden">
                  {/* Vista previa real: imagen de verdad para imágenes; un
                      ícono grande para PDF (renderizar la página real de un
                      PDF requeriría una librería aparte, así que se usa un
                      ícono grande en vez del thumbnail pequeño de antes). */}
                  <button
                    onClick={() => setVisorPlantilla(p)}
                    className={`relative h-36 w-full flex items-center justify-center overflow-hidden ${isImage ? 'bg-slate-100 dark:bg-slate-800' : 'bg-red-50 dark:bg-red-950/30'}`}
                  >
                    {isImage ? (
                      <img src={p.displayUrl} alt={p.nombre_archivo} className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="picture_as_pdf" size={48} className="text-red-400 dark:text-red-500" />
                    )}
                    <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                      <Icon name="visibility" size={28} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    {p.sede_id === null && (
                      <span className="absolute top-2 right-2 text-[10px] md:text-[11px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 px-2 py-0.5 rounded-full">
                        GLOBAL
                      </span>
                    )}
                  </button>

                  <div className="flex flex-col flex-1 p-4 gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[13px] md:text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={p.nombre_archivo}>
                        {p.nombre_archivo}
                      </h3>
                      <p className="text-[13px] md:text-sm text-slate-500 truncate">{p.descripcion || "Sin descripción"}</p>
                      <p className="text-[10px] md:text-[11px] text-slate-400 mt-1">Subido por: {p.subido_por_nombre}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button onClick={() => setVisorPlantilla(p)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] md:text-xs font-semibold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors">
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
                </div>
              );
            })
          )}
        </div>
      </main>

      <AnimatePresence>
        {isUploadModalOpen && (
          <ResponsiveSheet onClose={() => setIsUploadModalOpen(false)} title="Subir Nueva Plantilla">
            {renderUploadFormFields("upload-plantilla-form-modal")}
          </ResponsiveSheet>
        )}
      </AnimatePresence>
    </div>
  );
}
