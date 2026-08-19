"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { useToast } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { getClientesPagoAction, saveClientePagoAction, deleteClientePagoAction } from "../contador.actions";

export default function ClientesPagoPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ id: "", nombre: "", apellidos: "", dni: "", pasaporte: "", carnet_extranjeria: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(clientes.length / pageSize));
  const paginatedData = clientes.slice((page - 1) * pageSize, page * pageSize);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getClientesPagoAction();
      setClientes(data);
      setPage(1);
    } catch (err) {
      toast.error("Error al cargar clientes de pago");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Eliminar Cliente",
      message: "¿Estás seguro de eliminar este cliente? Si ya tiene comprobantes asociados, no podrás eliminarlo.",
      confirmLabel: "Eliminar",
      danger: true
    });
    if (!ok) return;

    try {
      const res = await deleteClientePagoAction(id);
      if (res.success) {
        setClientes(c => c.filter(t => t.id !== id));
        toast.success("Cliente eliminado");
      } else {
        toast.error(res.error || "Error al eliminar (¿Tiene comprobantes asociados?)");
      }
    } catch (err: any) {
      toast.error("Error al eliminar");
    }
  }

  function openEdit(item: any) {
    setFormData({
      id: item.id,
      nombre: item.nombre,
      apellidos: item.apellidos || "",
      dni: item.dni || "",
      pasaporte: item.pasaporte || "",
      carnet_extranjeria: item.carnet_extranjeria || ""
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  }

  function openNew() {
    setFormData({ id: "", nombre: "", apellidos: "", dni: "", pasaporte: "", carnet_extranjeria: "" });
    setEditingId(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.dni && !formData.pasaporte && !formData.carnet_extranjeria) {
      toast.error("Debe ingresar al menos un documento de identidad (DNI, Pasaporte o CE).");
      return;
    }

    setIsSubmitting(true);
    const isEditing = Boolean(formData.id);
    try {
      const res = await saveClientePagoAction(formData.id ? formData : { ...formData, id: undefined });
      if (res.success) {
        setIsModalOpen(false);
        toast.success(isEditing ? "Cliente actualizado" : "Cliente creado");
        loadData();
      } else {
        toast.error(res.error || "Error al guardar (¿Documento duplicado?)");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Header title="Clientes de Pago" />
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center text-cyan-600 shrink-0">
              <Icon name="groups" size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] md:text-base font-bold text-slate-800">Clientes de Pago (Facturación)</h1>
              <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Personas o empresas a las que se emiten comprobantes.</p>
            </div>
          </div>
          <button onClick={openNew} className="shrink-0 bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 lg:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-[13px] md:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors">
            <Icon name="add" size={18} />
            <span className="hidden lg:inline">Nuevo Cliente</span>
          </button>
        </header>

        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        {!loading && clientes.length > 0 && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-100">
            <span className="text-[10px] md:text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, clientes.length)}</span> de <span className="font-semibold text-slate-700">{clientes.length}</span>
            </span>
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <Icon name="chevron_left" size={16} />
              </button>
              <span className="text-[12px] md:text-[13px] font-semibold text-slate-700">{page}/{totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          </div>
        )}
        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 600 }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Nombres / Razón Social</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Apellidos</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Documentos</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-3 w-40" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-3 w-32" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-3 w-24" /></td>
                    <td className="px-5 py-4 flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-8 w-8 rounded-lg" /></td>
                  </tr>
                ))
              ) : clientes.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-400">No hay clientes registrados.</td></tr>
              ) : (
                paginatedData.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-700">{t.nombre}</td>
                    <td className="px-5 py-4 text-slate-600">{t.apellidos || '-'}</td>
                    <td className="px-5 py-4 text-slate-500 font-mono text-[12px]">
                      {t.dni && <div>DNI: {t.dni}</div>}
                      {t.pasaporte && <div>PAS: {t.pasaporte}</div>}
                      {t.carnet_extranjeria && <div>CE: {t.carnet_extranjeria}</div>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(t)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 flex items-center justify-center">
                          <Icon name="edit" size={18} />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center">
                          <Icon name="delete" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 flex flex-col gap-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))
          ) : clientes.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-10">No hay clientes registrados.</p>
          ) : (
            paginatedData.map(t => (
              <div key={t.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-[14px] text-slate-700 truncate">{t.nombre} {t.apellidos}</p>
                    <div className="text-[12px] text-slate-500 font-mono mt-0.5 space-y-0.5">
                      {t.dni && <div>DNI: {t.dni}</div>}
                      {t.pasaporte && <div>PAS: {t.pasaporte}</div>}
                      {t.carnet_extranjeria && <div>CE: {t.carnet_extranjeria}</div>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => openEdit(t)} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 flex items-center justify-center border border-slate-100">
                      <Icon name="edit" size={18} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center border border-slate-100">
                      <Icon name="delete" size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <ResponsiveSheet
            onClose={() => setIsModalOpen(false)}
            title={editingId ? "Editar Cliente" : "Nuevo Cliente"}
            footer={
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="cliente-form" disabled={isSubmitting} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold shadow-sm flex items-center gap-1.5 transition-colors">
                  <Icon name="save" size={16} /> {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            }
          >
            <form id="cliente-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Nombre(s) / Razón Social <span className="text-red-500">*</span></label>
                <input
                  type="text" required
                  value={formData.nombre} onChange={e => setFormData(p => ({...p, nombre: e.target.value}))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Apellidos</label>
                <input
                  type="text"
                  value={formData.apellidos} onChange={e => setFormData(p => ({...p, apellidos: e.target.value}))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Documentos (Ingresar al menos uno)</p>
                
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">DNI (u otro principal)</label>
                  <input
                    type="text"
                    value={formData.dni} onChange={e => setFormData(p => ({...p, dni: e.target.value}))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Pasaporte</label>
                  <input
                    type="text"
                    value={formData.pasaporte} onChange={e => setFormData(p => ({...p, pasaporte: e.target.value}))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Carnet Extranjería</label>
                  <input
                    type="text"
                    value={formData.carnet_extranjeria} onChange={e => setFormData(p => ({...p, carnet_extranjeria: e.target.value}))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>
              </div>
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
