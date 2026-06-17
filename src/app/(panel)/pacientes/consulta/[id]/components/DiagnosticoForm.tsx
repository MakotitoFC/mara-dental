"use client";

import { useState, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { searchCIE10Action, saveDiagnosticoAction } from "../actions";
import { createClient } from "@/lib/supabase/client";

export function DiagnosticoForm({ consultaId, hcId }: { consultaId: number, hcId: string }) {
  const [diagnostico, setDiagnostico] = useState("");
  const [esTratado, setEsTratado] = useState(true);
  const [esDefinitivo, setEsDefinitivo] = useState(false);
  
  // CIE10 Search
  const [query, setQuery] = useState("");
  const [cieList, setCieList] = useState<any[]>([]);
  const [selectedCie, setSelectedCie] = useState<any>(null);
  const [searchingCie, setSearchingCie] = useState(false);
  
  // Archivos
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [categorias, setCategorias] = useState<Record<string, string>>({}); // file.name -> categoria

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSave = diagnostico.trim().length > 0 && !loading;

  async function handleCieSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (q.length >= 2) {
      setSearchingCie(true);
      const res = await searchCIE10Action(q);
      setCieList(res);
      setSearchingCie(false);
    } else {
      setCieList([]);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setArchivos([...archivos, ...newFiles]);
      
      const newCats = { ...categorias };
      newFiles.forEach(f => {
        newCats[f.name] = "otros"; // default
      });
      setCategorias(newCats);
    }
  }

  function removeFile(name: string) {
    setArchivos(archivos.filter(a => a.name !== name));
    const newCats = { ...categorias };
    delete newCats[name];
    setCategorias(newCats);
  }

  function updateFileCategoria(name: string, cat: string) {
    setCategorias({ ...categorias, [name]: cat });
  }

  async function handleGuardar() {
    if (!canSave) return;
    setLoading(true);
    setErrorMsg(null);

    const supabase = createClient();
    const uploadedFiles: any[] = [];

    // Subir archivos a Storage si hay definitivos
    if (esDefinitivo && archivos.length > 0) {
      for (const file of archivos) {
        // Renombrar archivo para evitar colisiones
        const ext = file.name.split('.').pop();
        const safeName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `diagnosticos/${consultaId}/${safeName}`;

        const { data, error } = await supabase.storage
          .from("archivos_clinico") // user confirmed this bucket name
          .upload(filePath, file);

        if (error) {
          setErrorMsg(`Error subiendo el archivo ${file.name}: ${error.message}`);
          setLoading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("archivos_clinico")
          .getPublicUrl(filePath);

        uploadedFiles.push({
          nombre_archivo: file.name,
          url: publicUrl,
          tipo_archivo: file.type.startsWith("image/") ? "imagen" : "pdf",
          categoria: categorias[file.name] || "otros",
          tamaño_bytes: file.size
        });
      }
    }

    const res = await saveDiagnosticoAction({
      consulta_id: consultaId,
      hc_id: hcId,
      diagnostico: diagnostico.trim(),
      es_tratado: esTratado,
      es_definitivo: esDefinitivo,
      cie10_id: selectedCie?.id || null,
      archivos: uploadedFiles
    });

    setLoading(false);

    if (res?.error) {
      setErrorMsg(res.error);
    }
    // Si hay éxito, la página se recargará automáticamente por revalidatePath
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Icon name="biotech" size={18} />
        </div>
        <h2 className="font-semibold text-slate-800">Definir Diagnóstico</h2>
      </div>

      <div className="p-5 flex flex-col gap-5">
        
        {/* Diagnóstico Text */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-slate-700">Diagnóstico (Detalle clínico) *</label>
          <textarea
            rows={3}
            value={diagnostico}
            onChange={(e) => setDiagnostico(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 resize-none"
            placeholder="Describa el diagnóstico detallado..."
          />
        </div>

        {/* CIE10 Search */}
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-[12px] font-semibold text-slate-700">Código CIE-10 (Opcional)</label>
          {selectedCie ? (
            <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-bold text-emerald-700 px-2 py-0.5 bg-white rounded-md shrink-0">{selectedCie.codigo}</span>
                <span className="text-[13px] text-emerald-900 truncate">{selectedCie.descripcion}</span>
              </div>
              <button onClick={() => setSelectedCie(null)} className="text-emerald-500 hover:text-emerald-700 shrink-0">
                <Icon name="close" size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Icon name="search" size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={handleCieSearch}
                  placeholder="Buscar por código o descripción..."
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
                {searchingCie && <div className="absolute right-3 top-2.5 w-4 h-4 rounded-full border-2 border-cyan-200 border-t-cyan-600 animate-spin" />}
              </div>
              
              {cieList.length > 0 && (
                <div className="absolute top-[100%] left-0 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl max-h-48 overflow-y-auto z-10">
                  {cieList.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCie(c); setQuery(""); setCieList([]); }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex gap-2 items-center"
                    >
                      <span className="text-[11px] font-bold text-slate-500 w-12">{c.codigo}</span>
                      <span className="text-[12px] text-slate-700 truncate">{c.descripcion}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Opciones (Checkboxes) */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={esTratado} 
              onChange={(e) => setEsTratado(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-600"
            />
            <span className="text-[13px] font-medium text-slate-700">Se tratará en la clínica</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={esDefinitivo} 
              onChange={(e) => setEsDefinitivo(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-600"
            />
            <span className="text-[13px] font-medium text-slate-700">Es diagnóstico definitivo</span>
          </label>
        </div>

        {/* Subida de Archivos (solo si es definitivo) */}
        {esDefinitivo && (
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-slate-700">Archivos Probatorios</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-medium text-cyan-600 hover:underline flex items-center gap-1"
              >
                <Icon name="attach_file" size={14} /> Adjuntar archivo
              </button>
              <input 
                type="file" 
                multiple 
                accept="image/*,application/pdf"
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>

            {archivos.length === 0 ? (
              <div 
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center text-slate-400 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="cloud_upload" size={24} className="mb-2 opacity-50" />
                <p className="text-[12px] font-medium text-slate-600 mb-0.5">Arrastra o haz clic para subir</p>
                <p className="text-[10px]">Soporta imágenes y PDFs</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {archivos.map(f => (
                  <div key={f.name} className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                      <Icon name={f.type.startsWith("image/") ? "image" : "description"} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-slate-700 truncate">{f.name}</p>
                      <p className="text-[10px] text-slate-500">{(f.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <select
                      value={categorias[f.name]}
                      onChange={(e) => updateFileCategoria(f.name, e.target.value)}
                      className="w-32 border border-slate-200 rounded-lg px-2 py-1 text-[11px] outline-none focus:border-cyan-500 bg-white"
                    >
                      <option value="Rx panoramica">Rx panorámica</option>
                      <option value="Rx periapical">Rx periapical</option>
                      <option value="Foto intraoral">Foto intraoral</option>
                      <option value="Tomografia">Tomografía</option>
                      <option value="otros">Otros</option>
                    </select>
                    <button onClick={() => removeFile(f.name)} className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                      <Icon name="delete" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {errorMsg && (
        <div className="px-5 pb-3">
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-[12px] flex items-center gap-1.5 border border-red-100">
            <Icon name="warning" size={16} />
            <p className="font-medium">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
        <button
          onClick={handleGuardar}
          disabled={!canSave}
          className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-semibold transition-colors"
        >
          <Icon name="save" size={16} />
          {loading ? "Guardando..." : "Guardar diagnóstico"}
        </button>
      </div>

    </div>
  );
}
