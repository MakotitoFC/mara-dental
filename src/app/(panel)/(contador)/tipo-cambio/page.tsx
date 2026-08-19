"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { useToast } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { getTipoCambioAction, saveTipoCambioAction, deleteTipoCambioAction } from "../contador.actions";
import { format } from "date-fns";

export default function TipoCambioPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [tiposCambio, setTiposCambio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ id: 0, fecha: "", compra: 0, venta: 0, fuente: "SBS" });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(tiposCambio.length / pageSize));
  const paginatedData = tiposCambio.slice((page - 1) * pageSize, page * pageSize);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getTipoCambioAction();
      setTiposCambio(data);
      setPage(1);
    } catch (err) {
      toast.error("Error al cargar tipos de cambio");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDelete(id: number) {
    const ok = await confirm({
      title: "Eliminar Tipo de Cambio",
      message: "¿Estás seguro de eliminar este registro? Esto podría afectar reportes generados previamente si se basaban en este día.",
      confirmLabel: "Eliminar",
      danger: true
    });
    if (!ok) return;

    try {
      const res = await deleteTipoCambioAction(id);
      if (res.success) {
        setTiposCambio(c => c.filter(t => t.id !== id));
        toast.success("Tipo de cambio eliminado");
      } else {
        toast.error(res.error || "Error al eliminar");
      }
    } catch (err: any) {
      toast.error("Error al eliminar");
    }
  }

  function openEdit(item: any) {
    setFormData({
      id: item.id,
      fecha: item.fecha,
      compra: item.compra,
      venta: item.venta,
      fuente: item.fuente || "SBS"
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  }

  function openNew() {
    setFormData({ id: 0, fecha: format(new Date(), 'yyyy-MM-dd'), compra: 0, venta: 0, fuente: "SBS" });
    setEditingId(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const isEditing = Boolean(formData.id);
    try {
      const res = await saveTipoCambioAction(formData.id ? formData : { ...formData, id: undefined });
      if (res.success) {
        setIsModalOpen(false);
        toast.success(isEditing ? "Registro actualizado" : "Registro creado");
        loadData();
      } else {
        toast.error(res.error || "Error al guardar (¿fecha duplicada?)");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Header title="Tipo de Cambio" />
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center text-cyan-600 shrink-0">
              <Icon name="currency_exchange" size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] md:text-base font-bold text-slate-800">Tipo de Cambio Diario</h1>
              <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Registra el TC de la SBS para consolidar comprobantes en dólares.</p>
            </div>
          </div>
          <button onClick={openNew} className="shrink-0 bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 lg:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-[13px] md:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors">
            <Icon name="add" size={18} />
            <span className="hidden lg:inline">Registrar TC</span>
          </button>
        </header>

        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        {!loading && tiposCambio.length > 0 && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-100">
            <span className="text-[10px] md:text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, tiposCambio.length)}</span> de <span className="font-semibold text-slate-700">{tiposCambio.length}</span>
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
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Fecha</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Compra</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Venta</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-center">Fuente</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-5 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-5 py-4 text-center"><Skeleton className="h-5 w-12 mx-auto rounded-full" /></td>
                    <td className="px-5 py-4 flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-8 w-8 rounded-lg" /></td>
                  </tr>
                ))
              ) : tiposCambio.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">No hay registros de tipo de cambio.</td></tr>
              ) : (
                paginatedData.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-700">{format(new Date(t.fecha + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                    <td className="px-5 py-4 text-right text-emerald-600 font-mono font-bold">{Number(t.compra).toFixed(3)}</td>
                    <td className="px-5 py-4 text-right text-rose-600 font-mono font-bold">{Number(t.venta).toFixed(3)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 uppercase">{t.fuente}</span>
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
              <div key={i} className="p-4 flex flex-col gap-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-full" /></div>
            ))
          ) : tiposCambio.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-10">No hay registros de tipo de cambio.</p>
          ) : (
            paginatedData.map(t => (
              <div key={t.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[14px] text-slate-800">{format(new Date(t.fecha + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(t)} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 flex items-center justify-center">
                      <Icon name="edit" size={18} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center">
                      <Icon name="delete" size={18} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Compra</span>
                    <span className="text-[15px] font-mono font-bold text-emerald-600 mt-0.5">{Number(t.compra).toFixed(3)}</span>
                  </div>
                  <div className="flex flex-col items-center border-l border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Venta</span>
                    <span className="text-[15px] font-mono font-bold text-rose-600 mt-0.5">{Number(t.venta).toFixed(3)}</span>
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
            title={editingId ? "Editar TC" : "Registrar TC"}
            footer={
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="tc-form" disabled={isSubmitting} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold shadow-sm flex items-center gap-1.5 transition-colors">
                  <Icon name="save" size={16} /> {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            }
          >
            <form id="tc-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Fecha <span className="text-red-500">*</span></label>
                <input
                  type="date" required
                  value={formData.fecha} onChange={e => setFormData(p => ({...p, fecha: e.target.value}))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold text-emerald-700 mb-1">Compra <span className="text-red-500">*</span></label>
                  <input
                    type="number" step="0.001" min="0" required
                    value={formData.compra || ''} onChange={e => setFormData(p => ({...p, compra: Number(e.target.value)}))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold text-rose-700 mb-1">Venta <span className="text-red-500">*</span></label>
                  <input
                    type="number" step="0.001" min="0" required
                    value={formData.venta || ''} onChange={e => setFormData(p => ({...p, venta: Number(e.target.value)}))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Fuente</label>
                <input
                  type="text" required
                  value={formData.fuente} onChange={e => setFormData(p => ({...p, fuente: e.target.value.toUpperCase()}))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
