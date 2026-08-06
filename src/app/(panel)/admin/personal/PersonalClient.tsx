"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { createEmpleadoAction, editEmpleadoAction, softDeleteEmpleadoAction } from "./personal.actions";
import { AnimatePresence, motion } from "framer-motion";

export default function PersonalClient({
  initialData,
  initialCount,
  totalPages,
  currentPage,
  especialidades,
  puestos,
  sedes,
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

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const openModal = (personal: any = null) => {
    setEditingPersonal(personal);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingPersonal(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      if (editingPersonal) {
        await editEmpleadoAction(editingPersonal.usuario_id, formData);
        toast.success("Personal actualizado");
      } else {
        await createEmpleadoAction(formData);
        toast.success("Personal creado con éxito");
      }
      closeModal();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setIsSubmitting(false);
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
      toast.success("Empleado eliminado");
    } catch (err: any) {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros y Botón */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center relative">
          <Icon name="search" size={18} className="absolute left-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o apellido..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button type="submit" className="hidden" />
        </form>

        <div className="flex gap-2 flex-wrap items-center">
          {userRole === "superadmin" && (
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white min-w-[150px]"
              value={searchParams.get("sedeId") || ""}
              onChange={(e) => handleFilter("sedeId", e.target.value)}
            >
              <option value="">Tu sede (por defecto)</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>Sede: {s.nombre_clinica}</option>
              ))}
            </select>
          )}

          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white"
            value={searchParams.get("especialidadId") || ""}
            onChange={(e) => handleFilter("especialidadId", e.target.value)}
          >
            <option value="">Todas las Especialidades</option>
            {especialidades.map((e) => (
              <option key={e.id} value={e.id}>{e.especialidad}</option>
            ))}
          </select>

          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white"
            value={searchParams.get("puestoId") || ""}
            onChange={(e) => handleFilter("puestoId", e.target.value)}
          >
            <option value="">Todos los Puestos</option>
            {puestos.map((p) => (
              <option key={p.id} value={p.id}>{p.puesto}</option>
            ))}
          </select>

          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Icon name="add" size={18} />
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Lista / Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Rol / Puesto</th>
                <th className="px-6 py-4">Colegiatura</th>
                <th className="px-6 py-4">Ingreso</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialData.map((p) => (
                <tr key={p.usuario_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{p.nombre} {p.apellido}</div>
                    <div className="text-xs text-slate-500">{p.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-700">{p.telefono || "-"}</div>
                    {p.fecha_nacimiento && <div className="text-xs text-slate-500">Nac: {p.fecha_nacimiento}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 mb-1">
                      {p.puesto?.puesto || "Sin puesto"}
                    </div>
                    {p.especialidad && (
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Icon name="medical_services" size={12} /> {p.especialidad.especialidad}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {p.num_colegiatura || "-"}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(p.created_at).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric"
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
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
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No se encontró personal con los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50">
            <span className="text-sm text-slate-500">
              Página {currentPage} de {totalPages} ({initialCount} total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-3 py-1 text-sm bg-white border border-slate-200 rounded-md disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-3 py-1 text-sm bg-white border border-slate-200 rounded-md disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Añadir/Editar */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-bold text-slate-800">
                  {editingPersonal ? "Editar Empleado" : "Nuevo Empleado"}
                </h3>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                  <Icon name="close" size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                      <input name="nombre" defaultValue={editingPersonal?.nombre} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
                      <input name="apellido" defaultValue={editingPersonal?.apellido} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none" />
                    </div>
                  </div>

                  {!editingPersonal && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input name="email" type="email" required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                        <input name="password" type="password" required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                      <input name="telefono" defaultValue={editingPersonal?.telefono} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Nacimiento</label>
                      <input name="fecha_nacimiento" type="date" defaultValue={editingPersonal?.fecha_nacimiento} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none" />
                    </div>
                  </div>

                  {!editingPersonal && userRole === "superadmin" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Sede de Asignación</label>
                      <select name="sede_id" required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none">
                        <option value="">Seleccione una sede...</option>
                        {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre_clinica}</option>)}
                      </select>
                    </div>
                  )}

                  {!editingPersonal && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Rol de Acceso en Sistema</label>
                      <select name="rol_id" required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none">
                        <option value="1">Doctor</option>
                        <option value="4">Asistente</option>
                        {userRole === "superadmin" && <option value="2">Administrador</option>}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Puesto</label>
                      <select name="puesto_id" defaultValue={editingPersonal?.puesto?.id} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none">
                        <option value="">Seleccione...</option>
                        {puestos.map((p) => <option key={p.id} value={p.id}>{p.puesto}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Especialidad (Opcional)</label>
                      <select name="especialidad_id" defaultValue={editingPersonal?.especialidad?.id || ""} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none">
                        <option value="">Ninguna</option>
                        {especialidades.map((e) => <option key={e.id} value={e.id}>{e.especialidad}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">N° Colegiatura (Opcional)</label>
                    <input name="num_colegiatura" defaultValue={editingPersonal?.num_colegiatura} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none" />
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50 rounded-b-2xl">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors">
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
