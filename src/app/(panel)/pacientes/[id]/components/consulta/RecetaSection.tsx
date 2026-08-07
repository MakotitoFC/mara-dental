"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { fadeIn, scaleIn, slideUp, staggerContainer, staggerItem } from "@/lib/animations";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import { calcEdad } from "@/lib/date-utils";
import {
  esc, buildLetterheadHeader, buildLetterheadFooter, buildSignatureBlock, wrapDocument, fmtGenerado,
  downloadHtmlAsSinglePagePdf, printHtml, type ClinicaInfo,
} from "@/lib/reportExport";
import {
  saveRecetaAction,
  toggleEstadoRecetaAction,
  deleteMedicamentoAction,
  searchMedicamentosAction,
  getSedeInfoAction,
} from "../../consulta.actions";
import { getPerfilProfesionalAction, type PerfilProfesional } from "../../../../configuracion/actions";
import { useToast } from "@/components/ui/Toast";

interface Medicamento {
  id: number;
  medicamento_id?: number | null;
  medicamento_nombre: string;
  dosis: string;
  frecuencia: string;
  indicaciones: string;
}

interface Receta {
  id: number;
  fecha_emision: string;
  estado: string;
  receta_medicamento: Medicamento[];
}

type MedDraft = { medicamento_nombre: string; dosis: string; frecuencia: string; indicaciones: string; medicamento_id: number | null };
const emptyMed = (): MedDraft => ({ medicamento_nombre: "", dosis: "", frecuencia: "Cada 8 horas", indicaciones: "", medicamento_id: null });

const FRECUENCIAS = ["Cada 6 horas", "Cada 8 horas", "Cada 12 horas", "Cada 24 horas", "Una vez al día", "Dos veces al día"];
const FRECUENCIA_OPTIONS = FRECUENCIAS.map((f) => ({ value: f, label: f }));

const fmtFecha = (d: string) => {
  try { return new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return d; }
};

interface SectionProps {
  diagnosticoId: string;
  pacienteId: string;
  initial: Receta[];
  enabled?: boolean;
  pacienteNombre: string;
  telefono: string;
  dni: string;
  pacienteFechaNacimiento?: string | null;
  alergias?: string[];
  doctorNombre: string;
  diagnosticoTexto: string;
  onSaved?: () => void;
  /** El rótulo queda fijo y solo el listado de registros scrollea (uso en el modal mobile). */
  scrollBody?: boolean;
}

export function RecetaSection(props: SectionProps) {
  const { diagnosticoId, pacienteId, initial, enabled = true, pacienteNombre, telefono, dni, pacienteFechaNacimiento, alergias, doctorNombre, diagnosticoTexto, onSaved, scrollBody = false } = props;
  const [recetas, setRecetas] = useState<Receta[]>(initial || []);
  const [showModal, setShowModal] = useState(false);
  const [sede, setSede] = useState<ClinicaInfo | null>(null);
  const [firmante, setFirmante] = useState<any | null>(null);
  const edad = pacienteFechaNacimiento ? calcEdad(pacienteFechaNacimiento) : null;

  useEffect(() => {
    getSedeInfoAction().then(setSede).catch(() => {});
    // getPerfilProfesionalAction().then(setFirmante).catch(() => {});
  }, []);

  const toast = useToast();

  async function handleToggleEstado(r: Receta) {
    const newEst = r.estado === "activa" ? "cancelada" : "activa";
    await toggleEstadoRecetaAction(String(r.id), newEst, String(pacienteId));
    setRecetas(prev => prev.map(x => x.id === r.id ? { ...x, estado: newEst } : x));
    toast.success(newEst === "activa" ? "Receta activada" : "Receta cancelada");
  }

  const filas = recetas.flatMap((r) => r.receta_medicamento.map((m) => ({ medicamento: m, receta: r })));

  const [medToDelete, setMedToDelete] = useState<number | null>(null);
  async function confirmDeleteMed() {
    if (!medToDelete) return;
    await deleteMedicamentoAction(String(medToDelete), String(pacienteId));
    setRecetas(p => p.map(r => ({ ...r, receta_medicamento: r.receta_medicamento.filter(m => m.id !== medToDelete) })));
    setMedToDelete(null);
    toast.success("Medicamento eliminado");
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className={`bg-white dark:bg-slate-800 rounded-2xl border relative ${scrollBody ? "flex flex-col h-full overflow-hidden" : ""} ${enabled ? "border-slate-200 dark:border-slate-700" : "border-slate-200 dark:border-slate-700 opacity-60"}`}>
      {!enabled && (
        <div className="absolute inset-0 z-10 bg-white/70 dark:bg-slate-800/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-2xl">
          <Icon name="lock" size={22} className="text-slate-400 dark:text-slate-500" />
          <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Disponible con diagnóstico definitivo</p>
        </div>
      )}
      <div className={`${scrollBody ? "shrink-0" : ""} flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0">
            <Icon name="medication" size={18} />
          </div>
          <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Recetas médicas</h2>
        </div>
        <button onClick={() => enabled && setShowModal(true)} disabled={!enabled}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cyan-200 dark:border-cyan-800 text-[12px] font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 disabled:opacity-40 transition-colors">
          <Icon name="add" size={16} /> Nueva receta
        </button>
      </div>

      <div className={`p-5 flex flex-col gap-4 ${scrollBody ? "flex-1 min-h-0 overflow-y-auto no-scrollbar" : ""}`}>
        {recetas.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500">
            <Icon name="medication" size={28} className="opacity-30 mx-auto mb-2" />
            <p className="text-[12px]">Sin recetas emitidas</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="flex flex-col gap-3">
            {filas.map(({ medicamento: m, receta: r }) => {
              const docData: DocData = {
                pacienteNombre, doctorNombre, fecha: r.fecha_emision, diagnostico: diagnosticoTexto, medicamentos: r.receta_medicamento,
                dni, edad, alergias,
                doctorEspecialidad: firmante?.especialidad, doctorNumColegiatura: firmante?.num_colegiatura, doctorFirmaUrl: firmante?.firma_url,
                clinica: sede,
              };
              return (
                <motion.div key={m.id} variants={staggerItem}>
                  <PrescriptionRow
                    medicamento={m}
                    estado={r.estado}
                    fechaEmision={r.fecha_emision}
                    doctorNombre={doctorNombre}
                    onDownload={() => handleDownloadPdf(docData, sede)}
                    onPrint={() => handlePrint(docData)}
                    onSend={() => window.open(buildTelegramLink(docData), "_blank")}
                    onToggleEstado={() => handleToggleEstado(r)}
                    onDeleteMed={() => setMedToDelete(m.id)}
                    showManage
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Modal nueva receta electrónica */}
      <AnimatePresence>
        {showModal && (
          <RecetaModal
            diagnosticoId={diagnosticoId}
            pacienteId={pacienteId}
            pacienteNombre={pacienteNombre}
            telefono={telefono}
            dni={dni}
            edad={edad}
            alergias={alergias}
            doctorNombre={doctorNombre}
            doctorEspecialidad={firmante?.especialidad}
            doctorNumColegiatura={firmante?.num_colegiatura}
            doctorFirmaUrl={firmante?.firma_url}
            clinica={sede}
            diagnosticoTexto={diagnosticoTexto}
            onClose={() => setShowModal(false)}
            onSaved={onSaved}
          />
        )}
      </AnimatePresence>

      {/* Confirmaciones */}
      <AnimatePresence>
        {medToDelete && (
          <ConfirmDialog
            titulo="¿Quitar medicamento?"
            texto="El medicamento será removido de esta receta médica."
            onCancel={() => setMedToDelete(null)}
            onConfirm={confirmDeleteMed}
            confirmLabel="Sí, quitar"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const fmtFechaCorta = (d: string) => {
  try { return new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
};

function ActionLink({ icon, label, onClick, hoverClass = "hover:text-cyan-600 dark:hover:text-cyan-400", textClass = "text-slate-500 dark:text-slate-400", className = "" }: {
  icon: string; label: string; onClick?: () => void; hoverClass?: string; textClass?: string; className?: string;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      title={label}
      aria-label={label}
      className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-lg ${textClass} ${hoverClass} hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors ${className}`}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

/** Tarjeta de un medicamento. Clic en la tarjeta abre el detalle;
 * acciones: descargar/imprimir/enviar/cancelar/eliminar. */
export function PrescriptionRow({ medicamento, estado, fechaEmision, doctorNombre, onView, onDownload, onPrint, onSend, onToggleEstado, onDeleteMed, showManage }: {
  medicamento: PreviewMed;
  estado: string;
  fechaEmision: string;
  doctorNombre: string;
  onView?: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onSend: () => void;
  onToggleEstado?: () => void;
  onDeleteMed?: () => void;
  showManage?: boolean;
}) {
  const isActive = estado === "activa";
  const subtitle = [medicamento.dosis, medicamento.frecuencia].filter(Boolean).join(" · ");

  return (
    <div
      onClick={onView}
      className={`flex rounded-3xl overflow-hidden border border-blue-100 dark:border-blue-900/50 bg-white dark:bg-slate-800 shadow-sm ${onView ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className={`flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
            <Icon name="medication" size={14} /> Receta médica
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shrink-0 ${isActive ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
            {isActive ? "Activa" : "Cancelada"}
          </span>
        </div>

        <div>
          <p className="text-[17px] font-bold text-slate-900 dark:text-slate-100">{medicamento.medicamento_nombre}</p>
          {subtitle && <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Emitida</p>
            <p className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 truncate">{fmtFechaCorta(fechaEmision)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Doctor</p>
            <p className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 truncate">Dr. {doctorNombre}</p>
          </div>
        </div>

        {medicamento.indicaciones && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl px-3 py-2">
            <Icon name="info" size={13} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-amber-800 dark:text-amber-300 leading-snug">{medicamento.indicaciones}</p>
          </div>
        )}

        <div className="flex items-center justify-end flex-nowrap gap-0.5 pt-3 mt-1 -mx-4 sm:-mx-5 px-4 sm:px-5 border-t border-slate-100 dark:border-slate-700">
          <ActionLink icon="download" label="Descargar" onClick={onDownload} hoverClass="hover:text-emerald-600 dark:hover:text-emerald-400" />
          <ActionLink icon="print" label="Imprimir" onClick={onPrint} hoverClass="hover:text-emerald-600 dark:hover:text-emerald-400" />
          <ActionLink icon="send" label="Enviar" onClick={onSend} hoverClass="hover:text-[#24A1DE]" />
          {showManage && (
            <>
              <ActionLink
                icon={isActive ? "block" : "check_circle"}
                label={isActive ? "Cancelar" : "Activar"}
                onClick={onToggleEstado}
                hoverClass="hover:text-amber-600 dark:hover:text-amber-400"
              />
              <ActionLink
                icon="delete"
                label="Eliminar"
                onClick={onDeleteMed}
                textClass="text-red-400 dark:text-red-400/80"
                hoverClass="hover:text-red-600 dark:hover:text-red-400"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Modal de detalle de una receta completa — reutiliza el diseño de documento (RecetaPreview). */
export function RecetaDetailModal({ data, dni, onClose }: { data: DocData; dni?: string; onClose: () => void }) {
  return (
    <motion.div
      variants={fadeIn} initial="hidden" animate="visible" exit="exit"
      className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        variants={scaleIn} initial="hidden" animate="visible" exit="exit"
        className="relative w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <Icon name="close" size={16} />
        </button>
        <div className="max-h-[85vh] overflow-y-auto no-scrollbar rounded-2xl">
          <RecetaPreview
            pacienteNombre={data.pacienteNombre}
            dni={dni ?? ""}
            fecha={data.fecha}
            doctorNombre={data.doctorNombre}
            diagnostico={data.diagnostico}
            medicamentos={data.medicamentos}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function buildRecetaHtml(opts: DocData): string {
  const docCode = `Receta médica`;
  const header = buildLetterheadHeader({
    clinica: opts.clinica ?? null,
    docLabel: "Receta Médica Odontológica",
    docCode,
    pacienteNombre: opts.pacienteNombre,
    generado: fmtGenerado(),
  });

  const infoCell = (label: string, value?: string | null) => value ? `
    <div>
      <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:2px;">${esc(label)}</div>
      <div style="font-size:12px;font-weight:700;color:#1e293b;">${esc(value)}</div>
    </div>
  ` : "";

  const infoBar = `
    <div style="margin:0 28px 20px;padding:14px 18px;background:#ecfeff;border-radius:10px;display:flex;flex-wrap:wrap;gap:18px;">
      ${infoCell("Paciente", opts.pacienteNombre)}
      ${infoCell("DNI", opts.dni)}
      ${infoCell("Edad", opts.edad != null ? `${opts.edad} años` : null)}
      ${infoCell("Fecha", fmtFechaCorta(opts.fecha))}
      ${infoCell("Diagnóstico", opts.diagnostico)}
    </div>
  `;

  const medsHtml = opts.medicamentos.map((m, i) => `
    <div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <span style="width:22px;height:22px;border-radius:50%;background:#0891b2;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i + 1}</span>
        <span style="font-size:13.5px;font-weight:800;color:#1e293b;">${esc(m.medicamento_nombre)}</span>
        ${m.dosis ? `<span style="font-size:12px;color:#64748b;">${esc(m.dosis)}</span>` : ""}
      </div>
      ${m.frecuencia || m.indicaciones ? `
        <div style="padding-left:32px;">
          ${m.frecuencia ? `<div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:2px;">Frecuencia</div><div style="font-size:12px;color:#334155;margin-bottom:6px;">${esc(m.frecuencia)}</div>` : ""}
          ${m.indicaciones ? `<div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:2px;">Indicaciones</div><div style="font-size:12px;color:#334155;">${esc(m.indicaciones)}</div>` : ""}
        </div>
      ` : ""}
    </div>`).join("");

  const alergiasHtml = (opts.alergias && opts.alergias.length > 0) ? `
    <div style="margin:6px 0 0;padding:12px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;display:flex;gap:8px;align-items:flex-start;">
      <span style="font-size:14px;line-height:1;">⚠️</span>
      <div style="font-size:11px;color:#92400e;line-height:1.6;"><b>Paciente con alergias registradas:</b> ${esc(opts.alergias.join(", "))}. Verificar compatibilidad antes de administrar.</div>
    </div>
  ` : "";

  const body = `
    ${infoBar}
    <div style="padding:0 28px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <span style="width:34px;height:34px;border-radius:50%;background:#ecfeff;color:#0891b2;font-family:Georgia,serif;font-size:20px;display:flex;align-items:center;justify-content:center;">℞</span>
        <div>
          <div style="font-size:14px;font-weight:800;color:#1e293b;">Prescripción Médica</div>
          <div style="font-size:10.5px;color:#94a3b8;">Válida por 30 días desde la fecha de emisión</div>
        </div>
      </div>
      ${medsHtml}
      ${alergiasHtml}
    </div>

    <div style="padding:28px 28px 24px;display:flex;justify-content:flex-end;">
      ${buildSignatureBlock({ nombre: opts.doctorNombre, especialidad: opts.doctorEspecialidad, numColegiatura: opts.doctorNumColegiatura, firmaUrl: opts.doctorFirmaUrl })}
    </div>
  `;

  return wrapDocument(`${header}${body}${buildLetterheadFooter({ clinica: opts.clinica ?? null, pacienteNombre: opts.pacienteNombre, docCode })}`, 800);
}

export async function handleDownloadPdf(d: DocData, sede: ClinicaInfo | null) {
  const html = buildRecetaHtml({ ...d, clinica: d.clinica ?? sede });
  await downloadHtmlAsSinglePagePdf(html, `receta_${d.pacienteNombre.replace(/\s+/g, "_")}_${d.fecha}.pdf`);
}

// ─── Modal "Nueva receta electrónica" (dos paneles + vista previa) ─────────────

function RecetaModal({
  diagnosticoId, pacienteId, pacienteNombre, telefono, dni, edad, alergias,
  doctorNombre, doctorEspecialidad, doctorNumColegiatura, doctorFirmaUrl, clinica,
  diagnosticoTexto, onClose, onSaved,
}: {
  diagnosticoId: string; pacienteId: string; pacienteNombre: string; telefono: string; dni: string;
  edad?: number | null; alergias?: string[];
  doctorNombre: string; doctorEspecialidad?: string | null; doctorNumColegiatura?: string | null; doctorFirmaUrl?: string | null;
  clinica?: ClinicaInfo | null;
  diagnosticoTexto: string; onClose: () => void; onSaved?: () => void;
}) {
  useBodyScrollLock();
  const isMobile = useIsMobile();
  const today = new Date().toISOString().split("T")[0];
  const [motivo, setMotivo] = useState(diagnosticoTexto || "");
  const [meds, setMeds] = useState<MedDraft[]>([emptyMed()]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  function setField(i: number, field: keyof MedDraft, value: any) {
    setMeds(p => p.map((m, j) => j === i ? { ...m, [field]: value } : m));
  }
  function addMed() { setMeds(p => [...p, emptyMed()]); }
  function removeMed(i: number) { setMeds(p => p.filter((_, j) => j !== i)); }

  async function buscarMed(q: string, idx: number) {
    setField(idx, "medicamento_nombre", q);
    setField(idx, "medicamento_id", null);
    if (q.length < 2) { setSearchResults([]); return; }
    setActiveIdx(idx);
    setSearchResults(await searchMedicamentosAction(q));
  }
  function elegirMed(idx: number, med: any) {
    const name = med.nombre_comercial
      ? `${med.nombre_comercial} (${med.nombre_generico}) - ${med.concentracion}`
      : `${med.nombre_generico} - ${med.concentracion}`;
    setField(idx, "medicamento_nombre", name);
    setField(idx, "medicamento_id", med.id);
    setSearchResults([]);
    setActiveIdx(null);
  }

  const validMeds = meds.filter(m => m.medicamento_nombre.trim());
  const canSave = validMeds.length > 0 && !saving;

  async function guardar(): Promise<boolean> {
    if (validMeds.length === 0) { setError("Agrega al menos un medicamento"); return false; }
    setSaving(true); setError("");
    const res = await saveRecetaAction({ diagnostico_id: String(diagnosticoId), paciente_id: String(pacienteId), medicamentos: validMeds });
    setSaving(false);
    if (res?.error) { setError(res.error); toast.error(res.error); return false; }
    toast.success("Receta médica guardada correctamente");
    return true;
  }

  async function guardarYCerrar() {
    if (await guardar()) { onSaved?.(); onClose(); }
  }

  const previewData: DocData = {
    pacienteNombre, doctorNombre, fecha: today, diagnostico: motivo, medicamentos: validMeds,
    dni, edad, alergias, doctorEspecialidad, doctorNumColegiatura, doctorFirmaUrl, clinica,
  };
  const telegramLink = buildTelegramLink(previewData);

  return createPortal(
    <div className="fixed inset-0 z-[70] md:flex md:items-center md:justify-center md:p-6">
      <motion.div
        variants={fadeIn} initial="hidden" animate="visible" exit="exit"
        className="absolute inset-0 bg-slate-900/50 md:backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        variants={isMobile ? slideUp : scaleIn}
        initial="hidden" animate="visible" exit="exit"
        className="fixed inset-x-0 bottom-0 top-10 md:relative md:inset-auto rounded-t-2xl md:rounded-2xl bg-white dark:bg-slate-800 w-full shadow-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: isMobile ? undefined : 900, maxHeight: isMobile ? undefined : "min(90vh, calc(100dvh - 96px))" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div>
            <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">Nueva receta electrónica</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{pacienteNombre} · {fmtFecha(today)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700">
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 overflow-hidden md:flex-row">
          {/* Formulario */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 md:border-r md:border-slate-100 dark:md:border-slate-700">
            <Field label="Diagnóstico / motivo">
              <input value={motivo} onChange={e => setMotivo(e.target.value)}
                placeholder="Ej: Gingivitis crónica, infección post-extracción…"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 bg-white dark:bg-slate-900 dark:text-slate-100" />
            </Field>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Medicamentos</p>
                <button onClick={addMed} className="flex items-center gap-1 text-[11px] text-cyan-600 hover:text-cyan-700 font-medium">
                  <Icon name="add_circle" size={14} /> Agregar
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {meds.map((m, i) => (
                  <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-[11px] font-bold text-cyan-600">#{i + 1}</span>
                      {meds.length > 1 && (
                        <button onClick={() => removeMed(i)} className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors">
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Field label="Medicamento">
                        <input value={m.medicamento_nombre} onChange={e => buscarMed(e.target.value, i)}
                          placeholder="Amoxicilina, Ibuprofeno…"
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 bg-white dark:bg-slate-900 dark:text-slate-100" />
                      </Field>
                      {activeIdx === i && searchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-10 max-h-44 overflow-y-auto">
                          {searchResults.map(r => (
                            <button key={r.id} onClick={() => elegirMed(i, r)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 last:border-0">
                              <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{r.nombre_comercial || r.nombre_generico}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">{r.concentracion} - {r.forma_farmaceutica}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Field label="Dosis">
                        <input value={m.dosis} onChange={e => setField(i, "dosis", e.target.value)}
                          placeholder="500mg, 15ml…"
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 bg-white dark:bg-slate-900 dark:text-slate-100" />
                      </Field>
                      <Field label="Frecuencia">
                        <Select value={m.frecuencia} onChange={(v) => setField(i, "frecuencia", v)} options={FRECUENCIA_OPTIONS} />
                      </Field>
                    </div>
                    <Field label="Indicaciones">
                      <input value={m.indicaciones} onChange={e => setField(i, "indicaciones", e.target.value)}
                        placeholder="Tomar con alimentos, no mezclar con alcohol…"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 bg-white dark:bg-slate-900 dark:text-slate-100" />
                    </Field>
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="text-[12px] text-red-500 px-1 flex items-center gap-1.5"><Icon name="warning" size={13} /> {error}</p>}
          </div>

          {/* Vista previa */}
          <div className="hidden md:block w-75 shrink-0 overflow-y-auto p-5 bg-slate-50 dark:bg-slate-900/50">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Vista previa</p>
            <RecetaPreview pacienteNombre={pacienteNombre} dni={dni} fecha={today} doctorNombre={doctorNombre} diagnostico={motivo} medicamentos={validMeds} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-t border-slate-100 dark:border-slate-700 shrink-0" style={{ paddingBottom: isMobile ? "calc(0.75rem + env(safe-area-inset-bottom))" : undefined }}>
          <button onClick={onClose} className="px-4 py-2 text-[12px] font-medium border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <div className="flex items-center flex-wrap gap-2">
            <button onClick={guardarYCerrar} disabled={!canSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Icon name="save" size={14} /> {saving ? "Guardando…" : "Guardar"}
            </button>
            <button onClick={() => canSave && handlePrint(previewData)} disabled={!canSave}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Icon name="print" size={14} /> Imprimir PDF
            </button>
            <a href={canSave ? telegramLink : undefined} target="_blank" rel="noreferrer"
              onClick={canSave ? (e) => { e.preventDefault(); guardar().then(ok => { if (ok) { window.open(telegramLink, "_blank"); onSaved?.(); onClose(); } }); } : (e) => e.preventDefault()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-colors ${canSave ? "bg-[#24A1DE] hover:bg-[#1c8ac2] text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed pointer-events-none"}`}>
              <Icon name="send" size={14} /> Telegram
            </a>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// ─── Vista previa de receta ───────────────────────────────────────────────────

export type PreviewMed = { medicamento_nombre: string; dosis: string; frecuencia: string; indicaciones: string };

export function RecetaPreview({ pacienteNombre, dni, fecha, doctorNombre, diagnostico, medicamentos }: {
  pacienteNombre: string; dni: string; fecha: string; doctorNombre: string; diagnostico: string; medicamentos: PreviewMed[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-[11px]">
      <div className="px-4 py-3 text-white" style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Icon name="medical_services" size={16} />
          <span className="font-bold text-[14px] tracking-tight">MaraDental</span>
        </div>
        <p className="text-cyan-100 text-[10px]">Receta médica electrónica</p>
        <p className="text-cyan-200 text-[10px]">{doctorNombre} · Odontología</p>
      </div>

      <div className="px-4 py-3 flex flex-col gap-2.5">
        <div className="flex justify-between text-slate-500 gap-2">
          <span className="min-w-0 truncate">Paciente: <span className="font-semibold text-slate-800">{pacienteNombre}</span></span>
          <span className="shrink-0 text-[10px]" suppressHydrationWarning>{fmtFecha(fecha)}</span>
        </div>
        {dni && <p className="text-slate-400 text-[10px]">DNI: {dni}</p>}

        {diagnostico && (
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-slate-500">Dx: </span>
            <span className="font-medium text-slate-800">{diagnostico}</span>
          </div>
        )}

        {medicamentos.length > 0 ? (
          <div>
            <p className="font-bold text-[18px] text-cyan-700 mb-1.5" style={{ fontFamily: "Georgia, serif" }}>℞</p>
            <div className="flex flex-col gap-2">
              {medicamentos.map((m, i) => (
                <div key={i}>
                  <p className="font-semibold text-slate-800">{i + 1}. {m.medicamento_nombre} <span className="font-normal text-slate-500">{m.dosis}</span></p>
                  {m.frecuencia && <p className="text-slate-500 pl-3">{m.frecuencia}</p>}
                  {m.indicaciones && <p className="text-slate-400 pl-3">→ {m.indicaciones}</p>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="italic text-slate-300 py-3 text-center">Agrega medicamentos para ver la receta…</p>
        )}

        <div className="border-t border-slate-200 pt-3 mt-1 flex flex-col items-center gap-1">
          <svg viewBox="0 0 160 50" xmlns="http://www.w3.org/2000/svg" width="110" height="34" aria-hidden="true">
            <path d="M8,40 C18,18 28,44 38,26 C46,12 54,40 64,24 C73,10 82,36 92,22 C100,10 110,32 122,20 C130,12 138,26 150,18"
              stroke="#1e3a8a" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
            <path d="M8,40 Q16,44 24,42" stroke="#1e3a8a" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
          </svg>
          <div className="w-28 border-t border-slate-300 mb-0.5" />
          <p className="font-semibold text-slate-700 text-[10px]">{doctorNombre}</p>
          <p className="text-[9px] text-slate-400">Odontólogo</p>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function ConfirmDialog({ titulo, texto, onCancel, onConfirm, confirmLabel = "Sí, eliminar" }: {
  titulo: string; texto: string; onCancel: () => void; onConfirm: () => void; confirmLabel?: string;
}) {
  return createPortal(
    <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
      <motion.div variants={scaleIn} initial="hidden" animate="visible" exit="exit" className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-5 max-w-sm w-full text-center">
        <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-2">{titulo}</h3>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-5">{texto}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[12px] font-bold transition-colors">{confirmLabel}</button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

export type DocData = {
  pacienteNombre: string; doctorNombre: string; fecha: string; diagnostico: string; medicamentos: PreviewMed[];
  dni?: string; edad?: number | null; alergias?: string[];
  doctorEspecialidad?: string | null; doctorNumColegiatura?: string | null; doctorFirmaUrl?: string | null;
  clinica?: ClinicaInfo | null;
};

function buildTelegramText(d: DocData): string {
  const contacto = [d.clinica?.telefono, d.clinica?.email_contacto].filter(Boolean).join(" · ");
  const lineas = [
    `🦷 RECETA MÉDICA${d.clinica?.nombre_clinica ? ` - ${d.clinica.nombre_clinica}` : ""}`,
    `Dr. ${d.doctorNombre}${d.doctorEspecialidad ? ` · ${d.doctorEspecialidad}` : ""}`,
    ``,
    `Paciente: ${d.pacienteNombre}${d.dni ? ` · DNI ${d.dni}` : ""}`,
    `Fecha: ${fmtFecha(d.fecha)}`,
    `Diagnóstico: ${d.diagnostico || "—"}`,
    ``,
    `💊 Medicamentos:`,
    ...d.medicamentos.map((m, i) =>
      [`${i + 1}. ${m.medicamento_nombre} ${m.dosis}`, m.frecuencia ? `   ${m.frecuencia}` : "", m.indicaciones ? `   → ${m.indicaciones}` : ""].filter(Boolean).join("\n")
    ),
    ...(contacto ? ["", contacto] : []),
  ];
  return lineas.join("\n");
}

/** Enlace universal para compartir por Telegram — no hay un handle de Telegram guardado por paciente, así que abre el selector "Compartir con…" de Telegram con el mensaje ya redactado. */
export function buildTelegramLink(d: DocData): string {
  return `https://t.me/share/url?url=&text=${encodeURIComponent(buildTelegramText(d))}`;
}

/** Imprime el mismo documento con membrete que se usa para descargar/telegram — antes generaba su propio HTML con datos de contacto inventados (dirección/teléfono fijos), ahora reutiliza buildRecetaHtml con los datos reales de la sede. */
export function handlePrint(d: DocData) {
  const html = buildRecetaHtml(d);
  printHtml(html, `Receta · ${d.pacienteNombre}`);
}
