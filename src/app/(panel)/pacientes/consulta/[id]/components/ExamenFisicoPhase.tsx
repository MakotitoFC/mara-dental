"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { updateExamenFisicoAction } from "../actions";

type Campo = { clave: string; valor: string };

const SUGERENCIAS = [
  "Presión arterial", "Temperatura", "Frecuencia cardíaca", "Frecuencia respiratoria",
  "Peso", "Inspección extraoral", "Inspección intraoral", "Palpación", "Oclusión",
];

export function ExamenFisicoPhase({ consultaId, examenFisico }: {
  consultaId: number;
  examenFisico: Record<string, string>;
}) {
  const inicial: Campo[] = Object.entries(examenFisico)
    .filter(([k]) => k !== "tipo")
    .map(([clave, valor]) => ({ clave, valor: String(valor) }));

  const [campos, setCampos] = useState<Campo[]>(inicial.length > 0 ? inicial : [{ clave: "", valor: "" }]);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

  function update(i: number, patch: Partial<Campo>) {
    setCampos(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }
  function add(clave = "") {
    setCampos(prev => [...prev, { clave, valor: "" }]);
  }
  function remove(i: number) {
    setCampos(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setSaving(true); setError(""); setOk(false);
    const limpios = campos.filter(c => c.clave.trim());
    const res = await updateExamenFisicoAction({ consulta_id: consultaId, campos: limpios });
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    setOk(true);
    setTimeout(() => setOk(false), 2500);
  }

  const usadas = new Set(campos.map(c => c.clave.trim().toLowerCase()));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
          <Icon name="stethoscope" size={18} />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-slate-800">Examen físico</h2>
          <p className="text-[12px] text-slate-400">Signos y hallazgos para orientar el diagnóstico</p>
        </div>
      </div>

      {/* Sugerencias rápidas */}
      <div className="flex flex-wrap gap-2">
        {SUGERENCIAS.filter(s => !usadas.has(s.toLowerCase())).map(s => (
          <button key={s} type="button" onClick={() => add(s)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors min-h-[36px]">
            <Icon name="add" size={13} /> {s}
          </button>
        ))}
      </div>

      {/* Campos clave/valor — flex-col en mobile, flex-row en sm+ */}
      <div className="flex flex-col gap-3">
        {campos.map((c, i) => (
          <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              value={c.clave}
              onChange={e => update(i, { clave: e.target.value })}
              placeholder="Signo / hallazgo"
              className="sm:w-44 shrink-0 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
            <input
              value={c.valor}
              onChange={e => update(i, { valor: e.target.value })}
              placeholder="Valor / descripción"
              className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
            <button type="button" onClick={() => remove(i)}
              className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors self-end sm:self-auto">
              <Icon name="delete" size={18} />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => add()}
          className="flex items-center gap-1.5 px-3 py-2.5 w-fit text-[13px] font-medium text-cyan-600 hover:bg-cyan-50 rounded-xl transition-colors min-h-[40px]">
          <Icon name="add" size={16} /> Agregar campo
        </button>
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
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-xl text-[13px] font-semibold transition-colors min-h-[40px]"
        >
          <Icon name="save" size={15} />
          {saving ? "Guardando…" : "Guardar examen físico"}
        </button>
      </div>
    </div>
  );
}
