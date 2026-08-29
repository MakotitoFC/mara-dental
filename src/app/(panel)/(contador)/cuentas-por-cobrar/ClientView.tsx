"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Header } from "@/components/layout/Header";
import { format, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CuentasPorCobrarClient({ initialData }: { initialData: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  // Usamos los datos iniciales que vienen del SSR
  const cuotas = initialData || [];
  const totalPages = Math.max(1, Math.ceil(cuotas.length / pageSize));
  const paginatedData = cuotas.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    // Suscripción Realtime a la tabla cuotas
    const channel = supabase.channel('realtime-cuotas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuotas' }, () => {
        // Al ocurrir cualquier cambio, forzamos un refresh del Server Component
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  function getEstadoBadge(fecha_vencimiento: string) {
    const v = new Date(fecha_vencimiento + "T00:00:00");
    if (isPast(v) && !isToday(v)) {
      return <Badge status="error" className="text-[10px] font-bold">VENCIDO</Badge>;
    }
    if (isToday(v)) {
      return (
        <Badge status="info" className="gap-1 text-[10px] font-bold">
          <Icon name="schedule" size={10} /> VENCE HOY
        </Badge>
      );
    }
    return <Badge status="pending" className="text-[10px] font-bold">PENDIENTE</Badge>;
  }

  return (
    <>
      <Header title="Cuentas por Cobrar" />
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center text-cyan-600 shrink-0">
              <Icon name="request_quote" size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] md:text-base font-bold text-slate-800">Cuentas por Cobrar (Cuotas)</h1>
              <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Listado de cuotas pendientes de pago por los pacientes.</p>
            </div>
          </div>
          <div className="shrink-0 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Actualizado en Vivo</span>
          </div>
        </header>

        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        {cuotas.length > 0 && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-100">
            <span className="text-[10px] md:text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, cuotas.length)}</span> de <span className="font-semibold text-slate-700">{cuotas.length}</span>
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
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Paciente</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-center">Cuota N°</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Vencimiento</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-center">Estado</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Monto a Cobrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cuotas.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">No hay cuentas por cobrar.</td></tr>
              ) : (
                paginatedData.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-700">
                      {t.presupuesto?.paciente ? `${t.presupuesto.paciente.nombre} ${t.presupuesto.paciente.apellido}` : 'Desconocido'}
                    </td>
                    <td className="px-5 py-4 text-center text-slate-600 font-mono font-bold">
                      {t.numero_cuota}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {format(new Date(t.fecha_vencimiento + "T00:00:00"), "dd MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {getEstadoBadge(t.fecha_vencimiento)}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-800">
                      S/ {Number(t.monto).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar divide-y divide-slate-100">
          {cuotas.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-10">No hay cuentas por cobrar.</p>
          ) : (
            paginatedData.map((t: any) => (
              <div key={t.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-[14px] text-slate-800 truncate">
                      {t.presupuesto?.paciente ? `${t.presupuesto.paciente.nombre} ${t.presupuesto.paciente.apellido}` : 'Desconocido'}
                    </p>
                    <p className="text-[12px] text-slate-500">Cuota N° <span className="font-mono font-bold">{t.numero_cuota}</span></p>
                  </div>
                  {getEstadoBadge(t.fecha_vencimiento)}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                  <span className="text-[12px] text-slate-500">Vence: {format(new Date(t.fecha_vencimiento + "T00:00:00"), "dd MMM yyyy", { locale: es })}</span>
                  <span className="font-mono font-bold text-slate-800">S/ {Number(t.monto).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      </div>
    </>
  );
}
