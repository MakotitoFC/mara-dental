"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
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
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { fadeIn, slideUp } from "@/lib/animations";

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

/** Tarjeta de un diagnóstico en el aside del historial — dot + badge de tipo, título, fecha/doctor y conteos. */
function DiagnosticoAsideCard({ d, isActual, isSelected, tratCount, recCount, onClick }: {
  d: any; isActual: boolean; isSelected: boolean; tratCount: number; recCount: number; onClick: () => void;
}) {
  const cfg = d.es_definitivo
    ? { label: "Definitivo", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-300 dark:border-emerald-700" }
    : { label: "Presuntivo", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", border: "border-amber-300 dark:border-amber-700" };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-2xl border transition-colors ${
        isSelected
          ? "bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`flex items-center gap-1.5 border rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          <span className={cfg.text}>{cfg.label}</span>
        </span>
        {isActual && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wide shrink-0">
            Actual
          </span>
        )}
      </div>
      <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 mb-1">{d.diagnostico_texto}</p>
      <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mb-2 truncate">
        {fmtFecha(d.fecha_deteccion)}{d.doctor_nombre ? ` · Dr. ${d.doctor_nombre}` : ""}
      </p>
      <div className="flex items-center gap-3 text-[10.5px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1"><Icon name="space_dashboard" size={12} /> {tratCount} tratamiento{tratCount !== 1 ? "s" : ""}</span>
        <span className="flex items-center gap-1"><Icon name="heart" size={12} /> {recCount} receta{recCount !== 1 ? "s" : ""}</span>
      </div>
    </button>
  );
}

/** Variante compacta de DiagnosticoAsideCard para la franja horizontal (breakpoints < lg). */
function DiagnosticoAsideCardCompact({ d, isActual, isSelected, onClick }: {
  d: any; isActual: boolean; isSelected: boolean; onClick: () => void;
}) {
  const cfg = d.es_definitivo
    ? { label: "Definitivo", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-300 dark:border-emerald-700" }
    : { label: "Presuntivo", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", border: "border-amber-300 dark:border-amber-700" };

  return (
    <button
      onClick={onClick}
      className={`shrink-0 w-48 text-left p-2.5 rounded-xl border transition-colors ${
        isSelected
          ? "bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700"
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <span className={`flex items-center gap-1 border rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shrink-0 ${cfg.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          <span className={cfg.text}>{cfg.label}</span>
        </span>
        {isActual && (
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[8.5px] font-bold uppercase tracking-wide shrink-0">
            Actual
          </span>
        )}
      </div>
      <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate mb-0.5">{d.diagnostico_texto}</p>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{fmtFecha(d.fecha_deteccion)}</p>
    </button>
  );
}

/** Mobile — modal por debajo con el detalle del registro de historial, organizado
 * como carrusel horizontal (Diagnóstico / Tratamiento / Recomendaciones / Receta).
 * Flecha hacia abajo centrada arriba para salir; puntos de paginación abajo. */
function DiagnosticoCarouselModal({ seleccionado, detalleSel, pacienteId, paciente, onClose, onSaved }: {
  seleccionado: any;
  detalleSel: { tratamientos: any[]; recomendaciones: any[]; recetas: any[] } | null;
  pacienteId: string;
  paciente: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  useBodyScrollLock();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const dragControls = useDragControls();

  const pages = [
    { key: "diagnostico", label: "Diagnóstico" },
    { key: "tratamiento", label: "Tratamiento" },
    { key: "recomendaciones", label: "Recomendaciones" },
    { key: "receta", label: "Receta" },
  ] as const;

  function goTo(i: number) {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(pages.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  }

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />

      <motion.div variants={slideUp} initial="hidden" animate="visible" exit="exit"
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_e, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="absolute inset-x-0 bottom-0 top-10 bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Salir — flecha hacia abajo centrada, arriba del todo; mantener pulsado arrastra el modal */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="shrink-0 flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
        >
          <button onClick={onClose} aria-label="Cerrar" className="w-10 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <Icon name="expand_more" size={20} />
          </button>
        </div>
        <div className="shrink-0 px-4 pb-2 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{pages[page].label}</h2>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{page + 1} / {pages.length}</span>
        </div>

        {/* Carrusel horizontal */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 min-w-0 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
          >
            {pages.map((p) => (
              <div key={p.key} className="w-full h-full shrink-0 snap-center overflow-hidden px-4 pb-4">
                {p.key === "diagnostico" && (
                  <div className="h-full overflow-y-auto no-scrollbar">
                    <DiagnosticoCard
                      diagnostico={seleccionado}
                      consultaId={String(seleccionado.consulta_id)}
                      pacienteId={pacienteId}
                      onSaved={onSaved}
                    />
                  </div>
                )}
                {p.key === "tratamiento" && (
                  !detalleSel ? (
                    <div className="h-full flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-cyan-500 animate-spin" /></div>
                  ) : seleccionado.es_tratado ? (
                    <TratamientoSection
                      key={`trat-${seleccionado.id}`}
                      diagnosticoId={String(seleccionado.id)}
                      consultaId={String(seleccionado.consulta_id)}
                      pacienteId={pacienteId}
                      initial={detalleSel.tratamientos}
                      onItemsChange={onSaved}
                      scrollBody
                    />
                  ) : (
                    <div className="h-full overflow-y-auto no-scrollbar"><Notice text="Este diagnóstico no requiere tratamiento en la clínica." /></div>
                  )
                )}
                {p.key === "recomendaciones" && (
                  !detalleSel ? (
                    <div className="h-full flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-cyan-500 animate-spin" /></div>
                  ) : (
                    <RecomendacionesSection
                      key={`recom-${seleccionado.id}`}
                      consultaId={String(seleccionado.consulta_id)}
                      pacienteId={pacienteId}
                      initial={detalleSel.recomendaciones}
                      onSaved={onSaved}
                      scrollBody
                    />
                  )
                )}
                {p.key === "receta" && (
                  !detalleSel ? (
                    <div className="h-full flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-cyan-500 animate-spin" /></div>
                  ) : (
                    <RecetaSection
                      key={`receta-${seleccionado.id}`}
                      diagnosticoId={String(seleccionado.id)}
                      pacienteId={pacienteId}
                      initial={detalleSel.recetas}
                      pacienteNombre={paciente.nombre_completo}
                      telefono={paciente.telefono ?? ""}
                      dni={paciente.dni ?? ""}
                      pacienteFechaNacimiento={paciente.fecha_nacimiento}
                      alergias={paciente.alergias}
                      doctorNombre={seleccionado.doctor_nombre ?? "Doctor"}
                      diagnosticoTexto={seleccionado.diagnostico_texto ?? ""}
                      onSaved={onSaved}
                      scrollBody
                    />
                  )
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Puntos — indicador de página, horizontal abajo; tocar navega directo */}
        <div className="shrink-0 flex justify-center items-center gap-2 py-3 border-t border-slate-100 dark:border-slate-700">
          {pages.map((p, i) => (
            <button
              key={p.key}
              onClick={() => goTo(i)}
              aria-label={p.label}
              className={`rounded-full transition-all ${i === page ? "h-2.5 w-6 bg-cyan-600" : "h-2.5 w-2.5 bg-slate-300 dark:bg-slate-500 hover:bg-slate-400 dark:hover:bg-slate-400"}`}
            />
          ))}
        </div>
      </motion.div>
    </div>,
    document.body
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
  return (
    <div className="flex items-start px-1 py-2">
      {WIZARD_STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1 last:flex-none">
          <button onClick={() => onStepClick(i)} className="flex flex-col items-center gap-1 shrink-0 w-10 sm:w-16">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
              i === step
                ? "border-cyan-600 text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30"
                : done[i]
                  ? "border-cyan-600 bg-cyan-600 text-white"
                  : "border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600"
            }`}>
              <Icon name={done[i] && i !== step ? "check" : s.icon} size={14} />
            </div>
            <span className={`hidden sm:block text-[9px] font-bold uppercase tracking-wide text-center leading-tight ${
              i === step ? "text-cyan-700 dark:text-cyan-400" : done[i] ? "text-slate-600 dark:text-slate-300" : "text-slate-300 dark:text-slate-600"
            }`}>
              {s.label}
            </span>
          </button>
          {i < WIZARD_STEPS.length - 1 && (
            <div className={`flex-1 h-px mx-1 mt-4 ${done[i + 1] ? "bg-cyan-400 dark:bg-cyan-600" : "bg-slate-200 dark:bg-slate-700"}`} />
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

function WizardFooter({ step, canGoNext, onBack, onNext }: { step: number; canGoNext: boolean; onBack: () => void; onNext: () => void }) {
  const isLast = step === WIZARD_STEPS.length - 1;
  return (
    <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-slate-700">
      <button
        onClick={onBack}
        disabled={step === 0}
        className="flex items-center gap-0.5 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-0 disabled:pointer-events-none transition-colors"
      >
        <Icon name="chevron_left" size={14} /> Anterior
      </button>
      <button
        onClick={onNext}
        disabled={!canGoNext && !isLast}
        className="flex items-center gap-1 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[11.5px] font-semibold transition-colors"
      >
        {isLast ? (<><Icon name="check" size={13} /> Finalizar</>) : (<>Continuar <Icon name="chevron_right" size={14} /></>)}
      </button>
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
  const asideScroll = useScrollFade<HTMLDivElement>();
  const detalleScroll = useScrollFade<HTMLDivElement>();
  const isMobile = useIsMobile();
  const [showMobileModal, setShowMobileModal] = useState(false);

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
      setHistorialPaciente(safeList);

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
        setDetalleMap(Object.fromEntries(entries));
        setSelectedId((prev) =>
          prev && safeList.some((d: any) => String(d.id) === prev)
            ? prev
            : String(safeList[0].id)
        );
      } else {
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
    <>
      <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
        {historialPaciente.length === 0 ? (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 py-10 text-center text-slate-400 dark:text-slate-500">
              <Icon name="assignment" size={28} className="opacity-30 mx-auto mb-2" />
              <p className="text-[12px]">Sin diagnósticos registrados aún</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:flex-1 lg:min-h-0">
            {/* Aviso fijo + aside con su propio scroll independiente oculto — solo desktop ancho (lg+) */}
            <div className="hidden lg:flex flex-col gap-3 w-100 shrink-0 lg:h-full lg:min-h-0">
              <div ref={asideScroll.ref} style={asideScroll.style} className="flex flex-col gap-2.5 flex-1 min-h-0 overflow-y-auto no-scrollbar pr-1">
                {historialPaciente.map((d, i) => (
                  <DiagnosticoAsideCard
                    key={d.id}
                    d={d}
                    isActual={i === 0}
                    isSelected={String(d.id) === selectedId}
                    tratCount={detalleMap[String(d.id)]?.tratamientos.length ?? 0}
                    recCount={detalleMap[String(d.id)]?.recetas.length ?? 0}
                    onClick={() => setSelectedId(String(d.id))}
                  />
                ))}
              </div>
            </div>

            {/* Mobile (< md): historial en lista vertical — el detalle se ve en un modal aparte */}
            <div className="md:hidden flex flex-col gap-3 w-full">
              {historialPaciente.map((d, i) => (
                <DiagnosticoAsideCard
                  key={d.id}
                  d={d}
                  isActual={i === 0}
                  isSelected={false}
                  tratCount={detalleMap[String(d.id)]?.tratamientos.length ?? 0}
                  recCount={detalleMap[String(d.id)]?.recetas.length ?? 0}
                  onClick={() => { setSelectedId(String(d.id)); setShowMobileModal(true); }}
                />
              ))}
            </div>

            {/* Columna derecha (md+): en angosto (md-lg) incluye la franja horizontal + aviso arriba; en lg+ solo el detalle */}
            <div className="hidden md:flex flex-col gap-4 flex-1 min-w-0 w-full lg:h-full lg:min-h-0">
              {/* Franja horizontal compacta del historial — solo entre md y lg */}
              <div className="lg:hidden shrink-0 flex flex-col gap-3">
                <div className="bg-white dark:bg-slate-800 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 py-3 border-y border-slate-100 dark:border-slate-700">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {historialPaciente.map((d, i) => (
                      <DiagnosticoAsideCardCompact
                        key={d.id}
                        d={d}
                        isActual={i === 0}
                        isSelected={String(d.id) === selectedId}
                        onClick={() => setSelectedId(String(d.id))}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel de detalle del diagnóstico seleccionado — su propio scroll independiente oculto en lg+ */}
              <div ref={detalleScroll.ref} style={detalleScroll.style} className="flex flex-col gap-4 flex-1 min-w-0 lg:min-h-0 lg:overflow-y-auto no-scrollbar lg:pr-1">
                {seleccionado && (
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
              )}
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isMobile && showMobileModal && seleccionado && (
          <DiagnosticoCarouselModal
            seleccionado={seleccionado}
            detalleSel={detalleSel}
            pacienteId={pacienteId}
            paciente={paciente}
            onClose={() => setShowMobileModal(false)}
            onSaved={fetchHistorialPaciente}
          />
        )}
      </AnimatePresence>
    </>
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
    <div className="flex flex-col gap-4">
      {/* Wizard — el stepper queda fijo (sticky); solo el contenido del paso
          debajo se desplaza con el scroll de la página. El resumen registrado
          ya no vive aquí: se muestra en el modal de confirmación al Finalizar. */}
      <div className="flex flex-col gap-4 min-w-0">
        <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 -mx-3 px-3 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6">
          <ConsultaStepper step={step} done={done} onStepClick={goStep} />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6">
          <p className="text-[10.5px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">Paso {step + 1} de {WIZARD_STEPS.length}</p>
          <h3 className="text-[17px] font-bold text-slate-900 dark:text-slate-100 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">{WIZARD_STEPS[step].titulo}</h3>

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

          {step > 0 && (
            <WizardFooter
              step={step}
              canGoNext={true}
              onBack={() => goStep(step - 1)}
              onNext={() => { if (step < WIZARD_STEPS.length - 1) goStep(step + 1); else setShowFinalizar(true); }}
            />
          )}
        </div>
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