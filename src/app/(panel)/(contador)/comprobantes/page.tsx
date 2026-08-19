"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { useToast } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { getComprobantesAction, anularComprobanteAction } from "../contador.actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ComprobantesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [comprobantes, setComprobantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(comprobantes.length / pageSize));
  const paginatedData = comprobantes.slice((page - 1) * pageSize, page * pageSize);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getComprobantesAction();
      setComprobantes(data);
    } catch (err) {
      toast.error("Error al cargar comprobantes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function getClienteInfo(t: any) {
    if (t.cliente) return `${t.cliente.nombre} ${t.cliente.apellidos || ''}`;
    if (t.paciente) return `${t.paciente.nombre} ${t.paciente.apellido || ''}`;
    return "Consumidor Final";
  }

  function getComprobanteNombre(tipo: string) {
    switch (tipo) {
      case 'boleta': return 'Boleta';
      case 'factura': return 'Factura';
      case 'recibo_honorarios': return 'RxH';
      case 'nota_credito': return 'Nota de Crédito';
      case 'nota_debito': return 'Nota de Débito';
      default: return 'Ticket';
    }
  }

  function openAnular(id: string) {
    setAnulandoId(id);
    setMotivoAnulacion("");
    setIsModalOpen(true);
  }

  async function handleAnular(e: React.FormEvent) {
    e.preventDefault();
    if (!anulandoId) return;

    const ok = await confirm({
      title: "Anular Comprobante",
      message: "¿Estás seguro de anular este comprobante? Esta acción no se puede deshacer.",
      confirmLabel: "Anular Comprobante",
      danger: true,
      requireText: "ANULAR"
    });
    
    if (!ok) return;

    setIsSubmitting(true);
    try {
      const res = await anularComprobanteAction(anulandoId, motivoAnulacion);
      if (res.success) {
        toast.success("Comprobante anulado");
        setIsModalOpen(false);
        loadData();
      } else {
        toast.error(res.error || "Error al anular");
      }
    } catch (err) {
      toast.error("Error al anular");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Header title="Comprobantes" />
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center text-cyan-600 shrink-0">
              <Icon name="receipt_long" size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] md:text-base font-bold text-slate-800">Comprobantes de Pago</h1>
              <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Historial de facturas, boletas y notas de crédito.</p>
            </div>
          </div>
          <button onClick={loadData} className="shrink-0 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-[13px] md:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors">
            <Icon name="history" size={18} />
            <span className="hidden lg:inline">Actualizar</span>
          </button>
        </header>

        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        {!loading && comprobantes.length > 0 && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-100">
            <span className="text-[10px] md:text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, comprobantes.length)}</span> de <span className="font-semibold text-slate-700">{comprobantes.length}</span>
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
          <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 800 }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Fecha</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Comprobante</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Receptor</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-center">Estado</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Total</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-5 py-4 text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></td>
                    <td className="px-5 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-5 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : comprobantes.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">No hay comprobantes registrados.</td></tr>
              ) : (
                paginatedData.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 text-slate-600">
                      {format(new Date(t.fecha_emision), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-700">{getComprobanteNombre(t.tipo_comprobante)}</div>
                      <div className="text-[12px] font-mono text-slate-500">{t.serie}-{t.numero}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-medium">
                      {getClienteInfo(t)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        t.estado === 'emitido' ? 'bg-emerald-100 text-emerald-700' :
                        t.estado === 'anulado' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {t.estado.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-800">
                      {t.moneda === 'PEN' ? 'S/' : '$'} {Number(t.monto_total).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {t.estado !== 'anulado' && (
                        <button onClick={() => openAnular(t.id)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center" title="Anular Comprobante">
                          <Icon name="block" size={18} />
                        </button>
                      )}
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
              <div key={i} className="p-4 flex flex-col gap-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-16 w-full" /></div>
            ))
          ) : comprobantes.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-10">No hay comprobantes registrados.</p>
          ) : (
            paginatedData.map(t => (
              <div key={t.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-[14px] text-slate-800">{getComprobanteNombre(t.tipo_comprobante)} {t.serie}-{t.numero}</span>
                    <p className="text-[12px] text-slate-500 truncate">{getClienteInfo(t)}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                    t.estado === 'emitido' ? 'bg-emerald-100 text-emerald-700' :
                    t.estado === 'anulado' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {t.estado.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                  <span className="text-[12px] text-slate-500">{format(new Date(t.fecha_emision), "dd/MM/yyyy HH:mm")}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-800">{t.moneda === 'PEN' ? 'S/' : '$'} {Number(t.monto_total).toFixed(2)}</span>
                    {t.estado !== 'anulado' && (
                      <button onClick={() => openAnular(t.id)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-100 flex items-center justify-center">
                        <Icon name="block" size={16} />
                      </button>
                    )}
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
            title="Anular Comprobante"
            footer={
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="anular-form" disabled={isSubmitting || !motivoAnulacion.trim()} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold shadow-sm flex items-center gap-1.5 transition-colors">
                  <Icon name="block" size={16} /> {isSubmitting ? "Anulando..." : "Proceder a Anular"}
                </button>
              </div>
            }
          >
            <form id="anular-form" onSubmit={handleAnular} className="flex flex-col gap-4">
              <div className="p-3 bg-rose-50 rounded-xl text-rose-800 text-[13px]">
                <p className="font-bold mb-1">Cuidado</p>
                <p>Estás a punto de anular un comprobante. Esta acción marcará el comprobante como "anulado" e invalidará los montos en los reportes correspondientes.</p>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Motivo de Anulación <span className="text-red-500">*</span></label>
                <textarea
                  required
                  value={motivoAnulacion} onChange={e => setMotivoAnulacion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors h-24 resize-none"
                  placeholder="Explica brevemente por qué se anula..."
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
