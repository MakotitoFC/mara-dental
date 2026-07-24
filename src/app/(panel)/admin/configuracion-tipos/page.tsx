"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  getTiposConsultaAction,
  createTipoConsultaAction,
  updateTipoConsultaAction,
  deleteTipoConsultaAction,
  getTiposArchivoAction,
  createTipoArchivoAction,
  updateTipoArchivoAction,
  deleteTipoArchivoAction
} from "./actions";

// Paleta de colores predefinidos (oscuros y claros diferenciables)
const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", 
  "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", 
  "#d946ef", "#ec4899", "#f43f5e", 
  "#7f1d1d", "#7c2d12", "#713f12", "#365314", "#14532d", "#064e3b", "#164e63", 
  "#1e3a8a", "#312e81", "#4c1d95", "#701a75", "#831843", "#475569"
];

export default function ConfiguracionTiposPage() {
  const [activeTab, setActiveTab] = useState<"consultas" | "archivos">("consultas");

  // Estado Consultas
  const [consultas, setConsultas] = useState<any[]>([]);
  const [isConsultaModalOpen, setIsConsultaModalOpen] = useState(false);
  const [consultaForm, setConsultaForm] = useState({ id: "", tipo_consulta: "", color: "#3b82f6" });
  
  // Estado Archivos
  const [archivos, setArchivos] = useState<any[]>([]);
  const [isArchivoModalOpen, setIsArchivoModalOpen] = useState(false);
  const [archivoForm, setArchivoForm] = useState({ id: "", tipo_archivo: "" });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [cData, aData] = await Promise.all([getTiposConsultaAction(), getTiposArchivoAction()]);
    setConsultas(cData);
    setArchivos(aData);
  }

  // --- Handlers Consultas ---
  const handleSaveConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultaForm.tipo_consulta.trim()) return;
    
    if (consultaForm.id) {
      await updateTipoConsultaAction(consultaForm.id, consultaForm);
    } else {
      await createTipoConsultaAction(consultaForm);
    }
    setIsConsultaModalOpen(false);
    loadData();
  };

  const handleDeleteConsulta = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este tipo de consulta?")) return;
    const res = await deleteTipoConsultaAction(id);
    if ((res as any)?.error) alert((res as any).error);
    loadData();
  };

  // --- Handlers Archivos ---
  const handleSaveArchivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivoForm.tipo_archivo.trim()) return;
    
    if (archivoForm.id) {
      await updateTipoArchivoAction(archivoForm.id, archivoForm.tipo_archivo);
    } else {
      await createTipoArchivoAction(archivoForm.tipo_archivo);
    }
    setIsArchivoModalOpen(false);
    loadData();
  };

  const handleDeleteArchivo = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este tipo de archivo?")) return;
    const res = await deleteTipoArchivoAction(id);
    if ((res as any)?.error) alert((res as any).error);
    loadData();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* HEADER */}
      <header className="flex flex-col gap-4 px-6 py-6 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 shrink-0">
            <Icon name="category" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Configuración de Tipos</h1>
            <p className="text-[13px] text-slate-500">Gestiona los tipos de consultas y archivos permitidos en el sistema.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("consultas")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "consultas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Tipos de Consulta
          </button>
          <button
            onClick={() => setActiveTab("archivos")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "archivos" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Tipos de Archivos
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === "consultas" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-[15px] font-bold text-slate-700 flex items-center gap-2">
                <Icon name="event_note" size={18} className="text-slate-400" /> Listado de Consultas
              </h2>
              <button
                onClick={() => {
                  setConsultaForm({ id: "", tipo_consulta: "", color: "#3b82f6" });
                  setIsConsultaModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 text-white text-[13px] font-semibold rounded-lg hover:bg-cyan-700 transition-colors shadow-sm shadow-cyan-600/20"
              >
                <Icon name="add" size={16} /> Nuevo Tipo
              </button>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {consultas.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5" style={{ backgroundColor: c.color }}></div>
                      <span className="font-semibold text-[13px] text-slate-700">{c.tipo_consulta}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setConsultaForm(c); setIsConsultaModalOpen(true); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteConsulta(c.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {consultas.length === 0 && <p className="col-span-full text-center text-slate-500 text-sm py-8">No hay tipos de consulta configurados.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "archivos" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-[15px] font-bold text-slate-700 flex items-center gap-2">
                <Icon name="folder_zip" size={18} className="text-slate-400" /> Listado de Archivos Permitidos
              </h2>
              <button
                onClick={() => {
                  setArchivoForm({ id: "", tipo_archivo: "" });
                  setIsArchivoModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 text-white text-[13px] font-semibold rounded-lg hover:bg-cyan-700 transition-colors shadow-sm shadow-cyan-600/20"
              >
                <Icon name="add" size={16} /> Nuevo Tipo
              </button>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {archivos.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                        <Icon name="description" size={16} />
                      </div>
                      <span className="font-semibold text-[13px] text-slate-700 uppercase">{a.tipo_archivo}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setArchivoForm(a); setIsArchivoModalOpen(true); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteArchivo(a.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {archivos.length === 0 && <p className="col-span-full text-center text-slate-500 text-sm py-8">No hay tipos de archivo configurados.</p>}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL CONSULTAS */}
      {isConsultaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsConsultaModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">{consultaForm.id ? "Editar Tipo de Consulta" : "Nuevo Tipo de Consulta"}</h3>
              <button onClick={() => setIsConsultaModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Icon name="close" size={20} /></button>
            </div>
            <form onSubmit={handleSaveConsulta} className="p-5 flex flex-col gap-5">
              <div>
                <label className="block text-[12px] font-semibold text-slate-500 mb-1">Nombre del Tipo</label>
                <input
                  type="text"
                  required
                  value={consultaForm.tipo_consulta}
                  onChange={(e) => setConsultaForm({...consultaForm, tipo_consulta: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                  placeholder="Ej. Control de Ortodoncia"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate-500 mb-2">Color Representativo (Calendario)</label>
                
                {/* Predefined Palette */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setConsultaForm({...consultaForm, color: c})}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${consultaForm.color.toLowerCase() === c.toLowerCase() ? "border-cyan-500 scale-110 shadow-sm" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>

                {/* Custom HEX */}
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={consultaForm.color}
                    onChange={(e) => setConsultaForm({...consultaForm, color: e.target.value})}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={consultaForm.color.toUpperCase()}
                    onChange={(e) => setConsultaForm({...consultaForm, color: e.target.value})}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium uppercase outline-none focus:border-cyan-400"
                    pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsConsultaModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-[13px] font-bold text-white bg-cyan-600 hover:bg-cyan-700 shadow-sm shadow-cyan-600/20 rounded-xl transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ARCHIVOS */}
      {isArchivoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsArchivoModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">{archivoForm.id ? "Editar Tipo de Archivo" : "Nuevo Tipo de Archivo"}</h3>
              <button onClick={() => setIsArchivoModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Icon name="close" size={20} /></button>
            </div>
            <form onSubmit={handleSaveArchivo} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-slate-500 mb-1">Nombre / Extensión</label>
                <input
                  type="text"
                  required
                  value={archivoForm.tipo_archivo}
                  onChange={(e) => setArchivoForm({...archivoForm, tipo_archivo: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all uppercase"
                  placeholder="Ej. RADIOGRAFIA_PANORAMICA o PDF"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsArchivoModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-[13px] font-bold text-white bg-cyan-600 hover:bg-cyan-700 shadow-sm shadow-cyan-600/20 rounded-xl transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
