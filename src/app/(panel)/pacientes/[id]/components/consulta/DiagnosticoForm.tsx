"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { fadeIn } from "@/lib/animations";
import { searchCIE10Action, saveDiagnosticoAction, getTiposArchivoAction, getPresignedUploadUrlAction } from "../../consulta.actions";

export function DiagnosticoForm({ consultaId, pacienteId, onSaved }: {
  consultaId: string;
  pacienteId: string;
  onSaved: (esTratado: boolean) => void;
}) {
  const [diagnostico, setDiagnostico] = useState("");
  const [esTratado, setEsTratado] = useState(true);
  const [esDefinitivo, setEsDefinitivo] = useState(false);

  // CIE10
  const [query, setQuery] = useState("");
  const [cieList, setCieList] = useState<any[]>([]);
  const [selectedCie, setSelectedCie] = useState<any>(null);
  const [searchingCie, setSearchingCie] = useState(false);

  // Archivos
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [categorias, setCategorias] = useState<Record<string, string>>({});
  const [descripciones, setDescripciones] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [tiposArchivo, setTiposArchivo] = useState<any[]>([]);
  const canSave = diagnostico.trim().length > 0 && !loading;

  useEffect(() => {
    getTiposArchivoAction().then(data => setTiposArchivo(data));
  }, []);

  // limpiar object URLs solo al desmontar (ref para no revocar URLs en uso)
  const previewsRef = useRef<Record<string, string>>({});
  useEffect(() => { previewsRef.current = previews; }, [previews]);
  useEffect(() => () => { Object.values(previewsRef.current).forEach(URL.revokeObjectURL); }, []);

  async function handleCieSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (q.length >= 2) {
      setSearchingCie(true);
      setCieList(await searchCIE10Action(q));
      setSearchingCie(false);
    } else setCieList([]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const nuevos = Array.from(e.target.files).filter(f => !archivos.some(a => a.name === f.name));
    setArchivos(prev => [...prev, ...nuevos]);
    setCategorias(prev => {
      const n = { ...prev };
      // pre-seleccionar el primer tipo por defecto si existe
      nuevos.forEach(f => { n[f.name] = tiposArchivo.length > 0 ? String(tiposArchivo[0].id) : "1"; });
      return n;
    });
    setPreviews(prev => {
      const n = { ...prev };
      nuevos.forEach(f => { if (f.type.startsWith("image/")) n[f.name] = URL.createObjectURL(f); });
      return n;
    });
    e.target.value = "";
  }

  function removeFile(name: string) {
    setArchivos(prev => prev.filter(a => a.name !== name));
    setCategorias(prev => { const n = { ...prev }; delete n[name]; return n; });
    setPreviews(prev => { const n = { ...prev }; if (n[name]) URL.revokeObjectURL(n[name]); delete n[name]; return n; });
  }

  async function handleGuardar() {
    if (!canSave) return;
    setLoading(true); setErrorMsg(null);

    const fd = new FormData();
    fd.append("consulta_id", String(consultaId));
    fd.append("paciente_id", String(pacienteId));
    fd.append("diagnostico", diagnostico.trim());
    fd.append("es_tratado", String(esTratado));
    fd.append("es_definitivo", String(esDefinitivo));
    if (selectedCie) fd.append("cie10_id", String(selectedCie.id));
    if (esDefinitivo && archivos.length > 0) {
      const metadata = [];
      for (const file of archivos) {
        // 1. Obtener URL firmada
        const { signedUrl, objectKey, error: presignErr } = await getPresignedUploadUrlAction(file.name, file.type, "diagnostico");
        if (presignErr || !signedUrl) {
          setErrorMsg(`Error preparando subida de ${file.name}`);
          setLoading(false);
          return;
        }

        // 2. Subir directo a R2 desde el navegador
        try {
          const uploadRes = await fetch(signedUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type }
          });
          if (!uploadRes.ok) throw new Error("Error en PUT");
        } catch (e) {
          setErrorMsg(`Error subiendo el archivo ${file.name}`);
          setLoading(false);
          return;
        }

        // 3. Registrar metadatos
        metadata.push({
          nombre: file.name,
          url: objectKey, // Guardar la ruta relativa o objectKey
          tipo_archivo_id: Number(categorias[file.name] || 1),
          categoria: file.type.startsWith("image/") ? "img" : "pdf",
          descripcion: (descripciones[file.name] || "").trim(),
          tam_bytes: file.size
        });
      }
      fd.append("archivos_metadata", JSON.stringify(metadata));
    }

    const res = await saveDiagnosticoAction(fd);
    setLoading(false);
    if (res?.error) { setErrorMsg(res.error); return; }
    onSaved(esTratado);
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col">
      {/* Header — Guardar vive acá arriba, no en un footer al fondo del card. */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Icon name="biotech" size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Definir diagnóstico</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">Adjunta imágenes o tomografías para sustentar si es definitivo</p>
          </div>
        </div>
        <button onClick={handleGuardar} disabled={!canSave}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-semibold transition-colors">
          <Icon name="save" size={16} />
          {loading ? "Guardando…" : "Guardar"}
        </button>
      </div>

      {/* Body: formulario */}
      <div>
        <div className="p-5 flex flex-col gap-5">

          {/* Tipo */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">Tipo de diagnóstico *</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setEsDefinitivo(false)}
                className={`flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl border-2 transition-all ${!esDefinitivo ? "border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${!esDefinitivo ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400" : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500"}`}>
                  <Icon name="pending" size={18} />
                </div>
                <span className={`text-[13px] font-bold ${!esDefinitivo ? "text-amber-700 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"}`}>Presuntivo</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Probable, sin confirmar</span>
              </button>
              <button type="button" onClick={() => setEsDefinitivo(true)}
                className={`flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl border-2 transition-all ${esDefinitivo ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${esDefinitivo ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500"}`}>
                  <Icon name="verified" size={18} />
                </div>
                <span className={`text-[13px] font-bold ${esDefinitivo ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300"}`}>Definitivo</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Causa confirmada</span>
              </button>
            </div>
            {esDefinitivo && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Icon name="info" size={13} /> Un diagnóstico definitivo debería sustentarse con imágenes/tomografías.
              </p>
            )}
          </div>

          {/* Texto */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">Diagnóstico (detalle clínico) *</label>
            <textarea rows={3} value={diagnostico} onChange={e => setDiagnostico(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 resize-none"
              placeholder="Describa el diagnóstico detallado…" />
          </div>

          {/* CIE10 */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">Código CIE-10 (opcional)</label>
            {selectedCie ? (
              <div className="flex items-center justify-between border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 bg-white dark:bg-slate-800 rounded-md shrink-0">{selectedCie.codigo}</span>
                  <span className="text-[13px] text-emerald-900 dark:text-emerald-200 truncate">{selectedCie.descripcion}</span>
                </div>
                <button onClick={() => setSelectedCie(null)} className="text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 shrink-0">
                  <Icon name="close" size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Icon name="search" size={16} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                  <input type="text" value={query} onChange={handleCieSearch}
                    placeholder="Buscar por código o descripción…"
                    className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl pl-9 pr-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40" />
                  {searchingCie && <div className="absolute right-3 top-2.5 w-4 h-4 rounded-full border-2 border-cyan-200 dark:border-cyan-800 border-t-cyan-600 animate-spin" />}
                </div>
                {cieList.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl max-h-48 overflow-y-auto no-scrollbar z-10">
                    {cieList.map(c => (
                      <button key={c.id} onClick={() => { setSelectedCie(c); setQuery(""); setCieList([]); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 last:border-0 flex gap-2 items-center">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 w-12">{c.codigo}</span>
                        <span className="text-[12px] text-slate-700 dark:text-slate-300 truncate">{c.descripcion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Se tratará */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <Icon name="medical_services" size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Se tratará en la clínica</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={esTratado}
              onClick={() => setEsTratado((v) => !v)}
              className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${esTratado ? "bg-cyan-600" : "bg-slate-300 dark:bg-slate-600"}`}
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
                style={{ left: esTratado ? 20 : 2 }}
              />
            </button>
          </div>

          {/* Archivos */}
          <div className="flex flex-col gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                Archivos probatorios
                <span className="ml-1.5 text-[10px] font-normal text-slate-400 dark:text-slate-500">imagen o tomografía</span>
              </p>
              <button onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1">
                <Icon name="attach_file" size={14} /> Adjuntar
              </button>
              <input type="file" multiple accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>

            {archivos.length === 0 ? (
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-6 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                <Icon name="cloud_upload" size={24} className="mb-2 opacity-50" />
                <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">Arrastra o haz clic para subir</p>
                <p className="text-[10px]">Radiografías, tomografías, fotos intraorales (JPG, PNG, PDF)</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {archivos.map(f => {
                  const isImg = f.type.startsWith("image/");
                  const url = previews[f.name];
                  return (
                    <div key={f.name} className="border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col relative">
                      <div className="relative h-24 bg-slate-100 dark:bg-slate-900 flex items-center justify-center cursor-pointer group rounded-t-xl overflow-hidden"
                        onClick={() => isImg && url && setLightbox(url)}>
                        {isImg && url ? (
                          <>
                            <img src={url} alt={f.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <Icon name="zoom_in" size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </>
                        ) : (
                          <Icon name="description" size={28} className="text-red-400 dark:text-red-500" />
                        )}
                        <button onClick={e => { e.stopPropagation(); removeFile(f.name); }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-red-500 dark:text-red-400 flex items-center justify-center shadow-sm">
                          <Icon name="close" size={13} />
                        </button>
                      </div>
                      <div className="p-2 flex flex-col gap-1.5">
                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{f.name}</p>
                        <Select
                          value={categorias[f.name] || (tiposArchivo.length > 0 ? String(tiposArchivo[0].id) : "")}
                          onChange={(v) => setCategorias(p => ({ ...p, [f.name]: v }))}
                          options={tiposArchivo.map((t: any) => ({ value: String(t.id), label: t.tipo_archivo || t.Tipo_archivo || t.TIPO_ARCHIVO || "Sin nombre" }))}
                        />
                        <input
                          value={descripciones[f.name] || ""}
                          onChange={(e) => setDescripciones(p => ({ ...p, [f.name]: e.target.value }))}
                          placeholder="Descripción (opcional)"
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-[16px] sm:text-[11.5px] outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="px-5 pb-3">
          <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-lg text-[12px] flex items-center gap-1.5 border border-red-100 dark:border-red-900">
            <Icon name="warning" size={16} /> <p className="font-medium">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Lightbox para imágenes (pre-guardado) */}
      {lightbox && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-[2px]" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
            <Icon name="close" size={20} />
          </button>
          <img src={lightbox} alt="Vista" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </motion.div>
  );
}
