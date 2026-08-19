"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { useToast } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCategoriasAction, saveCategoriaAction, toggleCategoriaActivoAction } from "../contador.actions";

export default function CategoriasPage() {
  const toast = useToast();
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ id: 0, nombre: "", tipo: "I", descripcion: "", activo: true, afecto_igv: false, cuenta_contable: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(categorias.length / pageSize));
  const paginatedData = categorias.slice((page - 1) * pageSize, page * pageSize);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getCategoriasAction();
      setCategorias(data);
      setPage(1);
    } catch (err) {
      toast.error("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function toggleActivo(id: number, currentStatus: boolean) {
    const nextStatus = !currentStatus;
    try {
      const res = await toggleCategoriaActivoAction(id, nextStatus);
      if (res.success) {
        setCategorias(c => c.map(t => t.id === id ? { ...t, activo: nextStatus } : t));
        toast.success(nextStatus ? "Categoría activada" : "Categoría desactivada");
      } else {
        toast.error(res.error || "Error al cambiar estado");
      }
    } catch (err: any) {
      toast.error("Error al cambiar estado");
    }
  }

  function openEdit(item: any) {
    setFormData({
      id: item.id,
      nombre: item.nombre,
      tipo: item.tipo,
      descripcion: item.descripcion || "",
      activo: item.activo,
      afecto_igv: item.afecto_igv || false,
      cuenta_contable: item.cuenta_contable || ""
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  }

  function openNew() {
    setFormData({ id: 0, nombre: "", tipo: "I", descripcion: "", activo: true, afecto_igv: false, cuenta_contable: "" });
    setEditingId(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const isEditing = Boolean(formData.id);
    try {
      const res = await saveCategoriaAction(formData.id ? formData : { ...formData, id: undefined });
      if (res.success) {
        setIsModalOpen(false);
        toast.success(isEditing ? "Categoría actualizada" : "Categoría creada");
        loadData();
      } else {
        toast.error(res.error || "Error al guardar");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Header title="Categorías" />
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center text-cyan-600 shrink-0">
              <Icon name="category" size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] md:text-base font-bold text-slate-800">Plan de Cuentas (Categorías)</h1>
              <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Clasifica los ingresos y egresos de la clínica.</p>
            </div>
          </div>
          <button onClick={openNew} className="shrink-0 bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 lg:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-[13px] md:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors">
            <Icon name="add" size={18} />
            <span className="hidden lg:inline">Nueva Categoría</span>
          </button>
        </header>

        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        {!loading && categorias.length > 0 && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-100">
            <span className="text-[10px] md:text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, categorias.length)}</span> de <span className="font-semibold text-slate-700">{categorias.length}</span>
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
          <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 700 }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Categoría</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-center">Tipo</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-center">Afecto a IGV</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Cuenta Contable</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-center">Estado</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-3 w-32" /></td>
                    <td className="px-5 py-4 text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></td>
                    <td className="px-5 py-4 text-center"><Skeleton className="h-5 w-10 mx-auto rounded-full" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-3 w-20" /></td>
                    <td className="px-5 py-4 text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></td>
                    <td className="px-5 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : categorias.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">No hay categorías registradas.</td></tr>
              ) : (
                paginatedData.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-700">{t.nombre}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${t.tipo === 'I' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {t.tipo === 'I' ? 'INGRESO' : 'EGRESO'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {t.afecto_igv ? <span className="text-cyan-600 font-bold">Sí</span> : <span className="text-slate-400">No</span>}
                    </td>
                    <td className="px-5 py-4 text-slate-500 font-mono text-[12px]">{t.cuenta_contable || '-'}</td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => toggleActivo(t.id, t.activo)}
                        className={`px-3 py-1 text-[10px] md:text-[11px] font-bold rounded-full transition-colors ${t.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {t.activo ? 'ACTIVO' : 'INACTIVO'}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openEdit(t)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors inline-flex items-center justify-center">
                        <Icon name="edit" size={18} />
                      </button>
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
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          ) : categorias.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-10">No hay categorías registradas.</p>
          ) : (
            paginatedData.map(t => (
              <div key={t.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-[13px] text-slate-700 truncate">{t.nombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${t.tipo === 'I' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {t.tipo === 'I' ? 'INGRESO' : 'EGRESO'}
                      </span>
                      {t.afecto_igv && <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-100 text-cyan-700">IGV</span>}
                    </div>
                  </div>
                  <button onClick={() => openEdit(t)} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 flex items-center justify-center">
                    <Icon name="edit" size={18} />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-1">
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Cuenta</span>
                    <span className="font-mono text-[12px] text-slate-600">{t.cuenta_contable || '-'}</span>
                  </div>
                  <div className="text-right">
                    <button
                      onClick={() => toggleActivo(t.id, t.activo)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-full ${t.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {t.activo ? 'ACTIVO' : 'INACTIVO'}
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
            title={editingId ? "Editar Categoría" : "Nueva Categoría"}
            footer={
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="categoria-form" disabled={isSubmitting} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold shadow-sm flex items-center gap-1.5 transition-colors">
                  <Icon name="save" size={16} /> {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            }
          >
            <form id="categoria-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                <input
                  type="text" required
                  value={formData.nombre} onChange={e => setFormData(p => ({...p, nombre: e.target.value}))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Tipo <span className="text-red-500">*</span></label>
                  <Select
                    value={formData.tipo}
                    onChange={(v) => setFormData(p => ({...p, tipo: v}))}
                    options={[
                      { value: "I", label: "Ingreso" },
                      { value: "E", label: "Egreso" },
                    ]}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Cuenta Contable</label>
                  <input
                    type="text"
                    value={formData.cuenta_contable} onChange={e => setFormData(p => ({...p, cuenta_contable: e.target.value}))}
                    placeholder="Ej. 70.1.1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  value={formData.descripcion} onChange={e => setFormData(p => ({...p, descripcion: e.target.value}))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors resize-none h-16"
                />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, afecto_igv: !p.afecto_igv }))}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    formData.afecto_igv ? "bg-cyan-600 border-cyan-600" : "border-slate-300"
                  }`}>
                    {formData.afecto_igv && <Icon name="check" size={13} className="text-white" />}
                  </span>
                  <div>
                    <span className="block text-[13px] text-slate-700 font-medium">Afecto a IGV</span>
                    <span className="block text-[11px] text-slate-500">Marcar si esta categoría tributa IGV.</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, activo: !p.activo }))}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    formData.activo ? "bg-cyan-600 border-cyan-600" : "border-slate-300"
                  }`}>
                    {formData.activo && <Icon name="check" size={13} className="text-white" />}
                  </span>
                  <span className="text-[13px] text-slate-700 font-medium">Categoría Activa</span>
                </button>
              </div>
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
