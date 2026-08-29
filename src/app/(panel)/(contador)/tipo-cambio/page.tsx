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
import { DatePicker } from "@/components/ui/DatePicker";

/** Ventana de números de página con elipsis — mismo patrón que Personal
 * ("1 2 3 ... 8 9 10"). */
function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "...", total - 2, total - 1, total];
  if (current >= total - 2) return [1, 2, 3, "...", total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

/** Ventana compacta de 2 números para la píldora flotante de mobile. */
function getMobilePageWindow(current: number, total: number): number[] {
  if (total <= 1) return [1];
  if (current >= total) return [total - 1, total];
  return [current, current + 1];
}

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
  const pageSize = 8;
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
          <div className="min-w-0">
            <h1 className="text-[15px] md:text-base font-bold text-slate-800">Tipo de Cambio Diario</h1>
            <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Registra el TC de la SBS para consolidar comprobantes en dólares.</p>
          </div>
          <button onClick={openNew} className="shrink-0 flex items-center justify-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[12.5px] font-semibold transition-colors">
            <Icon name="add" size={16} />
            <span className="hidden lg:inline">Registrar TC</span>
          </button>
        </header>

        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 600 }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Fecha</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Compra</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Venta</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-center">Fuente</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-6 py-4 text-center"><Skeleton className="h-5 w-12 mx-auto rounded-full" /></td>
                    <td className="px-6 py-4"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-8 w-8 rounded-lg" /></div></td>
                  </tr>
                ))
              ) : tiposCambio.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-[13px] md:text-sm text-slate-500">No hay registros de tipo de cambio.</td></tr>
              ) : (
                paginatedData.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                          <Icon name="calendar_month" size={18} />
                        </div>
                        <span className="font-bold text-slate-800">{format(new Date(t.fecha + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700 font-mono">{Number(t.compra).toFixed(3)}</td>
                    <td className="px-6 py-4 text-right text-slate-700 font-mono">{Number(t.venta).toFixed(3)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] md:text-[11px] font-medium bg-slate-100 text-slate-600">{t.fuente}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(t)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors">
                          <Icon name="edit" size={16} />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Icon name="delete" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación desktop/tablet — debajo de la tabla, fuera del área con
            scroll, mismo patrón "Anterior / 1 2 3 ... / Siguiente" de
            Personal. En mobile se oculta: ahí la paginación es la píldora
            flotante dentro de la lista de tarjetas (ver más abajo). */}
        {!loading && tiposCambio.length > 0 && (
          <div className="hidden sm:flex shrink-0 items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-wrap border-t border-slate-200">
            <span className="text-[12.5px] text-slate-500 whitespace-nowrap">Página {page} de {totalPages}</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="shrink-0 flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_left" size={16} />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="shrink-0 w-8 h-8 flex items-center justify-center text-[12.5px] text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`shrink-0 w-8 h-8 rounded-lg text-[12.5px] font-semibold transition-colors ${
                      p === page ? "bg-slate-100 text-slate-800" : "text-slate-600 hover:bg-slate-50 border border-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="shrink-0 flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar bg-slate-50 p-3 flex flex-col">
          <div className="flex flex-col gap-3">
          {loading ? (
             Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))
          ) : tiposCambio.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-10">No hay registros de tipo de cambio.</p>
          ) : (
            paginatedData.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                      <Icon name="calendar_month" size={14} />
                    </div>
                    <span className="font-bold text-[13px] text-slate-800">{format(new Date(t.fecha + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1 -mr-1.5">
                    <button onClick={() => openEdit(t)} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 flex items-center justify-center transition-colors">
                      <Icon name="edit" size={16} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors">
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center bg-slate-50 rounded-lg py-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Compra</span>
                      <span className="text-[14px] font-mono text-slate-800 mt-0.5">{Number(t.compra).toFixed(3)}</span>
                    </div>
                    <div className="flex flex-col items-center bg-slate-50 rounded-lg py-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Venta</span>
                      <span className="text-[14px] font-mono text-slate-800 mt-0.5">{Number(t.venta).toFixed(3)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Fuente</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">{t.fuente}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          </div>

          {!loading && totalPages > 1 && (
            <div className="mt-3 sticky bottom-0 self-center z-10 flex items-center gap-1 bg-white/70 backdrop-blur-md border border-slate-200 rounded-full shadow-lg px-1.5 py-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_left" size={16} />
              </button>
              {getMobilePageWindow(page, totalPages).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-full text-[12px] font-semibold transition-colors ${
                    p === page ? "bg-cyan-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
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
                <DatePicker
                  value={formData.fecha}
                  onChange={v => setFormData(p => ({...p, fecha: v}))}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Compra <span className="text-red-500">*</span></label>
                  <input
                    type="number" step="0.001" min="0" required
                    value={formData.compra || ''} onChange={e => setFormData(p => ({...p, compra: Number(e.target.value)}))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Venta <span className="text-red-500">*</span></label>
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
