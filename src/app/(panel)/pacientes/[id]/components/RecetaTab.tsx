"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { fmtFecha } from "@/lib/mock-pacientes";
import type { Receta, Medicamento } from "@/types/receta";
import type { Paciente } from "@/types/paciente";

// ─── Mock recetas previas ─────────────────────────────────────────────────────

function getMockRecetas(paciente_id: string): Receta[] {
  if (paciente_id !== "p1" && paciente_id !== "p3") return [];
  return [
    {
      id: "r1",
      paciente_id: "p1",
      paciente_nombre: "María González López",
      doctor_nombre: "Dr. García",
      fecha: "2026-03-10",
      diagnostico_texto: "Gingivitis crónica generalizada",
      estado: "activa" as const,
      medicamentos: [
        { id:"m1", nombre:"Clorhexidina 0.12%", dosis:"15 ml", frecuencia:"Cada 12 horas", indicaciones:"No enjuagarse con agua después." },
        { id:"m2", nombre:"Ibuprofeno",          dosis:"400 mg", frecuencia:"Cada 8 horas", indicaciones:"Tomar con alimentos." },
      ],
    },
  ].filter((r) => r.paciente_id === paciente_id);
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function RecetaTab({ paciente }: { paciente: Paciente }) {
  const [recetas, setRecetas] = useState<Receta[]>(() => getMockRecetas(paciente.id));
  const [showModal, setShowModal] = useState(false);

  function handleGuardar(r: Receta) {
    setRecetas((prev) => [r, ...prev]);
    setShowModal(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[12px] font-medium transition-colors"
        >
          <Icon name="add" size={15} />
          Nueva receta
        </button>
      </div>

      {recetas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center text-slate-400">
          <Icon name="medication" size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-[13px]">Sin recetas emitidas</p>
        </div>
      ) : (
        recetas.map((r) => <RecetaCard key={r.id} receta={r} paciente={paciente} />)
      )}

      {showModal && (
        <RecetaModal
          paciente={paciente}
          onClose={() => setShowModal(false)}
          onGuardar={handleGuardar}
        />
      )}
    </div>
  );
}

// ─── Card de receta emitida ───────────────────────────────────────────────────

function RecetaCard({ receta: r, paciente: p }: { receta: Receta; paciente: Paciente }) {
  const texto  = buildWhatsAppText(r);
  const waLink = `https://wa.me/${p.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900">{r.diagnostico_texto}</p>
          <p className="text-[11px] text-slate-400">{fmtFecha(r.fecha)} · {r.doctor_nombre}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handlePrint(r)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Icon name="print" size={14} className="text-slate-500" />
            Imprimir
          </button>
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-green-50 hover:border-green-200 transition-colors"
          >
            <Icon name="chat" size={14} className="text-[#25D366]" />
            WhatsApp
          </a>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {r.medicamentos.map((m, i) => (
          <div key={m.id} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50">
            <span className="text-[11px] font-bold text-cyan-600 w-4 shrink-0">{i + 1}.</span>
            <div>
              <p className="text-[12px] font-semibold text-slate-900">{m.nombre} <span className="font-normal text-slate-500">{m.dosis}</span></p>
              <p className="text-[11px] text-slate-500">{m.frecuencia}</p>
              {m.indicaciones && <p className="text-[11px] text-slate-400 mt-0.5">→ {m.indicaciones}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal crear receta ───────────────────────────────────────────────────────

function RecetaModal({
  paciente,
  onClose,
  onGuardar,
}: {
  paciente: Paciente;
  onClose: () => void;
  onGuardar: (r: Receta) => void;
}) {
  const today = new Date().toISOString().split("T")[0];

  const [diagnostico,  setDiagnostico]  = useState("");
  const [meds, setMeds] = useState<Medicamento[]>([
    { id: uid(), nombre: "", dosis: "", frecuencia: "Cada 8 horas", indicaciones: "" },
  ]);

  function addMed() {
    setMeds((p) => [...p, { id: uid(), nombre: "", dosis: "", frecuencia: "Cada 8 horas", indicaciones: "" }]);
  }
  function removeMed(id: string) {
    setMeds((p) => p.filter((m) => m.id !== id));
  }
  function updateMed(id: string, field: keyof Medicamento, value: string) {
    setMeds((p) => p.map((m) => m.id === id ? { ...m, [field]: value } : m));
  }

  function handleGuardar() {
    if (!diagnostico.trim() || meds.some((m) => !m.nombre.trim())) return;
    const receta: Receta = {
      id:               uid(),
      paciente_id:      paciente.id,
      paciente_nombre:  paciente.nombre,
      doctor_nombre:    "Dr. García",
      fecha:            today,
      diagnostico_texto: diagnostico,
      estado:           "activa",
      medicamentos:     meds.filter((m) => m.nombre.trim()),
    };
    onGuardar(receta);
  }

  const previewData: Receta = {
    id: "", paciente_id: paciente.id, paciente_nombre: paciente.nombre,
    doctor_nombre: "Dr. García", fecha: today, diagnostico_texto: diagnostico,
    estado: "activa",
    medicamentos: meds.filter((m) => m.nombre.trim()),
  };

  const waLink  = `https://wa.me/${paciente.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(buildWhatsAppText(previewData))}`;
  const canSend = !!(diagnostico.trim() && meds.some((m) => m.nombre.trim()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 md:pb-4"
      style={{ background: "rgba(15,23,42,0.5)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: 900, maxHeight: "min(90vh, calc(100dvh - 96px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-[14px] font-semibold text-slate-900">Nueva receta electrónica</p>
            <p className="text-[11px] text-slate-400">{paciente.nombre} · {fmtFecha(today)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 overflow-hidden md:flex-row">
          {/* Formulario */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 md:border-r md:border-slate-100">

            <FormField label="Diagnóstico / motivo">
              <input
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                placeholder="Ej: Gingivitis crónica, infección post-extracción…"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </FormField>

            {/* Medicamentos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Medicamentos</p>
                <button onClick={addMed} className="flex items-center gap-1 text-[11px] text-cyan-600 hover:text-cyan-700 font-medium">
                  <Icon name="add_circle" size={14} />
                  Agregar
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {meds.map((m, i) => (
                  <div key={m.id} className="border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-[11px] font-bold text-cyan-600">#{i + 1}</span>
                      {meds.length > 1 && (
                        <button onClick={() => removeMed(m.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <FormField label="Medicamento">
                        <input
                          value={m.nombre}
                          onChange={(e) => updateMed(m.id, "nombre", e.target.value)}
                          placeholder="Amoxicilina, Ibuprofeno…"
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-500"
                        />
                      </FormField>
                      <FormField label="Dosis">
                        <input
                          value={m.dosis}
                          onChange={(e) => updateMed(m.id, "dosis", e.target.value)}
                          placeholder="500mg, 15ml…"
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-500"
                        />
                      </FormField>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <FormField label="Frecuencia">
                        <select value={m.frecuencia} onChange={(e) => updateMed(m.id, "frecuencia", e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-500">
                          <option>Cada 6 horas</option>
                          <option>Cada 8 horas</option>
                          <option>Cada 12 horas</option>
                          <option>Cada 24 horas</option>
                          <option>Una vez al día</option>
                          <option>Dos veces al día</option>
                        </select>
                      </FormField>
                    </div>
                    <FormField label="Indicaciones">
                      <input
                        value={m.indicaciones ?? ""}
                        onChange={(e) => updateMed(m.id, "indicaciones", e.target.value)}
                        placeholder="Tomar con alimentos, no mezclar con alcohol…"
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-500"
                      />
                    </FormField>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Vista previa — desktop */}
          <div className="hidden md:block w-75 shrink-0 overflow-y-auto p-5 bg-slate-50">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Vista previa</p>
            <RecetaPreview
              paciente={paciente}
              fecha={today}
              diagnostico={diagnostico}
              medicamentos={meds.filter((m) => m.nombre.trim())}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[12px] font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleGuardar}
              disabled={!canSend}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="save" size={14} />
              Guardar
            </button>
            <button
              onClick={() => canSend && handlePrint(previewData)}
              disabled={!canSend}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="print" size={14} />
              Imprimir PDF
            </button>
            <a
              href={canSend ? waLink : undefined}
              target="_blank"
              rel="noreferrer"
              onClick={canSend ? () => handleGuardar() : (e) => e.preventDefault()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-colors ${
                canSend
                  ? "bg-[#25D366] hover:bg-[#1ebe5a] text-white"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed pointer-events-none"
              }`}
            >
              <Icon name="chat" size={14} />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vista previa de receta ───────────────────────────────────────────────────

function RecetaPreview({
  paciente, fecha, diagnostico, medicamentos,
}: {
  paciente: Paciente;
  fecha: string;
  diagnostico: string;
  medicamentos: Medicamento[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-[11px]">
      {/* Membrete */}
      <div className="px-4 py-3 text-white" style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Icon name="medical_services" size={16} />
          <span className="font-bold text-[14px] tracking-tight">MaraDental</span>
        </div>
        <p className="text-cyan-100 text-[10px]">Dr. García · Odontólogo COP 12345</p>
        <p className="text-cyan-200 text-[10px]">Av. Principal 123 · Tel: +51 987 000 000</p>
      </div>

      <div className="px-4 py-3 flex flex-col gap-2.5">
        {/* Datos */}
        <div className="flex justify-between text-slate-500 gap-2">
          <span className="min-w-0 truncate">Paciente: <span className="font-semibold text-slate-800">{paciente.nombre}</span></span>
          <span className="shrink-0 text-[10px]">{fmtFecha(fecha)}</span>
        </div>

        {diagnostico && (
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-slate-500">Dx: </span>
            <span className="font-medium text-slate-800">{diagnostico}</span>
          </div>
        )}

        {/* Rx */}
        {medicamentos.length > 0 && (
          <div>
            <p className="font-bold text-[18px] text-cyan-700 mb-1.5" style={{ fontFamily: "Georgia, serif" }}>℞</p>
            <div className="flex flex-col gap-2">
              {medicamentos.map((m, i) => (
                <div key={m.id}>
                  <p className="font-semibold text-slate-800">{i + 1}. {m.nombre} <span className="font-normal text-slate-500">{m.dosis}</span></p>
                  <p className="text-slate-500 pl-3">{m.frecuencia}</p>
                  {m.indicaciones && <p className="text-slate-400 pl-3">→ {m.indicaciones}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Firma SVG incrustada */}
        <div className="border-t border-slate-200 pt-3 mt-1 flex flex-col items-center gap-1">
          <svg viewBox="0 0 160 50" xmlns="http://www.w3.org/2000/svg" width="110" height="34" aria-hidden="true">
            <path d="M8,40 C18,18 28,44 38,26 C46,12 54,40 64,24 C73,10 82,36 92,22 C100,10 110,32 122,20 C130,12 138,26 150,18"
              stroke="#1e3a8a" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
            <path d="M8,40 Q16,44 24,42" stroke="#1e3a8a" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
          </svg>
          <div className="w-28 border-t border-slate-300 mb-0.5" />
          <p className="font-semibold text-slate-700 text-[10px]">Dr. García</p>
          <p className="text-[9px] text-slate-400">COP 12345 · Odontólogo</p>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function buildWhatsAppText(r: Receta): string {
  const lineas = [
    `🦷 *RECETA MÉDICA - MaraDental*`,
    `${r.doctor_nombre} | COP 12345`,
    ``,
    `*Paciente:* ${r.paciente_nombre}`,
    `*Fecha:* ${fmtFecha(r.fecha)}`,
    `*Diagnóstico:* ${r.diagnostico_texto || "—"}`,
    ``,
    `*💊 Medicamentos:*`,
    ...r.medicamentos.map((m, i) =>
      [`${i + 1}. *${m.nombre} ${m.dosis}*`, `   ${m.frecuencia}`, m.indicaciones ? `   → ${m.indicaciones}` : ""].filter(Boolean).join("\n")
    ),
  ];
  lineas.push(``, `_MaraDental · Av. Principal 123 · +51 987 000 000_`);
  return lineas.join("\n");
}

function handlePrint(r: Receta) {
  const medsHtml = r.medicamentos
    .map((m, i) => `
      <div class="med">
        <strong>${i + 1}. ${m.nombre} ${m.dosis}</strong><br/>
        <span style="color:#64748b">${m.frecuencia}</span>
        ${m.indicaciones ? `<br/><span style="color:#94a3b8">→ ${m.indicaciones}</span>` : ""}
      </div>
    `)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Receta · ${r.paciente_nombre}</title>
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
    .indications{border-top:1px solid #e2e8f0;padding-top:10px;margin-top:10px;font-size:11px;color:#475569}
    .sig{margin-top:24px;text-align:center}
    .sig svg{display:block;margin:0 auto 4px}
    .sig-line{border-top:1px solid #334155;width:140px;margin:0 auto 4px}
    .sig p{font-size:10px;color:#475569}
    .sig .name{font-weight:700;font-size:11px;color:#1e293b}
    @media print{body{margin:0}}
  </style>
</head>
<body>
  <div class="header">
    <h1>🦷 MaraDental</h1>
    <p>Dr. García · Odontólogo COP 12345</p>
    <p>Av. Principal 123 · Tel: +51 987 000 000</p>
  </div>
  <div class="body">
    <div class="row">
      <span><strong>Paciente:</strong> ${r.paciente_nombre}</span>
      <span><strong>Fecha:</strong> ${fmtFecha(r.fecha)}</span>
    </div>
    ${r.diagnostico_texto ? `<div class="dx"><strong>Diagnóstico:</strong> ${r.diagnostico_texto}</div>` : ""}
    <div class="rx-title">℞</div>
    ${medsHtml}
    <div class="sig">
      <svg viewBox="0 0 160 50" xmlns="http://www.w3.org/2000/svg" width="120" height="38">
        <path d="M8,40 C18,18 28,44 38,26 C46,12 54,40 64,24 C73,10 82,36 92,22 C100,10 110,32 122,20 C130,12 138,26 150,18"
          stroke="#1e3a8a" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
        <path d="M8,40 Q16,44 24,42" stroke="#1e3a8a" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.6"/>
      </svg>
      <div class="sig-line"></div>
      <p class="name">Dr. García</p>
      <p>COP 12345 · Odontólogo</p>
    </div>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=680,height=820");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }
}
