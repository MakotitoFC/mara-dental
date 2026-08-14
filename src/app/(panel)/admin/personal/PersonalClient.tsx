"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { createEmpleadoAction, editEmpleadoAction, softDeleteEmpleadoAction, toggleEmpleadoEstadoAction } from "./personal.actions";
import { AnimatePresence } from "framer-motion";

export default function PersonalClient({
  initialData,
  initialCount,
  totalPages,
  currentPage,
  especialidades,
  puestos,
  sedes,
  roles,
  userRole,
  userSedeId,
}: {
  initialData: any[];
  initialCount: number;
  totalPages: number;
  currentPage: number;
  especialidades: any[];
  puestos: any[];
  sedes: any[];
  roles: any[];
  userRole: string;
  userSedeId: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRol, setSelectedRol] = useState("1");
  const [isActivo, setIsActivo] = useState(true);
  const [selectedSede, setSelectedSede] = useState("");
  const [selectedPuesto, setSelectedPuesto] = useState("");
  const [selectedEspecialidad, setSelectedEspecialidad] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = ["sedeId", "rolId", "especialidadId", "puestoId"].filter((k) => searchParams.get(k)).length;

  // Filtros
  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilter("search", searchQuery);
  };

  // Botón "Limpiar filtros" — a diferencia de limpiar automáticamente al
  // buscar (que arrastraba conflictos con Auditoría, donde el fetch se
  // dispara solo al cambiar los selects), esto es explícito: el usuario
  // decide cuándo resetear.
  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("rolId");
    params.delete("especialidadId");
    params.delete("puestoId");
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const openModal = (personal: any = null) => {
    setEditingPersonal(personal);
    setSelectedRol(personal ? personal.usuarios?.rol_id?.toString() : "1");
    setIsActivo(personal ? Boolean(personal.usuarios?.activo) : true);
    setSelectedSede("");
    setSelectedPuesto(personal?.puesto?.id ? String(personal.puesto.id) : "");
    setSelectedEspecialidad(personal?.especialidad?.id ? String(personal.especialidad.id) : "");
    setFechaNacimiento(personal?.fecha_nacimiento || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingPersonal(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // sede_id/puesto_id eran <select required> nativos — al pasar a nuestro
    // componente Select (no participa en FormData/validación HTML5 por sí
    // solo) esa validación había que reponerla a mano.
    if (!editingPersonal && userRole === "superadmin" && !selectedSede) {
      toast.error("Selecciona una sede de asignación");
      return;
    }
    if (!selectedPuesto) {
      toast.error("Selecciona un puesto");
      return;
    }
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      if (editingPersonal) {
        await editEmpleadoAction(editingPersonal.usuario_id, formData);
        toast.success("Personal actualizado correctamente");
      } else {
        await createEmpleadoAction(formData);
        toast.success("Personal creado con éxito");
      }
      closeModal();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEstado = async (usuarioId: string, currentActivo: boolean) => {
    const nuevoEstado = !currentActivo;
    const accionText = nuevoEstado ? "activar" : "desactivar";
    const ok = await confirm({
      title: `${nuevoEstado ? "Activar" : "Desactivar"} empleado`,
      message: `¿Estás seguro de ${accionText} a este empleado?${nuevoEstado ? " Podrá volver a ingresar al sistema." : " Su sesión se cerrará de inmediato si está activa."}`,
      confirmLabel: nuevoEstado ? "Activar" : "Desactivar",
    });
    if (!ok) return;

    try {
      await toggleEmpleadoEstadoAction(usuarioId, nuevoEstado);
      toast.success(`Empleado ${nuevoEstado ? "activado" : "desactivado"} correctamente`);
      router.refresh();
    } catch (err: any) {
      toast.error(`Error al ${accionText} el empleado`);
    }
  };

  const handleDelete = async (usuarioId: string) => {
    const ok = await confirm({
      title: "Eliminar personal",
      message: "¿Estás seguro que deseas eliminar a este empleado? Esta acción no eliminará su historial, solo lo desactivará.",
      requireText: "ELIMINAR",
      confirmLabel: "Desactivar empleado",
    });
    if (!ok) return;

    try {
      await softDeleteEmpleadoAction(usuarioId);
      toast.success("Empleado desactivado correctamente");
      router.refresh();
    } catch (err: any) {
      toast.error("Error al eliminar");
    }
  };

  const filterFields = [
    ...(userRole === "superadmin"
      ? [{
          key: "sede",
          value: searchParams.get("sedeId") || "",
          onChange: (v: string) => handleFilter("sedeId", v),
          placeholder: "Tu sede (por defecto)",
          options: sedes.map((s) => ({ value: String(s.id), label: `Sede: ${s.nombre_clinica}` })),
        }]
      : []),
    {
      key: "rol",
      value: searchParams.get("rolId") || "",
      onChange: (v: string) => handleFilter("rolId", v),
      placeholder: "Todos los Roles",
      options: roles.map((r) => ({ value: String(r.id), label: r.rol })),
    },
    {
      key: "especialidad",
      value: searchParams.get("especialidadId") || "",
      onChange: (v: string) => handleFilter("especialidadId", v),
      placeholder: "Todas las Especialidades",
      options: especialidades.map((e) => ({ value: String(e.id), label: e.especialidad })),
    },
    {
      key: "puesto",
      value: searchParams.get("puestoId") || "",
      onChange: (v: string) => handleFilter("puestoId", v),
      placeholder: "Todos los Puestos",
      options: puestos.map((p) => ({ value: String(p.id), label: p.puesto })),
    },
  ];

  // Grilla apilable — usada en el panel colapsable de tablet/mobile.
  const filtrosSelects = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {filterFields.map((f) => (
        <Select key={f.key} value={f.value} onChange={f.onChange} placeholder={f.placeholder} options={f.options} />
      ))}
    </div>
  );

  // Fila inline — usada junto a la búsqueda en desktop (lg+), donde los
  // selectores "suben" a la misma fila en vez de ir apilados debajo.
  const filtrosSelectsInline = (
    <div className="flex items-center gap-2 w-full">
      {filterFields.map((f) => (
        <Select key={f.key} value={f.value} onChange={f.onChange} placeholder={f.placeholder} options={f.options} className="flex-1 min-w-0" />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
      {/* Mismo esqueleto que ConfiguracionTiposClient.tsx: <header> fijo
          (bg-white, solo border-b, sin rounded ni sombra) con título,
          botón y filtros — nada de esto scrollea. La tabla vive en su
          propia card dentro de <main>, que sí scrollea. */}
      <header className="shrink-0 flex flex-col gap-4 px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* En mobile solo el título — ícono y descripción se ocultan. */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center text-cyan-600 shrink-0">
              <Icon name="badge" size={24} />
            </div>
            <div>
              <h1 className="text-[15px] md:text-base font-bold text-slate-800">Personal</h1>
              <p className="hidden sm:block text-[13px] md:text-sm text-slate-500 mt-1">Administra el personal de la sede</p>
            </div>
          </div>
          <button
            onClick={() => openModal()}
            className="shrink-0 flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white h-9 sm:h-10 px-2.5 lg:px-4 rounded-lg text-[13px] md:text-sm font-semibold shadow-sm transition-colors"
          >
            <Icon name="add" size={18} />
            <span className="hidden lg:inline">Nuevo Personal</span>
          </button>
        </div>

        {/* Búsqueda + filtros. En lg+ los filtros se ven siempre; por
            debajo, quedan colapsados detrás del ícono de filtro para no
            amontonar selects en pantallas angostas. */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex-1 lg:flex-none lg:w-56 min-w-0 flex items-center relative">
              <Icon name="search" size={18} className="absolute left-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o apellido..."
                className="w-full h-9 sm:h-10 pl-10 pr-4 border border-slate-200 rounded-lg text-[13px] md:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button type="submit" className="hidden" />
            </form>

            {/* Selectores "suben" a la misma fila que la búsqueda en desktop */}
            <div className="hidden lg:flex flex-1 min-w-0">
              {filtrosSelectsInline}
            </div>

            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={`lg:hidden relative shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center transition-colors ${
                filtersOpen ? "bg-cyan-50 border-cyan-300 text-cyan-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
              title="Filtros"
            >
              <Icon name="filter_lines" size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-cyan-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={handleClearFilters}
              title="Limpiar filtros"
              className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 flex items-center justify-center transition-colors"
            >
              <Icon name="eraser" size={18} />
            </button>
          </div>

          <div className={`lg:hidden ${filtersOpen ? "block" : "hidden"}`}>
            {filtrosSelects}
          </div>
        </div>
      </header>

      {/* Sin padding ni card propia: el <main> continúa el mismo fondo
          blanco del <header>, así se ven como un solo bloque. */}
      <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        {/* Paginación arriba de la tabla (antes iba abajo, después de las
            filas) — mismos datos reales que ya se usaban abajo. Se muestra
            siempre que haya al menos un registro, aunque quepan todos en
            una sola página (flechas quedan deshabilitadas). */}
        {initialCount > 0 && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-100">
            <span className="text-[10px] md:text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">{(currentPage - 1) * 5 + 1}–{Math.min(currentPage * 5, initialCount)}</span> de <span className="font-semibold text-slate-700">{initialCount}</span> registros
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_left" size={16} />
              </button>
              <span className="text-[12px] md:text-[13px] font-semibold text-slate-700">{currentPage}/{totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Lista — tabla en desktop (md+), tarjetas en mobile/tablet: una
            tabla de 6 columnas no cabía en esos anchos ni con scroll
            horizontal. */}
        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-[13px] md:text-sm whitespace-nowrap" style={{ minWidth: 720 }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Empleado</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Contacto</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Rol / Puesto</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Colegiatura</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Ingreso</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialData.map((p) => (
                <tr key={p.usuario_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{p.nombre} {p.apellido}</div>
                    <div className="text-[10px] md:text-[11px] text-slate-500">{p.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-700">{p.telefono || "-"}</div>
                    {p.fecha_nacimiento && <div className="text-[10px] md:text-[11px] text-slate-500">Nac: {p.fecha_nacimiento}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] md:text-[11px] font-semibold ${
                        !p.usuarios?.activo ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {p.usuarios?.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] md:text-[11px] font-semibold bg-indigo-50 text-indigo-700 uppercase">
                        {p.usuarios?.rol?.rol || "Usuario"}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-medium bg-cyan-50 text-cyan-700 mb-1">
                      {p.puesto?.puesto || "Sin puesto"}
                    </div>
                    {p.especialidad && (
                      <div className="text-[10px] md:text-[11px] text-slate-500 flex items-center gap-1">
                        <Icon name="medical_services" size={12} /> {p.especialidad.especialidad}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {p.num_colegiatura || "-"}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-[10px] md:text-[11px]">
                    {new Date(p.created_at).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric"
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleEstado(p.usuario_id, Boolean(p.usuarios?.activo))}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                          p.usuarios?.activo
                            ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                            : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                        }`}
                        title={p.usuarios?.activo ? "Desactivar empleado" : "Activar empleado"}
                      >
                        <Icon name={p.usuarios?.activo ? "block" : "check_circle"} size={16} />
                      </button>
                      <button
                        onClick={() => openModal(p)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                        title="Editar"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.usuario_id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {initialData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[13px] md:text-sm text-slate-500">
                    No se encontró personal con los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet — tarjetas. pb extra para despejar el BottomNav
            (fixed, se dibuja encima del contenido). */}
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar divide-y divide-slate-100">
          {initialData.length === 0 ? (
            <p className="text-center text-[13px] md:text-sm text-slate-500 py-12">No se encontró personal con los filtros seleccionados</p>
          ) : (
            initialData.map((p) => (
              <div key={p.usuario_id} className="p-4 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Empleado</span>
                    <p className="font-semibold text-[13px] md:text-sm text-slate-800 truncate">{p.nombre} {p.apellido}</p>
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-1.5">Contacto</span>
                    <p className="text-[10px] md:text-[11px] text-slate-500 truncate">{p.email}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleEstado(p.usuario_id, Boolean(p.usuarios?.activo))}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                        p.usuarios?.activo
                          ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                          : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                      }`}
                      title={p.usuarios?.activo ? "Desactivar empleado" : "Activar empleado"}
                    >
                      <Icon name={p.usuarios?.activo ? "block" : "check_circle"} size={16} />
                    </button>
                    <button
                      onClick={() => openModal(p)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                      title="Editar"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.usuario_id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </div>

                <div>
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Rol / Puesto</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] md:text-[11px] font-semibold ${
                    !p.usuarios?.activo ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {p.usuarios?.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] md:text-[11px] font-semibold bg-indigo-50 text-indigo-700 uppercase">
                    {p.usuarios?.rol?.rol || "Usuario"}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] md:text-[11px] font-medium bg-cyan-50 text-cyan-700">
                    {p.puesto?.puesto || "Sin puesto"}
                  </span>
                  {p.especialidad && (
                    <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-slate-500">
                      <Icon name="medical_services" size={12} /> {p.especialidad.especialidad}
                    </span>
                  )}
                </div>
                </div>

                <div className="flex items-center justify-between text-[10px] md:text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                  <span>{p.telefono || "Sin teléfono"}{p.num_colegiatura ? ` · Col. ${p.num_colegiatura}` : ""}</span>
                  <span>
                    Ingreso: {new Date(p.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal Añadir/Editar */}
      <AnimatePresence>
        {isModalOpen && (
          <ResponsiveSheet
            onClose={closeModal}
            title={editingPersonal ? "Editar Empleado" : "Nuevo Empleado"}
            maxWidthDesktop="580px"
            footer={
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-[13px] font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="personal-form" disabled={isSubmitting} className="px-6 py-2 bg-cyan-600 text-white text-[13px] font-semibold rounded-xl hover:bg-cyan-700 disabled:opacity-50 transition-colors">
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            }
          >
            <form id="personal-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Los 4 pares grid-cols-2 de este form estaban sin guard —
                      en mobile cada input quedaba a ~150-160px. */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Nombre</label>
                      <input name="nombre" defaultValue={editingPersonal?.nombre} required className="w-full h-9 sm:h-10 border border-slate-200 rounded-lg px-3 text-[16px] sm:text-[13px] focus:ring-2 focus:ring-cyan-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Apellido</label>
                      <input name="apellido" defaultValue={editingPersonal?.apellido} required className="w-full h-9 sm:h-10 border border-slate-200 rounded-lg px-3 text-[16px] sm:text-[13px] focus:ring-2 focus:ring-cyan-500 outline-none" />
                    </div>
                  </div>

                  {!editingPersonal && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input name="email" type="email" required className="w-full h-9 sm:h-10 border border-slate-200 rounded-lg px-3 text-[16px] sm:text-[13px] focus:ring-2 focus:ring-cyan-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                        <input name="password" type="password" required className="w-full h-9 sm:h-10 border border-slate-200 rounded-lg px-3 text-[16px] sm:text-[13px] focus:ring-2 focus:ring-cyan-500 outline-none" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                      <input name="telefono" defaultValue={editingPersonal?.telefono} className="w-full h-9 sm:h-10 border border-slate-200 rounded-lg px-3 text-[16px] sm:text-[13px] focus:ring-2 focus:ring-cyan-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Fecha Nacimiento</label>
                      <input type="hidden" name="fecha_nacimiento" value={fechaNacimiento} />
                      <DatePicker value={fechaNacimiento} onChange={setFechaNacimiento} />
                    </div>
                  </div>

                  {!editingPersonal && userRole === "superadmin" && (
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Sede de Asignación</label>
                      <input type="hidden" name="sede_id" value={selectedSede} />
                      <Select
                        value={selectedSede}
                        onChange={setSelectedSede}
                        placeholder="Seleccione una sede..."
                        options={sedes.map((s) => ({ value: String(s.id), label: s.nombre_clinica }))}
                      />
                    </div>
                  )}

                  {!editingPersonal && (
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Rol de Acceso en Sistema</label>
                      <input type="hidden" name="rol_id" value={selectedRol} />
                      <Select
                        value={selectedRol}
                        onChange={setSelectedRol}
                        options={[
                          { value: "1", label: "Doctor" },
                          { value: "4", label: "Asistente" },
                          ...(userRole === "superadmin" ? [{ value: "2", label: "Administrador" }] : []),
                        ]}
                      />
                    </div>
                  )}

                  {editingPersonal && (
                    <div className="flex items-center gap-3">
                      <label className="text-[13px] font-semibold text-slate-700">Estado del Empleado:</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="hidden" name="activo" value={isActivo ? "true" : "false"} />
                        <input
                          type="checkbox"
                          checked={isActivo}
                          onChange={(e) => setIsActivo(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        <span className={`ml-2.5 text-[12.5px] font-medium ${isActivo ? "text-emerald-600" : "text-red-500"}`}>
                          {isActivo ? "Activo en el sistema" : "Inactivo / Desactivado"}
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Puesto</label>
                      <input type="hidden" name="puesto_id" value={selectedPuesto} />
                      <Select
                        value={selectedPuesto}
                        onChange={setSelectedPuesto}
                        placeholder="Seleccione..."
                        options={puestos.map((p) => ({ value: String(p.id), label: p.puesto }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Especialidad (Opcional)</label>
                      <input type="hidden" name="especialidad_id" value={selectedEspecialidad} />
                      <Select
                        value={selectedEspecialidad}
                        onChange={setSelectedEspecialidad}
                        placeholder="Ninguna"
                        options={especialidades.map((e) => ({ value: String(e.id), label: e.especialidad }))}
                      />
                    </div>
                  </div>

                  {selectedRol === "1" && (
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">N° Colegiatura (Opcional)</label>
                      <input name="num_colegiatura" defaultValue={editingPersonal?.num_colegiatura} className="w-full h-9 sm:h-10 border border-slate-200 rounded-lg px-3 text-[16px] sm:text-[13px] focus:ring-2 focus:ring-cyan-500 outline-none" />
                    </div>
                  )}
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>
    </div>
  );
}
