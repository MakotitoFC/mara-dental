"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Header } from "@/components/layout/Header";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CajaTurnosClient({ initialData }: { initialData: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
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
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center text-cyan-600 shrink-0">
              <Icon name="wallet" size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] md:text-base font-bold text-slate-800">Turnos de Caja</h1>
              <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Historial de apertura y cierre de caja en todas las sedes.</p>
            </div>
          </div>
          <div className="shrink-0 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Actualizado en Vivo</span>
          </div>
        </header>

        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        {turnos.length > 0 && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-100">
            <span className="text-[10px] md:text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, turnos.length)}</span> de <span className="font-semibold text-slate-700">{turnos.length}</span>
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
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Sede</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Apertura</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Cierre</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-center">Estado</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Ingresos</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Egresos</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Balance</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {turnos.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">No hay turnos de caja registrados.</td></tr>
              ) : (
                paginatedData.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-700">{t.sede?.nombre_clinica || 'Sede Principal'}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {format(new Date(t.fecha_apertura), "dd MMM yyyy, hh:mm a", { locale: es })}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {t.fecha_cierre ? format(new Date(t.fecha_cierre), "dd MMM yyyy, hh:mm a", { locale: es }) : '-'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${t.fecha_cierre ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                        {t.fecha_cierre ? 'CERRADA' : 'ABIERTA'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-emerald-600 font-mono font-bold">
                      {Number(t.ingresos).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-right text-rose-600 font-mono font-bold">
                      {Number(t.egresos).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-800">
                      {Number(t.balance).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <a href={`/caja/${t.id}`} className="w-8 h-8 rounded-lg text-cyan-600 hover:bg-cyan-50 inline-flex items-center justify-center transition-colors">
                        <Icon name="chevron_right" size={20} />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar divide-y divide-slate-100">
          {turnos.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-10">No hay turnos de caja registrados.</p>
          ) : (
            paginatedData.map((t: any) => (
              <div key={t.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[14px] text-slate-800">{t.sede?.nombre_clinica || 'Sede Principal'}</span>
                    <p className="text-[12px] text-slate-500 capitalize">{format(new Date(t.fecha_apertura), "dd MMM, hh:mm a", { locale: es })}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${t.fecha_cierre ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                    {t.fecha_cierre ? 'CERRADA' : 'ABIERTA'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Ingresos</span>
                    <span className="text-[13px] font-mono font-bold text-emerald-600 mt-0.5">{Number(t.ingresos).toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-center border-l border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Egresos</span>
                    <span className="text-[13px] font-mono font-bold text-rose-600 mt-0.5">{Number(t.egresos).toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-center border-l border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Balance</span>
                    <span className="text-[13px] font-mono font-bold text-slate-800 mt-0.5">{Number(t.balance).toFixed(2)}</span>
                  </div>
                </div>
                <a href={`/caja/${t.id}`} className="mt-1 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-cyan-50 text-cyan-600 font-semibold text-[13px] hover:bg-cyan-100 transition-colors">
                  Ver Movimientos <Icon name="chevron_right" size={16} />
                </a>
              </div>
            ))
          )}
        </div>
      </main>
      </div>
    </>
  );
}
