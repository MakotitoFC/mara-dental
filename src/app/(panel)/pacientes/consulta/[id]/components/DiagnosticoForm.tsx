"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { searchCIE10Action, saveDiagnosticoAction } from "../actions";

const CATEGORIAS = [
  { value: "Rx panoramica", label: "Rx panorámica" },
  { value: "Rx periapical", label: "Rx periapical" },
  { value: "Foto intraoral", label: "Foto intraoral" },
  { value: "Tomografia", label: "Tomografía" },
  { value: "otros", label: "Otros" },
];

export function DiagnosticoForm({ consultaId, hcId }: {
  consultaId: number;
  hcId: string;
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
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSave = diagnostico.trim().length > 0 && !loading;

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
      nuevos.forEach(f => { n[f.name] = f.name.match(/tomograf/i) ? "Tomografia" : "Foto intraoral"; });
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
    fd.append("hc_id", hcId);
    fd.append("diagnostico", diagnostico.trim());
    fd.append("es_tratado", String(esTratado));
    fd.append("es_definitivo", String(esDefinitivo));
    if (selectedCie) fd.append("cie10_id", String(selectedCie.id));
    if (esDefinitivo) {
      archivos.forEach(file => {
        fd.append("archivos", file);
        fd.append(`categoria_${file.name}`, categorias[file.name] || "otros");
      });
    }

    const res = await saveDiagnosticoAction(fd);
    setLoading(false);
    if (res?.error) { setErrorMsg(res.error); return; }
    window.location.reload();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
          <Icon name="biotech" size={18} />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-slate-800">Definir diagnóstico</h2>
          <p className="text-[11px] text-slate-400">Adjunta imágenes o tomografías para sustentar si es definitivo</p>
        </div>
      </div>

      {/* Body: formulario */}
      <div>
        <div className="p-5 flex flex-col gap-5">

          {/* Tipo */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-slate-700">Tipo de diagnóstico *</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEsDefinitivo(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-semibold transition-all ${!esDefinitivo ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                <Icon name="pending" size={16} /> Presuntivo
              </button>
              <button type="button" onClick={() => setEsDefinitivo(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[13px] font-semibold transition-all ${esDefinitivo ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                <Icon name="verified" size={16} /> Definitivo
              </button>
            </div>
            {esDefinitivo && (
              <p className="text-[11px] text-blue-600 flex items-center gap-1">
                <Icon name="info" size={13} /> Un diagnóstico definitivo debería sustentarse con imágenes/tomografías.
              </p>
            )}
          </div>

          {/* Texto */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-slate-700">Diagnóstico (detalle clínico) *</label>
            <textarea rows={3} value={diagnostico} onChange={e => setDiagnostico(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 resize-none"
              placeholder="Describa el diagnóstico detallado…" />
          </div>

          {/* CIE10 */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[12px] font-semibold text-slate-700">Código CIE-10 (opcional)</label>
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
                  <input type="text" value={query} onChange={handleCieSearch}
                    placeholder="Buscar por código o descripción…"
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
                  {searchingCie && <div className="absolute right-3 top-2.5 w-4 h-4 rounded-full border-2 border-cyan-200 border-t-cyan-600 animate-spin" />}
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

          {/* Se tratará */}
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input type="checkbox" checked={esTratado} onChange={e => setEsTratado(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-600" />
            <span className="text-[13px] font-medium text-slate-700">Se tratará en la clínica</span>
          </label>

          {/* Archivos */}
          <div className="flex flex-col gap-2.5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-slate-700">
                Archivos probatorios
                <span className="ml-1.5 text-[10px] font-normal text-slate-400">imagen o tomografía</span>
              </p>
              <button onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-medium text-cyan-600 hover:underline flex items-center gap-1">
                <Icon name="attach_file" size={14} /> Adjuntar
              </button>
              <input type="file" multiple accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>

            {archivos.length === 0 ? (
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center text-slate-400 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                <Icon name="cloud_upload" size={24} className="mb-2 opacity-50" />
                <p className="text-[12px] font-medium text-slate-600">Arrastra o haz clic para subir</p>
                <p className="text-[10px]">Radiografías, tomografías, fotos intraorales (JPG, PNG, PDF)</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {archivos.map(f => {
                  const isImg = f.type.startsWith("image/");
                  const url = previews[f.name];
                  return (
                    <div key={f.name} className="border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                      <div className="relative h-24 bg-slate-100 flex items-center justify-center cursor-pointer group"
                        onClick={() => isImg && url && setLightbox(url)}>
                        {isImg && url ? (
                          <>
                            <img src={url} alt={f.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <Icon name="zoom_in" size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </>
                        ) : (
                          <Icon name="description" size={28} className="text-red-400" />
                        )}
                        <button onClick={e => { e.stopPropagation(); removeFile(f.name); }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-white/90 hover:bg-white text-red-500 flex items-center justify-center shadow-sm">
                          <Icon name="close" size={13} />
                        </button>
                      </div>
                      <div className="p-2 flex flex-col gap-1.5">
                        <p className="text-[11px] font-medium text-slate-700 truncate">{f.name}</p>
                        <select value={categorias[f.name]} onChange={e => setCategorias(p => ({ ...p, [f.name]: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px] outline-none focus:border-cyan-500 bg-white">
                          {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
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
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-[12px] flex items-center gap-1.5 border border-red-100">
            <Icon name="warning" size={16} /> <p className="font-medium">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
        <button onClick={handleGuardar} disabled={!canSave}
          className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-semibold transition-colors">
          <Icon name="save" size={16} />
          {loading ? "Guardando…" : "Guardar diagnóstico"}
        </button>
      </div>

      {/* Lightbox para imágenes (pre-guardado) */}
      {lightbox && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
            <Icon name="close" size={20} />
          </button>
          <img src={lightbox} alt="Vista" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
