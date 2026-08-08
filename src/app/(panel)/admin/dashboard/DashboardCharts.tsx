"use client";

import { useMemo, useState } from "react";
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
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Icon name="space_dashboard" size={28} className="text-cyan-600" />
            Dashboard Directivo
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Análisis de rendimiento, finanzas y operaciones.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <button onClick={() => setIsPrintModalOpen(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium transition-colors mr-2 text-sm">
            <Icon name="print" size={18} /> Generar Reporte
          </button>
          
          {/* Sede Selector (Superadmin only) */}
          {userRole === "superadmin" ? (
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Icon name="location_on" size={16} className="text-slate-400 mr-2" />
              <select
                value={currentSedeId}
                onChange={e => updateParams({ sedeId: e.target.value })}
                className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                {options.sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre_clinica}</option>)}
              </select>
            </div>
          ) : (
             <div className="flex items-center px-3 py-1.5">
               <Icon name="location_on" size={16} className="text-slate-400 mr-2" />
               <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                 {options.sedes.find((s:any) => s.id === userSedeId)?.nombre_clinica || "Sede"}
               </span>
             </div>
          )}

          {/* Filtro Tiempo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 w-full xl:w-auto">
             <div className="flex items-center gap-2 border-b sm:border-b-0 sm:border-r border-slate-300 dark:border-slate-600 pb-2 sm:pb-0 sm:pr-3 w-full sm:w-auto">
               <span className="text-xs text-slate-500 font-medium">Ver:</span>
               <select 
                 value={currentFiltro}
                 onChange={e => {
                   const f = e.target.value;
                   handleApplyDate(f, dateInput);
                 }}
                 className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
               >
                 <option value="dia">Día</option>
                 <option value="mes">Mes</option>
                 <option value="anio">Año</option>
               </select>
             </div>
             
             <div className="flex items-center gap-2 w-full sm:w-auto">
               <input 
                 type={currentFiltro === 'dia' ? 'date' : currentFiltro === 'mes' ? 'month' : 'number'} 
                 value={dateInput}
                 onChange={e => setDateInput(e.target.value)}
                 onBlur={() => handleApplyDate(currentFiltro, dateInput)}
                 onKeyDown={e => e.key === 'Enter' && handleApplyDate(currentFiltro, dateInput)}
                 className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none w-full sm:w-32 placeholder-slate-400"
                 placeholder={currentFiltro === 'anio' ? 'Ej: 2024' : ''}
               />
               <select 
                 value={currentAgrupacion}
                 onChange={e => updateParams({ agrupacion: e.target.value })}
                 className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none border-l border-slate-300 dark:border-slate-600 pl-3 cursor-pointer ml-auto sm:ml-0"
               >
                 <option value="dia" disabled={currentFiltro === 'anio'}>Por Día</option>
                 <option value="mes">Por Mes</option>
                 <option value="anio" disabled={currentFiltro !== 'anio'}>Por Año</option>
               </select>
             </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 w-full xl:w-auto">
             <select
                value={currentMoneda}
                onChange={e => updateParams({ monedaId: e.target.value })}
                className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none sm:border-r border-slate-300 dark:border-slate-600 sm:pr-3 cursor-pointer w-full sm:w-auto pb-2 sm:pb-0 border-b sm:border-b-0"
              >
                {options.monedas.map((m: any) => <option key={m.id} value={m.id}>{m.moneda}</option>)}
              </select>
              <select
                value={currentMedioPago}
                onChange={e => updateParams({ medioPagoId: e.target.value === "all" ? null : e.target.value })}
                className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none sm:pl-1 cursor-pointer w-full sm:w-auto pt-1 sm:pt-0"
              >
                <option value="all">Todos los pagos</option>
                {options.mediosPago.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
          </div>
        </div>
      </div>

      {/* HEADER DE IMPRESION (SOLO VISIBLE EN PDF) */}
      <div className="hidden print:block mb-6 border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-black text-slate-900">Reporte de Gestión y Operaciones</h1>
        <p className="text-slate-600 font-bold text-sm">Sede: {options.sedes.find((s:any) => s.id === currentSedeId)?.nombre_clinica || "Todas"}</p>
        <p className="text-slate-500 text-xs">Periodo Analizado: {dateInput} | Agrupación: {currentAgrupacion}</p>
        <p className="text-slate-400 text-[10px] mt-1">Generado el: {new Date().toLocaleString()}</p>
      </div>

      {/* CHARTS GRID (Requested Order) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print:w-full print:block">
        
        {/* 4. Finanzas */}
        <div className={`break-inside-avoid print:mb-4 ${!selectedKpis.finanzas ? 'hidden print:hidden' : ''}`}>
          <ChartCard title="Balance Financiero (Ingresos/Egresos/Ganancias)" icon="account_balance">
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
        <div className={`break-inside-avoid print:mb-4 ${!selectedKpis.ticket ? 'hidden print:hidden' : ''}`}>
          <ChartCard title="Ticket Promedio y Volumen de Ingresos" icon="point_of_sale">
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
        <div className={`break-inside-avoid print:mb-4 ${!selectedKpis.conversion ? 'hidden print:hidden' : ''}`}>
          <ChartCard title="Conversión de Presupuestos (% Aprobación)" icon="price_check">
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
        <div className={`break-inside-avoid print:mb-4 ${!selectedKpis.egresos ? 'hidden print:hidden' : ''}`}>
          <ChartCard title="Distribución de Egresos por Categoría" icon="receipt_long">
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
        <div className={`break-inside-avoid print:mb-4 ${!selectedKpis.nuevos ? 'hidden print:hidden' : ''}`}>
          <ChartCard title="Captación de Pacientes (Nuevos por periodo)" icon="group_add">
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
        <div className={`break-inside-avoid print:mb-4 ${!selectedKpis.tasasSede ? 'hidden print:hidden' : ''}`}>
          <ChartCard title="Evolución de Tasas de Atención de la Sede" icon="timeline">
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
        <div className={`break-inside-avoid print:mb-4 ${!selectedKpis.rankingMedicos ? 'hidden print:hidden' : ''}`}>
          <ChartCard title="Ranking de Atención por Médico" icon="how_to_reg">
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
        <div className={`break-inside-avoid print:mb-4 ${!selectedKpis.ocupacion ? 'hidden print:hidden' : ''}`}>
          <ChartCard title="Ocupación por Médico" icon="event_available">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.ocupacion}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="medico" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "8px" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="horas_reservadas" name="Hrs. Reservadas" stackId="a" fill="#14b8a6" radius={[0,0,0,0]} barSize={30} />
                <Bar dataKey="horas_capacidad" name="Hrs. Libres" stackId="a" fill="#e2e8f0" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 6. Top 5 Tratamientos */}
        <div className={`break-inside-avoid print:mb-4 lg:col-span-2 print:col-span-2 ${!selectedKpis.topTratamientos ? 'hidden print:hidden' : ''}`}>
          <ChartCard title="Top 5 Tratamientos (Más y Menos Frecuentes)" icon="medical_services">
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
    </div>
  );
}

function ChartCard({ title, icon, children, className = "" }: { title: string; icon: string; children: React.ReactNode; className?: string; }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 flex flex-col ${className} print:shadow-none print:border print:border-slate-300 print:rounded-none`}>
      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
        <Icon name={icon} size={18} className="text-slate-400 dark:text-slate-500" />
        {title}
      </h2>
      <div className="flex-1 w-full min-h-[300px]">
        {children}
      </div>
    </div>
  );
}