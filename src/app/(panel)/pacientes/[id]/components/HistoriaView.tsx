"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { calcEdad } from "@/lib/date-utils";
import { slideHorizontal } from "@/lib/animations";
import { getConsultaActivaAction } from "../consulta.actions";
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
  paciente: p,
  citas,
  notas: _notas,
  historial,
  datosCasos,
}: {
  paciente: any;
  citas: any[];
  notas: any[];
  historial: any[];
  datosCasos: any;
}) {
  const router = useRouter();
  const pathname = usePathname();

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

  const refetchConsultaData = useCallback(async () => {
    if (!consultaId) return;
    setLoadingConsulta(true);
    const data = await getConsultaActivaAction(consultaId, String(p.id));
    setConsultaData(data);
    setLoadingConsulta(false);
  }, [consultaId, p.id]);

  useEffect(() => {
    if (consultaId) refetchConsultaData();
    else setConsultaData(null);
  }, [consultaId, refetchConsultaData]);

  // Restaura pestaña/consulta activa desde el query param al montar; abre el
  // modal de nueva consulta si viene de "Iniciar consulta" en Agenda (?nueva=1).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t && (TAB_KEYS as string[]).includes(t)) setTab(t as TabKey);
    const c = params.get("consulta");
    if (c && c !== "null" && c !== "undefined" && c !== "" && c !== "NaN") setConsultaId(c);
    if (params.get("nueva") === "1") setShowNuevaConsultaModal(true);
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

  function handleConsultaCreada(id: string) {
    const stringId = String(id);
    setShowNuevaConsultaModal(false);
    if (stringId !== "undefined" && stringId !== "null" && stringId !== "NaN") {
      setConsultaId(stringId);
      goTo("dental", { consultaId: stringId });
    } else {
      goTo("dental");
    }
  }

  function salirDeConsulta() {
    setConsultaId(null);
    setConsultaData(null);
    goTo(tab, { consultaId: null });
  }

  const nombreCompleto = [p.nombre, p.apellido].filter(Boolean).join(" ") || "Paciente";
  const edad = p.fecha_nacimiento ? calcEdad(p.fecha_nacimiento) : null;
  const telegramLink = `https://t.me/share/url?url=&text=${encodeURIComponent(`Hola ${p.nombre?.split(" ")[0] ?? ""}, le contactamos desde MaraDental.`)}`;

  // Adaptador — RecetaSection/PresupuestoPhase esperan la forma que antes
  // devolvía getConsultaDetalleAction, distinta de la de este `paciente` prop.
  const pacienteAdapter = {
    id: p.id,
    paciente_id_num: String(p.id),
    nombre_completo: nombreCompleto,
    fecha_nacimiento: p.fecha_nacimiento,
    dni: p.dni,
    telefono: p.telefono ?? "",
  };

  const diagnostico = consultaData?.diagnostico ?? null;

  return (
    <div className="flex flex-col min-h-full bg-slate-50/40 dark:bg-slate-900/40">

      {showNuevaConsultaModal && (
        <NuevaConsultaModal
          pacienteId={String(p.id)}
          datosCasos={datosCasos}
          citas={citas}
          onClose={() => setShowNuevaConsultaModal(false)}
          onCreated={handleConsultaCreada}
        />
      )}

      {showEditModal && (
        <EditarPacienteModal
          paciente={p}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); router.refresh(); }}
        />
      )}

      {showDescargarModal && (
        <DescargarExpedienteModal
          paciente={{ id: p.id, nombre: p.nombre, apellido: p.apellido, dni: p.dni }}
          onClose={() => setShowDescargarModal(false)}
        />
      )}

      {/* ── Sub-header paciente ── */}
      <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-6 md:px-8 py-3 sm:py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <Link
          href="/pacientes"
          aria-label="Volver a pacientes"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0"
        >
          <Icon name="chevron_left" size={20} />
        </Link>

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
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-700 dark:text-cyan-400 text-[11.5px] font-semibold transition-colors border border-cyan-200 dark:border-cyan-800"
          >
            <Icon name="download" size={13} />Descargar expediente
          </button>

          <button
            onClick={() => setShowEditModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-[11.5px] font-semibold transition-colors border border-slate-200 dark:border-slate-600"
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
                  className="absolute right-0 top-full mt-1.5 z-30 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden w-48"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { setShowEditModal(true); setMenuOpen(false); }}
                    className="sm:hidden w-full flex items-center gap-2.5 px-4 py-3 text-[12px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Icon name="edit" size={15} className="text-slate-500 dark:text-slate-400" />Editar paciente
                  </button>
                  <button
                    onClick={() => { setShowDescargarModal(true); setMenuOpen(false); }}
                    className="sm:hidden w-full flex items-center gap-2.5 px-4 py-3 text-[12px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-t border-slate-100 dark:border-slate-700"
                  >
                    <Icon name="download" size={15} className="text-cyan-600 dark:text-cyan-400" />Descargar expediente
                  </button>
                  <a
                    href={telegramLink} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-t border-slate-100 dark:border-slate-700"
                  >
                    <Icon name="send" size={16} className="text-[#24A1DE]" />Telegram
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar horizontal ── */}
      <div className="scroll-x-touch bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex gap-1 px-3 sm:px-6 md:px-8 py-2.5 w-max min-w-full">
          {TABS.map(({ key, icon, label }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => goTo(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors shrink-0 border-0 ${
                  active ? "bg-cyan-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
                style={{ minHeight: 36 }}
              >
                <Icon name={icon} size={15} className={active ? "text-white" : "text-slate-400 dark:text-slate-500"} />
                {label}
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
          <button onClick={salirDeConsulta} className="text-[11.5px] font-semibold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 underline-offset-2 hover:underline">
            Salir de consulta
          </button>
        </div>
      )}

      {/* ── Contenido ── */}
      <div className="flex-1 min-h-0 p-3 sm:p-4 md:p-6 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={slideHorizontal(direction)}
            initial="hidden"
            animate="visible"
            exit="exit"
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
                    className="self-end flex items-center gap-1.5 h-10 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[13px] font-semibold transition-colors"
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
            {tab === "chat" && (
              <ChatTab pacienteId={String(p.id)} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
