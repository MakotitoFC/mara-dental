"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { crearNotaClinicaAction } from "../actions";

type Campo = { clave: string; valor: string };

const SUGERENCIAS = [
  "Presión arterial", "Temperatura", "Frecuencia cardíaca", "Frecuencia respiratoria",
  "Peso", "Inspección extraoral", "Inspección intraoral", "Palpación", "Oclusión",
];

export function NuevaConsultaModal({ pacienteId, onClose, onCreated }: {
  pacienteId: number;
  onClose: () => void;
  onCreated: (consultaId: number) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [campos, setCampos] = useState<Campo[]>([{ clave: "", valor: "" }]);
  const [saving, setSaving] = useState(false);
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

  const usadas = new Set(campos.map(c => c.clave.trim().toLowerCase()));

  async function handleGuardar() {
    if (!motivo.trim()) { setError("El motivo es obligatorio"); return; }
    setSaving(true); setError("");

    const examen_fisico: Record<string, string> = { tipo: "consulta" };
    campos.filter(c => c.clave.trim()).forEach(c => { examen_fisico[c.clave.trim()] = c.valor; });

    const res = await crearNotaClinicaAction(String(pacienteId), {
      motivo: motivo.trim(),
      observaciones: observaciones.trim() || undefined,
      examen_fisico,
    });

    setSaving(false);
    if ("error" in res) { setError(res.error ?? "Ocurrió un error"); return; }
    onCreated(res.consultaId);
  }

  return (
    <ResponsiveSheet
      onClose={onClose}
      maxWidthDesktop="640px"
      header={
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <Icon name="medical_information" size={18} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">Nueva consulta</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Motivo y examen físico inicial</p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={saving || !motivo.trim()}
            className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-semibold transition-colors">
            <Icon name="save" size={15} />
            {saving ? "Creando…" : "Crear consulta"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Motivo de consulta *</label>
            <textarea
              rows={2}
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Dolor en molar inferior derecho desde hace 3 días…"
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Observaciones / Anamnesis</label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Antecedentes del cuadro actual, evolución, síntomas asociados, medicación previa…"
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 resize-none"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Examen físico</p>

            <div className="flex flex-wrap gap-2">
              {SUGERENCIAS.filter(s => !usadas.has(s.toLowerCase())).map(s => (
                <button key={s} type="button" onClick={() => add(s)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors min-h-[36px]">
                  <Icon name="add" size={13} /> {s}
                </button>
              ))}
            </div>

            <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="flex flex-col gap-2">
              {campos.map((c, i) => (
                <motion.div key={i} variants={staggerItem} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    value={c.clave}
                    onChange={e => update(i, { clave: e.target.value })}
                    placeholder="Signo / hallazgo"
                    className="sm:w-44 shrink-0 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
                  />
                  <input
                    value={c.valor}
                    onChange={e => update(i, { valor: e.target.value })}
                    placeholder="Valor / descripción"
                    className="flex-1 min-w-0 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
                  />
                  <button type="button" onClick={() => remove(i)}
                    className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors self-end sm:self-auto">
                    <Icon name="delete" size={18} />
                  </button>
                </motion.div>
              ))}
              <button type="button" onClick={() => add()}
                className="flex items-center gap-1.5 px-3 py-2.5 w-fit text-[13px] font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-xl transition-colors min-h-[40px]">
                <Icon name="add" size={16} /> Agregar campo
              </button>
            </motion.div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-xl text-[13px] text-red-600 dark:text-red-400">
              <Icon name="warning" size={15} className="shrink-0" /> {error}
            </div>
          )}
      </div>
    </ResponsiveSheet>
  );
}
