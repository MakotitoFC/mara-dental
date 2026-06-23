"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  saveRecetaAction,
  toggleEstadoRecetaAction,
  deleteRecetaAction,
  deleteMedicamentoAction,
  searchMedicamentosAction,
} from "../actions";

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

const fmtFecha = (d: string) => {
  try { return new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return d; }
};

interface SectionProps {
  diagnosticoId: number;
  consultaId: number;
  initial: Receta[];
  enabled?: boolean;
  pacienteNombre: string;
  telefono: string;
  dni: string;
  doctorNombre: string;
  diagnosticoTexto: string;
}

export function RecetaSection(props: SectionProps) {
  const { diagnosticoId, consultaId, initial, enabled = true, pacienteNombre, telefono, dni, doctorNombre, diagnosticoTexto } = props;
  const [recetas, setRecetas] = useState<Receta[]>(initial || []);
  const [showModal, setShowModal] = useState(false);

  async function handleToggleEstado(r: Receta) {
    const newEst = r.estado === "activa" ? "cancelada" : "activa";
    await toggleEstadoRecetaAction(r.id, newEst, consultaId);
    setRecetas(prev => prev.map(x => x.id === r.id ? { ...x, estado: newEst } : x));
  }

  const [recetaToDelete, setRecetaToDelete] = useState<number | null>(null);
  async function confirmDeleteReceta() {
    if (!recetaToDelete) return;
    await deleteRecetaAction(recetaToDelete, consultaId);
    setRecetas(p => p.filter(x => x.id !== recetaToDelete));
    setRecetaToDelete(null);
  }

  const [medToDelete, setMedToDelete] = useState<number | null>(null);
  async function confirmDeleteMed() {
    if (!medToDelete) return;
    await deleteMedicamentoAction(medToDelete, consultaId);
    setRecetas(p => p.map(r => ({ ...r, receta_medicamento: r.receta_medicamento.filter(m => m.id !== medToDelete) })));
    setMedToDelete(null);
  }

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden relative ${enabled ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
      {!enabled && (
        <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-2xl">
          <Icon name="lock" size={22} className="text-slate-400" />
          <p className="text-[12px] font-semibold text-slate-500">Disponible con diagnóstico definitivo</p>
        </div>
      )}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <Icon name="medication" size={18} />
          </div>
          <h2 className="text-[14px] font-semibold text-slate-800">Recetas médicas</h2>
        </div>
        <button onClick={() => enabled && setShowModal(true)} disabled={!enabled}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-xl text-[13px] font-semibold transition-colors min-h-[40px]">
          <Icon name="add" size={16} /> Nueva receta
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {recetas.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <Icon name="medication" size={28} className="opacity-30 mx-auto mb-2" />
            <p className="text-[12px]">Sin recetas emitidas</p>
          </div>
        ) : (
          recetas.map(r => (
            <div key={r.id} className={`flex flex-col gap-2 p-4 rounded-xl border ${r.estado === "activa" ? "border-rose-200 bg-white shadow-sm" : "border-slate-200 bg-slate-50 opacity-70"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                  <Icon name="calendar_today" size={12} />
                  <span suppressHydrationWarning>{new Date(r.fecha_emision).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handlePrint({ pacienteNombre, doctorNombre, fecha: r.fecha_emision, diagnostico: diagnosticoTexto, medicamentos: r.receta_medicamento })}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors min-h-[36px]">
                    <Icon name="print" size={15} /> Imprimir
                  </button>
                  <a href={buildWaLink(telefono, { pacienteNombre, doctorNombre, fecha: r.fecha_emision, diagnostico: diagnosticoTexto, medicamentos: r.receta_medicamento })}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-slate-500 hover:text-[#25D366] hover:bg-green-50 transition-colors min-h-[36px]">
                    <Icon name="chat" size={15} /> WhatsApp
                  </a>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[12px] font-bold text-slate-600 px-1">
                    <input type="checkbox" checked={r.estado === "activa"} onChange={() => handleToggleEstado(r)} className="accent-cyan-600 w-4 h-4" />
                    Activa
                  </label>
                  <button onClick={() => setRecetaToDelete(r.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Icon name="delete" size={17} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {r.receta_medicamento.map((m, i) => (
                  <div key={m.id} className="p-3 bg-rose-50/40 rounded-lg border border-rose-100 flex gap-3">
                    <span className="w-6 h-6 mt-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-semibold text-slate-800 block mb-1">{m.medicamento_nombre}</span>
                      <div className="text-[12px] text-slate-500 space-y-0.5">
                        {m.dosis        && <p><span className="font-medium text-slate-600">Dosis:</span> {m.dosis}</p>}
                        {m.frecuencia   && <p><span className="font-medium text-slate-600">Frecuencia:</span> {m.frecuencia}</p>}
                        {m.indicaciones && <p><span className="font-medium text-slate-600">Indicaciones:</span> {m.indicaciones}</p>}
                      </div>
                    </div>
                    <button onClick={() => setMedToDelete(m.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 self-start">
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal nueva receta electrónica */}
      {showModal && (
        <RecetaModal
          diagnosticoId={diagnosticoId}
          consultaId={consultaId}
          pacienteNombre={pacienteNombre}
          telefono={telefono}
          dni={dni}
          doctorNombre={doctorNombre}
          diagnosticoTexto={diagnosticoTexto}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Confirmaciones */}
      {recetaToDelete && (
        <ConfirmDialog
          titulo="¿Eliminar receta completa?"
          texto="Esta acción eliminará la receta y todos sus medicamentos asociados."
          onCancel={() => setRecetaToDelete(null)}
          onConfirm={confirmDeleteReceta}
        />
      )}
      {medToDelete && (
        <ConfirmDialog
          titulo="¿Quitar medicamento?"
          texto="El medicamento será removido de esta receta médica."
          onCancel={() => setMedToDelete(null)}
          onConfirm={confirmDeleteMed}
          confirmLabel="Sí, quitar"
        />
      )}
    </div>
  );
}

// ─── Modal "Nueva receta electrónica" (dos paneles + vista previa) ─────────────

function RecetaModal({ diagnosticoId, consultaId, pacienteNombre, telefono, dni, doctorNombre, diagnosticoTexto, onClose }: {
  diagnosticoId: number; consultaId: number; pacienteNombre: string; telefono: string; dni: string;
  doctorNombre: string; diagnosticoTexto: string; onClose: () => void;
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
    const res = await saveRecetaAction({ diagnostico_id: diagnosticoId, consulta_id: consultaId, medicamentos: validMeds });
    setSaving(false);
    if (res?.error) { setError(res.error); return false; }
    return true;
  }

  async function guardarYCerrar() {
    if (await guardar()) window.location.reload();
  }

  const previewData = { pacienteNombre, doctorNombre, fecha: today, diagnostico: motivo, medicamentos: validMeds };
  const waLink = buildWaLink(telefono, previewData);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pb-20 md:pb-4" style={{ background: "rgba(15,23,42,0.5)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col" style={{ maxWidth: 900, maxHeight: "min(90vh, calc(100dvh - 96px))" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-[14px] font-semibold text-slate-900">Nueva receta electrónica</p>
            <p className="text-[11px] text-slate-400">{pacienteNombre} · {fmtFecha(today)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 overflow-hidden md:flex-row">
          {/* Formulario */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 md:border-r md:border-slate-100">
            <Field label="Diagnóstico / motivo">
              <input value={motivo} onChange={e => setMotivo(e.target.value)}
                placeholder="Ej: Gingivitis crónica, infección post-extracción…"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
            </Field>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Medicamentos</p>
                <button onClick={addMed} className="flex items-center gap-1 text-[11px] text-cyan-600 hover:text-cyan-700 font-medium">
                  <Icon name="add_circle" size={14} /> Agregar
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {meds.map((m, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-[11px] font-bold text-cyan-600">#{i + 1}</span>
                      {meds.length > 1 && (
                        <button onClick={() => removeMed(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Field label="Medicamento">
                        <input value={m.medicamento_nombre} onChange={e => buscarMed(e.target.value, i)}
                          placeholder="Amoxicilina, Ibuprofeno…"
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-500" />
                      </Field>
                      {activeIdx === i && searchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-44 overflow-y-auto">
                          {searchResults.map(r => (
                            <button key={r.id} onClick={() => elegirMed(i, r)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                              <p className="text-[12px] font-semibold text-slate-800">{r.nombre_comercial || r.nombre_generico}</p>
                              <p className="text-[10px] text-slate-500">{r.concentracion} - {r.forma_farmaceutica}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Field label="Dosis">
                        <input value={m.dosis} onChange={e => setField(i, "dosis", e.target.value)}
                          placeholder="500mg, 15ml…"
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-500" />
                      </Field>
                      <Field label="Frecuencia">
                        <select value={m.frecuencia} onChange={e => setField(i, "frecuencia", e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-500">
                          {FRECUENCIAS.map(f => <option key={f}>{f}</option>)}
                        </select>
                      </Field>
                    </div>
                    <Field label="Indicaciones">
                      <input value={m.indicaciones} onChange={e => setField(i, "indicaciones", e.target.value)}
                        placeholder="Tomar con alimentos, no mezclar con alcohol…"
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-500" />
                    </Field>
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="text-[12px] text-red-500 px-1 flex items-center gap-1.5"><Icon name="warning" size={13} /> {error}</p>}
          </div>

          {/* Vista previa */}
          <div className="hidden md:block w-75 shrink-0 overflow-y-auto p-5 bg-slate-50">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Vista previa</p>
            <RecetaPreview pacienteNombre={pacienteNombre} dni={dni} fecha={today} doctorNombre={doctorNombre} diagnostico={motivo} medicamentos={validMeds} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[12px] font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <div className="flex items-center flex-wrap gap-2">
            <button onClick={guardarYCerrar} disabled={!canSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Icon name="save" size={14} /> {saving ? "Guardando…" : "Guardar"}
            </button>
            <button onClick={() => canSave && handlePrint(previewData)} disabled={!canSave}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Icon name="print" size={14} /> Imprimir PDF
            </button>
            <a href={canSave ? waLink : undefined} target="_blank" rel="noreferrer"
              onClick={canSave ? (e) => { e.preventDefault(); guardar().then(ok => { if (ok) window.open(waLink, "_blank"); window.location.reload(); }); } : (e) => e.preventDefault()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-colors ${canSave ? "bg-[#25D366] hover:bg-[#1ebe5a] text-white" : "bg-slate-100 text-slate-300 cursor-not-allowed pointer-events-none"}`}>
              <Icon name="chat" size={14} /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vista previa de receta ───────────────────────────────────────────────────

type PreviewMed = { medicamento_nombre: string; dosis: string; frecuencia: string; indicaciones: string };

function RecetaPreview({ pacienteNombre, dni, fecha, doctorNombre, diagnostico, medicamentos }: {
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
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function ConfirmDialog({ titulo, texto, onCancel, onConfirm, confirmLabel = "Sí, eliminar" }: {
  titulo: string; texto: string; onCancel: () => void; onConfirm: () => void; confirmLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-5 max-w-sm w-full text-center">
        <h3 className="text-[16px] font-bold text-slate-800 mb-2">{titulo}</h3>
        <p className="text-[13px] text-slate-500 mb-5">{texto}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-600 bg-white">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[12px] font-bold transition-colors">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

type DocData = { pacienteNombre: string; doctorNombre: string; fecha: string; diagnostico: string; medicamentos: PreviewMed[] };

function buildWaText(d: DocData): string {
  const lineas = [
    `🦷 *RECETA MÉDICA - MaraDental*`,
    `${d.doctorNombre}`,
    ``,
    `*Paciente:* ${d.pacienteNombre}`,
    `*Fecha:* ${fmtFecha(d.fecha)}`,
    `*Diagnóstico:* ${d.diagnostico || "—"}`,
    ``,
    `*💊 Medicamentos:*`,
    ...d.medicamentos.map((m, i) =>
      [`${i + 1}. *${m.medicamento_nombre} ${m.dosis}*`, m.frecuencia ? `   ${m.frecuencia}` : "", m.indicaciones ? `   → ${m.indicaciones}` : ""].filter(Boolean).join("\n")
    ),
    ``,
    `_MaraDental · Av. Principal 123 · +51 987 000 000_`,
  ];
  return lineas.join("\n");
}

function buildWaLink(telefono: string, d: DocData): string {
  return `https://wa.me/${(telefono || "").replace(/\D/g, "")}?text=${encodeURIComponent(buildWaText(d))}`;
}

function handlePrint(d: DocData) {
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
