"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { fadeIn, scaleIn, staggerContainer, staggerItem } from "@/lib/animations";
import {
  buildLetterheadHeader, buildLetterheadFooter, wrapDocument, fmtGenerado,
  downloadHtmlAsSinglePagePdf, type ClinicaInfo,
} from "@/lib/reportExport";
import {
  saveRecetaAction,
  toggleEstadoRecetaAction,
  deleteMedicamentoAction,
  searchMedicamentosAction,
  getSedeInfoAction,
} from "../../consulta.actions";

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
  doctorNombre: string;
  diagnosticoTexto: string;
  onSaved?: () => void;
}

export function RecetaSection(props: SectionProps) {
  const { diagnosticoId, pacienteId, initial, enabled = true, pacienteNombre, telefono, dni, doctorNombre, diagnosticoTexto, onSaved } = props;
  const [recetas, setRecetas] = useState<Receta[]>(initial || []);
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState<DocData | null>(null);
  const [sede, setSede] = useState<ClinicaInfo | null>(null);

  useEffect(() => {
    setRecetas(initial || []);
  }, [initial]);

  useEffect(() => {
    getSedeInfoAction().then(setSede).catch(() => {});
  }, []);

  async function handleToggleEstado(r: Receta) {
    const newEst = r.estado === "activa" ? "cancelada" : "activa";
    await toggleEstadoRecetaAction(String(r.id), newEst, String(pacienteId));
    setRecetas(prev => prev.map(x => x.id === r.id ? { ...x, estado: newEst } : x));
  }

  const [medToDelete, setMedToDelete] = useState<number | null>(null);
  async function confirmDeleteMed() {
    if (!medToDelete) return;
    await deleteMedicamentoAction(String(medToDelete), String(pacienteId));
    setRecetas(p => p.map(r => ({ ...r, receta_medicamento: r.receta_medicamento.filter(m => m.id !== medToDelete) })));
    setMedToDelete(null);
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className={`bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden relative ${enabled ? "border-slate-200 dark:border-slate-700" : "border-slate-200 dark:border-slate-700 opacity-60"}`}>
      {!enabled && (
        <div className="absolute inset-0 z-10 bg-white/70 dark:bg-slate-800/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-2xl">
          <Icon name="lock" size={22} className="text-slate-400 dark:text-slate-500" />
          <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Disponible con diagnóstico definitivo</p>
        </div>
      )}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <Icon name="medication" size={18} />
          </div>
          <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Recetas médicas</h2>
        </div>
        <button onClick={() => enabled && setShowModal(true)} disabled={!enabled}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-xl text-[13px] font-semibold transition-colors min-h-[40px]">
          <Icon name="add" size={16} /> Nueva receta
        </button>
      </div>

      <div className="p-5 flex flex-col gap-3">
        {recetas.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500">
            <Icon name="medication" size={28} className="opacity-30 mx-auto mb-2" />
            <p className="text-[12px]">Sin recetas emitidas</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="flex flex-col gap-3">
            {recetas.flatMap((r) =>
              r.receta_medicamento.map((m) => {
                const docData: DocData = { pacienteNombre, doctorNombre, fecha: r.fecha_emision, diagnostico: diagnosticoTexto, medicamentos: r.receta_medicamento };
                return (
                  <motion.div key={m.id} variants={staggerItem}>
                    <PrescriptionRow
                      medicamento={m}
                      estado={r.estado}
                      fechaEmision={r.fecha_emision}
                      doctorNombre={doctorNombre}
                      onView={() => setViewing(docData)}
                      onDownload={() => handleDownloadPdf(docData, sede)}
                      onPrint={() => handlePrint(docData)}
                      onSend={() => window.open(buildTelegramLink(docData), "_blank")}
                      onToggleEstado={() => handleToggleEstado(r)}
                      onDeleteMed={() => setMedToDelete(m.id)}
                      showManage
                    />
                  </motion.div>
                );
              }),
            )}
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
            doctorNombre={doctorNombre}
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

      {/* Detalle de receta */}
      <AnimatePresence>
        {viewing && <RecetaDetailModal data={viewing} dni={dni} onClose={() => setViewing(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}

const fmtFechaCorta = (d: string) => {
  try { return new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
};

/** Tarjeta de un medicamento — un renglón por medicamento, con estado, fecha, doctor y acciones (ver detalle/descargar/imprimir/enviar). */
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
  const subtitle = [medicamento.dosis, medicamento.frecuencia].filter(Boolean).join(" • ");

  return (
    <div
      onClick={onView}
      className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3 ${onView ? "cursor-pointer hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors" : ""}`}
    >
      <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
        <Icon name="medication" size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-slate-800 dark:text-slate-100 truncate">{medicamento.medicamento_nombre}</p>
        {subtitle && <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${isActive ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
            {isActive ? "Activa" : "Cancelada"}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <Icon name="calendar_today" size={11} /> Emitida: {fmtFechaCorta(fechaEmision)}
          </span>
        </div>
      </div>
      <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
        <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <Icon name="person" size={12} /> Dr. {doctorNombre}
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); onDownload(); }} title="Descargar PDF"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors">
            <Icon name="download" size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onPrint(); }} title="Imprimir"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors">
            <Icon name="print" size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onSend(); }} title="Enviar por Telegram"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-[#24A1DE]/10 hover:text-[#24A1DE] text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors">
            <Icon name="send" size={14} />
          </button>
          {showManage && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onToggleEstado?.(); }} title={isActive ? "Marcar cancelada" : "Marcar activa"}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors">
                <Icon name={isActive ? "block" : "check_circle"} size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDeleteMed?.(); }} title="Quitar medicamento"
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 dark:text-slate-500 hover:text-red-500 flex items-center justify-center transition-colors">
                <Icon name="delete" size={14} />
              </button>
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

function buildRecetaHtml(opts: DocData & { clinica: ClinicaInfo | null }): string {
  const header = buildLetterheadHeader({ clinica: opts.clinica, titulo: "Receta Médica", sub: opts.pacienteNombre, generado: fmtGenerado() });
  const medsHtml = opts.medicamentos.map((m, i) => `
    <div style="margin-bottom:12px;padding-left:12px;border-left:3px solid #0891b2;">
      <div style="font-size:13px;font-weight:700;color:#1e293b;">${i + 1}. ${m.medicamento_nombre} ${m.dosis ?? ""}</div>
      ${m.frecuencia ? `<div style="font-size:11.5px;color:#64748b;">${m.frecuencia}</div>` : ""}
      ${m.indicaciones ? `<div style="font-size:11px;color:#94a3b8;">→ ${m.indicaciones}</div>` : ""}
    </div>`).join("");

  const body = `
    <div style="padding:20px 24px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;gap:8px;">
        <span style="font-size:12px;color:#64748b;">Paciente: <strong style="color:#1e293b;">${opts.pacienteNombre}</strong></span>
        <span style="font-size:11px;color:#94a3b8;">${fmtFechaCorta(opts.fecha)}</span>
      </div>
      ${opts.diagnostico ? `<div style="background:#f8fafc;padding:10px 12px;border-radius:8px;margin-bottom:14px;font-size:12px;"><strong>Diagnóstico:</strong> ${opts.diagnostico}</div>` : ""}
      <div style="font-family:Georgia,serif;font-size:24px;color:#0891b2;margin-bottom:8px;">℞</div>
      ${medsHtml}
      <div style="margin-top:28px;text-align:center;">
        <div style="width:160px;border-top:1px solid #334155;margin:0 auto 4px;"></div>
        <div style="font-size:11px;font-weight:700;color:#1e293b;">${opts.doctorNombre}</div>
        <div style="font-size:10px;color:#64748b;">Odontólogo</div>
      </div>
    </div>
  `;
  return wrapDocument(`${header}${body}${buildLetterheadFooter(opts.clinica)}`, 700);
}

export async function handleDownloadPdf(d: DocData, sede: ClinicaInfo | null) {
  const html = buildRecetaHtml({ ...d, clinica: sede });
  await downloadHtmlAsSinglePagePdf(html, `receta_${d.pacienteNombre.replace(/\s+/g, "_")}_${d.fecha}.pdf`);
}

// ─── Modal "Nueva receta electrónica" (dos paneles + vista previa) ─────────────

function RecetaModal({ diagnosticoId, pacienteId, pacienteNombre, telefono, dni, doctorNombre, diagnosticoTexto, onClose, onSaved }: {
  diagnosticoId: string; pacienteId: string; pacienteNombre: string; telefono: string; dni: string;
  doctorNombre: string; diagnosticoTexto: string; onClose: () => void; onSaved?: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [motivo, setMotivo] = useState(diagnosticoTexto || "");
  const [meds, setMeds] = useState<MedDraft[]>([emptyMed()]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    if (res?.error) { setError(res.error); return false; }
    return true;
  }

  async function guardarYCerrar() {
    if (await guardar()) { onSaved?.(); onClose(); }
  }

  const previewData = { pacienteNombre, doctorNombre, fecha: today, diagnostico: motivo, medicamentos: validMeds };
  const telegramLink = buildTelegramLink(previewData);

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-[70] flex items-center justify-center p-4 pb-20 md:pb-4 backdrop-blur-[2px]" style={{ background: "rgba(15,23,42,0.5)" }} onClick={onClose}>
      <motion.div variants={scaleIn} initial="hidden" animate="visible" exit="exit" className="bg-white dark:bg-slate-800 rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col" style={{ maxWidth: 900, maxHeight: "min(90vh, calc(100dvh - 96px))" }} onClick={e => e.stopPropagation()}>
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
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
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
    </motion.div>
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
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
      <motion.div variants={scaleIn} initial="hidden" animate="visible" exit="exit" className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-5 max-w-sm w-full text-center">
        <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-2">{titulo}</h3>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-5">{texto}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[12px] font-bold transition-colors">{confirmLabel}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export type DocData = { pacienteNombre: string; doctorNombre: string; fecha: string; diagnostico: string; medicamentos: PreviewMed[] };

function buildTelegramText(d: DocData): string {
  const lineas = [
    `🦷 RECETA MÉDICA - MaraDental`,
    `${d.doctorNombre}`,
    ``,
    `Paciente: ${d.pacienteNombre}`,
    `Fecha: ${fmtFecha(d.fecha)}`,
    `Diagnóstico: ${d.diagnostico || "—"}`,
    ``,
    `💊 Medicamentos:`,
    ...d.medicamentos.map((m, i) =>
      [`${i + 1}. ${m.medicamento_nombre} ${m.dosis}`, m.frecuencia ? `   ${m.frecuencia}` : "", m.indicaciones ? `   → ${m.indicaciones}` : ""].filter(Boolean).join("\n")
    ),
    ``,
    `MaraDental · Av. Principal 123 · +51 987 000 000`,
  ];
  return lineas.join("\n");
}

/** Enlace universal para compartir por Telegram — no hay un handle de Telegram guardado por paciente, así que abre el selector "Compartir con…" de Telegram con el mensaje ya redactado. */
export function buildTelegramLink(d: DocData): string {
  return `https://t.me/share/url?url=&text=${encodeURIComponent(buildTelegramText(d))}`;
}

export function handlePrint(d: DocData) {
  const medsHtml = d.medicamentos.map((m, i) => `
    <div class="med">
      <strong>${i + 1}. ${m.medicamento_nombre} ${m.dosis}</strong><br/>
      ${m.frecuencia ? `<span style="color:#64748b">${m.frecuencia}</span>` : ""}
      ${m.indicaciones ? `<br/><span style="color:#94a3b8">→ ${m.indicaciones}</span>` : ""}
    </div>`).join("");

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <title>Receta · ${d.pacienteNombre}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:12px;color:#1e293b;max-width:580px;margin:32px auto;padding:0 16px}
    .header{background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;padding:14px 18px;border-radius:10px 10px 0 0}
    .header h1{font-size:17px;font-weight:700;margin-bottom:3px}
    .header p{font-size:10px;color:rgba(255,255,255,0.8);margin:1px 0}
    .body{border:1px solid #e2e8f0;border-top:none;padding:18px;border-radius:0 0 10px 10px}
    .row{display:flex;justify-content:space-between;margin-bottom:8px;gap:8px}
    .dx{background:#f8fafc;padding:8px 10px;border-radius:7px;margin-bottom:10px;font-size:11px}
    .rx-title{font-family:Georgia,serif;font-size:22px;color:#0891b2;margin:10px 0 8px}
    .med{margin-bottom:10px;padding-left:10px;border-left:3px solid #0891b2}
    .sig{margin-top:24px;text-align:center}
    .sig-line{border-top:1px solid #334155;width:140px;margin:0 auto 4px}
    .sig p{font-size:10px;color:#475569}
    .sig .name{font-weight:700;font-size:11px;color:#1e293b}
    @media print{body{margin:0}}
  </style></head><body>
    <div class="header"><h1>🦷 MaraDental</h1><p>${d.doctorNombre} · Odontología</p><p>Av. Principal 123 · Tel: +51 987 000 000</p></div>
    <div class="body">
      <div class="row"><span><strong>Paciente:</strong> ${d.pacienteNombre}</span><span><strong>Fecha:</strong> ${fmtFecha(d.fecha)}</span></div>
      ${d.diagnostico ? `<div class="dx"><strong>Diagnóstico:</strong> ${d.diagnostico}</div>` : ""}
      <div class="rx-title">℞</div>
      ${medsHtml}
      <div class="sig"><div class="sig-line"></div><p class="name">${d.doctorNombre}</p><p>Odontólogo</p></div>
    </div>
  </body></html>`;

  const w = window.open("", "_blank", "width=680,height=820");
  if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 600); }
}
