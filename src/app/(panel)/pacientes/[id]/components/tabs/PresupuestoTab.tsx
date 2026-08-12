"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PresupuestoSkeleton } from "@/components/ui/ConsultaSkeletons";
import { useScrollFade } from "@/lib/hooks/useScrollFade";
import { useToast } from "@/components/ui/Toast";
import { PresupuestoPhase } from "../consulta/PresupuestoPhase";
import { getPresupuestosPacienteAction, getMediosPagoAction } from "../../consulta.actions";

const ESTADO_CFG: Record<string, { dot: string; badge: string; label: string }> = {
  pendiente: { dot: "bg-amber-400", badge: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800", label: "Pendiente" },
  aprobado:  { dot: "bg-emerald-500", badge: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", label: "Aprobado" },
  cancelado: { dot: "bg-slate-300 dark:bg-slate-600", badge: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600", label: "Cancelado" },
};

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
          ? "bg-cyan-50 dark:bg-cyan-900/20 border-l-cyan-500"
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
  const listScroll = useScrollFade<HTMLDivElement>();

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
  }

  function selectItem(id: number) {
    setCreating(false);
    setSelectedId(id);
  }

  if (historialLoading && historial.length === 0) return <PresupuestoSkeleton />;

  const seleccionado = historial.find(h => h.id === selectedId) ?? null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4 items-start">
      {/* ── Detalle — registro seleccionado del historial, o el formulario de creación. ── */}
      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Presupuesto</h2>
          <button onClick={handleNuevo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[12px] font-semibold transition-colors">
            <Icon name="add" size={15} /> Nuevo
          </button>
        </div>

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

      {/* ── Historial — todos los presupuestos del paciente, scroll propio. ── */}
      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Historial</h2>
          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10.5px] font-bold flex items-center justify-center">
            {historial.length}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {historial.length === 0 ? (
            <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center py-8">Sin presupuestos</p>
          ) : (
            <div ref={listScroll.ref} style={{ ...listScroll.style, maxHeight: LIST_MAX_H }} className="overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-slate-700">
              {historial.map(item => (
                <HistorialRow key={item.id} item={item} active={!creating && item.id === selectedId} onClick={() => selectItem(item.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
