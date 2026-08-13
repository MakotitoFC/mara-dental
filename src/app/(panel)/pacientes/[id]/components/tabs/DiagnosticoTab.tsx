"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { DiagnosticoSkeleton } from "@/components/ui/ConsultaSkeletons";
import { DiagnosticoForm } from "../consulta/DiagnosticoForm";
import { DiagnosticoCard } from "../consulta/DiagnosticoCard";
import { TratamientoSection } from "../consulta/TratamientoSection";
import { RecomendacionesSection } from "../consulta/RecomendacionesSection";
import { RecetaSection } from "../consulta/RecetaSection";
import {
  getDiagnosticosPacienteAction,
  getTratamientosAction,
  getRecomendacionesConsultaAction,
  getRecetasAction,
} from "../../consulta.actions";
import { useScrollFade } from "@/lib/hooks/useScrollFade";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";

function Notice({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
      <Icon name="info" size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
      <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

const fmtFecha = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
};

/** Alto fijo de fila — 8 filas visibles antes de scrollear (ver LIST_MAX_H),
 * y el mismo alto se usa como tope del panel de detalle para que ambos
 * paneles del layout maestro-detalle midan exactamente lo mismo (mismos
 * valores que PresupuestoTab, que usa este mismo patrón). */
const ROW_H = 60;
const LIST_MAX_H = ROW_H * 8;

/** Fila compacta del historial — fecha + tipo (presuntivo/definitivo) + si
 * tiene tratamiento/recetas. El seleccionado (por defecto, el más reciente)
 * se resalta en verde, el mismo color que ya usa el badge "Definitivo". */
function DiagnosticoHistorialRow({ d, active, tratCount, recCount, onClick }: {
  d: any; active: boolean; tratCount: number; recCount: number; onClick: () => void;
}) {
  const cfg = d.es_definitivo
    ? { dot: "bg-emerald-500", badge: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", label: "Definitivo" }
    : { dot: "bg-amber-500", badge: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800", label: "Presuntivo" };

  return (
    <button
      onClick={onClick}
      style={{ height: ROW_H }}
      className={`w-full text-left flex items-center gap-3 px-3 border-l-2 transition-colors border-0 ${
        active
          ? "bg-emerald-50 dark:bg-emerald-900/20 border-l-emerald-500"
          : "border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50"
      }`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100">{fmtFecha(d.fecha_deteccion)}</p>
        {(tratCount > 0 || recCount > 0) && (
          <div className="flex items-center gap-2.5 mt-0.5">
            {tratCount > 0 && (
              <span className="flex items-center gap-1 text-[10.5px] text-slate-400 dark:text-slate-500">
                <Icon name="account_tree" size={11} /> Tratamiento
              </span>
            )}
            {recCount > 0 && (
              <span className="flex items-center gap-1 text-[10.5px] text-slate-400 dark:text-slate-500">
                <Icon name="medication" size={11} /> Recetas
              </span>
            )}
          </div>
        )}
      </div>
      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border shrink-0 ${cfg.badge}`}>{cfg.label}</span>
    </button>
  );
}

// ─── Wizard de consulta activa (Diagnóstico → Tratamientos → Recomendaciones → Recetas) ──

const WIZARD_STEPS = [
  { key: "diagnostico", label: "Diagnóstico", icon: "stethoscope", titulo: "Registra el diagnóstico clínico" },
  { key: "tratamientos", label: "Tratamientos", icon: "account_tree", titulo: "Plan de tratamiento" },
  { key: "recomendaciones", label: "Recomendaciones", icon: "tips_and_updates", titulo: "Indicaciones para el paciente" },
  { key: "recetas", label: "Recetas", icon: "medication", titulo: "Medicamentos prescritos" },
] as const;

/** Franja fija (no scrollea) — ver DiagnosticoTab: se pasa sticky desde afuera. */
function ConsultaStepper({ step, done, onStepClick }: { step: number; done: boolean[]; onStepClick: (i: number) => void }) {
  // Mismo patrón visual que el stepper de "Nuevo paciente" (NuevoPacienteModal):
  // círculos a flex-1 (ocupan todo el ancho disponible, no un grupo centrado
  // y compacto), completados = relleno cian + check, activo = solo borde
  // cian con su número, pendientes = borde gris pálido con su número.
  return (
    <div className="flex items-center px-1 py-2">
      {WIZARD_STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1 last:flex-none">
          <button onClick={() => onStepClick(i)} className="shrink-0">
            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[12px] font-bold transition-colors duration-300 ease-out ${
              done[i]
                ? "bg-cyan-600 border-cyan-600 text-white"
                : i === step
                  ? "border-cyan-600 text-cyan-600"
                  : "border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600"
            }`}>
              {done[i] ? <Icon name="check" size={13} /> : i === step ? i + 1 : "–"}
            </div>
          </button>
          {i < WIZARD_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1.5 transition-colors duration-300 ease-out ${done[i + 1] ? "bg-cyan-600" : "bg-slate-200 dark:bg-slate-700"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ResumenRegistrado({ done, detalles }: { done: boolean[]; detalles: string[][] }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">Resumen registrado</p>
      <div className="flex flex-col gap-3">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.key}>
            <div className={`flex items-center gap-2 text-[12.5px] font-semibold ${done[i] ? "text-slate-700 dark:text-slate-300" : "text-slate-300 dark:text-slate-600"}`}>
              {done[i] ? (
                <Icon name="check_circle" size={15} className="text-emerald-500 shrink-0" />
              ) : (
                <span className="w-[15px] h-[15px] rounded-full border-2 border-slate-200 dark:border-slate-700 shrink-0" />
              )}
              <span className="truncate">{s.label}</span>
            </div>
            {done[i] && detalles[i].length > 0 && (
              <div className="pl-[23px] mt-1 flex flex-col gap-0.5">
                {detalles[i].slice(0, 4).map((d, j) => (
                  <p key={j} className="text-[11px] text-slate-500 dark:text-slate-400 truncate">· {d}</p>
                ))}
                {detalles[i].length > 4 && (
                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500 italic">+{detalles[i].length - 4} más</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiagnosticoTab({ paciente, consultaId, data, loading, refetch, onFinalizarConsulta }: {
  paciente: any;
  consultaId?: string | null;
  data: any;
  loading: boolean;
  refetch: () => void;
  onFinalizarConsulta?: () => void;
}) {
  const pacienteId = String(paciente.id);
  const [planItems, setPlanItems] = useState<{ estado: string }[] | null>(null);
  const [step, setStep] = useState(0);
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const listScroll = useScrollFade<HTMLDivElement>();
  const detailScroll = useScrollFade<HTMLDivElement>();

  // El diagnóstico recién creado solo existe en `data` después de que `refetch`
  // (async) termine — avanzar de paso ahí mismo (antes de esperarlo) dejaba el
  // wizard mostrando "sin diagnóstico" a pesar de haber guardado uno. Se marca
  // la intención con un ref y se avanza recién cuando `data.diagnostico` llega.
  const justCreatedDiagRef = useRef(false);
  const actualId = data?.diagnostico?.id ?? null;
  useEffect(() => {
    if (actualId && justCreatedDiagRef.current) {
      justCreatedDiagRef.current = false;
      setStep(1);
    }
  }, [actualId]);

  // Sin consulta activa: se muestra el historial completo del paciente en un
  // aside (lista) + panel de detalle del diagnóstico seleccionado.
  const [historialPaciente, setHistorialPaciente] = useState<any[] | null>(null);
  const [detalleMap, setDetalleMap] = useState<Record<string, { tratamientos: any[]; recomendaciones: any[]; recetas: any[] }>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchHistorialPaciente = useCallback(async () => {
    try {
      const list = await getDiagnosticosPacienteAction(String(pacienteId));
      const safeList = list || [];

      // `historialPaciente`/`detalleMap`/`selectedId` se actualizan juntos al
      // final — si `historialPaciente` se marcaba antes de tener el detalle
      // listo, había un render intermedio con la lista ya poblada pero
      // `selectedId` todavía apuntando a nada, y por un instante se mostraba
      // el aviso de "sin diagnósticos" en vez del registro actual (el más
      // reciente, que debe verse seleccionado por defecto).
      if (safeList.length > 0) {
        const entries = await Promise.all(
          safeList.map(async (d: any) => {
            const [tratamientos, recomendaciones, recetas] = await Promise.all([
              getTratamientosAction(String(d.id)),
              getRecomendacionesConsultaAction(String(d.consulta_id)),
              getRecetasAction(String(d.id)),
            ]);
            return [String(d.id), { tratamientos, recomendaciones, recetas }] as const;
          })
        );
        setHistorialPaciente(safeList);
        setDetalleMap(Object.fromEntries(entries));
        setSelectedId((prev) =>
          prev && safeList.some((d: any) => String(d.id) === prev)
            ? prev
            : String(safeList[0].id)
        );
      } else {
        setHistorialPaciente(safeList);
        setDetalleMap({});
        setSelectedId(null);
      }
    } catch (e) {
      console.error("Error al cargar historial de diagnósticos:", e);
      setHistorialPaciente([]);
      setDetalleMap({});
      setSelectedId(null);
    }
  }, [pacienteId]);

  useEffect(() => {
    fetchHistorialPaciente();
  }, [fetchHistorialPaciente]);

  if (!consultaId) {
    if (historialPaciente === null) return <DiagnosticoSkeleton />;

    const seleccionado = historialPaciente.find((d) => String(d.id) === selectedId) ?? null;
    const detalleSel = seleccionado ? detalleMap[String(seleccionado.id)] : null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4 items-start">
        {/* ── Detalle — diagnóstico seleccionado del historial (mismo patrón que Presupuesto).
            Scroll propio y acotado, igual que el panel de Historial de al lado — no depende
            de que la vista completa scrollee para alcanzar el resto del contenido. ── */}
        <div className="flex flex-col gap-2 min-w-0">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Diagnóstico</h2>

          <div ref={detailScroll.ref} style={{ ...detailScroll.style, maxHeight: LIST_MAX_H }} className="overflow-y-auto no-scrollbar flex flex-col gap-4 pr-1 pb-4">
            {seleccionado ? (
              <>
                <DiagnosticoCard
                  diagnostico={seleccionado}
                  consultaId={String(seleccionado.consulta_id)}
                  pacienteId={String(pacienteId)}
                  onSaved={fetchHistorialPaciente}
                />
                {detalleSel ? (
                  <>
                    {seleccionado.es_tratado ? (
                      <TratamientoSection
                        key={`trat-${seleccionado.id}`}
                        diagnosticoId={String(seleccionado.id)}
                        consultaId={String(seleccionado.consulta_id)}
                        pacienteId={String(pacienteId)}
                        initial={detalleSel.tratamientos}
                        onItemsChange={() => fetchHistorialPaciente()}
                      />
                    ) : (
                      <Notice text="Este diagnóstico no requiere tratamiento en la clínica." />
                    )}
                    <RecomendacionesSection
                      key={`recom-${seleccionado.id}`}
                      consultaId={String(seleccionado.consulta_id)}
                      pacienteId={String(pacienteId)}
                      initial={detalleSel.recomendaciones}
                      onSaved={fetchHistorialPaciente}
                    />
                    <RecetaSection
                      key={`receta-${seleccionado.id}`}
                      diagnosticoId={String(seleccionado.id)}
                      pacienteId={String(pacienteId)}
                      initial={detalleSel.recetas}
                      pacienteNombre={paciente.nombre_completo}
                      telefono={paciente.telefono ?? ""}
                      dni={paciente.dni ?? ""}
                      pacienteFechaNacimiento={paciente.fecha_nacimiento}
                      alergias={paciente.alergias}
                      doctorNombre={seleccionado.doctor_nombre ?? "Doctor"}
                      diagnosticoTexto={seleccionado.diagnostico_texto ?? ""}
                      onSaved={fetchHistorialPaciente}
                    />
                  </>
                ) : (
                  <div className="py-6 flex justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-cyan-500 animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                <Icon name="info" size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400">Este paciente no tiene diagnósticos registrados.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Historial — todos los diagnósticos del paciente, scroll propio. ── */}
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Historial</h2>
            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10.5px] font-bold flex items-center justify-center">
              {historialPaciente.length}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {historialPaciente.length === 0 ? (
              <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center py-8">Sin diagnósticos</p>
            ) : (
              <div ref={listScroll.ref} style={{ ...listScroll.style, maxHeight: LIST_MAX_H }} className="overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-slate-700">
                {historialPaciente.map((d) => (
                  <DiagnosticoHistorialRow
                    key={d.id}
                    d={d}
                    active={String(d.id) === selectedId}
                    tratCount={detalleMap[String(d.id)]?.tratamientos.length ?? 0}
                    recCount={detalleMap[String(d.id)]?.recetas.length ?? 0}
                    onClick={() => setSelectedId(String(d.id))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading || !data) return <DiagnosticoSkeleton />;

  const actual = data.diagnostico;
  const historial = historialPaciente ?? [];

  // Como `historialPaciente` ya contiene TODOS los diagnósticos del paciente (incluso el 'actual' si ya se guardó),
  // y están ordenados por fecha, podemos usarlo directamente. Si por alguna razón 'actual' aún no está en el historial
  // (por un desfase muy pequeño de tiempo), lo agregamos al inicio asegurándonos de no duplicarlo.
  const todos = actual 
    ? (historial.find(d => d.id === actual.id) ? historial : [actual, ...historial]) 
    : historial;

  const items = planItems ?? data.planTrabajo ?? [];
  const totalFases = items.length;
  const hechas = items.filter((i: any) => i.estado === "Terminado").length;
  const pct = totalFases > 0 ? Math.round((hechas / totalFases) * 100) : 0;

  const presupuestoTotal = data.presupuesto?.total_bruto != null
    ? Number(data.presupuesto.total_bruto) - Number(data.presupuesto.descuento_monto || 0)
    : null;

  const tratCount = data.tratamientos?.length ?? 0;
  const recomCount = data.recomendaciones?.length ?? 0;
  const recetaCount = data.recetas?.length ?? 0;

  const done = [
    !!actual,
    !!actual?.es_tratado && tratCount > 0,
    recomCount > 0,
    recetaCount > 0,
  ];
  const detalles: string[][] = [
    actual?.diagnostico_texto ? [actual.diagnostico_texto] : [],
    (data.tratamientos ?? []).map((t: any) => t.catalogo_nombre).filter(Boolean),
    (data.recomendaciones ?? []).map((r: any) => r.contenido).filter(Boolean),
    (data.recetas ?? []).flatMap((r: any) => (r.receta_medicamento ?? []).map((m: any) => m.medicamento_nombre)).filter(Boolean),
  ];

  function goStep(i: number) {
    setStep(Math.max(0, Math.min(WIZARD_STEPS.length - 1, i)));
  }

  return (
    <>
    <div className="h-full flex flex-col gap-4 min-w-0">
      {/* Wizard — el stepper queda fijo, fuera del scroll interno del paso (ver
          contenedor de HistoriaView: "diagnosticos" no scrollea a ese nivel,
          solo lo hace el contenido de abajo). Antes usaba position:sticky
          DENTRO de un contenedor que sí scrolleaba — funcionaba casi siempre,
          pero en mobile el compositor puede atrasarse un frame durante scroll
          rápido y dejar ver el contenido de abajo un instante. Sacarlo del
          scroll de raíz lo evita de plano. El resumen registrado ya no vive
          aquí: se muestra en el modal de confirmación al Finalizar. */}
      <div className="shrink-0 bg-slate-50 dark:bg-slate-900 -mx-3 px-3 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6 pb-2">
        <ConsultaStepper step={step} done={done} onStepClick={goStep} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-4">
        {/* Título del paso + navegación — fuera de cualquier card (cada
            componente de paso, DiagnosticoForm/TratamientoSection/etc., ya
            trae su propia tarjeta con su propio ícono/subtítulo, así que
            envolverlos en OTRA tarjeta acá arriba solo duplicaba el borde).
            Anterior/Continuar pasan de texto en un footer a solo íconos acá
            arriba, al lado del título. */}
        <div className="flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">Paso {step + 1} de {WIZARD_STEPS.length}</p>
            <h3 className="text-[17px] font-bold text-slate-900 dark:text-slate-100">{WIZARD_STEPS[step].titulo}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => goStep(step - 1)}
              disabled={step === 0}
              aria-label="Paso anterior"
              className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-0 disabled:pointer-events-none transition-colors"
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <button
              onClick={() => { if (step < WIZARD_STEPS.length - 1) goStep(step + 1); else setShowFinalizar(true); }}
              aria-label={step === WIZARD_STEPS.length - 1 ? "Finalizar consulta" : "Siguiente paso"}
              className="w-9 h-9 rounded-full bg-cyan-600 hover:bg-cyan-700 flex items-center justify-center text-white transition-colors"
            >
              <Icon name={step === WIZARD_STEPS.length - 1 ? "check" : "chevron_right"} size={18} />
            </button>
          </div>
        </div>

        {step === 0 && (
            actual ? (
              <DiagnosticoCard diagnostico={actual} consultaId={String(consultaId)} pacienteId={String(pacienteId)} onSaved={refetch} />
            ) : (
              <DiagnosticoForm consultaId={String(consultaId)} pacienteId={String(pacienteId)} onSaved={() => { justCreatedDiagRef.current = true; refetch(); }} />
            )
          )}

          {step === 1 && (
            !actual ? (
              <Notice text="Registra un diagnóstico para habilitar el plan de tratamiento." />
            ) : !actual.es_tratado ? (
              <Notice text="El diagnóstico actual no requiere tratamiento en la clínica. Continúa a Presupuesto si corresponde." />
            ) : (
              <div className="flex flex-col gap-4">
                <TratamientoSection
                  diagnosticoId={String(actual.id)}
                  consultaId={String(consultaId)}
                  pacienteId={String(pacienteId)}
                  initial={data.tratamientos ?? []}
                  onItemsChange={() => refetch()}
                />
                {(totalFases > 0 || presupuestoTotal != null) && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-4">
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
              </div>
            )
          )}

          {step === 2 && (
            !actual ? (
              <Notice text="Registra un diagnóstico para habilitar las recomendaciones." />
            ) : (
              <RecomendacionesSection
                consultaId={String(consultaId)}
                pacienteId={String(pacienteId)}
                initial={data.recomendaciones ?? []}
                onSaved={refetch}
              />
            )
          )}

          {step === 3 && (
            !actual ? (
              <Notice text="Registra un diagnóstico para habilitar las recetas." />
            ) : (
              <RecetaSection
                diagnosticoId={String(actual.id)}
                pacienteId={String(pacienteId)}
                initial={data.recetas ?? []}
                pacienteNombre={paciente.nombre_completo}
                telefono={paciente.telefono ?? ""}
                dni={paciente.dni ?? ""}
                pacienteFechaNacimiento={paciente.fecha_nacimiento}
                alergias={paciente.alergias}
                doctorNombre={data.consulta?.doctor_nombre ?? "Doctor"}
                diagnosticoTexto={actual.diagnostico_texto ?? ""}
                onSaved={refetch}
              />
            )
          )}

      </div>
    </div>

    <AnimatePresence>
      {showFinalizar && (
        <ResponsiveSheet
          title="Finalizar consulta"
          onClose={() => { setShowFinalizar(false); setConfirmado(false); }}
          footer={
            <button
              onClick={() => { onFinalizarConsulta?.(); setShowFinalizar(false); setConfirmado(false); }}
              disabled={!confirmado}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-semibold transition-colors"
            >
              <Icon name="check_circle" size={16} /> Finalizar consulta
            </button>
          }
        >
          <div className="flex flex-col gap-4 py-1">
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400">Revisa lo registrado en esta consulta antes de finalizar.</p>
            <ResumenRegistrado done={done} detalles={detalles} />
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-cyan-600 shrink-0"
              />
              <span className="text-[12.5px] text-slate-600 dark:text-slate-300">Confirmo que la información registrada es correcta.</span>
            </label>
          </div>
        </ResponsiveSheet>
      )}
    </AnimatePresence>
    </>
  );
}