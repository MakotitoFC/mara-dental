"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { getMovimientosCajaAction, toggleConciliadoAction } from "../../contador.actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useParams } from "next/navigation";

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

export default function MovimientosCajaPage() {
  const params = useParams();
  const turnoId = params.turnoId as string;
  const toast = useToast();

  const [data, setData] = useState<{ turno: any, movimientos: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  async function loadData() {
    setLoading(true);
    try {
      const res = await getMovimientosCajaAction(turnoId);
      setData(res);
      setPage(1);
    } catch (err) {
      toast.error("Error al cargar los movimientos del turno");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (turnoId) loadData();
  }, [turnoId]);

  async function handleToggleConciliado(mov: any) {
    const newValue = !mov.conciliado;
    const res = await toggleConciliadoAction(mov.id, newValue);
    if (res.success) {
      toast.success(`Movimiento marcado como ${newValue ? 'conciliado' : 'no conciliado'}`);
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          movimientos: prev.movimientos.map(m => m.id === mov.id ? { ...m, conciliado: newValue } : m)
        };
      });
    } else {
      toast.error("Error al actualizar estado");
    }
  }

  const movs = data?.movimientos || [];
  const totalPages = Math.max(1, Math.ceil(movs.length / pageSize));
  const paginatedMovs = movs.slice((page - 1) * pageSize, page * pageSize);

  let ingresos = 0;
  let egresos = 0;
  let devoluciones = 0;

  movs.forEach((m: any) => {
    if (m.estado === "anulado") return;
    const rawMonto = Number(m.monto);
    const montoAbs = Math.abs(rawMonto);

    if (m.es_devolucion) {
      devoluciones += montoAbs;
    } else if (m.categoria?.tipo === 'I' && rawMonto > 0) {
      ingresos += montoAbs;
    } else if (m.categoria?.tipo === 'E' || rawMonto < 0) {
      egresos += montoAbs;
    }
  });

  const balance = ingresos - egresos - devoluciones;

  return (
    <>
      <Header title="Movimientos de Caja" />
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          {/* Header — ya NO es fijo, se desplaza junto con la tabla. */}
          <div className="flex flex-col gap-4 px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200">
            <div className="flex items-start gap-3">
              <Link
                href="/caja"
                aria-label="Volver a Turnos"
                title="Volver a Turnos"
                className="shrink-0 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors mt-0.5"
              >
                <Icon name="chevron_left" size={18} />
              </Link>
              <div className="min-w-0">
                <h1 className="text-[16px] md:text-xl font-bold text-slate-800 flex items-center gap-2">
                  Turno de Caja
                  {data?.turno?.fecha_cierre ? (
                    <span className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-slate-100 text-slate-500">Cerrado</span>
                  ) : (
                    <span className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-cyan-500/5 text-cyan-600 border border-cyan-500/40">Abierto</span>
                  )}
                </h1>
                {data && (
                  <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[13px] text-slate-500">
                    <span className="flex items-center gap-1"><Icon name="store" size={14} /> {data.turno.sede?.nombre_clinica}</span>
                    <span className="flex items-center gap-1"><Icon name="person" size={14} /> {data.turno.usuario?.nombre} {data.turno.usuario?.apellido}</span>
                    <span className="flex items-center gap-1"><Icon name="event" size={14} /> {format(new Date(data.turno.fecha_apertura), "dd MMM yyyy, hh:mm a")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cards más compactas que las de "Resumen Financiero" del Dashboard. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-col justify-between">
                <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                  <Icon name="trending_up" size={15} strokeWidth={1.5} className="text-emerald-600" /> Ingresos
                </span>
                <span className="text-[15px] md:text-[16px] font-semibold font-mono text-slate-900 truncate">S/ {ingresos.toFixed(2)}</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-col justify-between">
                <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                  <Icon name="trending_down" size={15} strokeWidth={1.5} className="text-red-500" /> Egresos
                </span>
                <span className="text-[15px] md:text-[16px] font-semibold font-mono text-slate-900 truncate">S/ {egresos.toFixed(2)}</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-col justify-between">
                <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                  <Icon name="undo" size={15} strokeWidth={1.5} className="text-amber-500" /> Devoluciones
                </span>
                <span className="text-[15px] md:text-[16px] font-semibold font-mono text-slate-900 truncate">S/ {devoluciones.toFixed(2)}</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-col justify-between">
                <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                  <Icon name="account_balance_wallet" size={15} strokeWidth={1.5} className="text-slate-600" /> Balance Total
                </span>
                <span className={`text-[15px] md:text-[16px] font-semibold font-mono truncate ${balance >= 0 ? "text-slate-900" : "text-red-600"}`}>
                  S/ {balance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:block bg-white overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 800 }}>
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Categoría</th>
                  <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Detalle / Paciente</th>
                  <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Fecha</th>
                  <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Medio de Pago</th>
                  <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Monto</th>
                  <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-center">Conciliado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </td>
                      <td className="px-6 py-4"><Skeleton className="h-3 w-48" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-3 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-3 w-20" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
                      <td className="px-6 py-4 text-center"><Skeleton className="h-6 w-6 mx-auto rounded" /></td>
                    </tr>
                  ))
                ) : movs.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-[13px] md:text-sm text-slate-500">No hay movimientos en este turno.</td></tr>
                ) : (
                  paginatedMovs.map((m: any) => {
                    const isAnulado = m.estado === "anulado";
                    const isDevolucion = m.es_devolucion;
                    const isIngreso = !isDevolucion && (m.categoria?.tipo === 'I' || Number(m.monto) > 0);

                    return (
                      <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${isAnulado ? "opacity-45 bg-slate-50/50" : ""}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isDevolucion ? 'bg-amber-50 text-amber-500' : (isIngreso ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')
                            }`}>
                              <Icon name={isDevolucion ? "undo" : isIngreso ? "trending_up" : "trending_down"} size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">{m.categoria?.nombre || (isDevolucion ? 'Devolución' : 'Sin Categoría')}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {isAnulado && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-red-50 text-red-600">Anulado</span>
                                )}
                                {isDevolucion && !isAnulado && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-amber-50/60 text-amber-600">Devolución</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={isAnulado ? "line-through text-slate-400" : "text-slate-700"}>{m.observacion || '-'}</div>
                          {m.paciente_nombre && (
                            <div className="text-[11px] text-cyan-700 font-medium mt-0.5 flex items-center gap-1">
                              <Icon name="person" size={12} /> {m.paciente_nombre}
                            </div>
                          )}
                          {m.referencia && <div className="text-[11px] text-slate-400 font-mono mt-0.5">Ref: {m.referencia}</div>}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-[12px] whitespace-nowrap">
                          {format(new Date(m.fecha), "dd/MM/yyyy HH:mm")}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {m.medio_pago?.nombre || 'Efectivo'}
                        </td>
                        <td className={`px-6 py-4 text-right font-mono font-semibold whitespace-nowrap ${
                          isAnulado
                            ? "text-slate-400 line-through"
                            : isDevolucion
                            ? "text-amber-600"
                            : isIngreso
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}>
                          {isIngreso ? '+' : '-'} {m.moneda?.moneda === 'USD' ? '$' : 'S/'} {Math.abs(Number(m.monto)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleConciliado(m)}
                            className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-colors ${
                              m.conciliado
                                ? 'bg-white border border-cyan-500 text-cyan-600'
                                : 'bg-slate-100 text-slate-400 hover:text-cyan-600'
                            }`}
                          >
                            <Icon name="check" size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación desktop/tablet — mismo patrón de Personal. */}
          {!loading && movs.length > 0 && (
            <div className="hidden sm:flex items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-wrap border-t border-slate-200 bg-white">
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

          <div className="md:hidden bg-slate-50 p-3 flex flex-col gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-12 w-full" /></div>
              ))
            ) : movs.length === 0 ? (
              <p className="text-center text-[13px] text-slate-400 py-10">No hay movimientos en este turno.</p>
            ) : (
              paginatedMovs.map(m => {
                const isAnulado = m.estado === "anulado";
                const isDevolucion = m.es_devolucion;
                const isIngreso = !isDevolucion && (m.categoria?.tipo === 'I' || Number(m.monto) > 0);
                return (
                  <div key={m.id} className="bg-white rounded-xl border border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-400">{format(new Date(m.fecha), "dd/MM/yy HH:mm")}</span>
                      <button
                        onClick={() => handleToggleConciliado(m)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          m.conciliado
                            ? 'bg-white border border-cyan-500 text-cyan-600'
                            : 'bg-slate-100 text-slate-400 hover:text-cyan-600'
                        }`}
                      >
                        <Icon name="check" size={15} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isDevolucion ? 'bg-amber-50 text-amber-500' : (isIngreso ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')
                          }`}>
                            <Icon name={isDevolucion ? "undo" : isIngreso ? "trending_up" : "trending_down"} size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[13px] text-slate-800 truncate">{m.categoria?.nombre || (isDevolucion ? 'Devolución' : 'Sin Categoría')}</p>
                            <p className="text-[12px] text-slate-500 truncate">{m.observacion || 'Sin detalle'}</p>
                          </div>
                        </div>
                        <span className={`font-mono font-semibold shrink-0 ${
                          isAnulado ? "text-slate-400 line-through" : isDevolucion ? "text-amber-600" : isIngreso ? "text-emerald-600" : "text-red-600"
                        }`}>
                          {isIngreso ? '+' : '-'} {Number(m.monto).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                        <span>{m.medio_pago?.nombre || 'Efectivo'}</span>
                        {isDevolucion && !isAnulado && (
                          <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-amber-50/60 text-amber-600">Devolución</span>
                        )}
                        {isAnulado && (
                          <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-red-50 text-red-600">Anulado</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {!loading && totalPages > 1 && (
              <div className="mt-1 sticky bottom-3 self-center z-10 flex items-center gap-1 bg-white/70 backdrop-blur-md border border-slate-200 rounded-full shadow-lg px-1.5 py-1.5">
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
      </div>
    </>
  );
}
