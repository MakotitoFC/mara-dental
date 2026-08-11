"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { calcEdad } from "@/lib/date-utils";
import { slideHorizontal } from "@/lib/animations";
import { useConfirm } from "@/components/ui/ConfirmModal";
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
import { useScrollFade } from "@/lib/hooks/useScrollFade";

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
  paciente: p,
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
  const confirmModal = useConfirm();

  const [tab, setTab] = useState<TabKey>("info");
  const [direction, setDirection] = useState<1 | -1>(1);
  const contenidoScroll = useScrollFade<HTMLDivElement>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDescargarModal, setShowDescargarModal] = useState(false);

  // ── Consulta activa ──────────────────────────────────────────────────────
  const [consultaId, setConsultaId] = useState<string | null>(null);
  const [consultaData, setConsultaData] = useState<any>(null);
  const [loadingConsulta, setLoadingConsulta] = useState(false);
  const [showNuevaConsultaModal, setShowNuevaConsultaModal] = useState(false);
  const [preselectedCitaId, setPreselectedCitaId] = useState<string | null>(null);

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
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
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

  async function salirDeConsulta() {
    const ok = await confirmModal({
      title: "¿Deseas salir de la consulta en curso?",
      message: "Al confirmar la salida, la consulta se dará por finalizada y no se podrá volver a reanudar. ¿Estás seguro?",
      confirmLabel: "Sí, finalizar y salir",
      cancelLabel: "Cancelar",
      danger: true,
    });

    if (!ok) return;

    if (consultaId) {
      await finalizarConsultaAction(consultaId, String(p.id));
      if (typeof window !== "undefined") {
        localStorage.setItem(`consulta_finalizada_${consultaId}`, "true");
      }
    }

    setConsultaId(null);
    setConsultaData(null);
    setReanudableConsulta(null);
    goTo(tab, { consultaId: null });
  }

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
          onSaved={() => router.refresh()}
        />
      )}

      {showDescargarModal && (
        <DescargarExpedienteModal
          paciente={p}
          onClose={() => setShowDescargarModal(false)}
        />
      )}

      {/* ── Encabezado fijo del paciente ── */}
      <div className="shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-3">

          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <Link
              href="/pacientes"
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 transition-colors shrink-0"
              title="Volver a la lista de pacientes"
            >
              <Icon name="arrow_back" size={18} />
            </Link>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-sm">
              {initials(nombreCompleto)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[14px] sm:text-[16px] font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {nombreCompleto}
                </h1>
                {edad !== null && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium shrink-0">
                    {edad} años
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                DNI: <span className="font-medium text-slate-600 dark:text-slate-300">{p.dni || "—"}</span>
                {p.telefono && <span className="ml-2">• Tel: {p.telefono}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowDescargarModal(true)}
              className="flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-[12px] font-medium transition-colors"
              title="Exportar Historia Clínica a PDF"
            >
              <Icon name="picture_as_pdf" size={15} className="text-red-500" />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-[12px] font-medium transition-colors"
            >
              <Icon name="edit" size={15} className="text-slate-400" />
              <span className="hidden sm:inline">Editar</span>
            </button>
          </div>

        </div>

        {/* ── Submenú de navegación por tabs ── */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => goTo(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all whitespace-nowrap shrink-0 ${
                  active
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-700/40"
                }`}
              >
                <Icon name={t.icon} size={15} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Barra de consulta activa ── */}
      {consultaId && tab !== "info" && tab !== "timeline" && (
        <div className="flex items-center justify-between gap-3 px-3 sm:px-6 md:px-8 py-2 bg-cyan-50 dark:bg-cyan-900/20 border-b border-cyan-100 dark:border-cyan-800 shrink-0">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-cyan-700 dark:text-cyan-400">
            <Icon name="stethoscope" size={14} />
            Consulta en curso
          </span>
          <button onClick={salirDeConsulta} className="text-[11.5px] font-semibold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 underline-offset-2 hover:underline cursor-pointer">
            Salir de consulta
          </button>
        </div>
      )}

      {/* ── Banner de Consulta en Curso Interrumpida (Reanudable dentro de 1 hora) ── */}
      {reanudableConsulta && !consultaId && (
        <div className="mx-3 sm:mx-6 md:mx-8 mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-blue-500/10 border border-amber-400/40 dark:border-cyan-500/40 flex flex-wrap items-center justify-between gap-3 shadow-sm animate-fadeIn shrink-0">
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
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white rounded-xl text-[12.5px] font-bold shadow-md shadow-cyan-600/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Icon name="play_arrow" size={16} /> Reanudar Consulta
          </button>
        </div>
      )}

      {/* ── Contenido — único contenedor con scroll interno de toda la vista del paciente. ── */}
      <div
        ref={tab !== "chat" && tab !== "presupuestos" ? contenidoScroll.ref : undefined}
        style={tab !== "chat" && tab !== "presupuestos" ? contenidoScroll.style : undefined}
        className={`flex-1 min-h-0 overflow-x-hidden no-scrollbar ${tab === "presupuestos" ? "overflow-hidden" : "overflow-y-auto"} ${tab === "chat" || tab === "timeline" ? "" : "p-3 sm:p-4 md:p-6 pb-2 md:pb-10 lg:pb-12"}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={slideHorizontal(direction)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={tab === "presupuestos" ? "h-full" : "lg:h-full"}
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
              <div className="flex flex-col gap-4">
                <OdontogramaTab paciente={p} consultaId={(consultaId && consultaId !== "null" && consultaId !== "undefined" && consultaId !== "NaN") ? consultaId : undefined} />
                {consultaId && (
                  <button
                    onClick={() => goTo("diagnosticos")}
                    className="self-end flex items-center gap-1.5 h-10 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[13px] font-semibold transition-colors cursor-pointer"
                  >
                    Continuar a Diagnóstico <Icon name="chevron_right" size={16} />
                  </button>
                )}
              </div>
            )}
            {tab === "diagnosticos" && (
              <DiagnosticoTab
                paciente={pacienteAdapter}
                consultaId={consultaId}
                data={consultaData}
                loading={loadingConsulta}
                refetch={refetchConsultaData}
                onFinalizarConsulta={salirDeConsulta}
                onNavigateTab={(t) => goTo(t as TabKey)}
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
