"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SmartPopover } from "@/components/ui/SmartPopover";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { Select } from "@/components/ui/Select";
import { TextInput, Textarea } from "@/components/ui/TextInput";
import type { Cita, EstadoCita } from "@/types/agenda";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { searchPatients, createCitaAction, updateCitaAction, createPacienteRapidoAction } from "../actions";
import { getContextoClinicoPacienteAction, type ContextoClinicoPaciente } from "../../pacientes/[id]/consulta.actions";
import { estadoCitaVars, ESTADO_CITA_LABEL } from "@/lib/colors";
import { ESTADO_ICON, calcHoraFin, fmtHora12, fmtFechaLarga, type DoctorLite } from "./agendaUtils";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";

export type PatientLite = { id: string; nombre: string; apellido: string; dni?: string };

export type CitaFormState =
  | { mode: "create"; date: string; hour?: string; preloadedPatient?: PatientLite | null; preTratamientoId?: string; doctorId?: string; doctorNombre?: string; doctores?: DoctorLite[] }
  | { mode: "edit"; cita: Cita };

const CREATE_ESTADOS: EstadoCita[] = ["programada"];
const EDIT_ESTADOS: EstadoCita[] = ["programada", "hecho", "cancelada"];

export function CitaFormSheet({
  state, onClose, onSuccess, role,
}: {
  state: CitaFormState;
  onClose: () => void;
  onSuccess: () => void;
  role?: string;
}) {
  const isEdit = state.mode === "edit";
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientLite | null>(
    state.mode === "create" ? (state.preloadedPatient ?? null) : null
  );

  const doctoresDisponibles = !isEdit ? state.doctores ?? [] : [];
  const necesitaElegirDoctor = !isEdit && !state.doctorId && doctoresDisponibles.length > 0;
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(!isEdit ? state.doctorId ?? "" : "");

  const [fecha, setFecha] = useState(isEdit ? state.cita.fecha : state.date);
  const [horaInicio, setHoraInicio] = useState(isEdit ? state.cita.hora_inicio : (state.hour ?? "09:00"));
  const [horaFin, setHoraFin] = useState(
    isEdit ? state.cita.hora_fin : calcHoraFin(state.hour ?? "09:00", 30)
  );
  const [tipoConsultaId, setTipoConsultaId] = useState<string>(
    isEdit ? state.cita.tipo_consulta_id : ""
  );
  const [estado, setEstado] = useState<EstadoCita>(isEdit ? state.cita.estado : "programada");
  const [notas, setNotas] = useState(isEdit ? (state.cita.notas ?? "") : "");

  // Contexto clínico — solo para el asistente al crear una cita: identifica
  // la fase pendiente del tratamiento activo del paciente (o el tratamiento
  // o diagnóstico si no hay fases registradas) para que el doctor sepa qué
  // procedimiento le toca. Nunca inventa contenido, solo lee lo ya registrado.
  const mostrarContextoClinico = !isEdit && role === "asistente";
  const [contexto, setContexto] = useState<ContextoClinicoPaciente | null>(null);
  const [cargandoContexto, setCargandoContexto] = useState(false);
  const [contextoAplicado, setContextoAplicado] = useState(false);

  useEffect(() => {
    if (!mostrarContextoClinico || !selectedPatient) { setContexto(null); setContextoAplicado(false); return; }
    let cancelado = false;
    setCargandoContexto(true);
    getContextoClinicoPacienteAction(selectedPatient.id).then((res) => {
      if (cancelado) return;
      setCargandoContexto(false);
      if (!res) console.log("[ContextoClinico] Sin datos para este paciente (sin historial registrado, o RLS bloqueando la cadena diagnostico/tratamiento/plan_tratamiento para el rol asistente — a confirmar si persiste).");
      setContexto(res);
      if (res) {
        const etiqueta = res.tipo === "fase" ? "Próxima fase de tratamiento" : res.tipo === "tratamiento" ? "Tratamiento en curso" : "Diagnóstico activo (sin tratamiento registrado aún)";
        setNotas((prev) => {
          if (prev.trim()) return prev;
          setContextoAplicado(true);
          return `${etiqueta}: ${res.texto}`;
        });
      }
    });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient?.id, mostrarContextoClinico]);

  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newPatientData, setNewPatientData] = useState({ nombre: "", apellido: "", dni: "", fecha_nacimiento: "", telefono: "" });
  const [creatingPatient, setCreatingPatient] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const estadoOptions = isEdit ? EDIT_ESTADOS : CREATE_ESTADOS;

  const { getVars, tipos } = useTipoConsultaVars();

  useEffect(() => {
    if (isEdit) return;
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [isEdit]);
  
  useEffect(() => {
    if (!isEdit && tipos.length > 0 && !tipoConsultaId) {
      setTipoConsultaId(tipos[0].id);
    }
  }, [isEdit, tipos, tipoConsultaId]);

  useEffect(() => {
    if (isEdit || selectedPatient) { setPatients([]); return; }
    if (!query || query.trim().length < 2) { setPatients([]); return; }
    const id = setTimeout(() => { searchPatients(query).then(setPatients); }, 300);
    return () => clearTimeout(id);
  }, [query, selectedPatient, isEdit]);

  async function handleSave(force = false) {
    setError("");
    if (!isEdit && !selectedPatient) { setError("Selecciona un paciente."); return; }
    if (necesitaElegirDoctor && !selectedDoctorId) { setError("Selecciona un médico."); return; }
    setSaving(true);

    if (isEdit) {
      const res = await updateCitaAction(state.cita.id, {
        fecha, hora_inicio: horaInicio, hora_fin: horaFin,
        tipo_consulta_id: tipoConsultaId!, estado: estado!, notas: notas || "",
      });
      setSaving(false);
      if (res && "error" in res) { setError(res.error as string); return; }
    } else {
      const res = await createCitaAction({
        paciente_id: selectedPatient!.id,
        fecha, hora_inicio: horaInicio, hora_fin: horaFin,
        tipo_consulta_id: tipoConsultaId!, estado: estado!, notas: notas || "",
        tratamiento_id: state.mode === "create" ? state.preTratamientoId : undefined,
        doctor_id: state.doctorId || selectedDoctorId || undefined,
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

  async function handleCreatePatient(e: React.FormEvent) {
    e.preventDefault();
    if (!newPatientData.nombre || !newPatientData.apellido || !newPatientData.dni || !newPatientData.fecha_nacimiento || !newPatientData.telefono) {
      setError("Todos los campos del paciente son requeridos.");
      return;
    }
    setCreatingPatient(true);
    setError("");
    const res = await createPacienteRapidoAction(newPatientData);
    setCreatingPatient(false);
    
    if (res.error) {
      setError(res.error);
    } else if (res.paciente) {
      const p = res.paciente as any;
      setSelectedPatient({
        id: p.id,
        nombre: p.nombre,
        apellido: p.apellido,
        dni: p.dni
      });
      setShowNewPatientForm(false);
      setNewPatientData({ nombre: "", apellido: "", dni: "", fecha_nacimiento: "", telefono: "" });
    }
  }

  return (
    <ResponsiveSheet
      onClose={onClose}
      title={title}
      snapPoints={[0.7, 1]}
      footer={
        <div className="flex flex-col gap-2">
          {error && (
 <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 flex flex-col gap-2">
 <p className="text-[11.5px] text-red-600 font-medium flex items-start gap-1.5">
                <Icon name="warning" size={13} className="shrink-0 mt-0.5" /> {error}
              </p>
              {needsConfirm && (
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
 className="self-end bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-md text-[11.5px] font-semibold transition-colors"
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
 className="flex-1 h-11 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
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
        {!isEdit && state.doctorNombre && (
 <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
 <Icon name="stethoscope" size={14} className="text-slate-400 shrink-0"/>
 <span className="text-[12px] text-slate-500">Cita para <span className="font-semibold text-slate-700">Dr. {state.doctorNombre}</span></span>
          </div>
        )}
        {necesitaElegirDoctor && (
          <div className="flex flex-col gap-2">
 <label className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">Médico</label>
            <Select
              value={selectedDoctorId}
              onChange={setSelectedDoctorId}
              options={doctoresDisponibles.map(d => ({ value: d.id, label: `Dr. ${d.apellido}` }))}
              placeholder="Selecciona un médico…"
            />
          </div>
        )}
        {/* Paciente */}
        {isEdit ? (
 <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
 <Icon name="person" size={16} className="text-slate-400 shrink-0"/>
 <span className="text-[13px] font-medium text-slate-700 truncate">{state.cita.paciente_nombre}</span>
          </div>
        ) : (
          <div className="relative">
            {selectedPatient ? (
 <div className="flex items-center justify-between border border-cyan-400 bg-cyan-50 rounded-lg px-3 py-2.5">
 <span className="text-[13px] font-semibold text-cyan-900 truncate">{selectedPatient.nombre} {selectedPatient.apellido}</span>
 <button onClick={() => { setSelectedPatient(null); setQuery(""); }} className="text-cyan-500 hover:text-cyan-700 shrink-0">
                  <Icon name="close" size={14} />
                </button>
              </div>
            ) : (
              <>
                <SmartPopover
                  open={patients.length > 0}
                  onClose={() => setPatients([])}
                  placement="bottom-start"
                  matchWidth
                  renderTrigger={(ref) => (
                    <div ref={ref} className="flex gap-2 mb-2">
                      <div className="relative flex-1">
                        <TextInput
                          ref={inputRef}
                          value={query}
                          onChange={e => setQuery(e.target.value)}
                          placeholder="Buscar por nombre o DNI…"
                          className="pr-8"
                        />
 <Icon name="search" size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                      </div>
                      <button
                        onClick={() => setShowNewPatientForm(true)}
 className="flex items-center gap-1.5 px-3 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 text-[12px] font-semibold hover:bg-cyan-100 transition-colors shrink-0"
                      >
                        <Icon name="person_add" size={15} /> Nuevo
                      </button>
                    </div>
                  )}
                >
 <div className="bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto no-scrollbar">
                    {patients.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPatient(p); setPatients([]); setQuery(""); }}
 className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
 <p className="text-[12.5px] font-medium text-slate-800">{p.nombre} {p.apellido}</p>
 {p.dni && <p className="text-[10.5px] text-slate-400">DNI: {p.dni}</p>}
                      </button>
                    ))}
                  </div>
                </SmartPopover>

                {showNewPatientForm && (
 <div className="mb-4 p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
 <p className="text-[12.5px] font-bold text-slate-800">Creación rápida de paciente</p>
 <button onClick={() => setShowNewPatientForm(false)} className="text-slate-400 hover:text-slate-600">
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                    <form onSubmit={handleCreatePatient} className="flex flex-col gap-2.5">
                      <div className="flex gap-2">
                        <TextInput
                          placeholder="Nombre(s) *"
                          value={newPatientData.nombre}
                          onChange={e => setNewPatientData({...newPatientData, nombre: e.target.value})}
                          className="flex-1 w-0 text-[12.5px]"
                        />
                        <TextInput
                          placeholder="Apellidos *"
                          value={newPatientData.apellido}
                          onChange={e => setNewPatientData({...newPatientData, apellido: e.target.value})}
                          className="flex-1 w-0 text-[12.5px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <TextInput
                          placeholder="DNI *"
                          maxLength={15}
                          value={newPatientData.dni}
                          onChange={e => setNewPatientData({...newPatientData, dni: e.target.value})}
                          className="flex-1 w-0 text-[12.5px]"
                        />
                        <TextInput
                          placeholder="Teléfono *"
                          value={newPatientData.telefono}
                          onChange={e => setNewPatientData({...newPatientData, telefono: e.target.value})}
                          className="flex-1 w-0 text-[12.5px]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11.5px] text-slate-500 whitespace-nowrap">Nacimiento *</label>
                        <DatePicker
                          value={newPatientData.fecha_nacimiento}
                          onChange={(v) => setNewPatientData({...newPatientData, fecha_nacimiento: v})}
                          placeholder="Fecha de nacimiento"
                          className="flex-1 w-0"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={creatingPatient}
                        className="mt-1 w-full h-8 flex items-center justify-center rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[12.5px] font-bold transition-colors disabled:opacity-50"
                      >
                        {creatingPatient ? "Guardando..." : "Crear y seleccionar"}
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {mostrarContextoClinico && selectedPatient && (cargandoContexto || contexto) && (
 <div className="flex items-start gap-2.5 rounded-lg bg-cyan-50 border border-cyan-100 px-3 py-2.5">
 <Icon name="history_edu" size={15} className="text-cyan-600 shrink-0 mt-0.5"/>
            <div className="min-w-0">
 <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wide">
                Contexto clínico
              </p>
              {cargandoContexto ? (
 <p className="text-[12px] text-cyan-700">Buscando tratamiento activo…</p>
              ) : (
                <>
 <p className="text-[12px] text-cyan-900 leading-snug">
                    {contexto!.tipo === "fase" ? "Próxima fase: " : contexto!.tipo === "tratamiento" ? "Tratamiento en curso: " : "Diagnóstico activo: "}
                    <span className="font-semibold">{contexto!.texto}</span>
                  </p>
                  {contextoAplicado && (
 <p className="text-[10.5px] text-cyan-600 mt-0.5">Se agregó a las notas — puedes editarlo.</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Fecha / hora inicio (la hora de fin se calcula automáticamente) */}
        <div className="flex flex-col gap-2">
 <label className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">Fecha y hora</label>
          <div className="flex gap-2 flex-wrap">
            <DatePicker value={fecha} onChange={setFecha} className="flex-1 min-w-[160px]" />
            <TimePicker
              value={horaInicio}
              onChange={(v) => { setHoraInicio(v); setHoraFin(calcHoraFin(v, 30)); }}
              min="07:00"
              max="20:00"
              className="w-32"
            />
          </div>
          {fecha && horaInicio && (
 <p className="flex items-center gap-1.5 text-[11.5px] text-cyan-700 bg-cyan-50 rounded-lg px-2.5 py-1.5">
              <Icon name="event_available" size={13} className="shrink-0" />
              {fmtFechaLarga(fecha)} · {fmtHora12(horaInicio)} – {fmtHora12(horaFin)}
            </p>
          )}
        </div>

        {/* Tipo de consulta */}
        <div className="flex flex-col gap-2">
 <label className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">Tipo de consulta</label>
          <div className="flex gap-2 flex-wrap">
            {tipos.map(t => {
              const v = getVars(t.id);
              const active = tipoConsultaId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipoConsultaId(t.id)}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-[11.5px] font-semibold border-2 transition-all ${active ? "shadow-sm" : "opacity-60 hover:opacity-90"}`}
                  style={{ background: v.bg, color: v.text, borderColor: active ? v.solid : "transparent" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: v.solid }} />
                  {t.tipo_consulta}
                </button>
              );
            })}
          </div>
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-2">
 <label className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">Estado</label>
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
 <label className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">Notas internas</label>
          <Textarea
            rows={3}
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Observaciones previas al tratamiento…"
            className="resize-none"
          />
        </div>
      </div>
    </ResponsiveSheet>
  );
}
