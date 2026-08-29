"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Header } from "@/components/layout/Header";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

function renderLegend({ payload }: any) {
  return (
    <div className="flex items-center justify-center flex-wrap gap-4 pt-2.5">
      {payload.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5">
          <span className="inline-block rounded-[3px]" style={{ width: 12, height: 12, backgroundColor: entry.color }} />
          <span style={{ color: "#64748b", fontSize: 12 }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ContadorDashboardClient({ initialData }: { initialData: any }) {
  const router = useRouter();
  const supabase = createClient();
  
  const data = initialData;

  useEffect(() => {
    // Escuchar cambios en la tabla de movimiento_caja y cuotas para el dashboard
    const channelDashboard = supabase.channel('realtime-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimiento_caja' }, () => {
        router.refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuotas' }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelDashboard);
    };
  }, [router, supabase]);

  return (
    <>
      <Header title="Dashboard Financiero" />
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-slate-50 p-4 sm:p-6 md:p-8 no-scrollbar">
        <div className="max-w-6xl mx-auto h-full flex flex-col gap-6 md:gap-8">

          <div>
            <h1 className="text-[15px] md:text-base font-bold text-slate-800">Resumen Financiero</h1>
            <p className="text-[13px] md:text-sm text-slate-500">Indicadores clave y evolución de la clínica.</p>
          </div>

          <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1 md:mb-2">
                <Icon name="trending_up" size={20} strokeWidth={1.5} className="text-emerald-600" /> Ingresos Mes
              </span>
              <span className="text-[20px] sm:text-[22px] md:text-[24px] font-semibold font-mono text-slate-900 truncate">
                S/ {data?.kpis.ingresosMes.toFixed(2)}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1 md:mb-2">
                <Icon name="trending_down" size={20} strokeWidth={1.5} className="text-red-500" /> Egresos Mes
              </span>
              <span className="text-[20px] sm:text-[22px] md:text-[24px] font-semibold font-mono text-slate-900 truncate">
                S/ {data?.kpis.egresosMes.toFixed(2)}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1 md:mb-2">
                <Icon name="undo" size={20} strokeWidth={1.5} className="text-amber-500" /> Devoluciones
              </span>
              <span className="text-[20px] sm:text-[22px] md:text-[24px] font-semibold font-mono text-slate-900 truncate">
                S/ {(data?.kpis.devolucionesMes ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1 md:mb-2">
                <Icon name="account_balance_wallet" size={20} strokeWidth={1.5} className="text-slate-600" /> Balance Mes
              </span>
              <span className="text-[20px] sm:text-[22px] md:text-[24px] font-semibold font-mono text-slate-900 truncate">
                S/ {data?.kpis.balanceMes.toFixed(2)}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1 md:mb-2">
                <Icon name="pending_actions" size={20} strokeWidth={1.5} className="text-blue-600" /> Por Cobrar
              </span>
              <span className="text-[20px] sm:text-[22px] md:text-[24px] font-semibold font-mono text-slate-900 truncate">
                S/ {data?.kpis.totalPorCobrar.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-[420px] grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 md:p-6 flex flex-col">
              <h2 className="text-[13px] md:text-[15px] font-medium text-[#64748b] mb-6">Evolución de Ingresos y Egresos (6 meses)</h2>
              <div className="flex-1 min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.chartEvolucion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#27AE60" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#27AE60" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E45A49" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#E45A49" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDevoluciones" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F1A31D" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#F1A31D" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
                      itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}
                    />
                    <Legend content={renderLegend} />
                    <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#27AE60" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                    <Area type="monotone" dataKey="egresos" name="Egresos" stroke="#E45A49" strokeWidth={3} fillOpacity={1} fill="url(#colorEgresos)" />
                    <Area type="monotone" dataKey="devoluciones" name="Devoluciones" stroke="#F1A31D" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDevoluciones)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 md:p-6 flex flex-col">
              <h2 className="text-[13px] md:text-[15px] font-medium text-[#64748b] mb-6">Comparativa Mensual</h2>
              <div className="flex-1 min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.chartEvolucion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
                      itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}
                    />
                    <Legend content={renderLegend} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#27AE60" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="egresos" name="Egresos" fill="#E45A49" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="devoluciones" name="Devoluciones" fill="#F1A31D" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
