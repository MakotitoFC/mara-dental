"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { updateAnamnesisAction } from "../actions";

export function AnamnesisPhase({ consultaId, motivo: motivoInit, observaciones: obsInit }: {
  consultaId: number;
  motivo: string;
  observaciones: string | null;
}) {
  const [motivo, setMotivo] = useState(motivoInit || "");
  const [observaciones, setObs] = useState(obsInit || "");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!motivo.trim()) { setError("El motivo es obligatorio"); return; }
    setSaving(true); setError(""); setOk(false);
    const res = await updateAnamnesisAction({ consulta_id: consultaId, motivo, observaciones });
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    setOk(true);
    setTimeout(() => setOk(false), 2500);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 shrink-0">
          <Icon name="medical_information" size={18} />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-slate-800">Anamnesis</h2>
          <p className="text-[12px] text-slate-400">Motivo de la consulta y observaciones del paciente</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-semibold text-slate-700">Motivo de consulta *</label>
        <textarea
          rows={2}
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          placeholder="Ej: Dolor en molar inferior derecho desde hace 3 días…"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 resize-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-semibold text-slate-700">Observaciones / Anamnesis</label>
        <textarea
          rows={4}
          value={observaciones}
          onChange={e => setObs(e.target.value)}
          placeholder="Antecedentes del cuadro actual, evolución, síntomas asociados, medicación previa…"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 resize-none"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-600">
          <Icon name="warning" size={15} className="shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {ok && (
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-600">
            <Icon name="check_circle" size={15} /> Guardado
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !motivo.trim()}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-semibold transition-colors min-h-[40px]"
        >
          <Icon name="save" size={15} />
          {saving ? "Guardando…" : "Guardar anamnesis"}
        </button>
      </div>
    </div>
  );
}
