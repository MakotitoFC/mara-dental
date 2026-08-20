"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { GuardedLink } from "@/components/layout/GuardedLink";
import { useActiveConsultaGuard } from "@/components/layout/ActiveConsultaGuard";
import { calcEdad } from "@/lib/date-utils";
import { slideHorizontal } from "@/lib/animations";
import {
  getConsultaActivaAction, 
  getConsultaReanudableAction, 
  finalizarConsultaAction 
} from "../consulta.actions";
import { OdontogramaTab } from "./OdontogramaTab";
import { NuevaConsultaModal } from "./NuevaConsultaModal";
import { EditarPacienteModal } from "./EditarPacienteModal";
import { DescargarExpedienteModal } from "./DescargarExpedienteModal";
import { InfoTab } from "./tabs/InfoTab";
import { TimelineTab } from "./tabs/TimelineTab";
import { DiagnosticoTab } from "./tabs/DiagnosticoTab";
import { ArchivosTab } from "./tabs/ArchivosTab";
import { PresupuestoTab } from "./tabs/PresupuestoTab";
import { ChatTab } from "./tabs/ChatTab";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey =
  | "info" | "timeline" | "dental"
  | "diagnosticos" | "archivos" | "recetas" | "presupuestos" | "chat";

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: "info",          icon: "contact_page",    label: "Info" },
  { key: "timeline",      icon: "history",         label: "Timeline" },
  { key: "dental",        icon: "dentistry",       label: "Dental" },
  { key: "diagnosticos",  icon: "assignment",      label: "Diagnóstico" },
  { key: "archivos",      icon: "photo_library",   label: "Archivos" },
  { key: "presupuestos",  icon: "payments",        label: "Presup." },
  { key: "chat",          icon: "chat",            label: "Chat" },
];

const TAB_KEYS = TABS.map((t) => t.key);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(nombre: string) {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function HistoriaView({
  paciente: initialPaciente,
  citas = [],
  historial,
  datosCasos,
  notas,
}: {
  paciente: any;
  citas?: any[];
  historial: any[];
  datosCasos: any;
  notas?: any[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();
  const toast = useToast();
  const { setActiveConsultaExit } = useActiveConsultaGuard();

  const [pacienteData, setPacienteData] = useState(initialPaciente);

  useEffect(() => {
    setPacienteData(initialPaciente);
  }, [initialPaciente]);

  const p = pacienteData;

  const [tab, setTab] = useState<TabKey>("info");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDescargarModal, setShowDescargarModal] = useState(false);

  // ── Consulta activa ──────────────────────────────────────────────────────
  const [consultaId, setConsultaId] = useState<string | null>(null);
  const [consultaData, setConsultaData] = useState<any>(null);
  const [loadingConsulta, setLoadingConsulta] = useState(false);
  const [showNuevaConsultaModal, setShowNuevaConsultaModal] = useState(false);
  const [preselectedCitaId, setPreselectedCitaId] = useState<string | null>(null);

  // Registra/desregistra esta consulta en el guard global — así el
  // Sidebar/BottomNav/GuardedLink saben, sin conocer este componente, si
  // hay algo que confirmar antes de dejar salir al usuario de la ficha.
  useEffect(() => {
    setActiveConsultaExit(consultaId ? () => { setConsultaId(null); setConsultaData(null); } : null);
    return () => setActiveConsultaExit(null);
  }, [consultaId, setActiveConsultaExit]);

  // Consulta reanudable (ventana de 1 hora ante salida involuntaria)
  const [reanudableConsulta, setReanudableConsulta] = useState<{
    id: string;
    motivo: string;
    minutosTranscurridos: number;
    minutosRestantes: number;
  } | null>(null);

  const refetchConsultaData = useCallback(async () => {
    if (!consultaId) return;
    setLoadingConsulta(true);
    try {
      const data = await getConsultaActivaAction(consultaId, String(p.id));
      setConsultaData(data);
    } catch (e) {
      console.error("Error al cargar datos de consulta:", e);
    } finally {
      setLoadingConsulta(false);
    }
  }, [consultaId, p.id]);

  useEffect(() => {
    if (consultaId) refetchConsultaData();
    else setConsultaData(null);
  }, [consultaId, refetchConsultaData]);

  // Verificar si existe una consulta reanudable cuando NO hay una consulta abierta
  const checkReanudable = useCallback(async () => {
    if (consultaId) {
      setReanudableConsulta(null);
      return;
    }
    try {
      const res = await getConsultaReanudableAction(String(p.id));
      if (res && res.id) {
        const localFinalizada = typeof window !== "undefined" && localStorage.getItem(`consulta_finalizada_${res.id}`) === "true";
        if (!localFinalizada) {
          setReanudableConsulta(res);
          return;
        }
      }
      setReanudableConsulta(null);
    } catch (e) {
      console.error("Error al verificar consulta reanudable:", e);
      setReanudableConsulta(null);
    }
  }, [consultaId, p.id]);

  useEffect(() => {
    checkReanudable();
  }, [checkReanudable]);

  // Timer para ir descontando los minutos restantes en el banner
  useEffect(() => {
    if (!reanudableConsulta) return;
    const interval = setInterval(() => {
      setReanudableConsulta((prev) => {
        if (!prev) return null;
        const remaining = prev.minutosRestantes - 1;
        if (remaining <= 0) return null;
        return {
          ...prev,
          minutosTranscurridos: prev.minutosTranscurridos + 1,
          minutosRestantes: remaining,
        };
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [reanudableConsulta]);

  // Restaura pestaña/consulta activa desde el query param al montar; abre el
  // modal de nueva consulta si viene de "Iniciar consulta" en Agenda (?nueva=1).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t && (TAB_KEYS as string[]).includes(t)) setTab(t as TabKey);
    const c = params.get("consulta");
    if (c && c !== "null" && c !== "undefined" && c !== "" && c !== "NaN") setConsultaId(c);
    if (params.get("nueva") === "1") setShowNuevaConsultaModal(true);
    const citaIdParam = params.get("citaId");
    if (citaIdParam) setPreselectedCitaId(citaIdParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goTo(key: TabKey, opts?: { consultaId?: string | null }) {
    const oldIdx = TAB_KEYS.indexOf(tab);
    const newIdx = TAB_KEYS.indexOf(key);
    if (key !== tab) setDirection(newIdx >= oldIdx ? 1 : -1);
    setTab(key);

    const params = new URLSearchParams(window.location.search);
    params.set("tab", key);
    params.delete("nueva");
    if (opts && "consultaId" in opts) {
      if (opts.consultaId == null) params.delete("consulta");
      else params.set("consulta", String(opts.consultaId));
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleReanudarConsulta(idToResume: string) {
    setConsultaId(idToResume);
    setReanudableConsulta(null);
    goTo("dental", { consultaId: idToResume });
  }

  function handleConsultaCreada(id: string) {
    const stringId = String(id);
    setShowNuevaConsultaModal(false);
    setReanudableConsulta(null);
    if (stringId !== "undefined" && stringId !== "null" && stringId !== "NaN") {
      setConsultaId(stringId);
      goTo("dental", { consultaId: stringId });
    } else {
      goTo("dental");
    }
  }

  // Limpieza compartida al salir/finalizar una consulta: la marca como
  // finalizada en BD (para que no vuelva a aparecer como "reanudable" en el
  // banner de arriba) y limpia todo el estado local relacionado.
  async function cerrarConsultaState() {
    if (consultaId) {
      await finalizarConsultaAction(consultaId, String(p.id));
      if (typeof window !== "undefined") {
        localStorage.setItem(`consulta_finalizada_${consultaId}`, "true");
      }
    }
    setConsultaId(null);
    setConsultaData(null);
    setReanudableConsulta(null);
  }

  // Compartido entre el botón "Salir de consulta" y el guard de la tab bar
  // (guardedGoTo) — confirma, y si se acepta, limpia el estado de la
  // consulta. Quien llama decide a qué pestaña navegar después.
  async function confirmSalirDeConsulta() {
    const ok = await confirm({
      title: "Salir de la consulta",
      message: "Vas a salir de la consulta en curso. Lo que ya guardaste se mantiene, pero dejarás de estar en modo consulta.",
      requireText: "salir de consulta",
      confirmLabel: "Salir de consulta",
    });
    if (!ok) return false;
    await cerrarConsultaState();
    toast.success("Saliste de la consulta correctamente");
    return true;
  }

  async function salirDeConsulta() {
    if (await confirmSalirDeConsulta()) goTo(tab, { consultaId: null });
  }

  // Al "Finalizar consulta" desde el wizard de Diagnóstico, el registro ya
  // se confirmó dentro de ese mismo modal — no debe pedirse de nuevo el
  // texto "salir de consulta", solo se limpia el estado y se avisa del éxito.
  async function finalizarConsultaDirecto() {
    await cerrarConsultaState();
    toast.success("Consulta finalizada correctamente");
    goTo(tab, { consultaId: null });
  }

  // Cambiar de pestaña "a mano" (tab bar) en consulta activa también debe
  // confirmar — solo la navegación GUIADA de la propia consulta (ej.
  // "Continuar a Diagnóstico" desde Odontograma, o abrir "dental" al crear
  // una consulta nueva) llama a goTo() directo y se salta este guard.
  async function guardedGoTo(key: TabKey) {
    if (key === tab) return;
    if (consultaId) {
      if (await confirmSalirDeConsulta()) goTo(key, { consultaId: null });
      return;
    }
    goTo(key);
  }

  // El wizard de Diagnóstico (con su stepper fijo) solo existe con consulta
  // activa — sin ella, "diagnosticos" muestra el historial del paciente y
  // necesita el scroll normal de este contenedor (ver comentario más abajo).
  const diagnosticoWizardActivo = tab === "diagnosticos" && !!consultaId;

  const nombreCompleto = [p.nombre, p.apellido].filter(Boolean).join(" ") || "Paciente";
  const edad = p.fecha_nacimiento ? calcEdad(p.fecha_nacimiento) : null;
  const telegramLink = `https://t.me/share/url?url=&text=${encodeURIComponent(`Hola ${p.nombre?.split(" ")[0] ?? ""}, le contactamos desde MaraDental.`)}`;

  const pacienteAdapter = {
    id: p.id,
    paciente_id_num: String(p.id),
    nombre_completo: nombreCompleto,
    fecha_nacimiento: p.fecha_nacimiento,
    dni: p.dni,
    telefono: p.telefono ?? "",
    alergias: p.alergias ?? [],
  };

  const diagnostico = consultaData?.diagnostico ?? null;

  // "dental"/"timeline"/"chat" manejan su propio padding interno (encabezados
  // fijos, layouts a medida) y por eso no llevan nada acá. "diagnosticos" y
  // "presupuestos" ahora tienen su propio header sticky (blanco, con
  // título+descripción) pegado al tab bar en TODOS los breakpoints —
  // pt-0 siempre, para que ese header quede junto al tab bar sin franja
  // gris encima (el propio header ya trae su padding interno).
  const contentPadding =
    tab === "chat" || tab === "timeline" || tab === "dental"
      ? ""
      : tab === "diagnosticos" || tab === "presupuestos"
      ? "px-3 sm:px-4 md:px-6 pt-0 pb-2 md:pb-10 lg:pb-12"
      : "p-3 sm:p-4 md:p-6 pb-2 md:pb-10 lg:pb-12";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50/40 dark:bg-slate-900/40">

      {showNuevaConsultaModal && (
        <NuevaConsultaModal
          pacienteId={String(p.id)}
          datosCasos={datosCasos}
          citas={citas}
          preselectedCitaId={preselectedCitaId}
          onClose={() => { setShowNuevaConsultaModal(false); setPreselectedCitaId(null); }}
          onCreated={handleConsultaCreada}
        />
      )}

      {showEditModal && (
        <EditarPacienteModal
          paciente={p}
          onClose={() => setShowEditModal(false)}
          onSaved={(updatedData) => {
            setPacienteData((prev: any) => ({ ...prev, ...updatedData }));
            router.refresh();
            setShowEditModal(false);
          }}
        />
      )}

      {showDescargarModal && (
        <DescargarExpedienteModal
          paciente={p}
          onClose={() => setShowDescargarModal(false)}
        />
      )}

      {/* ── Sub-header paciente ── */}
      <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-6 md:px-8 py-3 sm:py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <GuardedLink
          href="/pacientes"
          aria-label="Volver a pacientes"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0"
        >
          <Icon name="chevron_left" size={20} />
        </GuardedLink>

        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-cyan-50 dark:bg-cyan-900/30 border-2 border-cyan-200 dark:border-cyan-800 flex items-center justify-center shrink-0 select-none">
          <span className="text-[14px] sm:text-[15px] font-bold text-cyan-700 dark:text-cyan-400 uppercase">
            {initials(nombreCompleto)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-[14.5px] sm:text-[17px] font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
            {nombreCompleto}
          </h1>
          <p className="text-[11.5px] sm:text-[12.5px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
            DNI {p.dni || "—"}{edad !== null ? ` · ${edad} años` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowDescargarModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-cyan-50 dark:hover:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-[11.5px] font-semibold transition-colors border border-cyan-200 dark:border-cyan-800"
          >
            <Icon name="download" size={13} />Expediente
          </button>

          <button
            onClick={() => setShowEditModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-[11.5px] font-semibold transition-colors border border-slate-300 dark:border-slate-600"
          >
            <Icon name="edit" size={13} />Editar
          </button>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Más opciones"
            >
              <Icon name="more_vert" size={17} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1.5 z-30 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden w-40"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { setShowEditModal(true); setMenuOpen(false); }}
                    className="sm:hidden w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Icon name="edit" size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />Editar paciente
                  </button>
                  <button
                    onClick={() => { setShowDescargarModal(true); setMenuOpen(false); }}
                    className="sm:hidden w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-t border-slate-100 dark:border-slate-700"
                  >
                    <Icon name="download" size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />Expediente
                  </button>
                  <a
                    href={telegramLink} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-t border-slate-100 dark:border-slate-700"
                  >
                    <Icon name="send" size={15} className="text-[#24A1DE] shrink-0" />Telegram
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Submenú de navegación por tabs ── */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-3 sm:px-6 md:px-8 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => guardedGoTo(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors shrink-0 border-0 ${
                active ? "bg-cyan-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Icon name={t.icon} size={15} className={active ? "text-white" : "text-slate-400 dark:text-slate-500"} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Barra de consulta activa — mismo fondo/texto que la pestaña activa.
          Visible en TODAS las pestañas (antes se ocultaba en info/timeline,
          lo que hacía parecer que la consulta se había cerrado ahí). ── */}
      {consultaId && (
        <div className="flex items-center justify-between gap-3 px-3 sm:px-6 md:px-8 py-2 bg-cyan-600 shrink-0">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
            <Icon name="stethoscope" size={14} className="text-white" />
            Consulta en curso
          </span>
          <button onClick={salirDeConsulta} className="text-[11.5px] font-semibold text-white border border-white rounded-lg px-2.5 py-1 bg-transparent hover:bg-white/10 transition-colors">
            Salir de consulta
          </button>
        </div>
      )}

      {/* ── Banner de Consulta en Curso Interrumpida (Reanudable dentro de 1 hora) ── */}
      {reanudableConsulta && !consultaId && (
        <div className="mx-3 sm:mx-6 md:mx-8 mt-3 p-3.5 sm:p-4 rounded-2xl bg-linear-to-r from-amber-500/10 via-cyan-500/10 to-blue-500/10 border border-amber-400/40 dark:border-cyan-500/40 flex flex-wrap items-center justify-between gap-3 shadow-sm animate-fadeIn shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <Icon name="history" size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">
                  Consulta en curso interrumpida
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800">
                  Iniciada hace {reanudableConsulta.minutosTranscurridos} min
                </span>
              </div>
              <p className="text-[12px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                Motivo: <span className="font-medium text-slate-700 dark:text-slate-300">{reanudableConsulta.motivo}</span> • Tienes <strong className="text-cyan-600 dark:text-cyan-400 font-semibold">{reanudableConsulta.minutosRestantes} min</strong> para reanudar antes de que expire.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleReanudarConsulta(reanudableConsulta.id)}
            className="px-4 py-2 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white rounded-xl text-[12.5px] font-bold shadow-md shadow-cyan-600/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Icon name="play_arrow" size={16} /> Reanudar Consulta
          </button>
        </div>
      )}

      {/* ── Contenido — único contenedor con scroll interno de toda la vista del paciente.
          "diagnosticos" solo es la excepción CON consulta activa: ahí su encabezado
          (stepper de pasos) queda fijo y solo su contenido interno scrollea (ver
          DiagnosticoTab). Antes el stepper usaba position:sticky DENTRO de este scroll —
          funcionaba, pero en mobile el compositor puede "atrasarse" un frame durante
          scroll rápido y dejar ver el contenido de abajo un instante; sacarlo del scroll
          de raíz lo evita del todo, no solo lo disimula. Sin consulta activa, "diagnosticos"
          muestra el historial del paciente (mismo patrón que "presupuestos") y SÍ usa este
          scroll normal — su contenido (detalle + historial) no tiene una región interna
          propia que scrollee, así que necesita el scroll de acá para que todo sea
          alcanzable (antes quedaba con overflow-hidden y el detalle quedaba inalcanzable). ── */}
      <div
        className={`flex-1 min-h-0 overflow-x-hidden no-scrollbar ${diagnosticoWizardActivo ? "overflow-hidden" : "overflow-y-auto"} ${contentPadding}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={slideHorizontal(direction)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={diagnosticoWizardActivo ? "h-full" : "lg:h-full"}
          >
            {tab === "info" && <InfoTab paciente={p} historial={historial} datosCasos={datosCasos} onNavigateTab={(t) => goTo(t as TabKey)} />}
            {tab === "timeline" && (
              <TimelineTab
                historial={historial}
                datosCasos={datosCasos}
                pacienteId={String(p.id)}
                onStartConsulta={() => setShowNuevaConsultaModal(true)}
                onNavigateTab={(t) => goTo(t as TabKey)}
              />
            )}
            {tab === "dental" && (
              <OdontogramaTab paciente={p} consultaId={(consultaId && consultaId !== "null" && consultaId !== "undefined" && consultaId !== "NaN") ? consultaId : undefined} onNavigateTab={(t) => goTo(t as TabKey)} />
            )}
            {tab === "diagnosticos" && (
              <DiagnosticoTab
                paciente={pacienteAdapter}
                consultaId={consultaId}
                data={consultaData}
                loading={loadingConsulta}
                refetch={refetchConsultaData}
                onFinalizarConsulta={finalizarConsultaDirecto}
              />
            )}
            {tab === "archivos" && (
              <ArchivosTab paciente={pacienteAdapter} consultaId={consultaId} onNavigateTab={(t) => goTo(t as TabKey)} />
            )}
            {tab === "presupuestos" && (
              <PresupuestoTab
                paciente={pacienteAdapter}
                consultaId={consultaId}
                data={consultaData}
                loading={loadingConsulta}
                refetch={refetchConsultaData}
                onNavigateTab={(t) => goTo(t as TabKey)}
              />
            )}
            {tab === "chat" && <ChatTab pacienteId={String(p.id)} />}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
