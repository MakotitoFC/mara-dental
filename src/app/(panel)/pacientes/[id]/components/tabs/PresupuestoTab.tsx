"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { PresupuestoSkeleton } from "@/components/ui/ConsultaSkeletons";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { PresupuestoPhase } from "../consulta/PresupuestoPhase";
import { getPresupuestosPacienteAction, getMediosPagoAction } from "../../consulta.actions";

const ESTADO_CFG: Record<string, { dot: string; badge: string; label: string }> = {
  pendiente: { dot: "bg-amber-400", badge: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800", label: "Pendiente" },
  aprobado:  { dot: "bg-emerald-500", badge: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", label: "Aprobado" },
  cancelado: { dot: "bg-slate-300 dark:bg-slate-600", badge: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600", label: "Cancelado" },
};

const ESTADO_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "aprobado", label: "Aprobado" },
  { value: "cancelado", label: "Cancelado" },
];

function fmtFechaCorta(iso?: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

const money = (n: number, m = "PEN") => `${m === "PEN" ? "S/" : m} ${n.toFixed(2)}`;

/** Alto fijo de fila — 8 filas visibles antes de scrollear (ver LIST_MAX_H),
 * y el mismo alto se usa como tope del panel de detalle para que ambos
 * paneles del layout maestro-detalle midan exactamente lo mismo. */
const ROW_H = 60;
const LIST_MAX_H = ROW_H * 8;

function HistorialRow({ item, active, onClick }: { item: any; active: boolean; onClick: () => void }) {
  const cfg = ESTADO_CFG[item.estado] ?? ESTADO_CFG.pendiente;
  const nombre = item.items?.[0]?.nombre ?? "Presupuesto";
  const total = Number(item.total_bruto) - Number(item.descuento_monto);
  return (
    <button
      onClick={onClick}
      style={{ height: ROW_H }}
      className={`w-full text-left flex items-center gap-3 px-3 border-l-2 transition-colors border-0 ${
        active
          ? "bg-slate-100 dark:bg-slate-700/60 border-l-slate-400 dark:border-l-slate-500"
          : "border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50"
      }`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] text-slate-400 dark:text-slate-500">{fmtFechaCorta(item.fecha_emision)}</p>
        <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">{nombre}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{money(total, item.items?.[0]?.moneda)}</span>
        <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${cfg.badge}`}>{cfg.label}</span>
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
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterFecha, setFilterFecha] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    if (filterOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [filterOpen]);

  const [historial, setHistorial] = useState<any[]>([]);
  const [historialLoading, setHistorialLoading] = useState(true);
  const [mediosPago, setMediosPago] = useState<{ id: number; nombre: string }[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

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

  // Cabecera — misma en TODOS los breakpoints (antes desktop tenía una
  // versión aparte, sin fondo blanco ni descripción, flotando sobre el
  // fondo gris de la página). Sticky, pegada al navbar de tabs, mismo fondo
  // blanco y sin espacio entre ambos; el separador gris queda abajo, entre
  // este bloque y el contenido scrolleable (mismo patrón que Odontograma
  // y Diagnóstico). El ícono de filtro despliega los selectores de fecha y
  // estado en un dropdown anclado DEBAJO del ícono (no a su lado): así el
  // panel nunca compite por espacio con el título/descripción, que solo se
  // envuelve de forma normal en su propia columna.
  const header = (
    <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 py-4 mb-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Presupuesto</h2>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">Gestiona y aprueba los presupuestos del paciente</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              title="Filtrar"
              className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                filterOpen || hasFilter ? "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400" : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <Icon name="filter_lines" size={18} />
            </button>
            {filterOpen && (
              <div className="absolute top-[calc(100%+8px)] right-0 z-30 flex flex-col gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg w-[200px]">
                <Select value={filterEstado} onChange={setFilterEstado} placeholder="Estado" options={ESTADO_OPTIONS} />
                <DatePicker value={filterFecha} onChange={setFilterFecha} placeholder="Fecha…" />
                {hasFilter && (
                  <button
                    onClick={() => { setFilterFecha(""); setFilterEstado(""); }}
                    className="flex items-center justify-center gap-1.5 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-[12px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Icon name="close" size={14} /> Quitar filtros
                  </button>
                )}
              </div>
            )}
          </div>
          <button onClick={handleNuevo} title="Nuevo"
            className="shrink-0 flex items-center justify-center gap-1.5 w-9 h-9 lg:w-auto lg:h-auto lg:px-3 lg:py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[12px] font-semibold transition-colors">
            <Icon name="add" size={15} /> <span className="hidden lg:inline">Nuevo</span>
          </button>
        </div>
      </div>
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
        <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
          <Icon name="info" size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400">Este paciente no tiene presupuesto registrado.</p>
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
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
          {historialFiltrado.length === 0 ? (
            <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center py-8">
              {hasFilter ? "Sin presupuestos con este filtro." : "Este paciente no tiene presupuesto registrado."}
            </p>
          ) : (
            historialFiltrado.map(item => (
              <HistorialRow key={item.id} item={item} active={item.id === selectedId} onClick={() => selectItem(item.id)} />
            ))
          )}
        </div>
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

  return (
    <>
      {header}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        {detalleContent}
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Historial</h2>
            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10.5px] font-bold flex items-center justify-center">
              {historial.length}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {historialFiltrado.length === 0 ? (
            <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center py-8">
              {hasFilter ? "Sin presupuestos con este filtro." : "Sin presupuestos"}
            </p>
          ) : (
            <div style={{ maxHeight: LIST_MAX_H }} className="overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-slate-700">
              {historialFiltrado.map(item => (
                <HistorialRow key={item.id} item={item} active={!creating && item.id === selectedId} onClick={() => selectItem(item.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
