"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import type { Cita, EstadoCita } from "@/types/agenda";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { searchPatients, createCitaAction, updateCitaAction } from "../actions";
import type { TipoCita } from "@/lib/colors";
import { TIPO_CITA_LABEL, TIPO_CITA_ORDER, resolveTipoCita, tipoCitaVars, estadoCitaVars, ESTADO_CITA_LABEL } from "@/lib/colors";
import { ESTADO_ICON, calcHoraFin, timeToMin, fmtHora12, fmtFechaLarga } from "./agendaUtils";

export type PatientLite = { id: string; nombre: string; apellido: string; dni?: string };

export type CitaFormState =
  | { mode: "create"; date: string; hour?: string; preloadedPatient?: PatientLite | null }
  | { mode: "edit"; cita: Cita };

const DURACIONES = ["30", "45", "60", "90", "120"];
const CREATE_ESTADOS: EstadoCita[] = ["programada", "confirmada"];
const EDIT_ESTADOS: EstadoCita[] = ["programada", "confirmada", "atendida", "cancelada"];

export function CitaFormSheet({
  state, onClose, onSuccess,
}: {
  state: CitaFormState;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = state.mode === "edit";
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientLite | null>(
    state.mode === "create" ? (state.preloadedPatient ?? null) : null
  );

  const initialDur = isEdit
    ? String(timeToMin(state.cita.hora_fin) - timeToMin(state.cita.hora_inicio))
    : "30";

  const [fecha, setFecha] = useState(isEdit ? state.cita.fecha : state.date);
  const [horaInicio, setHoraInicio] = useState(isEdit ? state.cita.hora_inicio : (state.hour ?? "09:00"));
  const [duracion, setDuracion] = useState(initialDur);
  const [tipoConsulta, setTipoConsulta] = useState<TipoCita>(
    isEdit ? resolveTipoCita(state.cita.tipo_consulta) : "revision"
  );
  const [estado, setEstado] = useState<EstadoCita>(isEdit ? state.cita.estado : "programada");
  const [notas, setNotas] = useState(isEdit ? (state.cita.notas ?? "") : "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const estadoOptions = isEdit ? EDIT_ESTADOS : CREATE_ESTADOS;
  const duracionOptions = DURACIONES.includes(initialDur) ? DURACIONES : [initialDur, ...DURACIONES];

  useEffect(() => {
    if (isEdit) return;
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [isEdit]);

  useEffect(() => {
    if (isEdit || selectedPatient) { setPatients([]); return; }
    if (!query || query.trim().length < 2) { setPatients([]); return; }
    const id = setTimeout(() => { searchPatients(query).then(setPatients); }, 300);
    return () => clearTimeout(id);
  }, [query, selectedPatient, isEdit]);

  async function handleSave(force = false) {
    setError("");
    if (!isEdit && !selectedPatient) { setError("Selecciona un paciente."); return; }
    setSaving(true);
    const horaFin = calcHoraFin(horaInicio, Number(duracion));

    if (isEdit) {
      const res = await updateCitaAction(state.cita.id, {
        fecha, hora_inicio: horaInicio, hora_fin: horaFin,
        tipo_consulta: tipoConsulta, estado, notas: notas || undefined,
      });
      setSaving(false);
      if (res && "error" in res) { setError(res.error as string); return; }
    } else {
      const res = await createCitaAction({
        paciente_id: Number(selectedPatient!.id),
        fecha, hora_inicio: horaInicio, hora_fin: horaFin,
        tipo_consulta: tipoConsulta, estado, notas,
      }, force);
      setSaving(false);
      if (res && "error" in res) {
        setError(res.error as string);
        setNeedsConfirm(!!(res as any).requiresConfirmation);
        return;
      }
    }
    onSuccess();
  }

  const title = isEdit ? state.cita.paciente_nombre : "Nueva cita";

  return (
    <ResponsiveSheet
      onClose={onClose}
      title={title}
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 px-3 py-2 flex flex-col gap-2">
              <p className="text-[11.5px] text-red-600 dark:text-red-400 font-medium flex items-start gap-1.5">
                <Icon name="warning" size={13} className="shrink-0 mt-0.5" /> {error}
              </p>
              {needsConfirm && (
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="self-end bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-md text-[11.5px] font-semibold transition-colors"
                >
                  Confirmar excepción
                </button>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors"
            >
              <Icon name="save" size={15} />
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-1 pb-2">
        {/* Paciente */}
        {isEdit ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5">
            <Icon name="person" size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300 truncate">{state.cita.paciente_nombre}</span>
          </div>
        ) : (
          <div className="relative">
            {selectedPatient ? (
              <div className="flex items-center justify-between border border-cyan-400 dark:border-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg px-3 py-2.5">
                <span className="text-[13px] font-semibold text-cyan-900 dark:text-cyan-300 truncate">{selectedPatient.nombre} {selectedPatient.apellido}</span>
                <button onClick={() => { setSelectedPatient(null); setQuery(""); }} className="text-cyan-500 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 shrink-0">
                  <Icon name="close" size={14} />
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar paciente por nombre o DNI…"
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-[13px] pr-8 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
                />
                <Icon name="search" size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                {patients.length > 0 && (
                  <div className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                    {patients.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPatient(p); setPatients([]); setQuery(""); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0"
                      >
                        <p className="text-[12.5px] font-medium text-slate-800 dark:text-slate-100">{p.nombre} {p.apellido}</p>
                        {p.dni && <p className="text-[10.5px] text-slate-400 dark:text-slate-500">DNI: {p.dni}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Fecha / hora / duración */}
        <div className="flex flex-col gap-2">
          <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Fecha y hora</label>
          <div className="flex gap-2 flex-wrap">
            <DatePicker value={fecha} onChange={setFecha} className="flex-1 min-w-[130px]" />
            <TimePicker value={horaInicio} onChange={setHoraInicio} min="07:00" max="20:00" className="w-28" />
            <Select
              value={duracion}
              onChange={setDuracion}
              options={duracionOptions.map(d => ({ value: d, label: `${d} min` }))}
              className="w-28"
            />
          </div>
          {fecha && horaInicio && (
            <p className="flex items-center gap-1.5 text-[11.5px] text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg px-2.5 py-1.5">
              <Icon name="event_available" size={13} className="shrink-0" />
              {fmtFechaLarga(fecha)} · {fmtHora12(horaInicio)} – {fmtHora12(calcHoraFin(horaInicio, Number(duracion)))}
            </p>
          )}
        </div>

        {/* Tipo de consulta */}
        <div className="flex flex-col gap-2">
          <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Tipo de consulta</label>
          <div className="flex gap-2 flex-wrap">
            {TIPO_CITA_ORDER.map(t => {
              const v = tipoCitaVars(t);
              const active = tipoConsulta === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipoConsulta(t)}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-[11.5px] font-semibold border-2 transition-all ${active ? "shadow-sm" : "opacity-60 hover:opacity-90"}`}
                  style={{ background: v.bg, color: v.text, borderColor: active ? v.solid : "transparent" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: v.solid }} />
                  {TIPO_CITA_LABEL[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-2">
          <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Estado</label>
          <div className="flex gap-2 flex-wrap">
            {estadoOptions.map(e => {
              const v = estadoCitaVars(e);
              const active = estado === e;
              return (
                <button
                  key={e}
                  onClick={() => setEstado(e)}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-[11.5px] font-semibold border-2 transition-all ${active ? "shadow-sm" : "opacity-60 hover:opacity-90"}`}
                  style={{ background: v.bg, color: v.text, borderColor: active ? v.solid : "transparent" }}
                >
                  <Icon name={ESTADO_ICON[e]} size={13} />
                  {ESTADO_CITA_LABEL[e]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-2">
          <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Notas internas</label>
          <textarea
            rows={3}
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Observaciones previas al tratamiento…"
            className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 resize-none"
          />
        </div>
      </div>
    </ResponsiveSheet>
  );
}
