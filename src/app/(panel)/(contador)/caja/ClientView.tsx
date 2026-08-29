"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Header } from "@/components/layout/Header";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

export default function CajaTurnosClient({ initialData }: { initialData: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const turnos = initialData || [];
  const totalPages = Math.max(1, Math.ceil(turnos.length / pageSize));
  const paginatedData = turnos.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    // Escuchar cambios tanto en turnos como en movimientos de caja para refrescar los totales
    const channelTurnos = supabase.channel('realtime-turnos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'caja_turno' }, () => {
        router.refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimiento_caja' }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelTurnos);
    };
  }, [router, supabase]);

  return (
    <>
      <Header title="Turnos de Caja" />
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200">
          <div className="min-w-0">
            <h1 className="text-[15px] md:text-base font-bold text-slate-800">Turnos de Caja</h1>
            <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Historial de apertura y cierre de caja en todas las sedes.</p>
          </div>
        </header>

        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 800 }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Sede / Apertura</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Cierre</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-center">Estado</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Ingresos</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Egresos</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Devoluciones</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Balance</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {turnos.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-[13px] md:text-sm text-slate-500">No hay turnos de caja registrados.</td></tr>
              ) : (
                paginatedData.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                          <Icon name="wallet" size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{t.sede?.nombre_clinica || 'Sede Principal'}</p>
                          <p className="text-[12px] text-slate-500 truncate">{format(new Date(t.fecha_apertura), "dd MMM yyyy, hh:mm a", { locale: es })}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-[12px]">
                      {t.fecha_cierre ? format(new Date(t.fecha_cierre), "dd MMM yyyy, hh:mm a", { locale: es }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-semibold ${t.fecha_cierre ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.fecha_cierre ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                        {t.fecha_cierre ? 'Cerrada' : 'Abierta'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700 font-mono">
                      S/ {Number(t.ingresos || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700 font-mono">
                      S/ {Number(t.egresos || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700 font-mono">
                      S/ {Number(t.devoluciones || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                      S/ {Number(t.balance || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right align-middle">
                      <a href={`/caja/${t.id}`} className="w-8 h-8 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 flex items-center justify-center transition-colors ml-auto" title="Ver movimientos">
                        <Icon name="chevron_right" size={16} />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación desktop/tablet — mismo patrón de Personal. */}
        {turnos.length > 0 && (
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
          {turnos.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-10">No hay turnos de caja registrados.</p>
          ) : (
            paginatedData.map((t: any) => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                      <Icon name="wallet" size={14} />
                    </div>
                    <span className="font-bold text-[13px] text-slate-800 truncate">{t.sede?.nombre_clinica || 'Sede Principal'}</span>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${t.fecha_cierre ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${t.fecha_cierre ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                    {t.fecha_cierre ? 'Cerrada' : 'Abierta'}
                  </span>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <p className="text-[11.5px] text-slate-500">{format(new Date(t.fecha_apertura), "dd MMM, hh:mm a", { locale: es })}</p>
                  <div className="grid grid-cols-4 gap-1.5 bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Ingresos</span>
                      <span className="text-[11px] font-mono text-slate-800">S/ {Number(t.ingresos || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-200">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Egresos</span>
                      <span className="text-[11px] font-mono text-slate-800">S/ {Number(t.egresos || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-200">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Devoluc.</span>
                      <span className="text-[11px] font-mono text-slate-800">S/ {Number(t.devoluciones || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-200">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Balance</span>
                      <span className="text-[11px] font-mono font-bold text-slate-900">S/ {Number(t.balance || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <a href={`/caja/${t.id}`} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-cyan-50 text-cyan-600 font-semibold text-[13px] hover:bg-cyan-100 transition-colors">
                    Ver Movimientos <Icon name="chevron_right" size={16} />
                  </a>
                </div>
              </div>
            ))
          )}
          </div>

          {totalPages > 1 && (
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
      </div>
    </>
  );
}
