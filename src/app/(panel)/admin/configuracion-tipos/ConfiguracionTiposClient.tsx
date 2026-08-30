"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { TextInput, Textarea } from "@/components/ui/TextInput";
import { Checkbox } from "@/components/ui/Checkbox";
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
// Paleta curada de marca — Condición del Diente (pasteles)
const PASTEL_COLORS = [
  "#E0F2F1", "#B2EBF2", "#80DEEA", "#4DD0E1",
  "#E9F8EF", "#FEF4E3", "#FDECEA", "#EEF1F3",
];

// Paleta curada de marca — Tipos de Consulta (sólidos)
const PRESET_COLORS = [
  "#0A8EA0", "#0D7377", "#1D95A0", "#073D42",
  "#5D6D7E", "#27AE60", "#F39C12", "#E74C3C",
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
  const [consultaForm, setConsultaForm] = useState({ id: "", tipo_consulta: "", color: "#0A8EA0", estado: true });
  
  // Estado Condicion Diente
  const [condiciones, setCondiciones] = useState<any[]>(initialCondiciones);
  const [isCondicionModalOpen, setIsCondicionModalOpen] = useState(false);
  const [condicionForm, setCondicionForm] = useState({ id: "", condicion: "", color: "#E0F2F1", estado: true });
  
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
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
      {/* HEADER — barra de pestañas propia de esta vista, distinta del
          <Header> sticky superior que ahora la envuelve desde page.tsx. */}
      <header className="flex flex-col gap-4 px-4 sm:px-6 pt-4 sm:pt-6 bg-white border-b border-slate-200 shrink-0">
        {/* En mobile solo el título — ícono y descripción se ocultan. */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[15px] md:text-base font-bold text-slate-800">Configuración de Tipos</h1>
            <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Gestiona los tipos de consultas y archivos permitidos en el sistema.</p>
          </div>
        </div>

        {/* Tabs — subrayado, sin fondo tipo píldora (antes era un
            segmented-control bg-slate-100 con la pestaña activa en bg-white;
            ahora es texto plano con borde inferior en la activa). */}
        <div className="flex gap-5 overflow-x-auto no-scrollbar max-w-full">
          {([
            { id: "consultas", label: "Tipos de Consulta" },
            { id: "archivos", label: "Tipos de Archivo" },
            { id: "condiciones", label: "Condición del Diente" },
            { id: "cie10", label: "CIE-10" },
            { id: "roles", label: "Roles" },
            { id: "puestos", label: "Puestos" },
            { id: "especialidades", label: "Especialidades" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 border-b-2 text-[12.5px] font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-cyan-600 text-cyan-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL — este <main> anidado scrollea de forma
          independiente al <main> del DashboardShell, así que necesita su
          propio padding para despejar el BottomNav (ver mismo cálculo en
          DashboardShell.tsx). */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto no-scrollbar">
        {activeTab === "consultas" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-[15px] md:text-base font-bold text-slate-700 flex items-center gap-2">
                <Icon name="event_note" size={18} className="text-slate-400" /> Listado de Consultas
              </h2>
              <button
                onClick={() => {
                  setConsultaForm({ id: "", tipo_consulta: "", color: "#0A8EA0", estado: true });
                  setIsConsultaModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[12.5px] font-semibold transition-colors"
              >
                <Icon name="add" size={16} /> <span className="hidden lg:inline">Nuevo Tipo</span>
              </button>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {consultas.map((c) => (
                  <div key={c.id} className={`flex items-center justify-between p-3 border rounded-xl transition-colors ${c.estado === false ? 'border-amber-200 bg-amber-50/40 opacity-70' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5" style={{ backgroundColor: c.color }}></div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[13px] md:text-sm text-slate-700">{c.tipo_consulta}</span>
                        {c.estado === false && <span className="text-[10px] md:text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded w-fit mt-0.5">INACTIVO</span>}
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
                {consultas.length === 0 && <p className="col-span-full text-center text-slate-500 text-[13px] md:text-sm py-8">No hay tipos de consulta configurados.</p>}
              </div>
            </div>
          </div>
        )}

        
        {activeTab === "condiciones" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-[15px] md:text-base font-bold text-slate-700 flex items-center gap-2">
                <Icon name="dentistry" size={18} className="text-slate-400" /> Listado de Condiciones (Odontograma)
              </h2>
              <button
                onClick={() => {
                  setCondicionForm({ id: "", condicion: "", color: "#E0F2F1", estado: true });
                  setIsCondicionModalOpen(true);
                }}
                className="flex items-center gap-2 px-2.5 lg:px-3 py-1.5 bg-cyan-600 text-white text-[13px] md:text-sm font-semibold rounded-lg hover:bg-cyan-700 transition-colors shadow-sm shadow-cyan-600/20"
              >
                <Icon name="add" size={16} /> <span className="hidden lg:inline">Nueva Condición</span>
              </button>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {condiciones.map((c) => (
                  <div key={c.id} className={`flex items-center justify-between p-3 border rounded-xl transition-colors ${c.estado === false ? 'border-amber-200 bg-amber-50/40 opacity-70' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5" style={{ backgroundColor: c.color }}></div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[13px] md:text-sm text-slate-700 uppercase">{c.condicion}</span>
                        {c.estado === false && <span className="text-[10px] md:text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded w-fit mt-0.5">INACTIVO</span>}
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
                {condiciones.length === 0 && <p className="col-span-full text-center text-slate-500 text-[13px] md:text-sm py-8">No hay condiciones configuradas.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "archivos" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-[15px] md:text-base font-bold text-slate-700 flex items-center gap-2">
                <Icon name="folder_zip" size={18} className="text-slate-400" /> Listado de Archivos Permitidos
              </h2>
              <button
                onClick={() => {
                  setArchivoForm({ id: "", tipo_archivo: "", estado: true });
                  setIsArchivoModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[12.5px] font-semibold transition-colors"
              >
                <Icon name="add" size={16} /> <span className="hidden lg:inline">Nuevo Tipo</span>
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
                        <span className="font-semibold text-[13px] md:text-sm text-slate-700 uppercase">{a.tipo_archivo}</span>
                        {a.estado === false && <span className="text-[10px] md:text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded w-fit mt-0.5">INACTIVO</span>}
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
                {archivos.length === 0 && <p className="col-span-full text-center text-slate-500 text-[13px] md:text-sm py-8">No hay tipos de archivo configurados.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "cie10" && (
          <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-[15px] md:text-base font-bold text-slate-700">Clasificación Internacional de Enfermedades (CIE-10)</h2>
              <button 
                onClick={() => {
                  setCie10Form({ codigo: "", descripcion: "", codigo_antiguo: "", estado: true });
                  setIsCie10ModalOpen(true);
                }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 lg:px-4 py-2 rounded-lg text-[13px] md:text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
              >
                <Icon name="add" size={16} /> <span className="hidden lg:inline">Agregar Código</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto no-scrollbar p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {cie10.map(c => (
                  <div key={c.codigo} className="border border-slate-200 bg-white rounded-xl p-4 flex flex-col gap-3 relative group shadow-sm hover:shadow-md transition-shadow">
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
                      <div className={`w-2 h-2 rounded-full ${c.estado === false ? 'bg-slate-300' : 'bg-cyan-600'}`}></div>
                      <h3 className="font-bold text-[13px] md:text-sm text-slate-800 break-all">{c.codigo}</h3>
                    </div>
                    <p className="text-[13px] md:text-sm text-slate-600 line-clamp-3" title={c.descripcion}>{c.descripcion}</p>
                    {c.estado === false && <span className="text-[10px] md:text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded w-fit mt-auto">INACTIVO</span>}
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
          <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-[15px] md:text-base font-bold text-slate-700">Catálogo de Roles</h2>
              <button
                onClick={() => {
                  setRolForm({ id: "", rol: "", descripcion: "", estado: true });
                  setIsRolModalOpen(true);
                }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 lg:px-4 py-2 rounded-lg text-[13px] md:text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
              >
                <Icon name="add" size={16} /> <span className="hidden lg:inline">Agregar Rol</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto no-scrollbar p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {roles.map(r => (
                  <div key={r.id} className="border border-slate-200 bg-white rounded-xl p-4 flex flex-col gap-3 relative group shadow-sm hover:shadow-md transition-shadow">
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
                      <div className={`w-2 h-2 rounded-full ${r.estado ? 'bg-cyan-600' : 'bg-slate-300'}`}></div>
                      <h3 className="font-bold text-[13px] md:text-sm text-slate-800 break-all">{r.rol}</h3>
                    </div>
                    <p className="text-[13px] md:text-sm text-slate-600 line-clamp-3">{r.descripcion}</p>
                    {!r.estado && <span className="text-[10px] md:text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded w-fit mt-auto">INACTIVO</span>}
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
          <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-[15px] md:text-base font-bold text-slate-700">Catálogo de Puestos</h2>
              <button
                onClick={() => {
                  setPuestoForm({ id: "", puesto: "", descripcion: "", estado: true });
                  setIsPuestoModalOpen(true);
                }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 lg:px-4 py-2 rounded-lg text-[13px] md:text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
              >
                <Icon name="add" size={16} /> <span className="hidden lg:inline">Agregar Puesto</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto no-scrollbar p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {puestos.map(p => (
                  <div key={p.id} className="border border-slate-200 bg-white rounded-xl p-4 flex flex-col gap-3 relative group shadow-sm hover:shadow-md transition-shadow">
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
                      <div className={`w-2 h-2 rounded-full ${p.estado ? 'bg-cyan-600' : 'bg-slate-300'}`}></div>
                      <h3 className="font-bold text-[13px] md:text-sm text-slate-800 break-all">{p.puesto}</h3>
                    </div>
                    <p className="text-[13px] md:text-sm text-slate-600 line-clamp-3">{p.descripcion}</p>
                    {!p.estado && <span className="text-[10px] md:text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded w-fit mt-auto">INACTIVO</span>}
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
          <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-[15px] md:text-base font-bold text-slate-700">Catálogo de Especialidades</h2>
              <button
                onClick={() => {
                  setEspecialidadForm({ id: "", especialidad: "", descripcion: "", estado: true });
                  setIsEspecialidadModalOpen(true);
                }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 lg:px-4 py-2 rounded-lg text-[13px] md:text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
              >
                <Icon name="add" size={16} /> <span className="hidden lg:inline">Agregar Especialidad</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto no-scrollbar p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {especialidades.map(e => (
                  <div key={e.id} className="border border-slate-200 bg-white rounded-xl p-4 flex flex-col gap-3 relative group shadow-sm hover:shadow-md transition-shadow">
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
                      <div className={`w-2 h-2 rounded-full ${e.estado ? 'bg-cyan-600' : 'bg-slate-300'}`}></div>
                      <h3 className="font-bold text-[13px] md:text-sm text-slate-800 break-all">{e.especialidad}</h3>
                    </div>
                    <p className="text-[13px] md:text-sm text-slate-600 line-clamp-3">{e.descripcion}</p>
                    {!e.estado && <span className="text-[10px] md:text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded w-fit mt-auto">INACTIVO</span>}
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
      <AnimatePresence>
        {isConsultaModalOpen && (
          <ResponsiveSheet
            onClose={() => setIsConsultaModalOpen(false)}
            title={consultaForm.id ? "Editar Tipo de Consulta" : "Nuevo Tipo de Consulta"}
            size="sm"
            footer={
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsConsultaModalOpen(false)} className="px-4 py-2 text-[13px] md:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" form="consulta-form" className="px-4 py-2 text-[13px] md:text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 shadow-sm shadow-cyan-600/20 rounded-xl transition-colors">Guardar</button>
              </div>
            }
          >
            <form id="consulta-form" onSubmit={handleSaveConsulta} className="flex flex-col gap-5">
              <div>
                <label className="block text-[11px] md:text-xs font-semibold text-slate-500 mb-1">Nombre del Tipo</label>
                <TextInput
                  type="text"
                  required
                  autoFocus
                  value={consultaForm.tipo_consulta}
                  onChange={(e) => setConsultaForm({...consultaForm, tipo_consulta: e.target.value})}
                  placeholder="Ej. Control de Ortodoncia"
                />
              </div>

              <div>
                <label className="block text-[11px] md:text-xs font-semibold text-slate-500 mb-2">Color Representativo (Calendario)</label>

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
                  <TextInput
                    type="text"
                    value={consultaForm.color.toUpperCase()}
                    onChange={(e) => setConsultaForm({...consultaForm, color: e.target.value})}
                    className="flex-1 uppercase"
                    pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>


      {/* MODAL CONDICION */}
      <AnimatePresence>
        {isCondicionModalOpen && (
          <ResponsiveSheet
            onClose={() => setIsCondicionModalOpen(false)}
            title={condicionForm.id ? "Editar Condición" : "Nueva Condición"}
            size="sm"
            footer={
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsCondicionModalOpen(false)} className="px-4 py-2 text-[13px] md:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" form="condicion-form" className="px-4 py-2 text-[13px] md:text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 shadow-sm shadow-cyan-600/20 rounded-xl transition-colors">Guardar</button>
              </div>
            }
          >
            <form id="condicion-form" onSubmit={handleSaveCondicion} className="flex flex-col gap-5">
              <div>
                <label className="block text-[11px] md:text-xs font-semibold text-slate-500 mb-1">Nombre de la Condición</label>
                <TextInput
                  type="text"
                  required
                  autoFocus
                  value={condicionForm.condicion}
                  onChange={(e) => setCondicionForm({...condicionForm, condicion: e.target.value})}
                  className="uppercase"
                  placeholder="Ej. CARIES, RESINA, CORONA..."
                />
              </div>

              <div>
                <label className="block text-[11px] md:text-xs font-semibold text-slate-500 mb-2">Color Representativo (Pastel)</label>

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
                  <TextInput
                    type="text"
                    value={condicionForm.color.toUpperCase()}
                    onChange={(e) => setCondicionForm({...condicionForm, color: e.target.value})}
                    className="flex-1 uppercase"
                    pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>

      {/* MODAL ARCHIVOS */}
      <AnimatePresence>
        {isArchivoModalOpen && (
          <ResponsiveSheet
            onClose={() => setIsArchivoModalOpen(false)}
            title={archivoForm.id ? "Editar Tipo de Archivo" : "Nuevo Tipo de Archivo"}
            footer={
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsArchivoModalOpen(false)} className="px-4 py-2 text-[13px] md:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" form="archivo-form" className="px-4 py-2 text-[13px] md:text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 shadow-sm shadow-cyan-600/20 rounded-xl transition-colors">Guardar</button>
              </div>
            }
          >
            <form id="archivo-form" onSubmit={handleSaveArchivo} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] md:text-xs font-semibold text-slate-500 mb-1">Nombre / Extensión</label>
                <TextInput
                  type="text"
                  required
                  autoFocus
                  value={archivoForm.tipo_archivo}
                  onChange={(e) => setArchivoForm({...archivoForm, tipo_archivo: e.target.value})}
                  className="uppercase"
                  placeholder="Ej. RADIOGRAFIA_PANORAMICA o PDF"
                />
              </div>
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>

      {/* Modal CIE-10 */}
      <AnimatePresence>
        {isCie10ModalOpen && (
          <ResponsiveSheet
            onClose={() => setIsCie10ModalOpen(false)}
            title={`${cie10Form.codigo_antiguo ? "Editar" : "Nuevo"} Código CIE-10`}
            size="sm"
            footer={
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsCie10ModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg text-[13px] md:text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="cie10-form" className="px-4 py-2 font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg text-[13px] md:text-sm shadow-sm transition-colors flex items-center gap-2">
                  <Icon name="save" size={16} /> Guardar
                </button>
              </div>
            }
          >
            <form id="cie10-form" onSubmit={handleSaveCie10} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] md:text-xs font-semibold text-slate-700 mb-1">Código</label>
                <TextInput
                  type="text"
                  required
                  placeholder="Ej. K02.1"
                  className="uppercase"
                  value={cie10Form.codigo}
                  onChange={(e) => setCie10Form({...cie10Form, codigo: e.target.value.toUpperCase()})}
                />
              </div>

              <div>
                <label className="block text-[11px] md:text-xs font-semibold text-slate-700 mb-1">Descripción</label>
                <Textarea
                  required
                  rows={3}
                  className="resize-none"
                  value={cie10Form.descripcion}
                  onChange={(e) => setCie10Form({...cie10Form, descripcion: e.target.value})}
                />
              </div>
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>
      {/* MODAL ROL */}
      <AnimatePresence>
        {isRolModalOpen && (
          <ResponsiveSheet
            onClose={() => setIsRolModalOpen(false)}
            title={rolForm.id ? "Editar Rol" : "Nuevo Rol"}
            size="sm"
            footer={
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsRolModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg text-[13px] md:text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="rol-form" className="px-4 py-2 font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg text-[13px] md:text-sm shadow-sm transition-colors flex items-center gap-2">
                  <Icon name="save" size={16} /> Guardar
                </button>
              </div>
            }
          >
            <form id="rol-form" onSubmit={handleSaveRol} className="flex flex-col gap-5">
              <div>
                <label className="block text-[11px] md:text-xs font-semibold text-slate-700 mb-1">Nombre del Rol</label>
                <TextInput
                  type="text"
                  required
                  autoFocus
                  value={rolForm.rol}
                  onChange={(e) => setRolForm({...rolForm, rol: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[11px] md:text-xs font-semibold text-slate-700 mb-1">Descripción</label>
                <Textarea
                  rows={3}
                  className="resize-none"
                  value={rolForm.descripcion}
                  onChange={(e) => setRolForm({...rolForm, descripcion: e.target.value})}
                />
              </div>
              <Checkbox
                checked={rolForm.estado}
                onChange={() => setRolForm({...rolForm, estado: !rolForm.estado})}
                label="Activo (Visible en el sistema)"
              />
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>

      {/* MODAL PUESTO */}
      <AnimatePresence>
        {isPuestoModalOpen && (
          <ResponsiveSheet
            onClose={() => setIsPuestoModalOpen(false)}
            title={puestoForm.id ? "Editar Puesto" : "Nuevo Puesto"}
            size="sm"
            footer={
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsPuestoModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg text-[13px] md:text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="puesto-form" className="px-4 py-2 font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg text-[13px] md:text-sm shadow-sm transition-colors flex items-center gap-2">
                  <Icon name="save" size={16} /> Guardar
                </button>
              </div>
            }
          >
            <form id="puesto-form" onSubmit={handleSavePuesto} className="flex flex-col gap-5">
              <div>
                <label className="block text-[11px] md:text-xs font-semibold text-slate-700 mb-1">Nombre del Puesto</label>
                <TextInput
                  type="text"
                  required
                  autoFocus
                  value={puestoForm.puesto}
                  onChange={(e) => setPuestoForm({...puestoForm, puesto: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[11px] md:text-xs font-semibold text-slate-700 mb-1">Descripción</label>
                <Textarea
                  rows={3}
                  className="resize-none"
                  value={puestoForm.descripcion}
                  onChange={(e) => setPuestoForm({...puestoForm, descripcion: e.target.value})}
                />
              </div>
              <Checkbox
                checked={puestoForm.estado}
                onChange={() => setPuestoForm({...puestoForm, estado: !puestoForm.estado})}
                label="Activo (Visible en el sistema)"
              />
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>

      {/* MODAL ESPECIALIDAD */}
      <AnimatePresence>
        {isEspecialidadModalOpen && (
          <ResponsiveSheet
            onClose={() => setIsEspecialidadModalOpen(false)}
            title={especialidadForm.id ? "Editar Especialidad" : "Nueva Especialidad"}
            size="sm"
            footer={
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsEspecialidadModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg text-[13px] md:text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="especialidad-form" className="px-4 py-2 font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg text-[13px] md:text-sm shadow-sm transition-colors flex items-center gap-2">
                  <Icon name="save" size={16} /> Guardar
                </button>
              </div>
            }
          >
            <form id="especialidad-form" onSubmit={handleSaveEspecialidad} className="flex flex-col gap-5">
              <div>
                <label className="block text-[11px] md:text-xs font-semibold text-slate-700 mb-1">Nombre de la Especialidad</label>
                <TextInput
                  type="text"
                  required
                  autoFocus
                  value={especialidadForm.especialidad}
                  onChange={(e) => setEspecialidadForm({...especialidadForm, especialidad: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[11px] md:text-xs font-semibold text-slate-700 mb-1">Descripción</label>
                <Textarea
                  rows={3}
                  className="resize-none"
                  value={especialidadForm.descripcion}
                  onChange={(e) => setEspecialidadForm({...especialidadForm, descripcion: e.target.value})}
                />
              </div>
              <Checkbox
                checked={especialidadForm.estado}
                onChange={() => setEspecialidadForm({...especialidadForm, estado: !especialidadForm.estado})}
                label="Activa (Visible en el sistema)"
              />
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>
    </div>
  );
}
