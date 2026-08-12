"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import {
  getTiposConsultaAction,
  createTipoConsultaAction,
  updateTipoConsultaAction,
  deleteTipoConsultaAction,
  getTiposArchivoAction,
  createTipoArchivoAction,
  updateTipoArchivoAction,
  deleteTipoArchivoAction,
  getCondicionAction,
  createCondicionAction,
  updateCondicionAction,
  deleteCondicionAction
} from "./actions";

// Paleta de colores predefinidos (oscuros y claros diferenciables)
const PASTEL_COLORS = [
  "#fecaca", "#fed7aa", "#fde68a", "#fef08a", "#d9f99d", "#bbf7d0", "#a7f3d0",
  "#99f6e4", "#a5f3fc", "#bae6fd", "#bfdbfe", "#c7d2fe", "#ddd6fe", "#e9d5ff",
  "#fbcfe8", "#fecdd3", "#ffe4e6", 
  "#ffedd5", "#fef3c7", "#ecfccb", "#ccfbf1", "#e0f2fe", "#ede9fe", "#fae8ff"
];

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", 
  "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", 
  "#d946ef", "#ec4899", "#f43f5e", 
  "#7f1d1d", "#7c2d12", "#713f12", "#365314", "#14532d", "#064e3b", "#164e63", 
  "#1e3a8a", "#312e81", "#4c1d95", "#701a75", "#831843", "#475569"
];

interface ConfiguracionTiposClientProps {
  initialConsultas: any[];
  initialArchivos: any[];
  initialCondiciones: any[];
  initialCie10: any[];
  initialRoles: any[];
  initialPuestos: any[];
  initialEspecialidades: any[];
}

export default function ConfiguracionTiposClient({
  initialConsultas,
  initialArchivos,
  initialCondiciones,
  initialCie10,
  initialRoles,
  initialPuestos,
  initialEspecialidades
}: ConfiguracionTiposClientProps) {
  const confirm = useConfirm();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"consultas" | "archivos" | "condiciones" | "cie10" | "roles" | "puestos" | "especialidades">("consultas");

  // Estado Consultas
  const [consultas, setConsultas] = useState<any[]>(initialConsultas);
  const [isConsultaModalOpen, setIsConsultaModalOpen] = useState(false);
  const [consultaForm, setConsultaForm] = useState({ id: "", tipo_consulta: "", color: "#3b82f6", estado: true });
  
  // Estado Condicion Diente
  const [condiciones, setCondiciones] = useState<any[]>(initialCondiciones);
  const [isCondicionModalOpen, setIsCondicionModalOpen] = useState(false);
  const [condicionForm, setCondicionForm] = useState({ id: "", condicion: "", color: "#bae6fd", estado: true });
  
  // Estado Archivos
  const [archivos, setArchivos] = useState<any[]>(initialArchivos);
  const [isArchivoModalOpen, setIsArchivoModalOpen] = useState(false);
  const [archivoForm, setArchivoForm] = useState({ id: "", tipo_archivo: "", estado: true });

  // Estado CIE-10
  const [cie10, setCie10] = useState<any[]>(initialCie10);
  const [isCie10ModalOpen, setIsCie10ModalOpen] = useState(false);
  const [cie10Form, setCie10Form] = useState({ codigo: "", descripcion: "", codigo_antiguo: "", estado: true });

  // Estado Roles
  const [roles, setRoles] = useState<any[]>(initialRoles);
  const [isRolModalOpen, setIsRolModalOpen] = useState(false);
  const [rolForm, setRolForm] = useState({ id: "", rol: "", descripcion: "", estado: true });

  // Estado Puestos
  const [puestos, setPuestos] = useState<any[]>(initialPuestos);
  const [isPuestoModalOpen, setIsPuestoModalOpen] = useState(false);
  const [puestoForm, setPuestoForm] = useState({ id: "", puesto: "", descripcion: "", estado: true });

  // Estado Especialidades
  const [especialidades, setEspecialidades] = useState<any[]>(initialEspecialidades);
  const [isEspecialidadModalOpen, setIsEspecialidadModalOpen] = useState(false);
  const [especialidadForm, setEspecialidadForm] = useState({ id: "", especialidad: "", descripcion: "", estado: true });

  async function loadData() {
    const [cData, aData, condData, cieData, rData, pData, eData] = await Promise.all([
      getTiposConsultaAction(), 
      getTiposArchivoAction(), 
      getCondicionAction(),
      import("../admin.actions").then(m => m.getCie10Action()),
      import("../admin.actions").then(m => m.getRolesAdminAction()),
      import("../admin.actions").then(m => m.getPuestosAdminAction()),
      import("../admin.actions").then(m => m.getEspecialidadesAdminAction())
    ]);
    setConsultas(cData);
    setArchivos(aData);
    setCondiciones(condData);
    setCie10(cieData);
    setRoles(rData);
    setPuestos(pData);
    setEspecialidades(eData);
  }

  // --- Handlers Consultas ---
  const handleSaveConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultaForm.tipo_consulta.trim()) return;
    
    const isEditing = Boolean(consultaForm.id);
    setIsConsultaModalOpen(false);

    // Actualización instantánea en frontend
    if (isEditing) {
      setConsultas(prev => prev.map(c => String(c.id) === String(consultaForm.id) ? { ...c, ...consultaForm } : c));
      toast.success("Tipo de consulta actualizado correctamente");
    } else {
      setConsultas(prev => [...prev, { ...consultaForm, id: Date.now().toString(), estado: true }]);
      toast.success("Tipo de consulta creado correctamente");
    }

    const res = consultaForm.id 
      ? await updateTipoConsultaAction(consultaForm.id, consultaForm)
      : await createTipoConsultaAction(consultaForm);

    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
    loadData();
  };

  const handleDeleteConsulta = async (id: string) => {
    const ok = await confirm({
      title: "Desactivar Tipo de Consulta",
      message: "¿Estás seguro de desactivar este tipo de consulta?",
      confirmLabel: "Desactivar",
    });
    if (!ok) return;

    // Actualización instantánea en frontend
    setConsultas(prev => prev.map(c => String(c.id) === String(id) ? { ...c, estado: false } : c));
    toast.success("Tipo de consulta desactivado correctamente");

    const res = await deleteTipoConsultaAction(id);
    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
    loadData();
  };

  // --- Handlers Condicion ---
  const handleSaveCondicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condicionForm.condicion.trim()) return;
    
    const isEditing = Boolean(condicionForm.id);
    setIsCondicionModalOpen(false);

    if (isEditing) {
      setCondiciones(prev => prev.map(c => String(c.id) === String(condicionForm.id) ? { ...c, ...condicionForm } : c));
      toast.success("Condición actualizada correctamente");
    } else {
      setCondiciones(prev => [...prev, { ...condicionForm, id: Date.now().toString(), estado: true }]);
      toast.success("Condición creada correctamente");
    }

    const res = condicionForm.id
      ? await updateCondicionAction(condicionForm.id, condicionForm)
      : await createCondicionAction(condicionForm);

    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
    loadData();
  };

  const handleDeleteCondicion = async (id: string) => {
    const ok = await confirm({
      title: "Desactivar Condición",
      message: "¿Estás seguro de desactivar esta condición?",
      confirmLabel: "Desactivar",
    });
    if (!ok) return;

    setCondiciones(prev => prev.map(c => String(c.id) === String(id) ? { ...c, estado: false } : c));
    toast.success("Condición desactivada correctamente");

    const res = await deleteCondicionAction(id);
    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
    loadData();
  };

  // --- Handlers Archivos ---
  const handleSaveArchivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivoForm.tipo_archivo.trim()) return;
    
    const isEditing = Boolean(archivoForm.id);
    setIsArchivoModalOpen(false);

    if (isEditing) {
      setArchivos(prev => prev.map(a => String(a.id) === String(archivoForm.id) ? { ...a, ...archivoForm } : a));
      toast.success("Tipo de archivo actualizado correctamente");
    } else {
      setArchivos(prev => [...prev, { ...archivoForm, id: Date.now().toString(), estado: true }]);
      toast.success("Tipo de archivo creado correctamente");
    }

    const res = archivoForm.id
      ? await updateTipoArchivoAction(archivoForm.id, archivoForm.tipo_archivo, archivoForm.estado)
      : await createTipoArchivoAction(archivoForm.tipo_archivo, archivoForm.estado);

    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
    loadData();
  };

  const handleDeleteArchivo = async (id: string) => {
    const ok = await confirm({
      title: "Desactivar Tipo de Archivo",
      message: "¿Estás seguro de desactivar este tipo de archivo?",
      confirmLabel: "Desactivar",
    });
    if (!ok) return;

    setArchivos(prev => prev.map(a => String(a.id) === String(id) ? { ...a, estado: false } : a));
    toast.success("Tipo de archivo desactivado correctamente");

    const res = await deleteTipoArchivoAction(id);
    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
    loadData();
  };

  // --- Handlers CIE-10 ---
  const handleSaveCie10 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cie10Form.codigo.trim() || !cie10Form.descripcion.trim()) return;
    
    const isEditing = Boolean(cie10Form.codigo_antiguo);
    setIsCie10ModalOpen(false);

    if (isEditing) {
      setCie10(prev => prev.map(c => String(c.codigo) === String(cie10Form.codigo_antiguo) ? { ...c, ...cie10Form } : c));
      toast.success("Código CIE-10 actualizado correctamente");
    } else {
      setCie10(prev => [...prev, { ...cie10Form, estado: true }]);
      toast.success("Código CIE-10 creado correctamente");
    }

    const { saveCie10Action } = await import("../admin.actions");
    const res = await saveCie10Action(cie10Form);

    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
    loadData();
  };

  const handleDeleteCie10 = async (codigo: string) => {
    const ok = await confirm({
      title: "Desactivar Código CIE-10",
      message: "¿Estás seguro de desactivar este código CIE-10?",
      confirmLabel: "Desactivar",
    });
    if (!ok) return;

    setCie10(prev => prev.map(c => String(c.codigo) === String(codigo) ? { ...c, estado: false } : c));
    toast.success("Código CIE-10 desactivado correctamente");

    const { softDeleteCie10Action } = await import("../admin.actions");
    const res = await softDeleteCie10Action(codigo);
    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
    loadData();
  };

  // --- Handlers Roles ---
  const handleSaveRol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rolForm.rol.trim()) return;

    const isEditing = Boolean(rolForm.id);
    setIsRolModalOpen(false);

    if (isEditing) {
      setRoles(prev => prev.map(r => String(r.id) === String(rolForm.id) ? { ...r, ...rolForm } : r));
      toast.success("Rol actualizado correctamente");
    } else {
      setRoles(prev => [...prev, { ...rolForm, id: Date.now(), estado: true }]);
      toast.success("Rol creado correctamente");
    }

    const { saveRolAdminAction } = await import("../admin.actions");
    const res = await saveRolAdminAction(rolForm);

    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
    loadData();
  };

  const handleDeleteRol = async (id: number) => {
    const ok = await confirm({
      title: "Desactivar Rol",
      message: "¿Estás seguro que deseas desactivar este rol? Dejará de estar disponible.",
      requireText: "DESACTIVAR",
      confirmLabel: "Desactivar Rol",
    });
    if (!ok) return;

    setRoles(prev => prev.map(r => Number(r.id) === Number(id) ? { ...r, estado: false } : r));
    toast.success("Rol desactivado correctamente");

    const { softDeleteRolAction } = await import("../admin.actions");
    const res = await softDeleteRolAction(id);
    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
    loadData();
  };

  // --- Handlers Puestos ---
  const handleSavePuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puestoForm.puesto.trim()) return;

    const isEditing = Boolean(puestoForm.id);
    setIsPuestoModalOpen(false);

    if (isEditing) {
      setPuestos(prev => prev.map(p => String(p.id) === String(puestoForm.id) ? { ...p, ...puestoForm } : p));
      toast.success("Puesto actualizado correctamente");
    } else {
      setPuestos(prev => [...prev, { ...puestoForm, id: Date.now(), estado: true }]);
      toast.success("Puesto creado correctamente");
    }

    const { savePuestoAdminAction } = await import("../admin.actions");
    const res = await savePuestoAdminAction(puestoForm);

    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
    loadData();
  };

  const handleDeletePuesto = async (id: number) => {
    const ok = await confirm({
      title: "Desactivar Puesto",
      message: "¿Estás seguro que deseas desactivar este puesto? Dejará de estar disponible.",
      requireText: "DESACTIVAR",
      confirmLabel: "Desactivar Puesto",
    });
    if (!ok) return;

    setPuestos(prev => prev.map(p => Number(p.id) === Number(id) ? { ...p, estado: false } : p));
    toast.success("Puesto desactivado correctamente");

    const { softDeletePuestoAction } = await import("../admin.actions");
    const res = await softDeletePuestoAction(id);
    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
    loadData();
  };

  // --- Handlers Especialidades ---
  const handleSaveEspecialidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!especialidadForm.especialidad.trim()) return;

    const isEditing = Boolean(especialidadForm.id);
    setIsEspecialidadModalOpen(false);

    if (isEditing) {
      setEspecialidades(prev => prev.map(es => String(es.id) === String(especialidadForm.id) ? { ...es, ...especialidadForm } : es));
      toast.success("Especialidad actualizada correctamente");
    } else {
      setEspecialidades(prev => [...prev, { ...especialidadForm, id: Date.now(), estado: true }]);
      toast.success("Especialidad creada correctamente");
    }

    const { saveEspecialidadAdminAction } = await import("../admin.actions");
    const res = await saveEspecialidadAdminAction(especialidadForm);

    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
    loadData();
  };

  const handleDeleteEspecialidad = async (id: number) => {
    const ok = await confirm({
      title: "Desactivar Especialidad",
      message: "¿Estás seguro que deseas desactivar esta especialidad? Dejará de estar disponible.",
      requireText: "DESACTIVAR",
      confirmLabel: "Desactivar Especialidad",
    });
    if (!ok) return;

    setEspecialidades(prev => prev.map(es => Number(es.id) === Number(id) ? { ...es, estado: false } : es));
    toast.success("Especialidad desactivada correctamente");

    const { softDeleteEspecialidadAction } = await import("../admin.actions");
    const res = await softDeleteEspecialidadAction(id);
    if ((res as any)?.error) {
      toast.error((res as any).error);
    }
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
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("consultas")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "consultas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Tipos de Consulta
          </button>
          <button
            onClick={() => setActiveTab("archivos")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "archivos" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Tipos de Archivo
          </button>
          <button
            onClick={() => setActiveTab("condiciones")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "condiciones" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Condición del Diente
          </button>
          <button
            onClick={() => setActiveTab("cie10")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "cie10" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            CIE-10
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "roles" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Roles
          </button>
          <button
            onClick={() => setActiveTab("puestos")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "puestos" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Puestos
          </button>
          <button
            onClick={() => setActiveTab("especialidades")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "especialidades" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Especialidades
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
                  setConsultaForm({ id: "", tipo_consulta: "", color: "#3b82f6", estado: true });
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
                  <div key={c.id} className={`flex items-center justify-between p-3 border rounded-xl transition-colors ${c.estado === false ? 'border-amber-200 bg-amber-50/40 opacity-70' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5" style={{ backgroundColor: c.color }}></div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[13px] text-slate-700">{c.tipo_consulta}</span>
                        {c.estado === false && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded w-fit mt-0.5">INACTIVO</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setConsultaForm(c); setIsConsultaModalOpen(true); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        title="Editar"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      {c.estado !== false && (
                        <button 
                          onClick={() => handleDeleteConsulta(c.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          title="Desactivar"
                        >
                          <Icon name="block" size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {consultas.length === 0 && <p className="col-span-full text-center text-slate-500 text-sm py-8">No hay tipos de consulta configurados.</p>}
              </div>
            </div>
          </div>
        )}

        
        {activeTab === "condiciones" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-[15px] font-bold text-slate-700 flex items-center gap-2">
                <Icon name="dentistry" size={18} className="text-slate-400" /> Listado de Condiciones (Odontograma)
              </h2>
              <button
                onClick={() => {
                  setCondicionForm({ id: "", condicion: "", color: "#bae6fd", estado: true });
                  setIsCondicionModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 text-white text-[13px] font-semibold rounded-lg hover:bg-cyan-700 transition-colors shadow-sm shadow-cyan-600/20"
              >
                <Icon name="add" size={16} /> Nueva Condición
              </button>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {condiciones.map((c) => (
                  <div key={c.id} className={`flex items-center justify-between p-3 border rounded-xl transition-colors ${c.estado === false ? 'border-amber-200 bg-amber-50/40 opacity-70' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5" style={{ backgroundColor: c.color }}></div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[13px] text-slate-700 uppercase">{c.condicion}</span>
                        {c.estado === false && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded w-fit mt-0.5">INACTIVO</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setCondicionForm(c); setIsCondicionModalOpen(true); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        title="Editar"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      {c.estado !== false && (
                        <button 
                          onClick={() => handleDeleteCondicion(c.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          title="Desactivar"
                        >
                          <Icon name="block" size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {condiciones.length === 0 && <p className="col-span-full text-center text-slate-500 text-sm py-8">No hay condiciones configuradas.</p>}
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
                  setArchivoForm({ id: "", tipo_archivo: "", estado: true });
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
                  <div key={a.id} className={`flex items-center justify-between p-3 border rounded-xl transition-colors ${a.estado === false ? 'border-amber-200 bg-amber-50/40 opacity-70' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                        <Icon name="description" size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[13px] text-slate-700 uppercase">{a.tipo_archivo}</span>
                        {a.estado === false && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded w-fit mt-0.5">INACTIVO</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setArchivoForm(a); setIsArchivoModalOpen(true); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        title="Editar"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      {a.estado !== false && (
                        <button 
                          onClick={() => handleDeleteArchivo(a.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          title="Desactivar"
                        >
                          <Icon name="block" size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {archivos.length === 0 && <p className="col-span-full text-center text-slate-500 text-sm py-8">No hay tipos de archivo configurados.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "cie10" && (
          <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="font-semibold text-slate-700">Clasificación Internacional de Enfermedades (CIE-10)</h2>
              <button 
                onClick={() => {
                  setCie10Form({ codigo: "", descripcion: "", codigo_antiguo: "", estado: true });
                  setIsCie10ModalOpen(true);
                }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                <Icon name="add" size={16} /> Agregar Código
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {cie10.map(c => (
                  <div key={c.codigo} className={`border rounded-xl p-4 flex flex-col gap-3 relative group shadow-sm hover:shadow-md transition-shadow ${c.estado === false ? 'border-amber-200 bg-amber-50/40 opacity-70' : 'border-slate-200 bg-white'}`}>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                        setCie10Form({ codigo: c.codigo, descripcion: c.descripcion, codigo_antiguo: c.codigo, estado: c.estado !== undefined ? c.estado : true });
                        setIsCie10ModalOpen(true);
                      }} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg" title="Editar">
                        <Icon name="edit_note" size={16} />
                      </button>
                      {c.estado !== false && (
                        <button onClick={() => handleDeleteCie10(c.codigo)} className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg" title="Desactivar">
                          <Icon name="block" size={16} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${c.estado === false ? 'bg-amber-500' : 'bg-cyan-500'}`}></div>
                      <h3 className="font-bold text-slate-800 break-all">{c.codigo}</h3>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-3" title={c.descripcion}>{c.descripcion}</p>
                    {c.estado === false && <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-1 rounded w-fit mt-auto">INACTIVO</span>}
                  </div>
                ))}
                {cie10.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    No hay códigos CIE-10 configurados.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* TABS: Roles */}
        {activeTab === "roles" && (
          <div className="h-full flex flex-col bg-slate-50 relative">
            <div className="flex-none p-4 pb-0 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Catálogo de Roles</h2>
              <button 
                onClick={() => {
                  setRolForm({ id: "", rol: "", descripcion: "", estado: true });
                  setIsRolModalOpen(true);
                }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                <Icon name="add" size={16} /> Agregar Rol
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {roles.map(r => (
                  <div key={r.id} className={`border ${r.estado ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50/50 opacity-70'} rounded-xl p-4 flex flex-col gap-3 relative group shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                        setRolForm({ id: r.id, rol: r.rol, descripcion: r.descripcion, estado: r.estado });
                        setIsRolModalOpen(true);
                      }} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg" title="Editar">
                        <Icon name="edit_note" size={16} />
                      </button>
                      {r.estado && (
                        <button onClick={() => handleDeleteRol(r.id)} className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg" title="Desactivar">
                          <Icon name="block" size={16} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${r.estado ? 'bg-cyan-500' : 'bg-red-500'}`}></div>
                      <h3 className="font-bold text-slate-800 break-all">{r.rol}</h3>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-3">{r.descripcion}</p>
                    {!r.estado && <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded w-fit mt-auto">INACTIVO</span>}
                  </div>
                ))}
                {roles.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    No hay roles configurados.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TABS: Puestos */}
        {activeTab === "puestos" && (
          <div className="h-full flex flex-col bg-slate-50 relative">
            <div className="flex-none p-4 pb-0 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Catálogo de Puestos</h2>
              <button 
                onClick={() => {
                  setPuestoForm({ id: "", puesto: "", descripcion: "", estado: true });
                  setIsPuestoModalOpen(true);
                }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                <Icon name="add" size={16} /> Agregar Puesto
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {puestos.map(p => (
                  <div key={p.id} className={`border ${p.estado ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50/50 opacity-70'} rounded-xl p-4 flex flex-col gap-3 relative group shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                        setPuestoForm({ id: p.id, puesto: p.puesto, descripcion: p.descripcion, estado: p.estado });
                        setIsPuestoModalOpen(true);
                      }} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg" title="Editar">
                        <Icon name="edit_note" size={16} />
                      </button>
                      {p.estado && (
                        <button onClick={() => handleDeletePuesto(p.id)} className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg" title="Desactivar">
                          <Icon name="block" size={16} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${p.estado ? 'bg-cyan-500' : 'bg-red-500'}`}></div>
                      <h3 className="font-bold text-slate-800 break-all">{p.puesto}</h3>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-3">{p.descripcion}</p>
                    {!p.estado && <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded w-fit mt-auto">INACTIVO</span>}
                  </div>
                ))}
                {puestos.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    No hay puestos configurados.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TABS: Especialidades */}
        {activeTab === "especialidades" && (
          <div className="h-full flex flex-col bg-slate-50 relative">
            <div className="flex-none p-4 pb-0 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Catálogo de Especialidades</h2>
              <button 
                onClick={() => {
                  setEspecialidadForm({ id: "", especialidad: "", descripcion: "", estado: true });
                  setIsEspecialidadModalOpen(true);
                }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                <Icon name="add" size={16} /> Agregar Especialidad
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {especialidades.map(e => (
                  <div key={e.id} className={`border ${e.estado ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50/50 opacity-70'} rounded-xl p-4 flex flex-col gap-3 relative group shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                        setEspecialidadForm({ id: e.id, especialidad: e.especialidad, descripcion: e.descripcion, estado: e.estado });
                        setIsEspecialidadModalOpen(true);
                      }} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg" title="Editar">
                        <Icon name="edit_note" size={16} />
                      </button>
                      {e.estado && (
                        <button onClick={() => handleDeleteEspecialidad(e.id)} className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg" title="Desactivar">
                          <Icon name="block" size={16} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${e.estado ? 'bg-cyan-500' : 'bg-red-500'}`}></div>
                      <h3 className="font-bold text-slate-800 break-all">{e.especialidad}</h3>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-3">{e.descripcion}</p>
                    {!e.estado && <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded w-fit mt-auto">INACTIVO</span>}
                  </div>
                ))}
                {especialidades.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    No hay especialidades configuradas.
                  </div>
                )}
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
                  autoFocus
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

      
      {/* MODAL CONDICION */}
      {isCondicionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCondicionModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">{condicionForm.id ? "Editar Condición" : "Nueva Condición"}</h3>
              <button onClick={() => setIsCondicionModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Icon name="close" size={20} /></button>
            </div>
            <form onSubmit={handleSaveCondicion} className="p-5 flex flex-col gap-5">
              <div>
                <label className="block text-[12px] font-semibold text-slate-500 mb-1">Nombre de la Condición</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={condicionForm.condicion}
                  onChange={(e) => setCondicionForm({...condicionForm, condicion: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all uppercase"
                  placeholder="Ej. CARIES, RESINA, CORONA..."
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate-500 mb-2">Color Representativo (Pastel)</label>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {PASTEL_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCondicionForm({...condicionForm, color: c})}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${condicionForm.color.toLowerCase() === c.toLowerCase() ? "border-cyan-500 scale-110 shadow-sm" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={condicionForm.color}
                    onChange={(e) => setCondicionForm({...condicionForm, color: e.target.value})}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={condicionForm.color.toUpperCase()}
                    onChange={(e) => setCondicionForm({...condicionForm, color: e.target.value})}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium uppercase outline-none focus:border-cyan-400"
                    pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsCondicionModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
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
                  autoFocus
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

      {/* Modal CIE-10 */}
      {isCie10ModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">
                {cie10Form.codigo_antiguo ? "Editar" : "Nuevo"} Código CIE-10
              </h3>
              <button onClick={() => setIsCie10ModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors">
                <Icon name="block" size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveCie10} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Código</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej. K02.1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 text-sm uppercase"
                  value={cie10Form.codigo}
                  onChange={(e) => setCie10Form({...cie10Form, codigo: e.target.value.toUpperCase()})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 text-sm resize-none"
                  value={cie10Form.descripcion}
                  onChange={(e) => setCie10Form({...cie10Form, descripcion: e.target.value})}
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsCie10ModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm shadow-sm transition-colors flex items-center gap-2">
                  <Icon name="save" size={16} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL ROL */}
      {isRolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsRolModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">{rolForm.id ? "Editar Rol" : "Nuevo Rol"}</h3>
              <button onClick={() => setIsRolModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Icon name="close" size={20} /></button>
            </div>
            <form onSubmit={handleSaveRol} className="p-5 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Rol</label>
                <input 
                  type="text" 
                  required 
                  autoFocus
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  value={rolForm.rol}
                  onChange={(e) => setRolForm({...rolForm, rol: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea 
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 text-sm resize-none"
                  value={rolForm.descripcion}
                  onChange={(e) => setRolForm({...rolForm, descripcion: e.target.value})}
                ></textarea>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="rol_estado"
                  checked={rolForm.estado}
                  onChange={(e) => setRolForm({...rolForm, estado: e.target.checked})}
                  className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                />
                <label htmlFor="rol_estado" className="text-sm font-semibold text-slate-700">Activo (Visible en el sistema)</label>
              </div>
              <div className="flex items-center justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsRolModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm shadow-sm transition-colors flex items-center gap-2">
                  <Icon name="save" size={16} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PUESTO */}
      {isPuestoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsPuestoModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">{puestoForm.id ? "Editar Puesto" : "Nuevo Puesto"}</h3>
              <button onClick={() => setIsPuestoModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Icon name="close" size={20} /></button>
            </div>
            <form onSubmit={handleSavePuesto} className="p-5 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Puesto</label>
                <input 
                  type="text" 
                  required 
                  autoFocus
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  value={puestoForm.puesto}
                  onChange={(e) => setPuestoForm({...puestoForm, puesto: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea 
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 text-sm resize-none"
                  value={puestoForm.descripcion}
                  onChange={(e) => setPuestoForm({...puestoForm, descripcion: e.target.value})}
                ></textarea>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="puesto_estado"
                  checked={puestoForm.estado}
                  onChange={(e) => setPuestoForm({...puestoForm, estado: e.target.checked})}
                  className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                />
                <label htmlFor="puesto_estado" className="text-sm font-semibold text-slate-700">Activo (Visible en el sistema)</label>
              </div>
              <div className="flex items-center justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsPuestoModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm shadow-sm transition-colors flex items-center gap-2">
                  <Icon name="save" size={16} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ESPECIALIDAD */}
      {isEspecialidadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEspecialidadModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">{especialidadForm.id ? "Editar Especialidad" : "Nueva Especialidad"}</h3>
              <button onClick={() => setIsEspecialidadModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Icon name="close" size={20} /></button>
            </div>
            <form onSubmit={handleSaveEspecialidad} className="p-5 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre de la Especialidad</label>
                <input 
                  type="text" 
                  required 
                  autoFocus
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  value={especialidadForm.especialidad}
                  onChange={(e) => setEspecialidadForm({...especialidadForm, especialidad: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea 
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 text-sm resize-none"
                  value={especialidadForm.descripcion}
                  onChange={(e) => setEspecialidadForm({...especialidadForm, descripcion: e.target.value})}
                ></textarea>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="especialidad_estado"
                  checked={especialidadForm.estado}
                  onChange={(e) => setEspecialidadForm({...especialidadForm, estado: e.target.checked})}
                  className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                />
                <label htmlFor="especialidad_estado" className="text-sm font-semibold text-slate-700">Activa (Visible en el sistema)</label>
              </div>
              <div className="flex items-center justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsEspecialidadModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm shadow-sm transition-colors flex items-center gap-2">
                  <Icon name="save" size={16} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
