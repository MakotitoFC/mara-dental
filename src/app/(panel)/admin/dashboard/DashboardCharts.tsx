"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart, AreaChart, Area, Cell
} from "recharts";

const COLORS = ["#0891b2", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#f97316"];
const POS_COLOR = "#10b981";
const NEG_COLOR = "#ef4444";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

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
  const [subFiltrosOpen, setSubFiltrosOpen] = useState(false);
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

  const KPI_META: Record<string, { label: string; icon: string }> = {
    finanzas: { label: "Finanzas", icon: "account_balance" },
    ticket: { label: "Ticket Promedio", icon: "point_of_sale" },
    conversion: { label: "Conversión", icon: "price_check" },
    egresos: { label: "Egresos", icon: "receipt_long" },
    nuevos: { label: "Pacientes Nuevos", icon: "group_add" },
    tasasSede: { label: "Tasas de Sede", icon: "timeline" },
    rankingMedicos: { label: "Ranking de Médicos", icon: "military_tech" },
    ocupacion: { label: "Ocupación", icon: "event_available" },
    topTratamientos: { label: "Top Tratamientos", icon: "medical_services" },
  };

  const handlePrint = () => {
    setIsPrintModalOpen(false);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50 relative">

      <AnimatePresence>
        {isPrintModalOpen && (
          <ResponsiveSheet
            onClose={() => setIsPrintModalOpen(false)}
            title="Seleccionar KPIs para imprimir"
            footer={
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsPrintModalOpen(false)} className="px-5 py-2 text-[13px] font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
                <button onClick={handlePrint} className="px-5 py-2 text-[13px] font-semibold bg-cyan-600 hover:bg-cyan-700 transition-colors text-white rounded-xl shadow-sm">Imprimir</button>
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {Object.keys(selectedKpis).map((kpi) => {
                const meta = KPI_META[kpi] ?? { label: kpi, icon: "bar_chart" };
                const checked = (selectedKpis as any)[kpi];
                return (
                  <button
                    key={kpi}
                    type="button"
                    onClick={() => setSelectedKpis({ ...selectedKpis, [kpi]: !checked })}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
                  >
                    <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      checked ? "bg-cyan-600 border-cyan-600" : "border-slate-300"
                    }`}>
                      {checked && <Icon name="check" size={13} className="text-white" />}
                    </span>
                    <Icon name={meta.icon} size={16} className="text-slate-400 shrink-0" />
                    <span className="text-[12.5px] text-slate-700 font-medium">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </ResponsiveSheet>
        )}
      </AnimatePresence>

      {/* HEADER & FILTERS — mismo esqueleto que ConfiguracionTiposClient.tsx:
          <header> fijo (bg-white, solo border-b, sin rounded ni sombra),
          fuera del área que scrollea. Solo el navbar superior global
          (Header.tsx) es sticky — este encabezado no lo es. */}
      <header className="shrink-0 flex flex-col gap-3 sm:gap-4 lg:gap-5 bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 sm:py-6 border-b border-slate-200 dark:border-slate-800 print:hidden">
        {/* Top Header Row — título+botón siempre en la misma línea (incluso
            en tablet/mobile); el selector de sede (superadmin) va en su
            propia fila debajo cuando aplica, para no forzar el salto de
            línea del botón principal. */}
        <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between gap-3">
            {/* En mobile solo el título — ícono y descripción se ocultan
                (hidden sm:flex / hidden sm:block) para que el encabezado no
                ocupe tanto alto, igual que en las capturas. */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                <Icon name="space_dashboard" size={24} />
              </div>
              <div className="min-w-0">
                <h1 className="text-[15px] md:text-base font-bold text-slate-800 dark:text-slate-100">Dashboard Directivo</h1>
                <p className="hidden sm:block text-[13px] md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Análisis de rendimiento, finanzas y operaciones.</p>
              </div>
            </div>

            <button onClick={() => setIsPrintModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-medium transition-colors text-[13px] md:text-sm shadow-sm shrink-0">
              <Icon name="print" size={16} className="sm:hidden" />
              <Icon name="print" size={18} className="hidden sm:inline" />
              <span className="sm:hidden">Reporte</span>
              <span className="hidden sm:inline">Generar Reporte</span>
            </button>
          </div>

        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:gap-4 items-start">
          {/* Bloque 1: Rango de Tiempo & Presets (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 sm:p-3 lg:p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="calendar_month" size={16} className="text-cyan-600" />
                Período de Análisis
              </span>
              <span className="text-[11px] md:text-xs text-slate-400 font-medium">Selecciona un preset o personaliza</span>
            </div>

            {/* Presets Rápidos + botón de filtro (tablet/mobile) en la misma
                fila — antes el ícono de filtro quedaba suelto debajo, en su
                propia línea, desperdiciando espacio vertical. */}
            <div className="flex items-center justify-between gap-2">
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
                      className={`px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-semibold transition-all ${
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

              {/* Mismo botón cuadrado de ícono que en la vista de Personal
                  (no un botón de texto completo) para tablet/mobile. */}
              <button
                type="button"
                onClick={() => setSubFiltrosOpen((o) => !o)}
                className={`lg:hidden relative shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center transition-colors ${
                  subFiltrosOpen ? "bg-cyan-50 border-cyan-300 text-cyan-600" : "border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
                title="Filtro, Fecha y Agrupación"
              >
                <Icon name="filter_lines" size={18} />
              </button>
            </div>

            {/* Sub-controles Personalizados — grilla de 3 controles (Filtro,
                Fecha, Agrupar por) que nunca deja al selector de Filtro solo
                en su fila. Desktop (lg+): los 3 en una fila (Filtro con más
                ancho, 2fr), siempre visibles. Tablet y mobile: colapsan
                detrás del ícono de filtro de arriba. */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
              <div className={`grid-cols-1 lg:grid-cols-[1.3fr_1fr_1.1fr] gap-2 ${subFiltrosOpen ? "grid mt-2" : "hidden"} lg:grid lg:mt-0`}>
                <div className="flex items-center gap-2 min-w-[170px]">
                  <span className="text-[11px] md:text-xs text-slate-400 font-medium shrink-0">Filtro:</span>
                  <Select
                    value={currentFiltro}
                    onChange={(f) => handleApplyDate(f, dateInput)}
                    options={[
                      { value: "dia", label: "Por Día Específico" },
                      { value: "mes", label: "Por Mes Específico" },
                      { value: "anio", label: "Por Año Específico" },
                      { value: "todos", label: "Histórico (Sin límite)" },
                    ]}
                    className="flex-1 min-w-0"
                  />
                </div>

                {/* Selector individual según la granularidad elegida en
                    "Filtro" — el diseño de calendario combinado (día+mes+año
                    en un solo widget) solo tiene sentido para "Día
                    Específico"; para "Mes"/"Año" son selects simples e
                    independientes (Mes+Año, o solo Año). Este contenedor
                    siempre ocupa la 2da columna del grid (aunque quede
                    vacío en "Histórico") para que "Agrupar por" no se
                    desplace de la 3ra columna. */}
                <div className="min-w-[140px]">
                  {currentFiltro === 'dia' && (
                    <DatePicker
                      value={dateInput}
                      onChange={(v) => { setDateInput(v); handleApplyDate('dia', v); }}
                    />
                  )}
                  {currentFiltro === 'mes' && (
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={String(Number(dateInput.slice(5, 7)) || 1)}
                        onChange={(v) => {
                          const y = dateInput.slice(0, 4) || String(CURRENT_YEAR);
                          const full = `${y}-${v.padStart(2, "0")}-01`;
                          setDateInput(full);
                          handleApplyDate('mes', full);
                        }}
                        options={MESES.map((m, i) => ({ value: String(i + 1), label: m }))}
                        className="flex-[1.4] min-w-0"
                      />
                      <Select
                        value={dateInput.slice(0, 4) || String(CURRENT_YEAR)}
                        onChange={(v) => {
                          const m = dateInput.slice(5, 7) || "01";
                          const full = `${v}-${m}-01`;
                          setDateInput(full);
                          handleApplyDate('mes', full);
                        }}
                        options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
                        className="flex-1 min-w-0"
                      />
                    </div>
                  )}
                  {currentFiltro === 'anio' && (
                    <Select
                      value={dateInput.slice(0, 4) || String(CURRENT_YEAR)}
                      onChange={(v) => { const full = `${v}-01-01`; setDateInput(full); handleApplyDate('anio', full); }}
                      options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
                    />
                  )}
                </div>

                {/* Granularidad / Agrupar Por — mismo componente Select que
                    usamos en todo el sistema, con íconos alusivos a
                    Día/Mes/Año en cada opción. Las combinaciones no válidas
                    para el Filtro actual (ej. agrupar por Día en un rango
                    Histórico) simplemente no aparecen en la lista. Este
                    bloque siempre vive en la 3ra columna del grid — fijo,
                    no se desplaza aunque el selector de fecha cambie. */}
                <div className="flex items-center gap-2 min-w-[150px]">
                  <span className="text-[11px] md:text-xs text-slate-400 font-medium shrink-0">Agrupar por:</span>
                  <Select
                    value={currentAgrupacion}
                    onChange={(v) => updateParams({ agrupacion: v })}
                    options={[
                      { value: "dia", label: "Día", icon: "today", allowed: currentFiltro !== "anio" && currentFiltro !== "todos" },
                      { value: "mes", label: "Mes", icon: "calendar_month", allowed: currentFiltro !== "dia" },
                      { value: "anio", label: "Año", icon: "calendar_range", allowed: currentFiltro !== "dia" && currentFiltro !== "mes" },
                    ].filter((g) => g.allowed)}
                    className="flex-1 min-w-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 2: Filtros Financieros (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 sm:p-3 lg:p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="payments" size={16} className="text-amber-500" />
                Filtros Financieros
              </span>
              <span className="text-[10px] md:text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                Afecta: Finanzas, Egresos, Ticket Promedio
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] md:text-xs font-medium text-slate-400">Moneda</label>
                <Select
                  value={String(currentMoneda)}
                  onChange={(v) => updateParams({ monedaId: v })}
                  options={options.monedas.map((m: any) => ({ value: String(m.id), label: m.moneda }))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] md:text-xs font-medium text-slate-400">Medio de Pago</label>
                <Select
                  value={currentMedioPago}
                  onChange={(v) => updateParams({ medioPagoId: v === "all" ? null : v })}
                  options={[
                    { value: "all", label: "Todos los medios" },
                    ...options.mediosPago.map((m: any) => ({ value: String(m.id), label: m.nombre })),
                  ]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de Filtros Activos (Chips Bar) */}
        <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] md:text-[11px]">
          <span className="font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Icon name="filter_alt" size={14} /> Filtros Activos:
          </span>
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold border border-slate-200 dark:border-slate-700">
            <Icon name="calendar_month" size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
            Período: {currentFiltro === "dia" ? `Día (${dateInput})` : currentFiltro === "mes" ? `Mes (${MESES[Number(dateInput.slice(5, 7)) - 1] || ""} ${dateInput.slice(0, 4)})` : currentFiltro === "anio" ? `Año (${dateInput.slice(0, 4)})` : "Histórico Completo"}
          </span>
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold border border-slate-200 dark:border-slate-700">
            <Icon name="analytics" size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
            Agrupación: {currentAgrupacion === "dia" ? "Por Día" : currentAgrupacion === "mes" ? "Por Mes" : "Por Año"}
          </span>
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold border border-slate-200 dark:border-slate-700">
            <Icon name="price_check" size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
            Moneda: {options.monedas.find((m: any) => m.id === currentMoneda)?.moneda || "PEN"}
          </span>
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold border border-slate-200 dark:border-slate-700">
            <Icon name="payments" size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
            Medio de Pago: {currentMedioPago === "all" ? "Todos los medios" : options.mediosPago.find((m: any) => String(m.id) === String(currentMedioPago))?.nombre || "Todos"}
          </span>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-10 print:p-0 print:overflow-visible">

      {/* HEADER DE IMPRESIÓN (PÁGINA 1 DEL PDF) — mismo lenguaje de membrete
          que Receta/Presupuesto/Archivo Clínico/Historia Clínica
          (src/lib/reportExport.ts): barra cian arriba/abajo, logo + sede a la
          izquierda, etiqueta de documento + código + fecha de generación a la
          derecha. Antes era un recuadro negro/gris sin relación visual con el
          resto de los documentos del sistema. */}
      <div className="hidden print:block mb-6 print:break-after-always rounded-xl overflow-hidden border border-slate-200">
        <div className="h-[5px] bg-gradient-to-r from-cyan-600 to-cyan-700" />
        <div className="bg-white px-6 py-5">
          <div className="flex justify-between items-start pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 shrink-0">
                <Icon name="space_dashboard" size={22} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-slate-900">
                  {options.sedes.find((s: any) => s.id === currentSedeId)?.nombre_clinica || "Todas las sedes"}
                </p>
                <p className="text-[11px] text-slate-400">Mara Dental — Reporte multi-sede</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-600">Reporte de Gestión Directiva</p>
              <p suppressHydrationWarning className="text-[19px] font-bold text-slate-900 mt-0.5">
                {new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
              <p suppressHydrationWarning className="text-[10px] text-slate-400 mt-1">Generado: {new Date().toLocaleString("es-PE")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="flex flex-col gap-2">
              <h3 className="text-[10px] font-bold text-cyan-600 uppercase tracking-wide border-b border-slate-100 pb-1">Parámetros de Tiempo y Granularidad</h3>
              <p><span className="font-semibold text-slate-700">Período de Análisis:</span> {currentFiltro === "dia" ? `Día Específico (${dateInput})` : currentFiltro === "mes" ? `Mes Específico (${MESES[Number(dateInput.slice(5, 7)) - 1] || ""} ${dateInput.slice(0, 4)})` : currentFiltro === "anio" ? `Año Específico (${dateInput.slice(0, 4)})` : "Histórico Completo (Sin límite)"}</p>
              <p><span className="font-semibold text-slate-700">Granularidad (Agrupar por):</span> {currentAgrupacion === "dia" ? "Por Día" : currentAgrupacion === "mes" ? "Por Mes" : "Por Año"}</p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-[10px] font-bold text-cyan-600 uppercase tracking-wide border-b border-slate-100 pb-1">Filtros Financieros Activos</h3>
              <p><span className="font-semibold text-slate-700">Moneda de Análisis:</span> {options.monedas.find((m: any) => m.id === currentMoneda)?.moneda || "PEN"}</p>
              <p><span className="font-semibold text-slate-700">Medio de Pago:</span> {currentMedioPago === "all" ? "Todos los medios de pago" : options.mediosPago.find((m: any) => String(m.id) === String(currentMedioPago))?.nombre || "Todos"}</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <h3 className="text-[10px] font-bold text-cyan-600 uppercase tracking-wide mb-2">KPIs y Gráficos Incluidos en este Informe</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {selectedKpis.finanzas && <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full font-semibold border border-cyan-100">✓ Balance Financiero</span>}
              {selectedKpis.ticket && <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full font-semibold border border-cyan-100">✓ Ticket Promedio</span>}
              {selectedKpis.conversion && <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full font-semibold border border-cyan-100">✓ Conversión Presupuestos</span>}
              {selectedKpis.egresos && <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full font-semibold border border-cyan-100">✓ Distribución Egresos</span>}
              {selectedKpis.nuevos && <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full font-semibold border border-cyan-100">✓ Captación Pacientes</span>}
              {selectedKpis.tasasSede && <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full font-semibold border border-cyan-100">✓ Tasas de Sede</span>}
              {selectedKpis.rankingMedicos && <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full font-semibold border border-cyan-100">✓ Ranking por Médico</span>}
              {selectedKpis.ocupacion && <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full font-semibold border border-cyan-100">✓ Ocupación Médica</span>}
              {selectedKpis.topTratamientos && <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full font-semibold border border-cyan-100">✓ Top 5 Tratamientos</span>}
            </div>
          </div>
        </div>
        <div className="h-[5px] bg-gradient-to-r from-cyan-600 to-cyan-700" />
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
      </main>

      {/* MODAL FULLSCREEN DE ZOOM DE GRÁFICO */}
      {activeZoomedKey && (
        <div 
          className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-md p-3 sm:p-6 flex flex-col justify-between animate-in fade-in duration-200 print:hidden"
          onClick={() => setActiveZoomedKey(null)}
        >
          <div className="w-full flex flex-col h-full max-w-[1600px] mx-auto" onClick={e => e.stopPropagation()}>
            {/* Top Bar Modal — tipografía alineada a la escala del sistema
                (antes text-xl era un tamaño aislado, sin relación al resto
                de la UI). El banner "Modo Ampliado" (pensado para sugerir
                rotar el celular) se quitó de acá: no aplica en tablet/desktop
                y quedaba confuso — el hint de rotación real vive abajo,
                solo en mobile. */}
            <div className="flex items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800 mb-3 shadow-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg shrink-0">
                  <Icon name="space_dashboard" size={24} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[15px] md:text-base font-bold text-white truncate">
                    {getChartTitle(activeZoomedKey)}
                  </h2>
                  <p className="text-[13px] md:text-sm text-slate-400 hidden sm:block">Vista en pantalla completa — Haz clic en X para cerrar</p>
                </div>
              </div>

              <button
                onClick={() => setActiveZoomedKey(null)}
                className="shrink-0 p-2.5 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2 font-semibold text-[13px] md:text-sm"
                title="Cerrar vista ampliada"
              >
                <Icon name="close" size={22} />
                <span className="hidden sm:inline">Cerrar</span>
              </button>
            </div>

            {/* Hint Móvil para pantalla chica — único aviso adicional del
                modal, solo en mobile real. */}
            <div className="sm:hidden mb-2 text-center text-[11px] md:text-xs font-medium text-amber-300 bg-amber-950/80 p-2 rounded-lg border border-amber-800/60 flex items-center justify-center gap-2">
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
        <h2 onClick={onExpand} className="text-[13px] md:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
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