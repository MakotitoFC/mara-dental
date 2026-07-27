"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { crearCasoClinicoAction, agregarConsultaAction } from "../casos.actions";
import { useTipoConsulta } from "@/providers/TipoConsultaProvider";

type Campo = { clave: string; valor: string };

const SUGERENCIAS = [
  "Presión arterial", "Temperatura", "Frecuencia cardíaca", "Frecuencia respiratoria",
  "Peso", "Inspección extraoral", "Inspección intraoral", "Palpación", "Oclusión",
];

// Helper para parsear fechas
const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return d; }
};

export function NuevaConsultaModal({ pacienteId, datosCasos, citas, onClose, onCreated }: {
  pacienteId: string;
  datosCasos?: any;
  citas?: any[];
  onClose: () => void;
  onCreated: (consultaId: string) => void;
}) {
  const { tipos } = useTipoConsulta();
  
  // Ordenar casos: Los que NO son "De Alta" van primero
  const casos = datosCasos?.casos || [];
  const casosActivos = casos.filter((c: any) => c.estado !== "De Alta" && c.estado !== "Alta");
  const casosInactivos = casos.filter((c: any) => c.estado === "De Alta" || c.estado === "Alta");
  const casosOrdenados = [...casosActivos, ...casosInactivos];

  const hoyStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const citasProgramadasHoy = (citas || []).filter(c => c.estado === "programada" && c.fecha.startsWith(hoyStr)).sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  // Estados del formulario
  const hasActiveCase = casosActivos.length > 0;
  const [selectedCasoId, setSelectedCasoId] = useState<string>(hasActiveCase ? casosActivos[0].id : "nuevo");
  const [tituloCaso, setTituloCaso] = useState<string>("");
  const [selectedCitaId, setSelectedCitaId] = useState<string>(citasProgramadasHoy[0]?.id || "");
  const [tipoConsultaId, setTipoConsultaId] = useState<string>(tipos[0]?.id || "");
  
  // Para input datetime-local la fecha debe ser YYYY-MM-DDThh:mm
  const [fechaConsulta, setFechaConsulta] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

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
    if (!tipoConsultaId) { setError("Debes seleccionar un tipo de consulta"); return; }
    if (!fechaConsulta) { setError("La fecha de consulta es obligatoria"); return; }

    setSaving(true); setError("");

    const examen_fisico: Record<string, string> = { tipo: "consulta" };
    campos.filter(c => c.clave.trim()).forEach(c => { examen_fisico[c.clave.trim()] = c.valor; });

    let notaIdToUse = selectedCasoId;

    if (!hasActiveCase || selectedCasoId === "nuevo") {
      const resCaso = await crearCasoClinicoAction(String(pacienteId), motivo.trim(), tituloCaso.trim());
      if ("error" in resCaso) {
        setSaving(false);
        setError(resCaso.error ?? "No se pudo crear el caso");
        return;
      }
      notaIdToUse = resCaso.notaId as string;
    }

    const res = await agregarConsultaAction(notaIdToUse, {
      cita_id: selectedCitaId || undefined,
      tipo_consulta_id: tipoConsultaId,
      fecha_consulta: new Date(fechaConsulta).toISOString(),
      motivo: motivo.trim(),
      observaciones: observaciones.trim() || undefined,
      examen_fisico,
    });

    setSaving(false);
    if ("error" in res) { setError(res.error ?? "Ocurrió un error al agregar la consulta"); return; }
    onCreated(res.consultaId);
  }

  return (
    <ResponsiveSheet
      onClose={onClose}
      maxWidthDesktop="700px"
      header={
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <Icon name="medical_information" size={18} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">Nueva consulta</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Registrar atención clínica</p>
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
            {saving ? "Guardando…" : "Guardar consulta"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        
        {/* Caso Clínico (Nota) - Solo visible si no hay caso activo */}
        {!hasActiveCase && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="w-7 h-7 rounded-lg bg-cyan-50 dark:bg-cyan-900/50 flex items-center justify-center">
                <Icon name="folder_shared" size={15} className="text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Caso Clínico (Nota)</h3>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                Título del caso Clínico*
              </label>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">
                Se creará un caso clínico automáticamente. Ingresa un título.
              </p>
              <input
                type="text"
                value={tituloCaso}
                onChange={(e) => setTituloCaso(e.target.value)}
                placeholder="Título del Caso Clínico (Opcional, Ej: Tratamiento Ortodoncia)"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        {/* Selector de Cita Programada (Opcional) */}
        {citasProgramadasHoy.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Icon name="calendar_month" size={16} className="text-slate-400" />
              Asociar a una Cita Programada (Opcional)
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
              {/* Opción ninguna */}
              <button
                onClick={() => setSelectedCitaId("")}
                className={`shrink-0 snap-start px-4 py-3 border rounded-xl flex items-center gap-2 text-left transition-all ${
                  selectedCitaId === "" 
                    ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-900/20 ring-1 ring-cyan-500" 
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60 hover:opacity-100"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedCitaId === "" ? "border-cyan-600" : "border-slate-300 dark:border-slate-600"
                }`}>
                  {selectedCitaId === "" && <div className="w-2 h-2 rounded-full bg-cyan-600" />}
                </div>
                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Ninguna (Solo consulta)</span>
              </button>

              {/* Lista de citas de HOY */}
              {citasProgramadasHoy.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCitaId(c.id)}
                  className={`shrink-0 snap-start px-4 py-3 border rounded-xl flex items-center gap-3 text-left transition-all ${
                    selectedCitaId === c.id 
                      ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-900/20 ring-1 ring-cyan-500" 
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedCitaId === c.id ? "border-cyan-600" : "border-slate-300 dark:border-slate-600"
                  }`}>
                    {selectedCitaId === c.id && <div className="w-2 h-2 rounded-full bg-cyan-600" />}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{fmtDate(`${c.fecha}T${c.hora_inicio}`)}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-37.5 truncate">{c.tipo_consulta?.tipo_consulta || c.notas || "Consulta programada"}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Campos de metadatos de la consulta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Tipo de consulta *</label>
            <select
              value={tipoConsultaId}
              onChange={e => setTipoConsultaId(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
            >
              {tipos.map(t => (
                <option key={t.id} value={t.id}>{t.tipo_consulta}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Fecha y Hora *</label>
            <input
              type="datetime-local"
              value={fechaConsulta}
              onChange={e => setFechaConsulta(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
            />
          </div>
        </div>

        {/* Motivo y Observaciones */}
        <div className="flex flex-col gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              {selectedCasoId === "nuevo" ? "Motivo principal *" : "Motivo de la visita *"}
            </label>
            <textarea
              rows={2}
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder={selectedCasoId === "nuevo" ? "Ej: Tratamiento de ortodoncia, Dolor en molar inferior..." : "Motivo de revisión de hoy..."}
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Observaciones de consulta</label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Notas de evolución, diagnóstico diferencial, comentarios..."
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 resize-none"
            />
          </div>
        </div>

        {/* Examen físico dinámico */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Examen físico (Hallazgos)</p>

          <div className="flex flex-wrap gap-2">
            {SUGERENCIAS.filter(s => !usadas.has(s.toLowerCase())).map(s => (
              <button key={s} type="button" onClick={() => add(s)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors min-h-9">
                <Icon name="add" size={13} /> {s}
              </button>
            ))}
          </div>

          <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="flex flex-col gap-2 mt-2">
            {campos.map((c, i) => (
              <motion.div key={i} variants={staggerItem} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  value={c.clave}
                  onChange={e => update(i, { clave: e.target.value })}
                  placeholder="Signo / hallazgo"
                  className="sm:w-44 shrink-0 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
                />
                <input
                  value={c.valor}
                  onChange={e => update(i, { valor: e.target.value })}
                  placeholder="Valor / descripción"
                  className="flex-1 min-w-0 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
                />
                <button type="button" onClick={() => remove(i)}
                  className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors self-end sm:self-auto">
                  <Icon name="delete" size={18} />
                </button>
              </motion.div>
            ))}
            <button type="button" onClick={() => add()}
              className="flex items-center gap-1.5 px-3 py-2.5 w-fit text-[13px] font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-xl transition-colors min-h-10">
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
