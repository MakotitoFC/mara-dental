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
import { Textarea } from "@/components/ui/TextInput";

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

export default function ComprobantesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [comprobantes, setComprobantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(comprobantes.length / pageSize));
  const paginatedData = comprobantes.slice((page - 1) * pageSize, page * pageSize);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedComprobante, setSelectedComprobante] = useState<any | null>(null);

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
    if (t.cliente) {
      const doc = t.cliente.dni || t.cliente.pasaporte || t.cliente.carnet_extranjeria || "-";
      return {
        nombre: `${t.cliente.nombre} ${t.cliente.apellidos || ''}`.trim(),
        tipo: "Tercero / Pagador",
        doc: doc
      };
    }
    if (t.paciente) {
      return {
        nombre: `${t.paciente.nombre} ${t.paciente.apellido || ''}`.trim(),
        tipo: "Paciente",
        doc: t.paciente.dni || "-"
      };
    }
    return { nombre: "Consumidor Final", tipo: "General", doc: "-" };
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
        if (selectedComprobante?.id === anulandoId) setSelectedComprobante(null);
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
          <div className="min-w-0">
            <h1 className="text-[15px] md:text-base font-bold text-slate-800">Comprobantes de Pago</h1>
            <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Historial de facturas, boletas y notas de crédito.</p>
          </div>
          <button onClick={loadData} className="shrink-0 flex items-center justify-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[12.5px] font-semibold transition-colors">
            <Icon name="history" size={16} />
            <span className="hidden lg:inline">Actualizar</span>
          </button>
        </header>

        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 800 }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Comprobante</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Receptor (Pagador)</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Fecha Emisión</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Total</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-center">Estado</th>
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
                        <div className="flex flex-col gap-1.5">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-2.5 w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Skeleton className="h-3 w-40" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-3 w-24" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-3 w-20 ml-auto" /></td>
                    <td className="px-6 py-4 text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></td>
                    <td className="px-6 py-4"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-8 w-8 rounded-lg" /></div></td>
                  </tr>
                ))
              ) : comprobantes.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-[13px] md:text-sm text-slate-500">No hay comprobantes registrados.</td></tr>
              ) : (
                paginatedData.map(t => {
                  const clienteInfo = getClienteInfo(t);
                  const isAnulado = t.estado === "anulado";

                  return (
                    <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${isAnulado ? "opacity-60 bg-slate-50/50" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                            <Icon name="receipt_long" size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{getComprobanteNombre(t.tipo_comprobante)}</p>
                            <p className="text-[12px] font-mono text-slate-500">{t.serie || t.numero ? `${t.serie || ''}-${t.numero || ''}` : "N/N"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{clienteInfo.nombre}</p>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">{clienteInfo.tipo}</span>
                          <span className="font-mono">Doc: {clienteInfo.doc}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-[12px] whitespace-nowrap">
                        {format(new Date(t.fecha_emision), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono whitespace-nowrap ${isAnulado ? "line-through text-slate-400" : "text-slate-900"}`}>
                        {t.moneda === 'PEN' ? 'S/' : '$'} {Number(t.monto_total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-semibold ${
                          t.estado === 'emitido' ? 'bg-emerald-50 text-emerald-600' :
                          t.estado === 'anulado' ? 'bg-red-50 text-red-600' :
                          'bg-amber-50/60 text-amber-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            t.estado === 'emitido' ? 'bg-emerald-500' :
                            t.estado === 'anulado' ? 'bg-red-500' :
                            'bg-amber-400'
                          }`} />
                          {t.estado === 'emitido' ? 'Emitido' : t.estado === 'anulado' ? 'Anulado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedComprobante(t)}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors inline-flex items-center justify-center"
                            title="Ver Detalle Completo"
                          >
                            <Icon name="visibility" size={16} />
                          </button>
                          {!isAnulado && (
                            <button
                              onClick={() => openAnular(t.id)}
                              className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors inline-flex items-center justify-center"
                              title="Anular Comprobante"
                            >
                              <Icon name="block" size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación desktop/tablet — mismo patrón de Personal. */}
        {!loading && comprobantes.length > 0 && (
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
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-16 w-full" /></div>
            ))
          ) : comprobantes.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-10">No hay comprobantes registrados.</p>
          ) : (
            paginatedData.map(t => {
              const clienteInfo = getClienteInfo(t);
              const isAnulado = t.estado === "anulado";

              return (
                <div key={t.id} className={`bg-white rounded-xl border border-slate-200 flex flex-col ${isAnulado ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400">{format(new Date(t.fecha_emision), "dd/MM/yyyy HH:mm")}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                      t.estado === 'emitido' ? 'bg-emerald-50 text-emerald-600' :
                      t.estado === 'anulado' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50/60 text-amber-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        t.estado === 'emitido' ? 'bg-emerald-500' :
                        t.estado === 'anulado' ? 'bg-red-500' :
                        'bg-amber-400'
                      }`} />
                      {t.estado === 'emitido' ? 'Emitido' : t.estado === 'anulado' ? 'Anulado' : 'Pendiente'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                        <Icon name="receipt_long" size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-slate-800 truncate">{getComprobanteNombre(t.tipo_comprobante)} {t.serie || t.numero ? `${t.serie || ''}-${t.numero || ''}` : "N/N"}</p>
                        <p className="text-[12px] text-slate-500 truncate">{clienteInfo.nombre}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-mono">Doc: {clienteInfo.doc}</span>
                      <span className={`font-mono font-bold ${isAnulado ? "line-through text-slate-400" : "text-slate-900"}`}>
                        {t.moneda === 'PEN' ? 'S/' : '$'} {Number(t.monto_total).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedComprobante(t)} className="flex-1 h-8 rounded-lg text-cyan-600 bg-cyan-50 hover:bg-cyan-100 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold transition-colors">
                        <Icon name="visibility" size={14} /> Ver Detalle
                      </button>
                      {!isAnulado && (
                        <button onClick={() => openAnular(t.id)} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors">
                          <Icon name="block" size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
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

      {/* Modal de Detalle Completo del Comprobante */}
      <AnimatePresence>
        {selectedComprobante && (
          <ResponsiveSheet
            onClose={() => setSelectedComprobante(null)}
            title={`Detalle de ${getComprobanteNombre(selectedComprobante.tipo_comprobante)} ${selectedComprobante.serie || selectedComprobante.numero ? `${selectedComprobante.serie || ''}-${selectedComprobante.numero || ''}` : 'N/N'}`}
            footer={
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedComprobante(null)}
                  className="px-5 py-2 text-[13px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cerrar
                </button>
                {selectedComprobante.estado !== "anulado" && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedComprobante.id;
                      setSelectedComprobante(null);
                      openAnular(id);
                    }}
                    className="px-4 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Icon name="block" size={16} /> Anular
                  </button>
                )}
              </div>
            }
          >
            <div className="space-y-5 text-[13px]">
              {/* Resumen Superior */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Monto Facturado</span>
                  <span className="text-2xl font-bold font-mono text-cyan-700">
                    {selectedComprobante.moneda === 'PEN' ? 'S/' : '$'} {Number(selectedComprobante.monto_total).toFixed(2)}
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-full ${
                  selectedComprobante.estado === 'emitido' ? 'bg-emerald-50 text-emerald-600' :
                  selectedComprobante.estado === 'anulado' ? 'bg-red-50 text-red-600' :
                  'bg-amber-50/60 text-amber-600'
                }`}>
                  {selectedComprobante.estado.charAt(0).toUpperCase() + selectedComprobante.estado.slice(1)}
                </span>
              </div>

              {/* Receptor */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Icon name="person" size={16} className="text-cyan-600" /> Receptor / Pagador
                </h3>
                <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Nombre / Razón Social</span>
                    <span className="font-semibold text-slate-800">{getClienteInfo(selectedComprobante).nombre}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Documento de Identidad</span>
                    <span className="font-mono font-semibold text-slate-800">{getClienteInfo(selectedComprobante).doc}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Tipo de Pagador</span>
                    <span className="font-medium text-slate-700">{getClienteInfo(selectedComprobante).tipo}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Fecha de Emisión</span>
                    <span className="font-medium text-slate-700">
                      {format(new Date(selectedComprobante.fecha_emision), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transacción / Movimiento de Caja */}
              {selectedComprobante.movimiento && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Icon name="point_of_sale" size={16} className="text-emerald-600" /> Transacción de Caja
                  </h3>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Medio de Pago</span>
                      <span className="font-semibold text-slate-800">
                        {selectedComprobante.movimiento.medio_pago?.nombre || "Efectivo"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Referencia / N° Op.</span>
                      <span className="font-mono text-slate-800">
                        {selectedComprobante.movimiento.referencia || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Sede</span>
                      <span className="font-medium text-slate-700">
                        {selectedComprobante.movimiento.caja_turno?.sede?.nombre_clinica || "Sede MaraDental"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Fecha y Hora de Cobro</span>
                      <span className="font-medium text-slate-700">
                        {selectedComprobante.movimiento.fecha ? format(new Date(selectedComprobante.movimiento.fecha), "dd/MM/yyyy HH:mm") : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Presupuesto Origen */}
              {selectedComprobante.movimiento?.presupuesto && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Icon name="assignment" size={16} className="text-indigo-600" /> Presupuesto Origen
                  </h3>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Fecha Presupuesto</span>
                      <span className="font-medium text-slate-700">
                        {format(new Date(selectedComprobante.movimiento.presupuesto.fecha_emision), "dd/MM/yyyy")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Estado Presupuesto</span>
                      <span className="text-indigo-600 capitalize">
                        {selectedComprobante.movimiento.presupuesto.estado}
                      </span>
                    </div>
                  </div>
                  {selectedComprobante.movimiento.presupuesto.detalle_presupuesto?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Tratamientos:</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-700">
                        {selectedComprobante.movimiento.presupuesto.detalle_presupuesto.map((d: any, idx: number) => {
                          const cat = Array.isArray(d.catalogo_tratamientos) ? d.catalogo_tratamientos[0] : d.catalogo_tratamientos;
                          return <li key={idx}>{cat?.nombre || "Tratamiento"}</li>;
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Si fue anulado */}
              {selectedComprobante.estado === "anulado" && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-red-800 space-y-1">
                  <span className="font-bold block flex items-center gap-1.5">
                    <Icon name="warning" size={16} /> Información de Anulación
                  </span>
                  <p className="text-[12px]"><span className="font-semibold">Motivo:</span> {selectedComprobante.motivo_anulacion || "Sin motivo especificado"}</p>
                  {selectedComprobante.fecha_anulacion && (
                    <p className="text-[11px] text-red-600">Fecha: {format(new Date(selectedComprobante.fecha_anulacion), "dd/MM/yyyy HH:mm")}</p>
                  )}
                </div>
              )}
            </div>
          </ResponsiveSheet>
        )}
      </AnimatePresence>

      {/* Modal de Anulación */}
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
                <button type="submit" form="anular-form" disabled={isSubmitting || !motivoAnulacion.trim()} className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold shadow-sm flex items-center gap-1.5 transition-colors">
                  <Icon name="block" size={16} /> {isSubmitting ? "Anulando..." : "Proceder a Anular"}
                </button>
              </div>
            }
          >
            <form id="anular-form" onSubmit={handleAnular} className="flex flex-col gap-4">
              <div className="p-3 bg-red-50 rounded-xl text-red-800 text-[13px]">
                <p className="font-bold mb-1">Cuidado</p>
                <p>Estás a punto de anular un comprobante. Esta acción marcará el comprobante como "anulado" e invalidará los montos en los reportes correspondientes.</p>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Motivo de Anulación <span className="text-red-500">*</span></label>
                <Textarea
                  required
                  value={motivoAnulacion} onChange={e => setMotivoAnulacion(e.target.value)}
                  className="h-24 resize-none"
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
