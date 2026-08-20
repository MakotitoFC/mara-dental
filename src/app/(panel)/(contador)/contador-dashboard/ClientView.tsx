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
      <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 md:p-8 no-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">Resumen Financiero</h1>
              <p className="text-[13px] md:text-sm text-slate-500">Indicadores clave y evolución de la clínica.</p>
            </div>
            <div className="shrink-0 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Actualizado en Vivo
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] md:text-[12px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1 md:mb-2">
                <Icon name="trending_up" size={16} className="text-emerald-500" /> Ingresos Mes
              </span>
              <span className="text-lg md:text-2xl font-bold font-mono text-emerald-600 truncate">
                S/ {data?.kpis.ingresosMes.toFixed(2)}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] md:text-[12px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1 md:mb-2">
                <Icon name="trending_down" size={16} className="text-rose-500" /> Egresos Mes
              </span>
              <span className="text-lg md:text-2xl font-bold font-mono text-rose-600 truncate">
                S/ {data?.kpis.egresosMes.toFixed(2)}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] md:text-[12px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1 md:mb-2">
                <Icon name="assignment_return" size={16} className="text-amber-500" /> Devoluciones
              </span>
              <span className="text-lg md:text-2xl font-bold font-mono text-amber-600 truncate">
                S/ {(data?.kpis.devolucionesMes ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] md:text-[12px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1 md:mb-2">
                <Icon name="account_balance_wallet" size={16} className="text-cyan-500" /> Balance Mes
              </span>
              <span className={`text-lg md:text-2xl font-bold font-mono truncate ${data?.kpis.balanceMes >= 0 ? "text-slate-800" : "text-rose-600"}`}>
                S/ {data?.kpis.balanceMes.toFixed(2)}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="text-[11px] md:text-[12px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1 md:mb-2">
                <Icon name="pending_actions" size={16} className="text-blue-500" /> Por Cobrar
              </span>
              <span className="text-lg md:text-2xl font-bold font-mono text-blue-600 truncate">
                S/ {data?.kpis.totalPorCobrar.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col">
              <h2 className="text-[14px] md:text-base font-bold text-slate-800 mb-6">Evolución de Ingresos y Egresos (6 meses)</h2>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.chartEvolucion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDevoluciones" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                      labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                    <Area type="monotone" dataKey="egresos" name="Egresos" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorEgresos)" />
                    <Area type="monotone" dataKey="devoluciones" name="Devoluciones" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDevoluciones)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col">
              <h2 className="text-[14px] md:text-base font-bold text-slate-800 mb-6">Comparativa Mensual</h2>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.chartEvolucion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                      labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="egresos" name="Egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="devoluciones" name="Devoluciones" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
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
