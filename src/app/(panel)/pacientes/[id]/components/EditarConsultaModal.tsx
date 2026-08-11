"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { Select } from "@/components/ui/Select";
import { editarConsultaAction } from "../casos.actions";
import { subirArchivoGeneralAction, deleteArchivoClinicoAction, getTiposArchivoAction } from "../consulta.actions";

type Campo = { clave: string; valor: string };

const SUGERENCIAS = [
  "Presión arterial", "Temperatura", "Frecuencia cardíaca", "Frecuencia respiratoria",
  "Peso", "Inspección extraoral", "Inspección intraoral", "Palpación", "Oclusión",
];

export function EditarConsultaModal({ consulta, pacienteId, onClose, onSaved }: {
  consulta: any;
  pacienteId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [motivo, setMotivo] = useState(consulta.motivo || "");
  const [observaciones, setObservaciones] = useState(consulta.observaciones || "");
  
  const initialExamen = Array.isArray(consulta.examen_fisico) 
    ? consulta.examen_fisico 
    : (consulta.examen_fisico && typeof consulta.examen_fisico === 'object')
      ? Object.entries(consulta.examen_fisico).filter(([k]) => k !== 'tipo').map(([k, v]) => ({ clave: k, valor: String(v) }))
      : [{ clave: "", valor: "" }];
      
  const [campos, setCampos] = useState<Campo[]>(initialExamen.length > 0 ? initialExamen : [{ clave: "", valor: "" }]);
  
  const [archivosExistentes, setArchivosExistentes] = useState<any[]>(consulta.archivos || []);
  const [archivosParaEliminar, setArchivosParaEliminar] = useState<{ id: string; url: string }[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [categorias, setCategorias] = useState<Record<string, string>>({});
  const [descripciones, setDescripciones] = useState<Record<string, string>>({});
  const [tiposArchivo, setTiposArchivo] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setNewFiles(prev => [...prev, ...selected]);
    }
  }

  useEffect(() => {
    getTiposArchivoAction().then(data => setTiposArchivo(data));
  }, []);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(i: number, patch: Partial<Campo>) {
    setCampos(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }
  function add(clave = "") {
    setCampos(prev => [...prev, { clave, valor: "" }]);
  }
  function remove(i: number) {
    setCampos(prev => prev.filter((_, idx) => idx !== i));
  }

  const usadas = new Set(campos.map(c => c.clave.trim().toLowerCase()));

  async function handleGuardar() {
    if (!motivo.trim()) { setError("El motivo es obligatorio"); return; }

    setSaving(true); setError("");

    const examen_fisico: Record<string, string> = { tipo: "consulta" };
    campos.filter(c => c.clave.trim()).forEach(c => { examen_fisico[c.clave.trim()] = c.valor; });

    const res = await editarConsultaAction(consulta.id, {
      motivo: motivo.trim(),
      observaciones: observaciones.trim() || null,
      examen_fisico,
    });

    if ("error" in res) { 
      setSaving(false); 
      setError(res.error ?? "Ocurrió un error al editar la consulta"); 
      return; 
    }

    if (archivosParaEliminar.length > 0) {
      await Promise.all(archivosParaEliminar.map(a => deleteArchivoClinicoAction(String(a.id), a.url, String(pacienteId))));
    }

    if (newFiles.length > 0) {
      const uploadPromises = newFiles.map(async (file) => {
        const fd = new FormData();
        fd.append("archivo", file);
        if (categorias[file.name]) {
          fd.append("tipo_archivo_id", categorias[file.name]);
        } else if (tiposArchivo.length > 0) {
          fd.append("tipo_archivo_id", String(tiposArchivo[0].id));
        }
        fd.append("categoria", file.type.startsWith("image/") ? "img" : "pdf");
        fd.append("descripcion", descripciones[file.name] || "");
        fd.append("consulta_id", String(consulta.id));
        fd.append("paciente_id", String(pacienteId));
        return subirArchivoGeneralAction(fd);
      });
      await Promise.all(uploadPromises);
    }

    setSaving(false);
    onSaved();
  }

  function handleQuitarExistente(id: string) {
    const target = archivosExistentes.find(a => String(a.id) === String(id));
    setArchivosExistentes(prev => prev.filter(a => String(a.id) !== String(id)));
    if (target) {
      setArchivosParaEliminar(prev => [...prev, { id: String(target.id), url: target.url }]);
    }
  }

  return (
    <ResponsiveSheet
      onClose={onClose}
      maxWidthDesktop="700px"
      header={
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Icon name="edit" size={18} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">Editar consulta</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Modificar registro clínico actual</p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={saving || !motivo.trim()}
            className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-semibold transition-colors">
            <Icon name="save" size={15} />
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Motivo & Observaciones */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              Motivo de consulta*
            </label>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Dolor mular agudo, Limpieza de rutina..."
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Observaciones de consulta</label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Notas de evolución, diagnóstico diferencial, comentarios..."
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/40 resize-none"
            />
          </div>
        </div>

        {/* Archivos Adjuntos */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Icon name="attach_file" size={16} className="text-slate-400" />
              Archivos Adjuntos
            </label>
            <button 
              type="button" 
              onClick={() => fileRef.current?.click()}
              className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 border-0"
            >
              <Icon name="add" size={14} /> Añadir archivos
            </button>
            <input 
              ref={fileRef} 
              type="file" 
              multiple 
              accept="image/*,application/pdf" 
              className="hidden" 
              onChange={handleFileAdd} 
            />
          </div>

          <div className="flex flex-col gap-3">
            <div 
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-5 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Icon name="cloud_upload" size={24} className="mb-2 opacity-50" />
              <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-0.5">Haz clic aquí para añadir nuevos archivos</p>
              <p className="text-[11px]">Puedes seleccionar varias imágenes o documentos a la vez</p>
            </div>
            
            {(archivosExistentes.length > 0 || newFiles.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {archivosExistentes.map((a) => {
                  const isImage = a.tipo_archivo === "imagen" || a.tipo_archivo === "image" || a.nombre_archivo.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  const tipoNombre = typeof a.tipo_archivo === "object" ? a.tipo_archivo?.tipo_archivo : (a.tipo_archivo || "Documento");
                  return (
                    <div key={`ext-${a.id}`} className="border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col relative bg-white dark:bg-slate-800 shadow-sm">
                      <div className="relative h-28 bg-slate-50 dark:bg-slate-900 flex items-center justify-center border-b border-slate-100 dark:border-slate-700">
                        {isImage ? (
                          <img src={a.displayUrl || a.url} alt={a.nombre_archivo} className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="description" size={32} className="text-slate-400" />
                        )}
                        <button 
                          type="button" 
                          onClick={() => handleQuitarExistente(a.id)}
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-white/90 dark:bg-slate-900/90 text-red-500 flex items-center justify-center shadow-md hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
                          title="Eliminar archivo"
                        >
                          <Icon name="delete" size={15} />
                        </button>
                      </div>
                      <div className="p-3 flex flex-col gap-1.5">
                        <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate" title={a.nombre_archivo}>{a.nombre_archivo}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200/60 dark:border-slate-600">
                            {tipoNombre}
                          </span>
                        </div>
                        {a.descripcion && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{a.descripcion}</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {newFiles.map((f, i) => {
                  const isImage = f.type.startsWith("image/");
                  return (
                    <div key={`new-${i}`} className="border border-amber-300 dark:border-amber-700 rounded-xl flex flex-col relative bg-amber-50/40 dark:bg-amber-900/10 shadow-sm">
                      <div className="relative h-28 bg-amber-100/50 dark:bg-amber-900/30 flex items-center justify-center border-b border-amber-200/60 dark:border-amber-700/60">
                        {isImage ? (
                          <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="description" size={32} className="text-amber-500" />
                        )}
                        <button 
                          type="button" 
                          onClick={() => setNewFiles(prev => prev.filter((_, idx) => idx !== i))} 
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-white/90 dark:bg-slate-900/90 text-red-500 flex items-center justify-center shadow-md hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
                          title="Quitar archivo nuevo"
                        >
                          <Icon name="close" size={15} />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-amber-500 text-[9px] text-white text-center py-0.5 font-bold uppercase tracking-wider">
                          Nuevo por guardar
                        </div>
                      </div>
                      <div className="p-3 flex flex-col gap-2">
                        <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate" title={f.name}>{f.name}</p>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-medium text-slate-500">Tipo de archivo*</label>
                          <Select
                            value={categorias[f.name] || (tiposArchivo.length > 0 ? String(tiposArchivo[0].id) : "")}
                            onChange={(v) => setCategorias(p => ({ ...p, [f.name]: v }))}
                            options={tiposArchivo.map((t: any) => ({ value: String(t.id), label: t.tipo_archivo || t.Tipo_archivo || t.TIPO_ARCHIVO || "Sin nombre" }))}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-medium text-slate-500">Descripción (Opcional)</label>
                          <textarea
                            placeholder="Ej: Radiografía panorámica inicial..."
                            value={descripciones[f.name] || ""}
                            onChange={(e) => setDescripciones(p => ({ ...p, [f.name]: e.target.value }))}
                            className="w-full text-[11px] p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Examen físico dinámico */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Examen físico (Hallazgos)</p>

          <div className="flex flex-wrap gap-2">
            {SUGERENCIAS.filter(s => !usadas.has(s.toLowerCase())).map(s => (
              <button key={s} type="button" onClick={() => add(s)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors min-h-9">
                <Icon name="add" size={13} /> {s}
              </button>
            ))}
          </div>

          <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="flex flex-col gap-2 mt-2">
            {campos.map((c, i) => (
              <motion.div key={i} variants={staggerItem} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  value={c.clave}
                  onChange={e => update(i, { clave: e.target.value })}
                  placeholder="Signo / hallazgo"
                  className="sm:w-44 shrink-0 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/40"
                />
                <input
                  value={c.valor}
                  onChange={e => update(i, { valor: e.target.value })}
                  placeholder="Valor / descripción"
                  className="flex-1 min-w-0 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/40"
                />
                <button type="button" onClick={() => remove(i)}
                  className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors self-end sm:self-auto">
                  <Icon name="delete" size={18} />
                </button>
              </motion.div>
            ))}
            <button type="button" onClick={() => add()}
              className="flex items-center gap-1.5 px-3 py-2.5 w-fit text-[13px] font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-colors min-h-10">
              <Icon name="add" size={16} /> Agregar campo
            </button>
          </motion.div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-xl text-[13px] text-red-600 dark:text-red-400">
            <Icon name="warning" size={15} className="shrink-0" /> {error}
          </div>
        )}
      </div>
    </ResponsiveSheet>
  );
}
