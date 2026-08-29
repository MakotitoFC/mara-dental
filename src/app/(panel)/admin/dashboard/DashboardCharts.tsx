"use client";

import { useMemo, useState, useEffect, cloneElement, isValidElement } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { FilterTag } from "@/components/ui/FilterTag";
import { SmartPopover } from "@/components/ui/SmartPopover";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { RotateDevicePrompt } from "@/components/ui/RotateDevicePrompt";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart, AreaChart, Area, Cell
} from "recharts";

const COLORS = ["#0A8EA0", "#0D7377", "#5D6D7E", "#1D95A0", "#073D42", "#F39C12"];
const POS_COLOR = "#10b981";
const NEG_COLOR = "#ef4444";

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

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

/** Panel flotante compartido — sin trigger propio, así lo reutilizan tanto
    el botón maestro de filtro como "+ Filtro" (mismo contenido completo) y
    cada tag individual (solo su propio campo). `relative` para poder anclar
    la "X" de cierre manual (ver TagDropdown) en la esquina superior derecha. */
function FilterPanel({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
 className="relative min-w-[240px] max-w-[280px] bg-white border border-slate-200 rounded-lg shadow-lg p-3 flex flex-col gap-3"
    >
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Cerrar"
 className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Icon name="close" size={16} />
        </button>
      )}
      {children}
    </motion.div>
  );
}

type TagKey = "periodo" | "agrupacion" | "financieros";

const TAG_META: Record<TagKey, { label: string; icon: string }> = {
  periodo: { label: "Período", icon: "calendar_month" },
  agrupacion: { label: "Agrupar", icon: "analytics" },
  financieros: { label: "Financieros", icon: "payments" },
};

/** Paso 1 del flujo (mismo patrón que FiltroPickerButton del Calendario):
    lista simple de las 3 categorías, SIN sus selects internos — elegir una
    solo la agrega/quita de `activeKeys` (aparece/desaparece su tag). Los
    campos reales (Mes/Año/Moneda/etc.) viven en el dropdown propio de cada
    tag (ver TagDropdown más abajo), no acá. variant "icon": botón maestro
    (fila de presets). variant "chip": "+ Filtro" al final de la fila de tags. */
function FilterCategoryPicker({
  variant, activeKeys, onToggle,
}: {
  variant: "icon" | "chip";
  activeKeys: Set<TagKey>;
  onToggle: (k: TagKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const KEYS: TagKey[] = ["periodo", "agrupacion", "financieros"];

  return (
    <SmartPopover
      open={open}
      onClose={() => setOpen(false)}
      placement="bottom-start"
      renderTrigger={(ref) =>
        variant === "icon" ? (
          <button
            ref={ref}
            onClick={() => setOpen((o) => !o)}
            title="Filtros"
            aria-label="Filtros"
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors shrink-0 ${
              open || activeKeys.size > 0 ? "bg-cyan-50 text-cyan-600" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            <Icon name="filter_lines" size={17} />
          </button>
        ) : (
          <button
            ref={ref}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium bg-cyan-500/5 text-cyan-600 border border-cyan-500/40 hover:bg-cyan-500/10 transition-colors shrink-0"
          >
            <Icon name="add" size={14} className="shrink-0" />
            Filtro
          </button>
        )
      }
    >
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
 className="min-w-[180px] bg-white border border-slate-200 rounded-lg shadow-lg py-1.5"
      >
        {KEYS.map((k) => {
          const active = activeKeys.has(k);
          return (
            <button
              key={k}
              onMouseDown={() => { onToggle(k); setOpen(false); }}
 className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${active ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
            >
 <Icon name={TAG_META[k].icon} size={15} className={active ? "text-cyan-600" : "text-slate-400"} />
              <span className="flex-1">{TAG_META[k].label}</span>
 {active && <Icon name="check" size={14} className="text-cyan-600"/>}
            </button>
          );
        })}
      </motion.div>
    </SmartPopover>
  );
}

/** Tag de filtro activo CON dropdown propio: clic en el tag (o su chevron)
    reabre un panel para cambiar solo esa selección, sin borrar el tag; su
    "X" (siempre visible aparte, afuera del tag) lo elimina del todo. Mismo
    patrón dual que TipoFiltroSelector/DoctorFiltroSelector del Calendario
    (FilterTag como trigger de un SmartPopover propio).

    Regla general: cierra solo al hacer click/tap AFUERA (vía SmartPopover
    → useClickOutside), sin botón de cierre dentro del panel. EXCEPCIÓN:
    "Período" y "Financieros" son selects compuestos (varios campos
    encadenados dentro del mismo panel) — ahí NO se cierra con click afuera,
    para no cortar al usuario a mitad de una selección de varios pasos;
    en su lugar llevan una "X" propia dentro del panel (`manualClose`). */
function TagDropdown({
  icon, label, onRemove, children, manualClose = false,
}: {
  icon: string;
  label: string;
  onRemove: () => void;
  children: React.ReactNode;
  manualClose?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <SmartPopover
      open={open}
      onClose={manualClose ? undefined : () => setOpen(false)}
      placement="bottom-start"
      renderTrigger={(ref) => (
        <FilterTag ref={ref as any} onClick={() => setOpen((o) => !o)} onRemove={onRemove} icon={icon} label={label} />
      )}
    >
      <FilterPanel onClose={manualClose ? () => setOpen(false) : undefined}>
        {children}
      </FilterPanel>
    </SmartPopover>
  );
}

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
  // Tags de "filtros activos": SOLO aparecen cuando el usuario los agrega a
  // mano desde el picker de 2 pasos (botón maestro o "+ Filtro" → elige
  // categoría → aparece el tag); no reflejan el valor "de fábrica" con el
  // que abre el dashboard, así la fila de tags puede estar vacía al entrar.
  const [activeTags, setActiveTags] = useState<Set<TagKey>>(new Set());
  const toggleTag = (key: TagKey) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const removeTag = (key: TagKey) => {
    setActiveTags((prev) => { const next = new Set(prev); next.delete(key); return next; });
    if (key === "periodo") updateParams({ filtro: "todos", fecha: null });
    else if (key === "agrupacion") updateParams({ agrupacion: "dia" });
    else if (key === "financieros") updateParams({ monedaId: null, medioPagoId: null });
  };
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

  // Campos reales de cada categoría — SOLO viven dentro del dropdown propio
  // de cada tag (paso 2 del flujo). El picker de paso 1 (FilterCategoryPicker)
  // no los muestra, solo la lista de 3 nombres de categoría.
  function renderPeriodoFields() {
    return (
      <>
        <div className="flex flex-col gap-1">
 <label className="text-[11px] font-semibold text-slate-500">Tipo de filtro</label>
          <Select
            value={currentFiltro}
            onChange={(f) => handleApplyDate(f, dateInput)}
            options={[
              { value: "dia", label: "Por Día Específico" },
              { value: "mes", label: "Por Mes Específico" },
              { value: "anio", label: "Por Año Específico" },
              { value: "todos", label: "Histórico (Sin límite)" },
            ]}
          />
        </div>
        {currentFiltro === "dia" && (
          <div className="flex flex-col gap-1">
 <label className="text-[11px] font-semibold text-slate-500">Fecha</label>
            <DatePicker
              value={dateInput}
              onChange={(v) => { setDateInput(v); handleApplyDate('dia', v); }}
            />
          </div>
        )}
        {currentFiltro === "mes" && (
          <>
            <div className="flex flex-col gap-1">
 <label className="text-[11px] font-semibold text-slate-500">Mes</label>
              <Select
                value={String(Number(dateInput.slice(5, 7)) || 1)}
                onChange={(v) => {
                  const y = dateInput.slice(0, 4) || String(CURRENT_YEAR);
                  const full = `${y}-${v.padStart(2, "0")}-01`;
                  setDateInput(full);
                  handleApplyDate('mes', full);
                }}
                options={MESES.map((m, i) => ({ value: String(i + 1), label: m }))}
              />
            </div>
            <div className="flex flex-col gap-1">
 <label className="text-[11px] font-semibold text-slate-500">Año</label>
              <Select
                value={dateInput.slice(0, 4) || String(CURRENT_YEAR)}
                onChange={(v) => {
                  const m = dateInput.slice(5, 7) || "01";
                  const full = `${v}-${m}-01`;
                  setDateInput(full);
                  handleApplyDate('mes', full);
                }}
                options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
              />
            </div>
          </>
        )}
        {currentFiltro === "anio" && (
          <div className="flex flex-col gap-1">
 <label className="text-[11px] font-semibold text-slate-500">Año</label>
            <Select
              value={dateInput.slice(0, 4) || String(CURRENT_YEAR)}
              onChange={(v) => { const full = `${v}-01-01`; setDateInput(full); handleApplyDate('anio', full); }}
              options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
            />
          </div>
        )}
      </>
    );
  }

  function renderAgrupacionField() {
    return (
      <div className="flex flex-col gap-1">
 <label className="text-[11px] font-semibold text-slate-500">Agrupar por</label>
        <Select
          value={currentAgrupacion}
          onChange={(v) => updateParams({ agrupacion: v })}
          options={[
            { value: "dia", label: "Día", icon: "today" },
            { value: "mes", label: "Mes", icon: "calendar_month" },
          ]}
        />
      </div>
    );
  }

  function renderFinancierosFields() {
    return (
      <>
        <div className="flex flex-col gap-1">
 <label className="text-[11px] font-semibold text-slate-500">Moneda</label>
          <Select
            value={String(currentMoneda)}
            onChange={(v) => updateParams({ monedaId: v })}
            options={options.monedas.map((m: any) => ({ value: String(m.id), label: m.moneda }))}
          />
        </div>
        <div className="flex flex-col gap-1">
 <label className="text-[11px] font-semibold text-slate-500">Medio de Pago</label>
          <Select
            value={currentMedioPago}
            onChange={(v) => updateParams({ medioPagoId: v === "all" ? null : v })}
            options={[
              { value: "all", label: "Todos los medios" },
              ...options.mediosPago.map((m: any) => ({ value: String(m.id), label: m.nombre })),
            ]}
          />
        </div>
      </>
    );
  }

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
 <header className="shrink-0 flex flex-col gap-3 sm:gap-4 lg:gap-5 bg-white px-4 sm:px-6 py-4 sm:py-6 border-b border-slate-200 print:hidden">
        {/* Top Header Row — título+botón siempre en la misma línea (incluso
            en tablet/mobile); el selector de sede (superadmin) va en su
            propia fila debajo cuando aplica, para no forzar el salto de
            línea del botón principal. */}
 <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between gap-3">
            {/* En mobile solo el título — ícono y descripción se ocultan
                (hidden sm:flex / hidden sm:block) para que el encabezado no
                ocupe tanto alto, igual que en las capturas. */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
 <h1 className="text-[15px] md:text-base font-bold text-slate-800">Dashboard Directivo</h1>
 <p className="hidden sm:block text-[13px] md:text-sm text-slate-500 mt-0.5">Análisis de rendimiento, finanzas y operaciones.</p>
              </div>
            </div>

            <button onClick={() => setIsPrintModalOpen(true)} className="flex items-center justify-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[12.5px] font-semibold transition-colors shrink-0">
              <Icon name="print" size={16} className="sm:hidden" />
              <Icon name="print" size={18} className="hidden sm:inline" />
              <span>Reporte</span>
            </button>
          </div>

        </div>

        {/* Presets rápidos de período + botón maestro de filtro, en la MISMA
            fila: en tablet/desktop el filtro va pegado justo después de los
            presets (a la izquierda, no al extremo opuesto); en mobile sí se
            separa al extremo derecho (justify-between). Sin cambios
            funcionales en los presets. */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
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
 :"bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Botón maestro — paso 1: SOLO lista Período/Agrupar/Financieros,
              sin sus selects internos. Elegir una categoría la agrega como
              tag; los campos reales viven en el dropdown propio de cada tag. */}
          <FilterCategoryPicker variant="icon" activeKeys={activeTags} onToggle={toggleTag} />
        </div>

        {/* Filtros activos — paso 2: cada tag es interactivo, clic en él (o
            su chevron) abre SU dropdown con los campos reales de esa
            categoría; su X lo elimina del todo. "+ Filtro" al final reabre
            el mismo picker de paso 1 (para agregar o quitar categorías). Sin
            "Limpiar todo". Si no hay ningún tag, la fila entera no se
            renderiza (el botón maestro de arriba sigue siendo la vía para
            agregar filtros). */}
        {activeTags.size > 0 && (
 <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100">
            {activeTags.has("periodo") && (
              <TagDropdown
                icon="calendar_month"
                label={`Período: ${currentFiltro === "dia" ? `Día (${dateInput})` : currentFiltro === "mes" ? `Mes (${MESES[Number(dateInput.slice(5, 7)) - 1] || ""} ${dateInput.slice(0, 4)})` : currentFiltro === "anio" ? `Año (${dateInput.slice(0, 4)})` : "Histórico Completo"}`}
                onRemove={() => removeTag("periodo")}
                manualClose
              >
                {renderPeriodoFields()}
              </TagDropdown>
            )}
            {activeTags.has("agrupacion") && (
              <TagDropdown
                icon="analytics"
                label={`Agrupación: ${currentAgrupacion === "dia" ? "Por Día" : currentAgrupacion === "mes" ? "Por Mes" : "Por Año"}`}
                onRemove={() => removeTag("agrupacion")}
              >
                {renderAgrupacionField()}
              </TagDropdown>
            )}
            {activeTags.has("financieros") && (
              <TagDropdown
                icon="payments"
                label={`Financieros: ${options.monedas.find((m: any) => m.id === currentMoneda)?.moneda || "PEN"}${currentMedioPago !== "all" ? ` · ${options.mediosPago.find((m: any) => String(m.id) === String(currentMedioPago))?.nombre || "Todos"}` : ""}`}
                onRemove={() => removeTag("financieros")}
                manualClose
              >
                {renderFinancierosFields()}
              </TagDropdown>
            )}
            <FilterCategoryPicker variant="chip" activeKeys={activeTags} onToggle={toggleTag} />
          </div>
        )}
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar p-4 sm:p-6 pb-10 print:p-0 print:overflow-visible">

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
          <ChartCard title="Balance Financiero (Ingresos/Egresos/Ganancias)" icon="account_balance">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.finanzas}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "8px" }} itemStyle={{ fontSize: 12 }} labelStyle={{ fontSize: 12 }} formatter={(val: any) => val?.toLocaleString?.() ?? String(val)} />
                <Legend content={renderLegend} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#3b82f6" radius={[4,4,0,0]} barSize={15} />
                <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[4,4,0,0]} barSize={15} />
                <Bar dataKey="ganancias" name="Ganancias" fill="#10b981" radius={[4,4,0,0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 8. Ticket promedio */}
        <div className={`print-page-chart ${!selectedKpis.ticket ? 'print:hidden' : ''}`}>
          <ChartCard title="Ticket Promedio y Volumen de Ingresos" icon="point_of_sale">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.ticketPromedio}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "8px" }} itemStyle={{ fontSize: 12 }} labelStyle={{ fontSize: 12 }} formatter={(val: any) => val?.toLocaleString?.() ?? String(val)} />
                <Legend content={renderLegend} />
                <Bar yAxisId="left" dataKey="ingreso_total" name="Ingreso Total" fill="#0A8EA0" radius={[4,4,0,0]} barSize={30} />
                <Line yAxisId="right" type="monotone" dataKey="ticket_promedio" name="Ticket Promedio" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 7. Tasa de conversión */}
        <div className={`print-page-chart ${!selectedKpis.conversion ? 'print:hidden' : ''}`}>
          <ChartCard title="Conversión de Presupuestos (% Aprobación)" icon="price_check">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.tasaAprobacion}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "8px" }} itemStyle={{ fontSize: 12 }} labelStyle={{ fontSize: 12 }} />
                <Legend content={renderLegend} />
                <Bar yAxisId="left" dataKey="total_presupuestos" name="Total Emitidos" fill="#94a3b8" radius={[4,4,0,0]} barSize={20} />
                <Bar yAxisId="left" dataKey="total_aprobados" name="Aprobados" fill="#3b82f6" radius={[4,4,0,0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="tasa_aprobacion" name="% Aprobación" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 5. Gastos por categoría */}
        <div className={`print-page-chart ${!selectedKpis.egresos ? 'print:hidden' : ''}`}>
          <ChartCard title="Distribución de Egresos por Categoría" icon="receipt_long">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.egresos} layout="vertical" margin={{ left: 50, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="categoria" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px" }} itemStyle={{ fontSize: 12 }} labelStyle={{ fontSize: 12 }} formatter={(val: any) => val?.toLocaleString?.() ?? String(val)} />
                <Bar dataKey="total_gastado" name="Gastado" fill="#5D6D7E" radius={[0,4,4,0]} barSize={20}>
                   {data.egresos.map((e:any, i:number) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 3. Pacientes nuevos */}
        <div className={`print-page-chart ${!selectedKpis.nuevos ? 'print:hidden' : ''}`}>
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
                <Tooltip cursor={{ stroke: "#e2e8f0", strokeWidth: 2 }} contentStyle={{ borderRadius: "8px" }} itemStyle={{ fontSize: 12 }} labelStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="cantidad_nuevos" name="Nuevos Pacientes" stroke="#0891b2" strokeWidth={3} fillOpacity={1} fill="url(#colorNuevos)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 2. Tasas de sede */}
        <div className={`print-page-chart ${!selectedKpis.tasasSede ? 'print:hidden' : ''}`}>
          <ChartCard title="Evolución de Tasas de Atención de la Sede" icon="timeline">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.tasaSede}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
                <Tooltip cursor={{ stroke: "#e2e8f0", strokeWidth: 2 }} contentStyle={{ borderRadius: "8px" }} itemStyle={{ fontSize: 12 }} labelStyle={{ fontSize: 12 }} formatter={(val: any) => typeof val === "number" ? `${(val*100).toFixed(0)}%` : String(val)} />
                <Legend content={renderLegend} />
                <Line type="monotone" dataKey="tasa_hecho" name="Hecho" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="tasa_programada" name="Programada" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="tasa_cancelada" name="Cancelada" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 1. Tasas medicos */}
        <div className={`print-page-chart ${!selectedKpis.rankingMedicos ? 'print:hidden' : ''}`}>
          <ChartCard title="Ranking de Atención por Médico" icon="how_to_reg">
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={chartTasaMedicos} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px" }} itemStyle={{ fontSize: 12 }} labelStyle={{ fontSize: 12 }} formatter={(val: any) => typeof val === "number" ? `${val.toFixed(0)}%` : String(val)} />
                <Legend content={renderLegend} />
                <Bar dataKey="Hecho" stackId="a" fill="#10b981" barSize={20} radius={[0,0,0,0]} />
                <Bar dataKey="Programada" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Cancelada" stackId="a" fill="#ef4444" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 9. Ocupación médico */}
        <div className={`print-page-chart ${!selectedKpis.ocupacion ? 'print:hidden' : ''}`}>
          <ChartCard title="Ocupación por Médico" icon="event_available">
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={data.ocupacion} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="medico"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  height={110}
                />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "8px" }} itemStyle={{ fontSize: 12 }} labelStyle={{ fontSize: 12 }} />
                <Legend content={renderLegend} />
                <Bar dataKey="horas_reservadas" name="Hrs. Reservadas" stackId="a" fill="#0D7377" radius={[0,0,0,0]} barSize={30} />
                <Bar dataKey="horas_capacidad" name="Hrs. Libres" stackId="a" fill="#e2e8f0" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 6. Top 5 Tratamientos */}
        <div className={`print-page-chart lg:col-span-2 ${!selectedKpis.topTratamientos ? 'print:hidden' : ''}`}>
          <ChartCard title="Top 5 Tratamientos (Más y Menos Frecuentes)" icon="medical_services">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.tratamientos} layout="vertical" margin={{ left: 50, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nombre_tratamiento" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={150} />
                <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px" }} itemStyle={{ fontSize: 12 }} labelStyle={{ fontSize: 12 }} />
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
    </div>
  );
}

function ChartCard({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();

  const [isPortrait, setIsPortrait] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(orientation: portrait)");
    setIsPortrait(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const [rotateDismissed, setRotateDismissed] = useState(false);
  useEffect(() => { if (!expanded || !isPortrait) setRotateDismissed(false); }, [expanded, isPortrait]);
  const showRotatePrompt = isMobile && expanded && isPortrait && !rotateDismissed;

  return (
    <>
      <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col group relative ${className} print:shadow-none print:border print:border-slate-300 print:rounded-none`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[12px] md:text-[13px] font-medium text-[#64748b] flex items-center gap-2">
            <Icon name={icon} size={18} className="text-slate-400"/>
            {title}
          </h2>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            title="Ver gráfico completo"
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-slate-100 transition-all opacity-80 group-hover:opacity-100 print:hidden"
          >
            <Icon name="fullscreen" size={20} />
          </button>
        </div>
        <div className="flex-1 w-full min-h-[300px]">
          {children}
        </div>
      </div>

      {expanded && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[150] bg-white p-3 sm:p-6 flex flex-col print:hidden">
          <div className="w-full flex flex-col h-full max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3 shrink-0">
              <h2 className="text-[15px] md:text-base font-bold text-slate-800 flex items-center gap-2 min-w-0 truncate">
                <Icon name={icon} size={20} className="text-cyan-600 shrink-0" />
                <span className="truncate">{title}</span>
              </h2>
              <button
                onClick={() => setExpanded(false)}
                className="shrink-0 p-2.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-all flex items-center justify-center"
                title="Cerrar vista ampliada"
              >
                <Icon name="close" size={22} />
              </button>
            </div>
            <div className="flex-1 min-h-0 w-full bg-white p-4 sm:p-8 overflow-hidden">
              {isValidElement(children) ? cloneElement(children as React.ReactElement<any>, { height: "100%" }) : children}
            </div>
          </div>
        </div>,
        document.body
      )}

      {showRotatePrompt && createPortal(
        <RotateDevicePrompt onDismiss={() => setRotateDismissed(true)} message="Gira tu dispositivo para ver el gráfico completo" />,
        document.body
      )}
    </>
  );
}