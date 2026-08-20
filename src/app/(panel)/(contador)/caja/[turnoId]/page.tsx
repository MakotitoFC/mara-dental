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

export default function MovimientosCajaPage() {
  const params = useParams();
  const turnoId = params.turnoId as string;
  const toast = useToast();
  
  const [data, setData] = useState<{ turno: any, movimientos: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const res = await getMovimientosCajaAction(turnoId);
      setData(res);
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
        <header className="shrink-0 flex flex-col gap-4 px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200">
          <Link href="/caja" className="text-sm font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 w-fit">
            <Icon name="arrow_back" size={16} /> Volver a Turnos
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[16px] md:text-xl font-bold text-slate-800 flex items-center gap-2">
                Turno de Caja 
                {data?.turno?.fecha_cierre ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-500">CERRADO</span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">ABIERTO</span>
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
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mt-2">
            <div className="bg-emerald-50 rounded-xl p-3 md:p-4 border border-emerald-100 flex flex-col items-start justify-center">
              <span className="text-[10px] md:text-[11px] font-bold text-emerald-600 uppercase">Ingresos</span>
              <span className="text-[15px] md:text-lg font-mono font-bold text-emerald-700 mt-0.5">S/ {ingresos.toFixed(2)}</span>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 md:p-4 border border-rose-100 flex flex-col items-start justify-center">
              <span className="text-[10px] md:text-[11px] font-bold text-rose-600 uppercase">Egresos</span>
              <span className="text-[15px] md:text-lg font-mono font-bold text-rose-700 mt-0.5">S/ {egresos.toFixed(2)}</span>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 md:p-4 border border-amber-100 flex flex-col items-start justify-center">
              <span className="text-[10px] md:text-[11px] font-bold text-amber-600 uppercase">Devoluciones</span>
              <span className="text-[15px] md:text-lg font-mono font-bold text-amber-700 mt-0.5">S/ {devoluciones.toFixed(2)}</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 md:p-4 border border-slate-200 flex flex-col items-start justify-center">
              <span className="text-[10px] md:text-[11px] font-bold text-slate-600 uppercase">Balance Total</span>
              <span className={`text-[15px] md:text-lg font-mono font-bold mt-0.5 ${balance >= 0 ? "text-slate-800" : "text-rose-600"}`}>
                S/ {balance.toFixed(2)}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
          <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
            <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 800 }}>
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Fecha</th>
                  <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Categoría</th>
                  <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Detalle / Paciente</th>
                  <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Medio de Pago</th>
                  <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Monto</th>
                  <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-center">Conciliado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-5 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      <td className="px-5 py-4 text-center"><Skeleton className="h-6 w-6 mx-auto rounded" /></td>
                    </tr>
                  ))
                ) : movs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">No hay movimientos en este turno.</td></tr>
                ) : (
                  movs.map((m: any) => {
                    const isAnulado = m.estado === "anulado";
                    const isDevolucion = m.es_devolucion;
                    const isIngreso = !isDevolucion && (m.categoria?.tipo === 'I' || Number(m.monto) > 0);

                    return (
                      <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${isAnulado ? "opacity-45 bg-slate-50/50" : ""}`}>
                        <td className="px-5 py-4 text-slate-600">
                          {format(new Date(m.fecha), "dd/MM/yyyy HH:mm")}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              isDevolucion ? 'bg-amber-500' : (isIngreso ? 'bg-emerald-500' : 'bg-rose-500')
                            }`} />
                            <span className="font-bold text-slate-700">{m.categoria?.nombre || (isDevolucion ? 'Devolución' : 'Sin Categoría')}</span>
                            {isAnulado && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-100 text-rose-700">ANULADO</span>
                            )}
                            {isDevolucion && !isAnulado && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800">DEVOLUCIÓN</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className={`font-medium ${isAnulado ? "line-through text-slate-400" : "text-slate-700"}`}>{m.observacion || '-'}</div>
                          {m.paciente_nombre && (
                            <div className="text-[11px] text-cyan-700 font-semibold mt-0.5 flex items-center gap-1">
                              <Icon name="person" size={12} /> {m.paciente_nombre}
                            </div>
                          )}
                          {m.referencia && <div className="text-[11px] text-slate-400 font-mono mt-0.5">Ref: {m.referencia}</div>}
                        </td>
                        <td className="px-5 py-4 text-slate-600 font-medium">
                          {m.medio_pago?.nombre || 'Efectivo'}
                        </td>
                        <td className={`px-5 py-4 text-right font-mono font-bold ${
                          isAnulado
                            ? "text-slate-400 line-through"
                            : isDevolucion
                            ? "text-amber-600"
                            : isIngreso
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}>
                          {isIngreso ? '+' : '-'} {m.moneda?.moneda === 'USD' ? '$' : 'S/'} {Math.abs(Number(m.monto)).toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button 
                            onClick={() => handleToggleConciliado(m)}
                            className={`w-6 h-6 mx-auto rounded flex items-center justify-center transition-colors ${
                              m.conciliado 
                                ? 'bg-cyan-100 text-cyan-600 border border-cyan-200' 
                                : 'bg-white border-2 border-slate-200 text-transparent hover:border-cyan-300'
                            }`}
                          >
                            <Icon name="check" size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 flex flex-col gap-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-12 w-full" /></div>
              ))
            ) : movs.length === 0 ? (
              <p className="text-center text-[13px] text-slate-400 py-10">No hay movimientos en este turno.</p>
            ) : (
              movs.map(m => (
                <div key={m.id} className="p-4 flex flex-col gap-2 relative">
                  <div className="flex items-start justify-between gap-2 pr-8">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${m.categoria?.tipo === 'I' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="font-bold text-[14px] text-slate-800 truncate">{m.categoria?.nombre || 'Sin Categoría'}</span>
                      </div>
                      <p className="text-[12px] text-slate-500 mt-0.5">{m.observacion || 'Sin detalle'}</p>
                    </div>
                    <span className={`font-mono font-bold shrink-0 ${m.categoria?.tipo === 'I' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.categoria?.tipo === 'I' ? '+' : '-'} {Number(m.monto).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>{format(new Date(m.fecha), "dd/MM/yy HH:mm")}</span>
                    <span>•</span>
                    <span className="font-medium text-slate-600">{m.medio_pago?.nombre || 'Efectivo'}</span>
                  </div>
                  
                  <button 
                    onClick={() => handleToggleConciliado(m)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center transition-colors ${
                      m.conciliado 
                        ? 'bg-cyan-100 text-cyan-600 border border-cyan-200' 
                        : 'bg-white border-2 border-slate-200 text-transparent'
                    }`}
                  >
                    <Icon name="check" size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </>
  );
}
