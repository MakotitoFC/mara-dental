"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { PresupuestoSkeleton } from "@/components/ui/ConsultaSkeletons";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { DatePicker } from "@/components/ui/DatePicker";
import { FilterCategoryPicker, type FilterCategoryMeta } from "@/components/ui/FilterCategoryPicker";
import { TagDropdown } from "@/components/ui/TagDropdown";
import { useToast } from "@/components/ui/Toast";
import { PresupuestoPhase } from "../consulta/PresupuestoPhase";
import { getPresupuestosPacienteAction, getMediosPagoAction } from "../../consulta.actions";
import { ESTADO_PRESUPUESTO_CFG as ESTADO_CFG } from "@/lib/estadoConfig";
import { Badge } from "@/components/ui/Badge";

const ESTADO_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "aprobado", label: "Aprobado" },
  { value: "cancelado", label: "Cancelado" },
];

type FilterTagKey = "estado" | "fecha";
const FILTER_CATEGORIES: Record<FilterTagKey, FilterCategoryMeta> = {
  estado: { label: "Estado", icon: "check_circle" },
  fecha: { label: "Fecha", icon: "calendar_today" },
};

function fmtFechaCorta(iso?: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

const money = (n: number, m = "PEN") => `${m === "PEN" ? "S/" : m} ${n.toFixed(2)}`;

// Paginación de la lista plana en mobile/tablet — mismo tamaño de página
// (8) y misma ventana compacta de 2 números para la píldora flotante que ya
// usan las vistas de asistente (Turnos de Caja, Personal, etc.).
const MOBILE_PAGE_SIZE = 5;
function getMobilePageWindow(current: number, total: number): number[] {
  if (total <= 1) return [1];
  if (current >= total) return [total - 1, total];
  return [current, current + 1];
}

/** En mobile (`isMobile`) usa el mismo diseño de tarjeta que "Catálogo de
 * Tratamientos" (admin/catalogo); tablet (dentro de isCompact) y desktop
 * siguen con la fila compacta de siempre. */
function HistorialRow({ item, active, onClick, isMobile }: { item: any; active: boolean; onClick: () => void; isMobile: boolean }) {
  const cfg = ESTADO_CFG[item.estado] ?? ESTADO_CFG.pendiente;
  const nombre = item.items?.[0]?.nombre ?? "Presupuesto";
  const total = Number(item.total_bruto) - Number(item.descuento_monto);
  const moneda = item.items?.[0]?.moneda;

  if (isMobile) {
    const pill = cfg.status === "success" ? "bg-emerald-50 text-emerald-600" : cfg.status === "canceled" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-600";
    return (
      <button
        onClick={onClick}
 className={`w-full text-left bg-white rounded-xl border flex flex-col transition-colors ${active ? "border-cyan-400 ring-1 ring-cyan-100" : "border-slate-200"}`}
      >
 <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
 <span className="text-[11px] font-semibold text-slate-400">{fmtFechaCorta(item.fecha_emision)}</span>
        </div>
 <div className="flex flex-col gap-3 p-4">
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-3 min-w-0">
 <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                <Icon name="request_quote" size={18} />
              </div>
 <p className="font-bold text-[13px] text-slate-700 truncate">{nombre}</p>
            </div>
 <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full ${pill}`}>
 <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>

 <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
 <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</span>
 <span className="text-[13px] text-slate-800">{money(total, moneda)}</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-3 py-3 border-l-2 transition-colors border-0 ${
        active
 ? "bg-slate-100 border-l-slate-400"
 :"border-l-transparent hover:bg-slate-50"
      }`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
 <p className="text-[10.5px] text-slate-400">{fmtFechaCorta(item.fecha_emision)}</p>
 <p className="text-[13px] font-medium text-slate-800 truncate">{nombre}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
 <span className="text-[12px] font-semibold text-slate-700">{money(total, moneda)}</span>
        <Badge status={cfg.status}>{cfg.label}</Badge>
      </div>
    </button>
  );
}

export function PresupuestoTab({ paciente, consultaId, refetch, onNavigateTab }: {
  paciente: any;
  consultaId?: string | null;
  data: any;
  loading: boolean;
  refetch: () => void;
  onNavigateTab?: (tab: string) => void;
}) {
  const pacienteId = String(paciente.id);
  const toast = useToast();
  // Tablet Y mobile (<lg) usan el patrón de tabla headerless + modal de
  // detalle (estilo admin), igual que Diagnóstico; solo desktop (lg+)
  // mantiene la grilla maestro-detalle de dos columnas.
  const isCompact = useIsMobile(1024);
  // Mobile "real" (<768) — solo acá las tarjetas del historial usan el
  // diseño de "Catálogo de Tratamientos"; tablet (dentro de isCompact) y
  // desktop siguen con la fila compacta de siempre.
  const isMobile = useIsMobile();
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [filterFecha, setFilterFecha] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  // Tags de filtro activo: solo aparecen al elegirlos desde el picker
  // maestro (mismo patrón que Dashboard Directivo/Personal/Auditoría/Diagnóstico).
  const [activeFilterTags, setActiveFilterTags] = useState<Set<FilterTagKey>>(new Set());
  const toggleFilterTag = (k: FilterTagKey) => {
    setActiveFilterTags((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };
  const removeFilterTag = (k: FilterTagKey) => {
    setActiveFilterTags((prev) => { const next = new Set(prev); next.delete(k); return next; });
    if (k === "estado") setFilterEstado("");
    else if (k === "fecha") setFilterFecha("");
  };
  const [historial, setHistorial] = useState<any[]>([]);
  const [historialLoading, setHistorialLoading] = useState(true);
  const [mediosPago, setMediosPago] = useState<{ id: number; nombre: string }[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  // Paginación mobile/tablet (lista plana) — mobilePage se reinicia cada vez
  // que cambia el filtro, para no quedar en una página que ya no existe.
  const [mobilePage, setMobilePage] = useState(1);
  useEffect(() => { setMobilePage(1); }, [filterFecha, filterEstado]);

  const fetchHistorial = useCallback(async () => {
    setHistorialLoading(true);
    try {
      setHistorial(await getPresupuestosPacienteAction(pacienteId));
    } catch (e) {
      console.error(e);
      setHistorial([]);
    } finally {
      setHistorialLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    fetchHistorial();
    getMediosPagoAction().then(setMediosPago).catch(() => setMediosPago([]));
  }, [fetchHistorial]);

  // Mantiene seleccionado el mismo registro tras editar/aprobar/cancelar (su id
  // no cambia); si ya no existe (se eliminó) o no había selección, cae al más
  // reciente del historial.
  useEffect(() => {
    if (historial.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (selectedId === null || !historial.some(h => h.id === selectedId)) {
      setSelectedId(historial[0].id);
    }
  }, [historial, selectedId]);

  async function refreshAll() {
    await fetchHistorial();
    if (consultaId) refetch();
  }

  async function handleCreated() {
    setCreating(false);
    setSelectedId(null);
    await fetchHistorial();
    if (consultaId) refetch();
  }

  function handleNuevo() {
    if (!consultaId) {
      toast.error("Inicia una consulta desde Timeline para generar un presupuesto nuevo.");
      return;
    }
    setCreating(true);
    if (isCompact) setShowDetalleModal(true);
  }

  function selectItem(id: number) {
    setCreating(false);
    setSelectedId(id);
    if (isCompact) setShowDetalleModal(true);
  }

  if (historialLoading && historial.length === 0) return <PresupuestoSkeleton />;

  const seleccionado = historial.find(h => h.id === selectedId) ?? null;
  const historialFiltrado = historial.filter((h) => {
    if (filterFecha && (h.fecha_emision ?? "").slice(0, 10) !== filterFecha) return false;
    if (filterEstado && h.estado !== filterEstado) return false;
    return true;
  });
  const hasFilter = !!filterFecha || !!filterEstado;
  const mobileTotalPages = Math.max(1, Math.ceil(historialFiltrado.length / MOBILE_PAGE_SIZE));
  const historialMobilePag = historialFiltrado.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE);

  // Botón de filtro + tags activos — reutilizado en la cabecera de
  // mobile/tablet y dentro de la propia tarjeta de "Historial" en desktop
  // (junto al conteo), igual que Diagnóstico/Odontograma. Patrón de "filtro
  // maestro": botón ☰ solo-ícono → picker de categorías (Estado/Fecha, sin
  // sus opciones) → tags cian con dropdown propio → "+ Filtro". Sin "Quitar
  // filtros": cada tag se quita con su propia X.
  const filtroButton = <FilterCategoryPicker variant="icon" categories={FILTER_CATEGORIES} activeKeys={activeFilterTags} onToggle={toggleFilterTag} />;
  const filtroTagsRow = activeFilterTags.size > 0 && (
    <div className="flex items-center gap-2 flex-wrap">
      {activeFilterTags.has("estado") && (
        <TagDropdown
          icon="check_circle"
          label={`Estado: ${filterEstado ? ESTADO_OPTIONS.find((o) => o.value === filterEstado)?.label : "Todos"}`}
          onRemove={() => removeFilterTag("estado")}
        >
          {(close) => (
            <>
              <button
                type="button"
                onMouseDown={() => { setFilterEstado(""); close(); }}
 className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] rounded-md hover:bg-slate-50 ${filterEstado === "" ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
              >
                Todos
              </button>
              {ESTADO_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onMouseDown={() => { setFilterEstado(o.value); close(); }}
 className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] rounded-md hover:bg-slate-50 ${o.value === filterEstado ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
                >
                  {o.label}
                </button>
              ))}
            </>
          )}
        </TagDropdown>
      )}
      {activeFilterTags.has("fecha") && (
        <TagDropdown
          icon="calendar_today"
          label={`Fecha: ${filterFecha || "Todas"}`}
          onRemove={() => removeFilterTag("fecha")}
 panelClassName="bg-white border border-slate-200 rounded-lg shadow-lg p-3"
        >
          {(close) => (
            <DatePicker value={filterFecha} onChange={(v) => { setFilterFecha(v); close(); }} />
          )}
        </TagDropdown>
      )}
      <FilterCategoryPicker variant="chip" categories={FILTER_CATEGORIES} activeKeys={activeFilterTags} onToggle={toggleFilterTag} />
    </div>
  );

  // Cabecera — sticky solo desde md (en mobile no queda fija, se desplaza con
  // el contenido); descripción oculta en mobile, solo el título. El botón de
  // filtro ya no vive acá en desktop — se movió a la tarjeta de "Historial"
  // (junto al título y el conteo); en mobile/tablet (lista plana, sin
  // tarjeta propia) se queda acá.
  const header = (
 <div className="static md:sticky md:top-0 md:z-20 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 py-4 mb-3 bg-white border-b border-slate-100 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
 <h2 className="text-[15px] font-bold text-slate-800">Presupuesto</h2>
 <p className="hidden md:block text-[12px] text-slate-400 mt-0.5 leading-snug">Gestiona y aprueba los presupuestos del paciente</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isCompact && filtroButton}
          <button onClick={handleNuevo} title="Nuevo"
            className="shrink-0 flex items-center gap-1.5 px-3 lg:px-4 py-2 sm:py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[12px] sm:text-[13px] font-semibold transition-colors shadow-sm">
            <Icon name="add" size={16} /> <span className="hidden lg:inline">Nuevo</span>
          </button>
        </div>
      </div>

      {isCompact && filtroTagsRow}
    </div>
  );

  const detalleContent = (
    <div className="flex flex-col gap-2 min-w-0">
      {creating ? (
        <PresupuestoPhase
          consultaId={consultaId ?? "0"}
          pacienteId={pacienteId}
          paciente={paciente}
          presupuesto={null}
          mediosPago={mediosPago}
          onSaved={handleCreated}
          onCancel={() => setCreating(false)}
        />
      ) : seleccionado ? (
        <PresupuestoPhase
          consultaId={consultaId ?? "0"}
          pacienteId={pacienteId}
          paciente={paciente}
          presupuesto={seleccionado}
          mediosPago={mediosPago}
          onSaved={refreshAll}
          onNavigateTab={onNavigateTab}
        />
      ) : (
 <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
 <Icon name="info" size={16} className="text-slate-400 shrink-0"/>
 <p className="text-[12.5px] text-slate-500">Este paciente no tiene presupuesto registrado.</p>
        </div>
      )}
    </div>
  );

  // Tablet/mobile (<lg): la pestaña muestra por defecto la tabla headerless
  // de registros (estilo admin) — clic en una fila (o en "+ Nuevo") abre el
  // detalle completo en un modal. Desktop (lg+) no cambia: sigue con la
  // grilla maestro-detalle de dos columnas.
  if (isCompact) {
    return (
      <>
        {header}
 <div className={isMobile ? "flex flex-col gap-3 px-3 pt-3 bg-slate-50" : "flex flex-col divide-y divide-slate-100"}>
          {historialFiltrado.length === 0 ? (
 <p className="text-[12px] text-slate-400 text-center py-8">
              {hasFilter ? "Sin presupuestos con este filtro." : "Este paciente no tiene presupuesto registrado."}
            </p>
          ) : (
            historialMobilePag.map(item => (
              <HistorialRow key={item.id} item={item} active={item.id === selectedId} onClick={() => selectItem(item.id)} isMobile={isMobile} />
            ))
          )}
        </div>

        {/* Paginación mobile — píldora flotante, igual que en las vistas de
            asistente (Turnos de Caja, Personal, etc.). Solo en mobile: en
            tablet (md-lg, dentro de isCompact) no se muestra. */}
        {mobileTotalPages > 1 && (
 <div className="md:hidden mt-3 sticky bottom-3 self-center z-10 flex items-center gap-1 bg-white/70 backdrop-blur-md border border-slate-200 rounded-full shadow-lg px-1.5 py-1.5 mx-auto w-fit">
            <button
              disabled={mobilePage === 1}
              onClick={() => setMobilePage(p => p - 1)}
 className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-0 bg-transparent"
            >
              <Icon name="chevron_left" size={16} />
            </button>
            {getMobilePageWindow(mobilePage, mobileTotalPages).map((p) => (
              <button
                key={p}
                onClick={() => setMobilePage(p)}
 className={`w-7 h-7 rounded-full text-[12px] font-semibold transition-colors border-0 ${p === mobilePage ? "bg-cyan-600 text-white" : "bg-transparent text-slate-600 hover:bg-slate-100"}`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={mobilePage === mobileTotalPages}
              onClick={() => setMobilePage(p => p + 1)}
 className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-0 bg-transparent"
            >
              <Icon name="chevron_right" size={16} />
            </button>
          </div>
        )}

        <AnimatePresence>
          {showDetalleModal && (
            <ResponsiveSheet onClose={() => { setShowDetalleModal(false); setCreating(false); }} title="Presupuesto">
              {detalleContent}
            </ResponsiveSheet>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop: la vista no tiene scroll propio — su alto lo da el contenedor
  // de la pestaña (misma cadena lg:h-full / lg:flex-1 / lg:min-h-0 que usan
  // Odontograma/Diagnóstico). "Detalle" e "Historial" quedan del mismo alto
  // (grid con stretch, sin items-start) y cada uno scrollea por su cuenta.
  return (
    <div className="flex flex-col w-full lg:h-full">
      {header}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:flex-1 lg:min-h-0">
        {detalleContent}
 <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col min-w-0 lg:h-full lg:min-h-0">
          <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 shrink-0">
            <div className="flex items-center gap-2">
 <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Historial</h2>
 <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10.5px] font-bold flex items-center justify-center">
                {historial.length}
              </span>
            </div>
            {filtroButton}
          </div>
          {filtroTagsRow && <div className="px-4 pb-3 shrink-0">{filtroTagsRow}</div>}
          {historialFiltrado.length === 0 ? (
 <p className="text-[12px] text-slate-400 text-center py-8">
              {hasFilter ? "Sin presupuestos con este filtro." : "Sin presupuestos"}
            </p>
          ) : (
 <div className="lg:flex-1 lg:min-h-0 overflow-y-auto no-scrollbar divide-y divide-slate-100 border-t border-slate-100">
              {historialFiltrado.map(item => (
                <HistorialRow key={item.id} item={item} active={!creating && item.id === selectedId} onClick={() => selectItem(item.id)} isMobile={false} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
