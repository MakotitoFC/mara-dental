"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { fadeIn, scaleIn } from "@/lib/animations";
import { DiagnosticoSkeleton } from "@/components/ui/ConsultaSkeletons";
import { DiagnosticoForm } from "../consulta/DiagnosticoForm";
import { DiagnosticoCard } from "../consulta/DiagnosticoCard";
import { TratamientoSection } from "../consulta/TratamientoSection";
import { PlanTrabajoSection } from "../consulta/PlanTrabajoSection";
import { RecomendacionesSection } from "../consulta/RecomendacionesSection";
import {
  getDiagnosticosPacienteAction,
  getTratamientosAction,
  getPlanTrabajoAction,
  getRecomendacionesConsultaAction,
} from "../../consulta.actions";

function Notice({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
      <Icon name="info" size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
      <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      variants={fadeIn} initial="hidden" animate="visible" exit="exit"
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        variants={scaleIn} initial="hidden" animate="visible" exit="exit"
        className="relative w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <Icon name="close" size={16} />
        </button>
        <div className="max-h-[90vh] overflow-y-auto overflow-x-hidden no-scrollbar rounded-2xl">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

const fmtFecha = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
};

function DiagnosticosTable({ items, onRowClick }: { items: any[]; onRowClick: (d: any) => void }) {
  if (items.length === 0) {
    return (
      <div className="py-10 text-center text-slate-400 dark:text-slate-500">
        <Icon name="assignment" size={28} className="opacity-30 mx-auto mb-2" />
        <p className="text-[12px]">Sin diagnósticos registrados</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">CIE-10</th>
            <th className="px-3 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Descripción</th>
            <th className="px-5 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-right">Estado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((d: any) => (
            <tr
              key={d.id}
              onClick={() => onRowClick(d)}
              className="border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
            >
              <td className="px-5 py-3 align-top whitespace-nowrap">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                  {d.cie10?.codigo ?? "—"}
                </span>
              </td>
              <td className="px-3 py-3 align-top max-w-[220px]">
                <p className="text-[12.5px] font-medium text-slate-800 dark:text-slate-100 line-clamp-2">{d.diagnostico_texto}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500">{fmtFecha(d.fecha_deteccion)}</p>
                  {d.archivos?.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[10.5px] font-medium text-cyan-600 dark:text-cyan-400">
                      <Icon name="attach_file" size={12} /> {d.archivos.length}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-5 py-3 align-top text-right whitespace-nowrap">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${d.es_definitivo ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}`}>
                  {d.es_definitivo ? "Definitivo" : "Presuntivo"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Diagnóstico del historial + su plan de tratamiento / recomendaciones a detalle (carga perezosa al expandir). */
function HistorialDiagnosticoItem({ diagnostico: d, pacienteId, onSaved }: { diagnostico: any; pacienteId: number; onSaved: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [detalle, setDetalle] = useState<{ tratamientos: any[]; planTrabajo: any[]; recomendaciones: any[] } | null>(null);
  const [planItems, setPlanItems] = useState<{ estado: string }[] | null>(null);

  async function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !detalle) {
      const [tratamientos, planTrabajo, recomendaciones] = await Promise.all([
        getTratamientosAction(String(d.id)),
        getPlanTrabajoAction(String(d.id)),
        getRecomendacionesConsultaAction(String(d.consulta_id)),
      ]);
      setDetalle({ tratamientos, planTrabajo, recomendaciones });
    }
  }

  const items = planItems ?? detalle?.planTrabajo ?? [];
  const totalFases = items.length;
  const hechas = items.filter((i: any) => i.estado === "Terminado").length;
  const pct = totalFases > 0 ? Math.round((hechas / totalFases) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <DiagnosticoCard diagnostico={d} consultaId={String(d.consulta_id)} pacienteId={String(pacienteId)} onSaved={onSaved} />

      {d.es_tratado && (
        <button
          onClick={toggleExpand}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-[12px] font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10 transition-colors"
        >
          <Icon name={expanded ? "expand_less" : "expand_more"} size={16} />
          {expanded ? "Ocultar plan de tratamiento" : "Ver plan de tratamiento y recomendaciones"}
        </button>
      )}

      {expanded && (
        !detalle ? (
          <div className="py-6 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-cyan-500 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-3 pl-2 border-l-2 border-slate-100 dark:border-slate-700">
            <TratamientoSection
              diagnosticoId={String(d.id)}
              consultaId={String(d.consulta_id)}
              pacienteId={String(pacienteId)}
              initial={detalle.tratamientos}
            />
            <PlanTrabajoSection
              diagnosticoId={String(d.id)}
              pacienteId={String(pacienteId)}
              initial={detalle.planTrabajo}
              onItemsChange={setPlanItems}
            />
            {totalFases > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-end gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Progreso total</p>
                  <p className="text-[15px] font-bold text-cyan-700 dark:text-cyan-400">{pct}%</p>
                </div>
              </div>
            )}
            <RecomendacionesSection
              consultaId={String(d.consulta_id)}
              pacienteId={String(pacienteId)}
              initial={detalle.recomendaciones}
              onSaved={() => {}}
            />
          </div>
        )
      )}
    </div>
  );
}

export function DiagnosticoTab({ paciente, consultaId, data, loading, refetch }: {
  paciente: any;
  consultaId?: string | null;
  data: any;
  loading: boolean;
  refetch: () => void;
}) {
  const pacienteId = Number(paciente.id);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const [planItems, setPlanItems] = useState<{ estado: string }[] | null>(null);

  // Sin consulta activa: se muestra el historial completo del paciente (solo lectura de la lista, con vista/edición individual).
  const [historialPaciente, setHistorialPaciente] = useState<any[] | null>(null);
  const fetchHistorialPaciente = useCallback(async () => {
    const list = await getDiagnosticosPacienteAction(String(pacienteId));
    setHistorialPaciente(list);
  }, [pacienteId]);

  useEffect(() => {
    if (!consultaId) fetchHistorialPaciente();
  }, [consultaId, fetchHistorialPaciente]);

  if (!consultaId) {
    if (historialPaciente === null) return <DiagnosticoSkeleton />;
    return (
      <div className="flex flex-col gap-4">
        <Notice text="Estás viendo el historial completo del paciente. Inicia una consulta desde Timeline para registrar un nuevo diagnóstico o gestionar su plan de tratamiento." />
        {historialPaciente.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 py-10 text-center text-slate-400 dark:text-slate-500">
            <Icon name="assignment" size={28} className="opacity-30 mx-auto mb-2" />
            <p className="text-[12px]">Sin diagnósticos registrados aún</p>
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto no-scrollbar pr-0.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {historialPaciente.map((d) => (
                <HistorialDiagnosticoItem
                  key={d.id}
                  diagnostico={d}
                  pacienteId={pacienteId}
                  onSaved={fetchHistorialPaciente}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading || !data) return <DiagnosticoSkeleton />;

  const actual = data.diagnostico;
  const historial = data.historialDiagnosticos ?? [];
  const todos = actual ? [actual, ...historial] : historial;

  const items = planItems ?? data.planTrabajo ?? [];
  const totalFases = items.length;
  const hechas = items.filter((i: any) => i.estado === "Terminado").length;
  const pct = totalFases > 0 ? Math.round((hechas / totalFases) * 100) : 0;

  const presupuestoTotal = data.presupuesto?.total_bruto != null
    ? Number(data.presupuesto.total_bruto) - Number(data.presupuesto.descuento_monto || 0)
    : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      {/* Columna izquierda — Diagnósticos */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Icon name="assignment" size={18} />
            </div>
            <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 truncate">Diagnósticos</h2>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[12px] font-semibold transition-colors shrink-0"
          >
            <Icon name="add" size={14} /> Añadir Diagnóstico
          </button>
        </div>

        <DiagnosticosTable items={todos} onRowClick={setViewing} />
      </div>

      {/* Columna derecha — Plan de Tratamiento */}
      <div className="flex flex-col gap-4">
        {!actual ? (
          <Notice text="Registra un diagnóstico para habilitar el plan de tratamiento." />
        ) : !actual.es_tratado ? (
          <Notice text="El diagnóstico actual no requiere tratamiento en la clínica. Continúa a Presupuesto si corresponde." />
        ) : (
          <>
            <TratamientoSection
              diagnosticoId={String(actual.id)}
              consultaId={String(consultaId)}
              pacienteId={String(pacienteId)}
              initial={data.tratamientos ?? []}
            />

            <PlanTrabajoSection
              diagnosticoId={String(actual.id)}
              pacienteId={String(pacienteId)}
              initial={data.planTrabajo ?? []}
              onItemsChange={setPlanItems}
            />

            {(totalFases > 0 || presupuestoTotal != null) && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Presupuesto estimado</p>
                  <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                    {presupuestoTotal != null ? `S/ ${presupuestoTotal.toFixed(2)}` : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Progreso total</p>
                  <p className="text-[15px] font-bold text-cyan-700 dark:text-cyan-400">{totalFases > 0 ? `${pct}%` : "—"}</p>
                </div>
              </div>
            )}

            <RecomendacionesSection
              consultaId={String(consultaId)}
              pacienteId={String(pacienteId)}
              initial={data.recomendaciones ?? []}
              onSaved={refetch}
            />
          </>
        )}
      </div>

      {/* Modal: nuevo diagnóstico */}
      <AnimatePresence>
        {showForm && (
          <Modal onClose={() => setShowForm(false)}>
            <DiagnosticoForm
              consultaId={String(consultaId)}
              pacienteId={String(pacienteId)}
              onSaved={() => { setShowForm(false); refetch(); }}
            />
          </Modal>
        )}
      </AnimatePresence>

      {/* Modal: ver/editar diagnóstico existente */}
      <AnimatePresence>
        {viewing && (
          <Modal onClose={() => setViewing(null)}>
            <DiagnosticoCard
              diagnostico={viewing}
              consultaId={String(consultaId)}
              pacienteId={String(pacienteId)}
              onSaved={() => { setViewing(null); refetch(); }}
            />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
