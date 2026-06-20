"use client";

import { useState, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { searchCIE10Action, updateDiagnosticoAction, deleteArchivoClinicoAction } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { VisorModal } from "./VisorModal";

interface Archivo { id: number; nombre_archivo: string; url: string; tipo_archivo: string; categoria: string; anotaciones?: any[]; displayUrl?: string; }
interface CIE10 { id: number; codigo: string; descripcion: string; }

interface Props {
  diagnostico: {
    id: number;
    diagnostico_texto: string;
    es_tratado: boolean;
    es_definitivo: boolean;
    cie10: CIE10 | null;
    archivos: Archivo[];
  };
  consultaId: number;
}

export function DiagnosticoCard({ diagnostico, consultaId }: Props) {
  const [editing, setEditing] = useState(false);
  const [visor, setVisor] = useState<Archivo | null>(null);

  /* ── estado del formulario de edición ── */
  const [texto, setTexto] = useState(diagnostico.diagnostico_texto);
  const [esTratado, setEsTratado] = useState(diagnostico.es_tratado);
  const [esDefinitivo, setDefinitivo] = useState(diagnostico.es_definitivo);
  const [selectedCie, setSelectedCie] = useState<CIE10 | null>(diagnostico.cie10);
  const [query, setQuery] = useState("");
  const [cieList, setCieList] = useState<CIE10[]>([]);
  const [searching, setSearching] = useState(false);
  const [nuevosFiles, setNuevosFiles] = useState<File[]>([]);
  const [categorias, setCategorias] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileToDelete, setFileToDelete] = useState<{id: number, url: string, name: string} | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCieSearch(q: string) {
    setQuery(q);
    if (q.length < 2) { setCieList([]); return; }
    setSearching(true);
    const res = await searchCIE10Action(q);
    setCieList(res as CIE10[]);
    setSearching(false);
  }

  function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setNuevosFiles(p => [...p, ...files]);
    setCategorias(p => { const n = { ...p }; files.forEach(f => { n[f.name] = "otros"; }); return n; });
  }

  async function handleSave() {
    if (!texto.trim()) return;
    setSaving(true); setError("");

    const formData = new FormData();
    formData.append("diagnostico_id", String(diagnostico.id));
    formData.append("consulta_id", String(consultaId));
    formData.append("diagnostico", texto.trim());
    formData.append("es_tratado", String(esTratado));
    formData.append("es_definitivo", String(esDefinitivo));
    if (selectedCie) formData.append("cie10_id", String(selectedCie.id));

    if (esDefinitivo) {
      nuevosFiles.forEach((f) => {
        formData.append("archivos", f);
        formData.append(`categoria_${f.name}`, categorias[f.name] || "otros");
      });
    }

    const res = await updateDiagnosticoAction(formData);

    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    window.location.reload();
  }

  async function confirmDelete() {
    if (!fileToDelete) return;
    setDeleting(true);
    const res = await deleteArchivoClinicoAction(fileToDelete.id, fileToDelete.url, consultaId);
    setDeleting(false);
    if (res?.error) { setError(res.error); }
    setFileToDelete(null);
    if (!res?.error) window.location.reload();
  }

  /* ── Vista ── */
  if (!editing) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Icon name="check_circle" size={18} />
            </div>
            <h2 className="text-[14px] font-semibold text-slate-800 truncate">Diagnóstico</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${diagnostico.es_definitivo ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
              }`}>
              {diagnostico.es_definitivo ? "Definitivo" : "Presuntivo"}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <Icon name="edit" size={14} /> Editar
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-slate-800 font-medium">{diagnostico.diagnostico_texto}</p>

          {diagnostico.cie10 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg w-fit">
              <span className="text-[11px] font-bold text-slate-500">{diagnostico.cie10.codigo}</span>
              <span className="text-[12px] text-slate-700">{diagnostico.cie10.descripcion}</span>
            </div>
          )}

          {diagnostico.archivos.length > 0 && (
            <div className="mt-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Archivos adjuntos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {diagnostico.archivos.map(a => {
                  const isImage = a.tipo_archivo === "imagen" || a.nombre_archivo.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  return (
                    <button key={a.id} onClick={() => setVisor(a)}
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left w-full">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isImage ? "bg-cyan-50 text-cyan-500" : "bg-red-50 text-red-500"}`}>
                        <Icon name={isImage ? "image" : "description"} size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-800 truncate">{a.nombre_archivo}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-slate-500">{a.categoria}</p>
                          {a.anotaciones && a.anotaciones.length > 0 && (
                             <span className="text-[9px] font-bold bg-cyan-100 text-cyan-700 px-1.5 rounded-full">{a.anotaciones.length}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
        
        {visor && (
          <VisorModal
            archivo={visor}
            todos={diagnostico.archivos}
            onClose={() => setVisor(null)}
            onNav={setVisor}
          />
        )}
      </div>
    );
  }

  /* ── Edición ── */
  return (
    <div className="bg-white rounded-2xl border border-cyan-300 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600 shrink-0">
            <Icon name="edit" size={18} />
          </div>
          <h2 className="text-[14px] font-semibold text-slate-800">Editar diagnóstico</h2>
        </div>
        <button onClick={() => { setEditing(false); setError(""); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors border-0">
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Tipo */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-semibold text-slate-700">Tipo de diagnóstico *</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDefinitivo(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-semibold transition-all ${!esDefinitivo ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}>
              <Icon name="pending" size={16} /> Presuntivo
            </button>
            <button type="button" onClick={() => setDefinitivo(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-semibold transition-all ${esDefinitivo ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}>
              <Icon name="verified" size={16} /> Definitivo
            </button>
          </div>
        </div>

        {/* Texto */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-slate-700">Detalle clínico *</label>
          <textarea rows={3} value={texto} onChange={e => setTexto(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 resize-none"
            placeholder="Describa el diagnóstico detallado..." />
        </div>

        {/* CIE-10 */}
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-[12px] font-semibold text-slate-700">Código CIE-10 (Opcional)</label>
          {selectedCie ? (
            <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-bold text-emerald-700 px-2 py-0.5 bg-white rounded-md shrink-0">{selectedCie.codigo}</span>
                <span className="text-[13px] text-emerald-900 truncate">{selectedCie.descripcion}</span>
              </div>
              <button onClick={() => setSelectedCie(null)} className="text-emerald-500 hover:text-emerald-700 border-0 shrink-0">
                <Icon name="close" size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Icon name="search" size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input type="text" value={query} onChange={e => handleCieSearch(e.target.value)}
                  placeholder="Buscar por código o descripción..."
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
                {searching && <div className="absolute right-3 top-2.5 w-4 h-4 rounded-full border-2 border-cyan-200 border-t-cyan-600 animate-spin" />}
              </div>
              {cieList.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl max-h-48 overflow-y-auto z-10">
                  {cieList.map(c => (
                    <button key={c.id} onClick={() => { setSelectedCie(c); setQuery(""); setCieList([]); }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex gap-2 items-center">
                      <span className="text-[11px] font-bold text-slate-500 w-12">{c.codigo}</span>
                      <span className="text-[12px] text-slate-700 truncate">{c.descripcion}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Archivos (solo definitivo) */}
        {esDefinitivo && (
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-slate-700">Archivos clínicos</p>
              <button onClick={() => fileRef.current?.click()}
                className="text-[11px] font-medium text-cyan-600 hover:underline flex items-center gap-1 border-0">
                <Icon name="attach_file" size={14} /> Adjuntar
              </button>
              <input type="file" multiple accept="image/*,application/pdf" className="hidden" ref={fileRef} onChange={addFiles} />
            </div>

            {/* Archivos existentes */}
            {diagnostico.archivos.map(a => (
              <div key={a.id} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <Icon name={a.tipo_archivo === "pdf" ? "description" : "image"} size={15} className="text-slate-500 shrink-0" />
                <span className="text-[12px] text-slate-700 flex-1 truncate">{a.nombre_archivo}</span>
                <span className="text-[10px] text-slate-400 px-2 border-r border-slate-200">{a.categoria}</span>
                <button onClick={() => setFileToDelete({ id: a.id, url: a.url, name: a.nombre_archivo })} className="text-red-400 hover:text-red-600 border-0 px-2">
                  <Icon name="delete" size={14} />
                </button>
              </div>
            ))}

            {/* Nuevos archivos */}
            {nuevosFiles.length > 0 && nuevosFiles.map(f => (
              <div key={f.name} className="flex items-center gap-2 p-2 bg-blue-50/50 border border-blue-100 rounded-lg">
                <Icon name={f.type.startsWith("image/") ? "image" : "description"} size={15} className="text-blue-400 shrink-0" />
                <span className="text-[12px] text-slate-700 flex-1 truncate">{f.name}</span>
                <select value={categorias[f.name]} onChange={e => setCategorias(p => ({ ...p, [f.name]: e.target.value }))}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] outline-none bg-white">
                  <option value="Rx panoramica">Rx panorámica</option>
                  <option value="Rx periapical">Rx periapical</option>
                  <option value="Foto intraoral">Foto intraoral</option>
                  <option value="Tomografia">Tomografía</option>
                  <option value="otros">Otros</option>
                </select>
                <button onClick={() => setNuevosFiles(p => p.filter(x => x.name !== f.name))} className="text-red-400 hover:text-red-600 border-0 px-2">
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Se tratará */}
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input type="checkbox" checked={esTratado} onChange={e => setEsTratado(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-600" />
          <span className="text-[13px] font-medium text-slate-700">Se tratará en la clínica</span>
        </label>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-[12px] text-red-600">
            <Icon name="warning" size={14} className="shrink-0" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => { setEditing(false); setError(""); }}
            className="px-4 py-2 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !texto.trim()}
            className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-xl text-[13px] font-semibold transition-colors border-0">
            <Icon name="save" size={15} />
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Modal de Confirmación de Borrado */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-5 max-w-sm w-full border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3">
              <Icon name="warning" size={24} />
            </div>
            <h3 className="text-[16px] font-bold text-slate-800 mb-1">¿Eliminar archivo?</h3>
            <p className="text-[13px] text-slate-500 mb-4 px-2">
              Estás a punto de eliminar permanentemente <strong className="text-slate-700">{fileToDelete.name}</strong> y todas sus anotaciones. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 w-full">
              <button onClick={() => setFileToDelete(null)} disabled={deleting}
                className="flex-1 py-2 rounded-xl text-[13px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 flex justify-center items-center gap-1.5 py-2 rounded-xl text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors">
                {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Icon name="delete" size={14} />}
                {deleting ? "Borrando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
