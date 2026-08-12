"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart, AreaChart, Area, Cell
} from "recharts";

const COLORS = ["#0891b2", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#f97316"];
const POS_COLOR = "#10b981"; 
const NEG_COLOR = "#ef4444"; 

interface DashboardChartsProps {
  data: any;
  options: any;
  userRole: string;
  userSedeId: number;
}

export default function DashboardCharts({ data, options, userRole, userSedeId }: DashboardChartsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentFiltro = searchParams.get("filtro") || "mes";
  const currentFecha = searchParams.get("fecha") || new Date().toISOString().split("T")[0];
  const currentAgrupacion = searchParams.get("agrupacion") || "dia";
  const currentSedeId = searchParams.get("sedeId") ? Number(searchParams.get("sedeId")) : userSedeId;
  const currentMoneda = searchParams.get("monedaId") ? Number(searchParams.get("monedaId")) : 1;
  const currentMedioPago = searchParams.get("medioPagoId") || "all";

  const updateParams = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.keys(newParams).forEach(key => {
      if (newParams[key] === null) {
        params.delete(key);
      } else {
        params.set(key, newParams[key] as string);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const chartTasaMedicos = useMemo(() => {
    return data.tasaMedicos.map((d: any) => ({
      name: d.doctor,
      Hecho: Number(d.tasa_hecho) * 100,
      Programada: Number(d.tasa_programada) * 100,
      Cancelada: Number(d.tasa_cancelada) * 100,
    }));
  }, [data.tasaMedicos]);

  const [dateInput, setDateInput] = useState(currentFecha);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activeZoomedKey, setActiveZoomedKey] = useState<string | null>(null);
  const [selectedKpis, setSelectedKpis] = useState({
    finanzas: true,
    ticket: true,
    conversion: true,
    egresos: true,
    nuevos: true,
    tasasSede: true,
    rankingMedicos: true,
    ocupacion: true,
    topTratamientos: true,
  });

  useEffect(() => {
    try {
      if (activeZoomedKey) {
        if (typeof screen !== "undefined" && screen.orientation && (screen.orientation as any).lock) {
          const res = (screen.orientation as any).lock("landscape");
          if (res && typeof res.catch === "function") {
            res.catch(() => {});
          }
        }
      } else {
        if (typeof screen !== "undefined" && screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      }
    } catch {
      // Ignorar si la API de orientación no es soportada en este entorno
    }
  }, [activeZoomedKey]);

  const handleApplyDate = (filtro: string, fecha: string) => {
    let agrup = currentAgrupacion;
    if (filtro === 'dia') agrup = 'dia';
    if (filtro === 'mes' && agrup === 'anio') agrup = 'dia'; 
    if (filtro === 'anio' && agrup === 'anio') agrup = 'mes'; 
    updateParams({ filtro, fecha, agrupacion: agrup });
  };

  const handlePrint = () => {
    setIsPrintModalOpen(false);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto w-full flex flex-col gap-6 relative">
      
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Seleccionar KPIs para imprimir</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.keys(selectedKpis).map((kpi) => (
                <label key={kpi} className="flex items-center gap-2 text-sm capitalize font-medium text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={(selectedKpis as any)[kpi]} 
                    onChange={(e) => setSelectedKpis({...selectedKpis, [kpi]: e.target.checked})} 
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  {kpi.replace(/([A-Z])/g, ' $1')}
                </label>
              ))}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setIsPrintModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancelar</button>
              <button onClick={handlePrint} className="px-5 py-2 text-sm font-bold bg-cyan-600 hover:bg-cyan-700 transition-colors text-white rounded-lg shadow-sm">Imprimir</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER & FILTERS */}
      <div className="flex flex-col gap-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        {/* Top Header Row */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Icon name="space_dashboard" size={28} className="text-cyan-600" />
              Dashboard Directivo
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Análisis de rendimiento, finanzas y operaciones.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
            {/* Sede Selector (Superadmin only) */}
            {userRole === "superadmin" ? (
              <div className="flex items-center bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <Icon name="location_on" size={18} className="text-cyan-600 mr-2" />
                <select
                  value={currentSedeId}
                  onChange={e => updateParams({ sedeId: e.target.value })}
                  className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  {options.sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre_clinica}</option>)}
                </select>
              </div>
            ) : (
              <div className="flex items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <Icon name="location_on" size={18} className="text-cyan-600 mr-2" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {options.sedes.find((s:any) => s.id === userSedeId)?.nombre_clinica || "Sede"}
                </span>
              </div>
            )}

            <button onClick={() => setIsPrintModalOpen(true)} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm shadow-sm">
              <Icon name="print" size={18} /> Generar Reporte
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Bloque 1: Rango de Tiempo & Presets (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="calendar_month" size={16} className="text-cyan-600" />
                Período de Análisis
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Selecciona un preset o personaliza</span>
            </div>

            {/* Presets Rápidos */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "hoy", label: "Hoy", filtro: "dia", agrupacion: "dia" },
                { id: "mes_actual", label: "Este Mes", filtro: "mes", agrupacion: "dia" },
                { id: "anio_actual", label: "Este Año", filtro: "anio", agrupacion: "mes" },
                { id: "todos", label: "Histórico (Todo)", filtro: "todos", agrupacion: "mes" },
              ].map((p) => {
                const todayStr = new Date().toISOString().split("T")[0];
                const isSelected = currentFiltro === p.filtro && currentFecha === todayStr;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setDateInput(todayStr);
                      updateParams({ filtro: p.filtro, fecha: todayStr, agrupacion: p.agrupacion });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-cyan-600 text-white shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Sub-controles Personalizados */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex-1">
                <span className="text-xs text-slate-400 font-medium">Filtro:</span>
                <select 
                  value={currentFiltro}
                  onChange={e => {
                    const f = e.target.value;
                    handleApplyDate(f, dateInput);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer w-full"
                >
                  <option value="dia">Por Día Específico</option>
                  <option value="mes">Por Mes Específico</option>
                  <option value="anio">Por Año Específico</option>
                  <option value="todos">Histórico (Sin límite)</option>
                </select>
              </div>

              {currentFiltro !== 'todos' && (
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <input 
                    type={currentFiltro === 'dia' ? 'date' : currentFiltro === 'mes' ? 'month' : 'number'} 
                    value={dateInput}
                    onChange={e => setDateInput(e.target.value)}
                    onBlur={() => handleApplyDate(currentFiltro, dateInput)}
                    onKeyDown={e => e.key === 'Enter' && handleApplyDate(currentFiltro, dateInput)}
                    className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none w-full sm:w-32 placeholder-slate-400"
                    placeholder={currentFiltro === 'anio' ? 'Ej: 2026' : ''}
                  />
                </div>
              )}

              {/* Granularidad / Agrupar Por Toggle */}
              <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 ml-auto">
                <span className="text-[11px] font-bold text-slate-400 px-2">Agrupar por:</span>
                <div className="flex gap-1">
                  {[
                    { id: "dia", label: "Día", disabled: currentFiltro === "anio" || currentFiltro === "todos" },
                    { id: "mes", label: "Mes", disabled: currentFiltro === "dia" },
                    { id: "anio", label: "Año", disabled: currentFiltro === "dia" || currentFiltro === "mes" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      disabled={g.disabled}
                      onClick={() => updateParams({ agrupacion: g.id })}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        currentAgrupacion === g.id
                          ? "bg-slate-900 text-white dark:bg-cyan-600"
                          : g.disabled
                          ? "opacity-30 cursor-not-allowed text-slate-400"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 2: Filtros Financieros (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="payments" size={16} className="text-amber-500" />
                Filtros Financieros
              </span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                Afecta: Finanzas, Egresos, Ticket Promedio
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="flex flex-col gap-1 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <label className="text-[11px] font-medium text-slate-400">Moneda</label>
                <select
                  value={currentMoneda}
                  onChange={e => updateParams({ monedaId: e.target.value })}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  {options.monedas.map((m: any) => <option key={m.id} value={m.id}>{m.moneda}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <label className="text-[11px] font-medium text-slate-400">Medio de Pago</label>
                <select
                  value={currentMedioPago}
                  onChange={e => updateParams({ medioPagoId: e.target.value === "all" ? null : e.target.value })}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="all">Todos los medios</option>
                  {options.mediosPago.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de Filtros Activos (Chips Bar) */}
        <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Icon name="filter_alt" size={14} /> Filtros Activos:
          </span>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold border border-slate-200 dark:border-slate-700">
            📅 Período: {currentFiltro === "dia" ? `Día (${dateInput})` : currentFiltro === "mes" ? `Mes (${dateInput})` : currentFiltro === "anio" ? `Año (${dateInput})` : "Histórico Completo"}
          </span>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold border border-slate-200 dark:border-slate-700">
            📊 Agrupación: {currentAgrupacion === "dia" ? "Por Día" : currentAgrupacion === "mes" ? "Por Mes" : "Por Año"}
          </span>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold border border-slate-200 dark:border-slate-700">
            💵 Moneda: {options.monedas.find((m: any) => m.id === currentMoneda)?.moneda || "PEN"}
          </span>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold border border-slate-200 dark:border-slate-700">
            💳 Medio de Pago: {currentMedioPago === "all" ? "Todos los medios" : options.mediosPago.find((m: any) => String(m.id) === String(currentMedioPago))?.nombre || "Todos"}
          </span>
        </div>
      </div>

      {/* HEADER DE IMPRESION (PÁGINA 1 DEL PDF / COPERTURA CON FILTROS ACTIVOS) */}
      <div className="hidden print:block mb-6 p-6 bg-slate-50 border-2 border-slate-800 rounded-xl print:break-after-always">
        <div className="flex justify-between items-start border-b border-slate-300 pb-4 mb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reporte de Gestión y Operaciones Directivas</h1>
            <p className="text-base font-bold text-cyan-800 mt-1">Sede: {options.sedes.find((s:any) => s.id === currentSedeId)?.nombre_clinica || "Todas las sedes"}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-500 uppercase">Documento Oficial</span>
            <p suppressHydrationWarning className="text-xs font-semibold text-slate-700 mt-1">Emisión: {new Date().toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1">1. Parámetros de Tiempo y Granularidad</h3>
            <p><span className="font-bold text-slate-700">Período de Análisis:</span> {currentFiltro === "dia" ? `Día Específico (${dateInput})` : currentFiltro === "mes" ? `Mes Específico (${dateInput})` : currentFiltro === "anio" ? `Año Específico (${dateInput})` : "Histórico Completo (Sin límite)"}</p>
            <p><span className="font-bold text-slate-700">Granularidad (Agrupar por):</span> {currentAgrupacion === "dia" ? "Por Día" : currentAgrupacion === "mes" ? "Por Mes" : "Por Año"}</p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1">2. Filtros Financieros Activos</h3>
            <p><span className="font-bold text-slate-700">Moneda de Análisis:</span> {options.monedas.find((m: any) => m.id === currentMoneda)?.moneda || "PEN"}</p>
            <p><span className="font-bold text-slate-700">Medio de Pago:</span> {currentMedioPago === "all" ? "Todos los medios de pago" : options.mediosPago.find((m: any) => String(m.id) === String(currentMedioPago))?.nombre || "Todos"}</p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">3. KPIs y Gráficos Incluidos en este Informe</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {selectedKpis.finanzas && <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded font-semibold border border-slate-300">✓ Balance Financiero</span>}
            {selectedKpis.ticket && <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded font-semibold border border-slate-300">✓ Ticket Promedio</span>}
            {selectedKpis.conversion && <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded font-semibold border border-slate-300">✓ Conversión Presupuestos</span>}
            {selectedKpis.egresos && <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded font-semibold border border-slate-300">✓ Distribución Egresos</span>}
            {selectedKpis.nuevos && <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded font-semibold border border-slate-300">✓ Captación Pacientes</span>}
            {selectedKpis.tasasSede && <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded font-semibold border border-slate-300">✓ Tasas de Sede</span>}
            {selectedKpis.rankingMedicos && <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded font-semibold border border-slate-300">✓ Ranking por Médico</span>}
            {selectedKpis.ocupacion && <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded font-semibold border border-slate-300">✓ Ocupación Médica</span>}
            {selectedKpis.topTratamientos && <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded font-semibold border border-slate-300">✓ Top 5 Tratamientos</span>}
          </div>
        </div>
      </div>

      {/* PRINT MEDIA STYLES FOR LANDSCAPE AND FULL PAGE CHARTS */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape !important;
            margin: 0.4cm !important;
          }
          body, html, main {
            background: white !important;
            color: black !important;
            height: auto !important;
            overflow: visible !important;
          }
          .print\:hidden, nav, header, aside, button, [role="navigation"] {
            display: none !important;
          }
          .print-page-chart {
            page-break-before: always !important;
            break-before: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            height: 90vh !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            margin-bottom: 0 !important;
            padding: 1.5rem !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
          .print-page-chart:first-child {
            page-break-before: auto !important;
            break-before: auto !important;
          }
        }
      `}</style>

      {/* CHARTS GRID (Requested Order) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:w-full">
        
        {/* 4. Finanzas */}
        <div className={`print-page-chart ${!selectedKpis.finanzas ? 'print:hidden' : ''}`}>
          <ChartCard title="Balance Financiero (Ingresos/Egresos/Ganancias)" icon="account_balance" onExpand={() => setActiveZoomedKey("finanzas")}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.finanzas}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "8px" }} formatter={(val: any) => val?.toLocaleString?.() ?? String(val)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#3b82f6" radius={[4,4,0,0]} barSize={15} />
                <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[4,4,0,0]} barSize={15} />
                <Bar dataKey="ganancias" name="Ganancias" fill="#10b981" radius={[4,4,0,0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 8. Ticket promedio */}
        <div className={`print-page-chart ${!selectedKpis.ticket ? 'print:hidden' : ''}`}>
          <ChartCard title="Ticket Promedio y Volumen de Ingresos" icon="point_of_sale" onExpand={() => setActiveZoomedKey("ticket")}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.ticketPromedio}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "8px" }} formatter={(val: any) => val?.toLocaleString?.() ?? String(val)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar yAxisId="left" dataKey="ingreso_total" name="Ingreso Total" fill="#8b5cf6" radius={[4,4,0,0]} barSize={30} />
                <Line yAxisId="right" type="monotone" dataKey="ticket_promedio" name="Ticket Promedio" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 7. Tasa de conversión */}
        <div className={`print-page-chart ${!selectedKpis.conversion ? 'print:hidden' : ''}`}>
          <ChartCard title="Conversión de Presupuestos (% Aprobación)" icon="price_check" onExpand={() => setActiveZoomedKey("conversion")}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.tasaAprobacion}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "8px" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar yAxisId="left" dataKey="total_presupuestos" name="Total Emitidos" fill="#94a3b8" radius={[4,4,0,0]} barSize={20} />
                <Bar yAxisId="left" dataKey="total_aprobados" name="Aprobados" fill="#3b82f6" radius={[4,4,0,0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="tasa_aprobacion" name="% Aprobación" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 5. Gastos por categoría */}
        <div className={`print-page-chart ${!selectedKpis.egresos ? 'print:hidden' : ''}`}>
          <ChartCard title="Distribución de Egresos por Categoría" icon="receipt_long" onExpand={() => setActiveZoomedKey("egresos")}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.egresos} layout="vertical" margin={{ left: 50, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="categoria" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px" }} formatter={(val: any) => val?.toLocaleString?.() ?? String(val)} />
                <Bar dataKey="total_gastado" name="Gastado" fill="#f97316" radius={[0,4,4,0]} barSize={20}>
                   {data.egresos.map((e:any, i:number) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 3. Pacientes nuevos */}
        <div className={`print-page-chart ${!selectedKpis.nuevos ? 'print:hidden' : ''}`}>
          <ChartCard title="Captación de Pacientes (Nuevos por periodo)" icon="group_add" onExpand={() => setActiveZoomedKey("nuevos")}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.pacientesNuevos}>
                <defs>
                  <linearGradient id="colorNuevos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ stroke: "#e2e8f0", strokeWidth: 2 }} contentStyle={{ borderRadius: "8px" }} />
                <Area type="monotone" dataKey="cantidad_nuevos" name="Nuevos Pacientes" stroke="#0891b2" strokeWidth={3} fillOpacity={1} fill="url(#colorNuevos)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 2. Tasas de sede */}
        <div className={`print-page-chart ${!selectedKpis.tasasSede ? 'print:hidden' : ''}`}>
          <ChartCard title="Evolución de Tasas de Atención de la Sede" icon="timeline" onExpand={() => setActiveZoomedKey("tasasSede")}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.tasaSede}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
                <Tooltip cursor={{ stroke: "#e2e8f0", strokeWidth: 2 }} contentStyle={{ borderRadius: "8px" }} formatter={(val: any) => typeof val === "number" ? `${(val*100).toFixed(0)}%` : String(val)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="tasa_hecho" name="Hecho" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="tasa_programada" name="Programada" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="tasa_cancelada" name="Cancelada" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 1. Tasas medicos */}
        <div className={`print-page-chart ${!selectedKpis.rankingMedicos ? 'print:hidden' : ''}`}>
          <ChartCard title="Ranking de Atención por Médico" icon="how_to_reg" onExpand={() => setActiveZoomedKey("rankingMedicos")}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartTasaMedicos} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px" }} formatter={(val: any) => typeof val === "number" ? `${val.toFixed(0)}%` : String(val)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Hecho" stackId="a" fill="#10b981" barSize={20} radius={[0,0,0,0]} />
                <Bar dataKey="Programada" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Cancelada" stackId="a" fill="#ef4444" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 9. Ocupación médico */}
        <div className={`print-page-chart ${!selectedKpis.ocupacion ? 'print:hidden' : ''}`}>
          <ChartCard title="Ocupación por Médico" icon="event_available" onExpand={() => setActiveZoomedKey("ocupacion")}>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={data.ocupacion} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="medico" 
                  tick={{ fontSize: 11, fill: "#64748b" }} 
                  axisLine={false} 
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={75}
                />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "8px" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Bar dataKey="horas_reservadas" name="Hrs. Reservadas" stackId="a" fill="#14b8a6" radius={[0,0,0,0]} barSize={30} />
                <Bar dataKey="horas_capacidad" name="Hrs. Libres" stackId="a" fill="#e2e8f0" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 6. Top 5 Tratamientos */}
        <div className={`print-page-chart lg:col-span-2 ${!selectedKpis.topTratamientos ? 'print:hidden' : ''}`}>
          <ChartCard title="Top 5 Tratamientos (Más y Menos Frecuentes)" icon="medical_services" onExpand={() => setActiveZoomedKey("topTratamientos")}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.tratamientos} layout="vertical" margin={{ left: 50, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nombre_tratamiento" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={150} />
                <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px" }} />
                <Bar dataKey="cantidad" name="Cantidad" radius={[0,4,4,0]} barSize={20}>
                  {data.tratamientos.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.clasificacion === "Más Frecuentes" ? POS_COLOR : NEG_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

      </div>

      {/* MODAL FULLSCREEN DE ZOOM DE GRÁFICO */}
      {activeZoomedKey && (
        <div 
          className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-md p-3 sm:p-6 flex flex-col justify-between animate-in fade-in duration-200 print:hidden"
          onClick={() => setActiveZoomedKey(null)}
        >
          <div className="w-full flex flex-col h-full max-w-[1600px] mx-auto" onClick={e => e.stopPropagation()}>
            {/* Top Bar Modal */}
            <div className="flex items-center justify-between bg-slate-900/90 p-4 rounded-xl border border-slate-800 mb-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
                  <Icon name="space_dashboard" size={24} />
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-bold text-white">
                    {getChartTitle(activeZoomedKey)}
                  </h2>
                  <p className="text-xs text-slate-400 hidden sm:block">Vista en pantalla completa — Haz clic en X para cerrar</p>
                </div>
              </div>

              {/* Sugerencia Móvil */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded-lg">
                <Icon name="screen_rotation" size={16} />
                <span>Modo Ampliado (Sugerido horizontal en móvil)</span>
              </div>

              <button
                onClick={() => setActiveZoomedKey(null)}
                className="p-2.5 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2 font-bold text-sm"
                title="Cerrar vista ampliada"
              >
                <Icon name="close" size={22} />
                <span className="hidden sm:inline">Cerrar</span>
              </button>
            </div>

            {/* Hint Móvil para pantalla chica */}
            <div className="sm:hidden mb-2 text-center text-xs font-medium text-amber-300 bg-amber-950/80 p-2 rounded-lg border border-amber-800/60 flex items-center justify-center gap-2">
              <Icon name="screen_rotation" size={16} />
              <span>Gira tu celular en modo horizontal para ver los datos más cómodamente</span>
            </div>

            {/* Canvas de gráfico ampliado */}
            <div className="flex-1 w-full bg-slate-900/80 p-4 sm:p-8 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                {renderZoomedChart(activeZoomedKey, data, chartTasaMedicos)}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getChartTitle(key: string): string {
  switch (key) {
    case "finanzas": return "Balance Financiero (Ingresos / Egresos / Ganancias)";
    case "ticket": return "Ticket Promedio y Volumen de Ingresos";
    case "conversion": return "Conversión de Presupuestos (% Aprobación)";
    case "egresos": return "Distribución de Egresos por Categoría";
    case "nuevos": return "Captación de Pacientes (Nuevos por periodo)";
    case "tasasSede": return "Evolución de Tasas de Atención de la Sede";
    case "rankingMedicos": return "Ranking de Atención por Médico";
    case "ocupacion": return "Ocupación por Médico";
    case "topTratamientos": return "Top 5 Tratamientos (Más y Menos Frecuentes)";
    default: return "Detalle de Gráfico";
  }
}

function renderZoomedChart(key: string, data: any, chartTasaMedicos: any) {
  switch (key) {
    case "finanzas":
      return (
        <BarChart data={data.finanzas} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
          <XAxis dataKey="periodo" tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} dy={10} />
          <YAxis tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
          <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} formatter={(val: any) => val?.toLocaleString?.() ?? String(val)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '15px' }} />
          <Bar dataKey="ingresos" name="Ingresos" fill="#3b82f6" radius={[6,6,0,0]} barSize={35} />
          <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[6,6,0,0]} barSize={35} />
          <Bar dataKey="ganancias" name="Ganancias" fill="#10b981" radius={[6,6,0,0]} barSize={35} />
        </BarChart>
      );
    case "ticket":
      return (
        <ComposedChart data={data.ticketPromedio} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
          <XAxis dataKey="periodo" tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} dy={10} />
          <YAxis yAxisId="left" tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} formatter={(val: any) => val?.toLocaleString?.() ?? String(val)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '15px' }} />
          <Bar yAxisId="left" dataKey="ingreso_total" name="Ingreso Total" fill="#8b5cf6" radius={[6,6,0,0]} barSize={45} />
          <Line yAxisId="right" type="monotone" dataKey="ticket_promedio" name="Ticket Promedio" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6 }} activeDot={{ r: 8 }} />
        </ComposedChart>
      );
    case "conversion":
      return (
        <ComposedChart data={data.tasaAprobacion} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
          <XAxis dataKey="periodo" tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} dy={10} />
          <YAxis yAxisId="left" tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
          <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '15px' }} />
          <Bar yAxisId="left" dataKey="total_presupuestos" name="Total Emitidos" fill="#64748b" radius={[6,6,0,0]} barSize={35} />
          <Bar yAxisId="left" dataKey="total_aprobados" name="Aprobados" fill="#3b82f6" radius={[6,6,0,0]} barSize={35} />
          <Line yAxisId="right" type="monotone" dataKey="tasa_aprobacion" name="% Aprobación" stroke="#10b981" strokeWidth={4} dot={{ r: 6 }} activeDot={{ r: 8 }} />
        </ComposedChart>
      );
    case "egresos":
      return (
        <BarChart data={data.egresos} layout="vertical" margin={{ left: 80, right: 30, top: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="categoria" tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} formatter={(val: any) => val?.toLocaleString?.() ?? String(val)} />
          <Bar dataKey="total_gastado" name="Gastado" fill="#f97316" radius={[0,6,6,0]} barSize={30}>
             {data.egresos.map((e:any, i:number) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      );
    case "nuevos":
      return (
        <AreaChart data={data.pacientesNuevos} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="colorNuevosZoom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0891b2" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
          <XAxis dataKey="periodo" tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} dy={10} />
          <YAxis tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ stroke: "#334155", strokeWidth: 2 }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} />
          <Area type="monotone" dataKey="cantidad_nuevos" name="Nuevos Pacientes" stroke="#0891b2" strokeWidth={4} fillOpacity={1} fill="url(#colorNuevosZoom)" />
        </AreaChart>
      );
    case "tasasSede":
      return (
        <LineChart data={data.tasaSede} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
          <XAxis dataKey="periodo" tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} dy={10} />
          <YAxis tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
          <Tooltip cursor={{ stroke: "#334155", strokeWidth: 2 }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} formatter={(val: any) => typeof val === "number" ? `${(val*100).toFixed(0)}%` : String(val)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '15px' }} />
          <Line type="monotone" dataKey="tasa_hecho" name="Hecho" stroke="#10b981" strokeWidth={4} dot={{ r: 5 }} activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="tasa_programada" name="Programada" stroke="#f59e0b" strokeWidth={4} dot={{ r: 5 }} activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="tasa_cancelada" name="Cancelada" stroke="#ef4444" strokeWidth={4} dot={{ r: 5 }} activeDot={{ r: 8 }} />
        </LineChart>
      );
    case "rankingMedicos":
      return (
        <BarChart data={chartTasaMedicos} layout="vertical" margin={{ left: 60, right: 30, top: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} formatter={(val: any) => typeof val === "number" ? `${val.toFixed(0)}%` : String(val)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '15px' }} />
          <Bar dataKey="Hecho" stackId="a" fill="#10b981" barSize={30} radius={[0,0,0,0]} />
          <Bar dataKey="Programada" stackId="a" fill="#f59e0b" />
          <Bar dataKey="Cancelada" stackId="a" fill="#ef4444" radius={[0,6,6,0]} />
        </BarChart>
      );
    case "ocupacion":
      return (
        <BarChart data={data.ocupacion} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
          <XAxis 
            dataKey="medico" 
            tick={{ fontSize: 12, fill: "#cbd5e1" }} 
            axisLine={false} 
            tickLine={false}
            angle={-30}
            textAnchor="end"
            interval={0}
            height={80}
          />
          <YAxis tick={{ fontSize: 13, fill: "#cbd5e1" }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
          <Bar dataKey="horas_reservadas" name="Hrs. Reservadas" stackId="a" fill="#14b8a6" radius={[0,0,0,0]} barSize={45} />
          <Bar dataKey="horas_capacidad" name="Hrs. Libres" stackId="a" fill="#475569" radius={[6,6,0,0]} />
        </BarChart>
      );
    case "topTratamientos":
      return (
        <BarChart data={data.tratamientos} layout="vertical" margin={{ left: 80, right: 30, top: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="nombre_tratamiento" tick={{ fontSize: 12, fill: "#cbd5e1" }} axisLine={false} tickLine={false} width={180} />
          <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} />
          <Bar dataKey="cantidad" name="Cantidad" radius={[0,6,6,0]} barSize={25}>
            {data.tratamientos.map((entry: any, index: number) => (
              <Cell key={`cell-zoom-${index}`} fill={entry.clasificacion === "Más Frecuentes" ? POS_COLOR : NEG_COLOR} />
            ))}
          </Bar>
        </BarChart>
      );
    default:
      return null;
  }
}

function ChartCard({
  title,
  icon,
  children,
  className = "",
  onExpand
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  className?: string;
  onExpand?: () => void;
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 flex flex-col group relative ${className} print:shadow-none print:border print:border-slate-300 print:rounded-none`}>
      <div className="flex items-center justify-between mb-6">
        <h2 onClick={onExpand} className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
          <Icon name={icon} size={18} className="text-slate-400 dark:text-slate-500" />
          {title}
        </h2>
        {onExpand && (
          <button
            onClick={onExpand}
            title="Ampliar gráfico a pantalla completa"
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all opacity-80 group-hover:opacity-100 print:hidden"
          >
            <Icon name="fullscreen" size={20} />
          </button>
        )}
      </div>
      <div className="flex-1 w-full min-h-[300px] cursor-pointer" onClick={onExpand}>
        {children}
      </div>
    </div>
  );
}