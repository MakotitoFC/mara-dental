"use client";

import { useEffect, useState, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { getDashboardMetricsAction } from "../admin.actions";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#0891b2", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sedeId, setSedeId] = useState<number | "all">("all");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getDashboardMetricsAction({}, sedeId === "all" ? undefined : sedeId);
      setData(res);
      setLoading(false);
    }
    loadData();
  }, [sedeId]);

  const gananciasMensuales = useMemo(() => {
    if (!data) return [];
    // Agrupar por mes
    const map = new Map<string, any>();
    for (const d of data.ganancias) {
      const mesStr = new Date(d.mes).toLocaleDateString("es-PE", { month: "short", year: "numeric" });
      if (!map.has(mesStr)) {
        map.set(mesStr, { name: mesStr });
      }
      const entry = map.get(mesStr);
      entry[d.sede_nombre] = (entry[d.sede_nombre] || 0) + Number(d.total_ganancias);
    }
    return Array.from(map.values());
  }, [data]);

  const pacientesNuevos = useMemo(() => {
    if (!data) return [];
    // Agrupar por mes
    const map = new Map<string, any>();
    for (const d of data.pacientes) {
      const mesStr = new Date(d.mes).toLocaleDateString("es-PE", { month: "short", year: "numeric" });
      const sedeNombre = data.sedes.find((s:any) => s.id === d.sede_id)?.nombre_clinica || "Sede";
      if (!map.has(mesStr)) {
        map.set(mesStr, { name: mesStr });
      }
      const entry = map.get(mesStr);
      entry[sedeNombre] = (entry[sedeNombre] || 0) + Number(d.total_pacientes);
    }
    return Array.from(map.values());
  }, [data]);

  const citasData = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    for (const d of data.citas) {
      map.set(d.estado, (map.get(d.estado) || 0) + Number(d.total_citas));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [data]);

  const totalIngresos = useMemo(() => {
    if (!data) return 0;
    return data.ganancias.reduce((acc: number, val: any) => acc + Number(val.total_ganancias), 0);
  }, [data]);

  const sedesList = useMemo(() => {
    if(!data) return [];
    return Array.from(new Set(data.ganancias.map((d:any)=>d.sede_nombre)));
  },[data]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <div className="w-8 h-8 border-2 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-sm">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
      
      {/* Cabecera y Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Control Multi-Sucursal</h1>
          <p className="text-sm text-slate-500">Métricas consolidadas y rendimiento financiero.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center px-3 gap-2 border-r border-slate-100">
            <Icon name="location_on" size={16} className="text-slate-400" />
            <select
              value={sedeId}
              onChange={e => setSedeId(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none pr-2 py-1 cursor-pointer"
            >
              <option value="all">Todas las Sedes</option>
              {data.sedes.map((s: any) => (
                <option key={s.id} value={s.id}>{s.nombre_clinica}</option>
              ))}
            </select>
          </div>
          <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <Icon name="calendar_today" size={15} />
            Este Año
          </button>
        </div>
      </div>

      {/* Tarjetas de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Ingresos Totales"
          value={`S/ ${totalIngresos.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`}
          icon="payments"
          trend="+12% mes anterior"
          color="cyan"
        />
        <KpiCard
          title="Pacientes Nuevos"
          value={data.pacientes.reduce((acc: number, val: any) => acc + Number(val.total_pacientes), 0).toString()}
          icon="person_add"
          trend="+5% mes anterior"
          color="violet"
        />
        <KpiCard
          title="Total de Citas"
          value={data.citas.reduce((acc: number, val: any) => acc + Number(val.total_citas), 0).toString()}
          icon="calendar_month"
          trend="8% canceladas"
          color="emerald"
        />
        <KpiCard
          title="Sedes Activas"
          value={data.sedes.length.toString()}
          icon="medical_services"
          trend="100% operativas"
          color="orange"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ingresos Mensuales */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Icon name="monitoring" size={18} className="text-cyan-600" />
            Ingresos Mensuales por Sede
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gananciasMensuales} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={v => `S/${v/1000}k`} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                {sedesList.map((sede:any, index:number) => (
                   <Bar key={sede} dataKey={sede} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} barSize={32} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución de Citas */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Icon name="analytics" size={18} className="text-violet-600" />
            Tasa de Ocupación
          </h2>
          <div className="h-[260px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={citasData} innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
                  {citasData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-slate-800">{citasData.reduce((a,b)=>a+b.value,0)}</span>
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Citas</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {citasData.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-600 capitalize">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </div>

        {/* Tendencia de Pacientes */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Icon name="groups" size={18} className="text-emerald-600" />
            Captación de Pacientes Nuevos
          </h2>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pacientesNuevos} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip cursor={{ stroke: "#e2e8f0", strokeWidth: 2 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                {sedesList.map((sede:any, index:number) => (
                   <Line key={sede} type="monotone" dataKey={sede} stroke={COLORS[index % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, trend, color }: { title: string; value: string; icon: string; trend: string; color: "cyan" | "violet" | "emerald" | "orange" }) {
  const colorMap = {
    cyan: "bg-cyan-50 text-cyan-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
  };
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon name={icon} size={20} />
        </div>
        <span className="text-[11px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-md">Hoy</span>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-800 leading-tight mb-1">{value}</p>
        <p className="text-sm font-semibold text-slate-500">{title}</p>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100">
        <p className="text-xs font-medium text-slate-400">{trend}</p>
      </div>
    </div>
  );
}
