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
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { DatePicker } from "@/components/ui/DatePicker";
import { FilterCategoryPicker, type FilterCategoryMeta } from "@/components/ui/FilterCategoryPicker";
import { TagDropdown } from "@/components/ui/TagDropdown";
import { Checkbox } from "@/components/ui/Checkbox";

const TIPO_OPTIONS = [
  { value: "definitivo", label: "Definitivo" },
  { value: "presuntivo", label: "Presuntivo" },
];

type FilterTagKey = "estado" | "fecha";
const FILTER_CATEGORIES: Record<FilterTagKey, FilterCategoryMeta> = {
  estado: { label: "Estado", icon: "check_circle" },
  fecha: { label: "Fecha", icon: "calendar_today" },
};

function Notice({ text }: { text: string }) {
  return (
 <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
 <Icon name="info" size={16} className="text-slate-400 shrink-0"/>
 <p className="text-[12.5px] text-slate-500">{text}</p>
    </div>
  );
}

const fmtFecha = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
};

// Paginación de la lista plana en mobile/tablet — mismo tamaño de página (8)
// y misma ventana compacta de 2 números para la píldora flotante que ya usan
// las vistas de asistente (Turnos de Caja, Personal, etc.).
const MOBILE_PAGE_SIZE = 5;
function getMobilePageWindow(current: number, total: number): number[] {
  if (total <= 1) return [1];
  if (current >= total) return [total - 1, total];
  return [current, current + 1];
}

/** Fila del historial — fecha + tipo (presuntivo/definitivo), el detalle
 * clínico (texto del diagnóstico) y, aparte, tags de si tiene
 * tratamiento/recetas. El seleccionado se resalta en gris neutro (no con el
 * color del estado/badge) — mismo esquema que `HistorialRow` en
 * PresupuestoTab.tsx (bg-slate-100 + border-l-slate-400). Alto variable (ya
 * no fijo) porque el texto del diagnóstico puede ocupar 1 o 2 líneas según
 * el registro. En mobile (`isMobile`) usa en cambio el mismo diseño de
 * tarjeta que "Catálogo de Tratamientos" (admin/catalogo). */
function DiagnosticoHistorialRow({ d, active, tratCount, recCount, onClick, isMobile }: {
  d: any; active: boolean; tratCount: number; recCount: number; onClick: () => void; isMobile: boolean;
}) {
  const cfg = d.es_definitivo
 ? { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Definitivo"}
 : { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-600", badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Presuntivo"};

  if (isMobile) {
    return (
      <button
        onClick={onClick}
 className={`w-full text-left bg-white rounded-xl border flex flex-col transition-colors ${active ? "border-cyan-400 ring-1 ring-cyan-100" : "border-slate-200"}`}
      >
 <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
 <span className="text-[11px] font-semibold text-slate-400">{fmtFecha(d.fecha_deteccion)}</span>
        </div>
 <div className="flex flex-col gap-3 p-4">
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-3 min-w-0">
 <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                <Icon name="stethoscope" size={18} />
              </div>
 <div className="min-w-0">
 <p className="font-bold text-[13px] text-slate-700 truncate">{d.diagnostico_texto || "Diagnóstico"}</p>
 <p className="text-[12px] text-slate-500 truncate">{d.doctor_nombre || <span className="italic text-slate-300">Sin dentista</span>}</p>
              </div>
            </div>
 <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full ${cfg.pill}`}>
 <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>

          {(tratCount > 0 || recCount > 0) && (
 <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              {tratCount > 0 && (
 <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Icon name="account_tree" size={12} /> Tratamiento
                </span>
              )}
              {recCount > 0 && (
 <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Icon name="medication" size={12} /> Recetas
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 px-3 py-3 border-l-2 transition-colors border-0 ${
        active
 ? "bg-slate-100 border-l-slate-400"
 :"border-l-transparent hover:bg-slate-50"
      }`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
 <p className="text-[13px] font-medium text-slate-800">{fmtFecha(d.fecha_deteccion)}</p>
 <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border shrink-0 ${cfg.badge}`}>{cfg.label}</span>
        </div>
        {d.diagnostico_texto && (
 <p className="text-[11.5px] text-slate-500 mt-1 leading-snug line-clamp-2">{d.diagnostico_texto}</p>
        )}
        {(tratCount > 0 || recCount > 0) && (
          <div className="flex items-center gap-2.5 mt-1.5">
            {tratCount > 0 && (
 <span className="flex items-center gap-1 text-[10.5px] text-slate-400">
                <Icon name="account_tree" size={11} /> Tratamiento
              </span>
            )}
            {recCount > 0 && (
 <span className="flex items-center gap-1 text-[10.5px] text-slate-400">
                <Icon name="medication" size={11} /> Recetas
              </span>
            )}
          </div>
        )}
      </div>
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
 :"border-slate-200 text-slate-300"
            }`}>
              {done[i] ? <Icon name="check" size={13} /> : i === step ? i + 1 : "–"}
            </div>
          </button>
          {i < WIZARD_STEPS.length - 1 && (
 <div className={`flex-1 h-0.5 mx-1.5 transition-colors duration-300 ease-out ${done[i + 1] ? "bg-cyan-600" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ResumenRegistrado({ done, detalles }: { done: boolean[]; detalles: string[][] }) {
  return (
 <div className="bg-white rounded-2xl border border-slate-200 p-4">
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Resumen registrado</p>
      <div className="flex flex-col gap-3">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.key}>
 <div className={`flex items-center gap-2 text-[12.5px] font-semibold ${done[i] ? "text-slate-700" : "text-slate-300"}`}>
              {done[i] ? (
                <Icon name="check_circle" size={15} className="text-emerald-500 shrink-0" />
              ) : (
 <span className="w-[15px] h-[15px] rounded-full border-2 border-slate-200 shrink-0"/>
              )}
              <span className="truncate">{s.label}</span>
            </div>
            {done[i] && detalles[i].length > 0 && (
              <div className="pl-[23px] mt-1 flex flex-col gap-0.5">
                {detalles[i].slice(0, 4).map((d, j) => (
 <p key={j} className="text-[11px] text-slate-500 truncate">· {d}</p>
                ))}
                {detalles[i].length > 4 && (
 <p className="text-[10.5px] text-slate-400 italic">+{detalles[i].length - 4} más</p>
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
  // Tablet Y mobile (<lg) usan el patrón de tabla headerless + modal de
  // detalle (estilo admin); solo desktop (lg+) mantiene la grilla
  // maestro-detalle de dos columnas.
  const isCompact = useIsMobile(1024);
  // Mobile "real" (<768) — solo acá las tarjetas del historial usan el
  // diseño de "Catálogo de Tratamientos"; tablet (dentro de isCompact) y
  // desktop siguen con la fila compacta de siempre.
  const isMobile = useIsMobile();
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [filterFecha, setFilterFecha] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  // Paginación mobile/tablet (lista plana) — se reinicia cada vez que cambia
  // el filtro, para no quedar en una página que ya no existe.
  const [mobilePage, setMobilePage] = useState(1);
  useEffect(() => { setMobilePage(1); }, [filterFecha, filterTipo]);
  // Tags de filtro activo: solo aparecen al elegirlos desde el picker
  // maestro (mismo patrón que Dashboard Directivo/Personal/Auditoría).
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
    if (k === "estado") setFilterTipo("");
    else if (k === "fecha") setFilterFecha("");
  };
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
      console.error("Error al cargar historial de diagnósticos: ", e);
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
    const historialFiltrado = historialPaciente.filter((d) => {
      if (filterFecha && (d.fecha_deteccion ?? "").slice(0, 10) !== filterFecha) return false;
      if (filterTipo === "definitivo" && !d.es_definitivo) return false;
      if (filterTipo === "presuntivo" && d.es_definitivo) return false;
      return true;
    });
    const hasFilter = !!filterFecha || !!filterTipo;
    const mobileTotalPages = Math.max(1, Math.ceil(historialFiltrado.length / MOBILE_PAGE_SIZE));
    const historialMobilePag = historialFiltrado.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE);

    // Botón de filtro + tags activos — reutilizado tanto en la cabecera de
    // mobile/tablet (donde el historial es una lista plana bajo el título)
    // como dentro de la propia tarjeta de "Historial" en desktop (donde vive
    // junto al conteo, ver más abajo). Patrón de "filtro maestro" (igual que
    // Dashboard Directivo/Personal/Auditoría/Odontograma): botón ☰ solo-ícono
    // → picker de categorías (Estado/Fecha, sin sus opciones) → tags cian con
    // dropdown propio → "+ Filtro". Sin "Quitar filtros": cada tag se quita
    // con su propia X.
    const filtroButton = <FilterCategoryPicker variant="icon" categories={FILTER_CATEGORIES} activeKeys={activeFilterTags} onToggle={toggleFilterTag} />;
    const filtroTagsRow = activeFilterTags.size > 0 && (
      <div className="flex items-center gap-2 flex-wrap">
        {activeFilterTags.has("estado") && (
          <TagDropdown
            icon="check_circle"
            label={`Estado: ${filterTipo ? TIPO_OPTIONS.find((o) => o.value === filterTipo)?.label : "Todos"}`}
            onRemove={() => removeFilterTag("estado")}
          >
            {(close) => (
              <>
                <button
                  type="button"
                  onMouseDown={() => { setFilterTipo(""); close(); }}
 className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] rounded-md hover:bg-slate-50 ${filterTipo === "" ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
                >
                  Todos
                </button>
                {TIPO_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onMouseDown={() => { setFilterTipo(o.value); close(); }}
 className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] rounded-md hover:bg-slate-50 ${o.value === filterTipo ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
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

    // ── Cabecera — misma en TODOS los breakpoints. Sticky, pegada al navbar
    // de tabs, mismo fondo blanco y sin espacio entre ambos (el separador
    // gris queda abajo, entre este bloque y el contenido scrolleable). En
    // desktop el botón de filtro ya no vive acá — se movió a la tarjeta de
    // "Historial" (junto al título y el conteo), como en Odontograma; en
    // mobile/tablet (lista plana, sin tarjeta propia) se queda acá. Sticky
    // solo desde md — en mobile no queda fija, se desplaza con el contenido;
    // la descripción también se oculta en mobile, solo el título.
    const header = (
 <div className="static md:sticky md:top-0 md:z-20 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 py-4 mb-3 bg-white border-b border-slate-100 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
 <h2 className="text-[15px] font-bold text-slate-800">Diagnóstico</h2>
 <p className="hidden md:block text-[12px] text-slate-400 mt-0.5 leading-snug">Registro clínico del diagnóstico activo del paciente</p>
          </div>
          {isCompact && filtroButton}
        </div>

        {isCompact && filtroTagsRow}
      </div>
    );

    const detalleContent = (
      <div className={`flex flex-col gap-2 min-w-0 ${isCompact ? "" : "lg:h-full lg:min-h-0"}`}>
        <div className={`overflow-y-auto no-scrollbar flex flex-col gap-4 pr-1 pb-4 ${isCompact ? "" : "lg:flex-1 lg:min-h-0"}`}>
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
 <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-cyan-500 animate-spin"/>
                </div>
              )}
            </>
          ) : (
 <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
 <Icon name="info" size={16} className="text-slate-400 shrink-0"/>
 <p className="text-[12.5px] text-slate-500">Este paciente no tiene diagnósticos registrados.</p>
            </div>
          )}
        </div>
      </div>
    );

    // Tablet/mobile (<lg): la pestaña muestra por defecto la tabla headerless
    // de registros (estilo admin) — clic en una fila abre el detalle completo
    // en un modal, en vez de mostrarlo expandido de entrada. Desktop (lg+)
    // no cambia: sigue con la grilla maestro-detalle de dos columnas.
    if (isCompact) {
      return (
        <>
          {header}
 <div className={isMobile ? "flex flex-col gap-3 px-3 pt-3 bg-slate-50" : "flex flex-col divide-y divide-slate-100"}>
            {historialFiltrado.length === 0 ? (
 <p className="text-[12px] text-slate-400 text-center py-8">
                {filterFecha ? "Sin diagnósticos en esta fecha." : "Este paciente no tiene diagnósticos registrados."}
              </p>
            ) : (
              historialMobilePag.map((d) => (
                <DiagnosticoHistorialRow
                  key={d.id}
                  d={d}
                  active={String(d.id) === selectedId}
                  tratCount={detalleMap[String(d.id)]?.tratamientos.length ?? 0}
                  recCount={detalleMap[String(d.id)]?.recetas.length ?? 0}
                  onClick={() => { setSelectedId(String(d.id)); setShowDetalleModal(true); }}
                  isMobile={isMobile}
                />
              ))
            )}
          </div>

          {/* Paginación mobile — píldora flotante, igual que en las vistas
              de asistente (Turnos de Caja, Personal, etc.). Solo en mobile:
              en tablet (md-lg, dentro de isCompact) no se muestra. */}
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
              <ResponsiveSheet onClose={() => setShowDetalleModal(false)} title="Diagnóstico">
                {detalleContent}
              </ResponsiveSheet>
            )}
          </AnimatePresence>
        </>
      );
    }

    // Desktop: la vista no tiene scroll propio — su alto lo da el contenedor
    // de la pestaña (misma cadena lg:h-full / lg:flex-1 / lg:min-h-0 que usa
    // Odontograma). "Detalle" e "Historial" quedan del mismo alto (grid con
    // stretch, sin items-start) y cada uno scrollea por su cuenta, por dentro.
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
                  {historialPaciente.length}
                </span>
              </div>
              {filtroButton}
            </div>
            {filtroTagsRow && <div className="px-4 pb-3 shrink-0">{filtroTagsRow}</div>}
            {historialFiltrado.length === 0 ? (
 <p className="text-[12px] text-slate-400 text-center py-8">
                {hasFilter ? "Sin diagnósticos con este filtro." : "Sin diagnósticos"}
              </p>
            ) : (
 <div className="lg:flex-1 lg:min-h-0 overflow-y-auto no-scrollbar divide-y divide-slate-100 border-t border-slate-100">
                {historialFiltrado.map((d) => (
                  <DiagnosticoHistorialRow
                    key={d.id}
                    d={d}
                    active={String(d.id) === selectedId}
                    tratCount={detalleMap[String(d.id)]?.tratamientos.length ?? 0}
                    recCount={detalleMap[String(d.id)]?.recetas.length ?? 0}
                    onClick={() => setSelectedId(String(d.id))}
                    isMobile={false}
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
 <div className="shrink-0 bg-slate-50 -mx-3 px-3 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6 pb-2">
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
 <p className="text-[10.5px] font-bold text-cyan-600 uppercase tracking-widest mb-1">Paso {step + 1} de {WIZARD_STEPS.length}</p>
 <h3 className="text-[17px] font-bold text-slate-900">{WIZARD_STEPS[step].titulo}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => goStep(step - 1)}
              disabled={step === 0}
              aria-label="Paso anterior"
 className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-0 disabled:pointer-events-none transition-colors"
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
              <DiagnosticoCard diagnostico={actual} consultaId={String(consultaId)} activeConsultaId={consultaId} pacienteId={String(pacienteId)} onSaved={refetch} />
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
 <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4">
                    <div>
 <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Presupuesto estimado</p>
 <p className="text-[15px] font-bold text-slate-900">
                        {presupuestoTotal != null ? `S/ ${presupuestoTotal.toFixed(2)}` : "—"}
                      </p>
                    </div>
                    <div className="text-right">
 <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Progreso total</p>
 <p className="text-[15px] font-bold text-cyan-700">{totalFases > 0 ?`${pct}%`:"—"}</p>
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
 <p className="text-[12.5px] text-slate-500">Revisa lo registrado en esta consulta antes de finalizar.</p>
            <ResumenRegistrado done={done} detalles={detalles} />
            <Checkbox
              checked={confirmado}
              onChange={() => setConfirmado(v => !v)}
              label={<span className="text-[12.5px] text-slate-600">Confirmo que la información registrada es correcta.</span>}
            />
          </div>
        </ResponsiveSheet>
      )}
    </AnimatePresence>
    </>
  );
}