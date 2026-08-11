"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { TimePicker } from "@/components/ui/TimePicker";
import {
  updateFirmaDigitalAction,
  saveHorarioDiaAction,
  saveHorarioMedicoDiaAction,
  type PerfilProfesional,
  type HorarioRango,
  type DoctorHorarioSede,
} from "../actions";

type DraftRango = { hora_inicio: string; hora_fin: string };

const DIAS = [
  { num: 1, label: "Lunes" },
  { num: 2, label: "Martes" },
  { num: 3, label: "Miércoles" },
  { num: 4, label: "Jueves" },
  { num: 5, label: "Viernes" },
  { num: 6, label: "Sábado" },
  { num: 7, label: "Domingo" },
];

function DiaHorarioRow({ dia, ranges, editing, onUpdate, onRemove, onAdd }: {
  dia: { num: number; label: string };
  ranges: DraftRango[];
  editing: boolean;
  onUpdate: (idx: number, field: keyof DraftRango, value: string) => void;
  onRemove: (idx: number) => void;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{dia.label}</span>
        {!editing && (
          <span className={`text-sm font-medium ${ranges.length > 0 ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
            {ranges.length > 0 ? "Disponible" : "Cerrado"}
          </span>
        )}
      </div>

      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          {ranges.map((r, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <TimePicker
                value={r.hora_inicio}
                onChange={(v) => onUpdate(idx, "hora_inicio", v)}
                className="flex-1"
              />
              <span className="text-slate-400 dark:text-slate-500 text-sm shrink-0">–</span>
              <TimePicker
                value={r.hora_fin}
                onChange={(v) => onUpdate(idx, "hora_fin", v)}
                className="flex-1"
              />
              <button
                onClick={() => onRemove(idx)}
                aria-label="Eliminar rango"
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <Icon name="delete" size={15} />
              </button>
            </div>
          ))}
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg border border-cyan-200 dark:border-cyan-800 text-[12px] font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
          >
            <Icon name="add" size={14} /> Agregar rango
          </button>
        </div>
      ) : ranges.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {ranges.map((r, idx) => (
            <div key={idx} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
              {r.hora_inicio} – {r.hora_fin}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-500">No hay horario definido para este día.</p>
      )}
    </div>
  );
}

const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// Un color por día de la semana (teal → cyan → azul), Lunes a Sábado —
// Domingo no tiene color propio porque casi nunca hay actividad y se pinta
// gris ("Sin actividad") en vez de con una barra.
const DIA_COLOR = ["#0f766e", "#0d9488", "#06b6d4", "#0284c7", "#0369a1", "#22d3ee", "#94a3b8"];

function toMinutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}
function fmtHora(minutos: number) {
  const h = Math.floor(minutos / 60);
  return `${String(h).padStart(2, "0")}:00`;
}
function fmtHoras(horas: number) {
  return horas % 1 === 0 ? `${horas}` : horas.toFixed(1);
}

/** Tres cifras resumen arriba del calendario — días con al menos un rango
 * asignado, horas totales de la semana, y el promedio por día activo. */
function HorarioStats({ horarios }: { horarios: Record<number, HorarioRango[]> }) {
  const diasActivos = DIAS.filter((d) => (horarios[d.num] ?? []).length > 0).length;
  const totalMin = DIAS.flatMap((d) => horarios[d.num] ?? [])
    .reduce((sum, r) => sum + (toMinutos(r.hora_fin) - toMinutos(r.hora_inicio)), 0);
  const horasSemanales = totalMin / 60;
  const promedioDiario = diasActivos > 0 ? horasSemanales / diasActivos : 0;

  const tiles = [
    { label: "Días activos", value: `${diasActivos}/7`, color: "#0891b2" },
    { label: "Horas semanales", value: `${fmtHoras(horasSemanales)}h`, color: "#06b6d4" },
    { label: "Promedio diario", value: `${promedioDiario.toFixed(1)}h/día`, color: "#22d3ee" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700 px-3 py-2.5">
          <span className="w-1 h-8 rounded-full shrink-0" style={{ background: t.color }} />
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate">{t.label}</p>
            <p className="text-[14px] sm:text-[15px] font-bold text-slate-800 dark:text-slate-100">{t.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Vista de solo lectura del horario semanal — una fila por día con una
 * barra de color posicionada/ancha proporcional a su hora dentro de una
 * escala común de la semana (min hora_inicio a max hora_fin de todos los
 * días), y un eje de horas compartido arriba. Los días sin ningún rango se
 * muestran en gris con "Sin actividad" en vez de una barra vacía. */
function HorarioSemanaCalendar({ horarios }: { horarios: Record<number, HorarioRango[]> }) {
  const todosLosRangos = DIAS.flatMap((d) => horarios[d.num] ?? []);
  const inicios = todosLosRangos.map((r) => toMinutos(r.hora_inicio));
  const fines = todosLosRangos.map((r) => toMinutos(r.hora_fin));
  const escalaInicio = inicios.length ? Math.min(...inicios, 7 * 60) : 7 * 60;
  const escalaFin = fines.length ? Math.max(...fines, 21 * 60) : 21 * 60;
  const escalaTotal = Math.max(escalaFin - escalaInicio, 60);

  const horasEje: number[] = [];
  for (let m = Math.ceil(escalaInicio / 120) * 120; m <= escalaFin; m += 120) horasEje.push(m);

  return (
    <div className="flex flex-col gap-2">
      {/* Eje de horas — alineado con el ancho de las barras (mismo offset que la etiqueta del día) */}
      <div className="flex items-center gap-2 pl-12 sm:pl-14">
        <div className="relative flex-1 h-3.5">
          {horasEje.map((m) => (
            <span
              key={m}
              className="absolute -translate-x-1/2 text-[9px] sm:text-[9.5px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap"
              style={{ left: `${((m - escalaInicio) / escalaTotal) * 100}%` }}
            >
              {fmtHora(m)}
            </span>
          ))}
        </div>
      </div>

      {DIAS.map((dia, i) => {
        const rangos = horarios[dia.num] ?? [];
        const horasDia = rangos.reduce((sum, r) => sum + (toMinutos(r.hora_fin) - toMinutos(r.hora_inicio)), 0) / 60;
        const color = DIA_COLOR[i];
        return (
          <div key={dia.num} className="flex items-center gap-2">
            <div className="w-10 sm:w-12 shrink-0 text-right">
              <p className={`text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wide ${rangos.length > 0 ? "text-slate-600 dark:text-slate-300" : "text-slate-300 dark:text-slate-600"}`}>
                {DIAS_CORTO[i]}
              </p>
              <p className="text-[8.5px] sm:text-[9px] text-slate-400 dark:text-slate-500">{rangos.length > 0 ? `${fmtHoras(horasDia)}h` : "Libre"}</p>
            </div>
            <div className="relative flex-1 h-8 rounded-lg bg-slate-50 dark:bg-slate-900/40 overflow-hidden">
              {horasEje.map((m) => (
                <span
                  key={m}
                  className="absolute inset-y-0 w-px bg-slate-200 dark:bg-slate-700/60"
                  style={{ left: `${((m - escalaInicio) / escalaTotal) * 100}%` }}
                />
              ))}
              {rangos.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] text-slate-300 dark:text-slate-600 italic">Sin actividad</span>
                </div>
              ) : (
                rangos.map((r, idx) => {
                  const left = ((toMinutos(r.hora_inicio) - escalaInicio) / escalaTotal) * 100;
                  const width = Math.max(((toMinutos(r.hora_fin) - toMinutos(r.hora_inicio)) / escalaTotal) * 100, 4);
                  return (
                    <div
                      key={idx}
                      className="absolute inset-y-0.5 rounded-md flex items-center justify-between px-2 overflow-hidden"
                      style={{ left: `${left}%`, width: `${width}%`, background: color }}
                      title={`${r.hora_inicio} – ${r.hora_fin}`}
                    >
                      <span className="text-[8.5px] sm:text-[9px] font-bold text-white/90 truncate">{r.hora_inicio}</span>
                      <span className="hidden sm:inline text-[9px] font-semibold text-white/70 shrink-0 px-1">{fmtHoras((toMinutos(r.hora_fin) - toMinutos(r.hora_inicio)) / 60)}h</span>
                      <span className="text-[8.5px] sm:text-[9px] font-bold text-white/90 truncate">{r.hora_fin}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}

      {/* Leyenda */}
      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: DIA_COLOR[2] }} />
            Días activos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
            Día libre
          </span>
        </div>
        <span>{fmtHora(escalaInicio)} — {fmtHora(escalaFin)}</span>
      </div>
    </div>
  );
}

export function ConfiguracionView({ perfil, rol, horarios, horariosSede }: {
  perfil: PerfilProfesional | null;
  rol?: string;
  horarios?: Record<number, HorarioRango[]>;
  horariosSede?: DoctorHorarioSede[];
}) {
  const router = useRouter();
  const toast = useToast();
  const esAsistente = rol === "asistente";

  const [uploadingFirma, setUploadingFirma] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editingHorario, setEditingHorario] = useState(false);
  const [savingHorario, setSavingHorario] = useState(false);
  const [draftHorarios, setDraftHorarios] = useState<Record<number, DraftRango[]>>({});

  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [savingHorarioSede, setSavingHorarioSede] = useState(false);
  const [draftHorariosSede, setDraftHorariosSede] = useState<Record<number, DraftRango[]>>({});

  function startEditHorario() {
    const draft: Record<number, DraftRango[]> = {};
    for (const dia of DIAS) {
      draft[dia.num] = (horarios?.[dia.num] ?? []).map((r) => ({ hora_inicio: r.hora_inicio, hora_fin: r.hora_fin }));
    }
    setDraftHorarios(draft);
    setEditingHorario(true);
  }

  function cancelEditHorario() {
    setEditingHorario(false);
    setDraftHorarios({});
  }

  function addRango(dia: number) {
    setDraftHorarios((prev) => ({ ...prev, [dia]: [...(prev[dia] ?? []), { hora_inicio: "09:00", hora_fin: "13:00" }] }));
  }

  function removeRango(dia: number, idx: number) {
    setDraftHorarios((prev) => ({ ...prev, [dia]: (prev[dia] ?? []).filter((_, i) => i !== idx) }));
  }

  function updateRango(dia: number, idx: number, field: keyof DraftRango, value: string) {
    setDraftHorarios((prev) => ({
      ...prev,
      [dia]: (prev[dia] ?? []).map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    }));
  }

  async function guardarHorario() {
    setSavingHorario(true);
    for (const dia of DIAS) {
      const rangos = (draftHorarios[dia.num] ?? []).filter((r) => r.hora_inicio && r.hora_fin);
      await saveHorarioDiaAction(dia.num, rangos);
    }
    setSavingHorario(false);
    setEditingHorario(false);
    setDraftHorarios({});
    toast.success("Horario actualizado correctamente");
    router.refresh();
  }

  function startEditDoctor(doctor: DoctorHorarioSede) {
    const draft: Record<number, DraftRango[]> = {};
    for (const dia of DIAS) {
      draft[dia.num] = (doctor.horarios[dia.num] ?? []).map((r) => ({ hora_inicio: r.hora_inicio, hora_fin: r.hora_fin }));
    }
    setDraftHorariosSede(draft);
    setEditingDoctorId(doctor.id);
  }

  function cancelEditDoctor() {
    setEditingDoctorId(null);
    setDraftHorariosSede({});
  }

  function addRangoSede(dia: number) {
    setDraftHorariosSede((prev) => ({ ...prev, [dia]: [...(prev[dia] ?? []), { hora_inicio: "09:00", hora_fin: "13:00" }] }));
  }

  function removeRangoSede(dia: number, idx: number) {
    setDraftHorariosSede((prev) => ({ ...prev, [dia]: (prev[dia] ?? []).filter((_, i) => i !== idx) }));
  }

  function updateRangoSede(dia: number, idx: number, field: keyof DraftRango, value: string) {
    setDraftHorariosSede((prev) => ({
      ...prev,
      [dia]: (prev[dia] ?? []).map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    }));
  }

  async function guardarHorarioDoctor() {
    if (!editingDoctorId) return;
    setSavingHorarioSede(true);
    for (const dia of DIAS) {
      const rangos = (draftHorariosSede[dia.num] ?? []).filter((r) => r.hora_inicio && r.hora_fin);
      await saveHorarioMedicoDiaAction(editingDoctorId, dia.num, rangos);
    }
    setSavingHorarioSede(false);
    setEditingDoctorId(null);
    setDraftHorariosSede({});
    toast.success("Horario actualizado correctamente");
    router.refresh();
  }

  async function handleFirmaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFirma(true);
    const fd = new FormData();
    fd.append("firma", file);

    const res = await updateFirmaDigitalAction(fd);
    setUploadingFirma(false);

    if (res?.error) {
      alert("Error al subir la firma: " + res.error);
      return;
    }

    router.refresh();
  }

  const nombreCompleto = perfil ? (esAsistente ? `${perfil.nombre} ${perfil.apellido}` : `Dr. ${perfil.nombre} ${perfil.apellido}`) : "—";

  if (esAsistente) {
    return (
      <div className="p-4 sm:p-6 flex flex-col gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 max-w-xl">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <Icon name="person" size={18} />
            </div>
            <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Información Personal</h2>
          </div>
          <div className="flex flex-col gap-3.5">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Nombre completo</p>
              <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{nombreCompleto}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Email</p>
              <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil?.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Teléfono</p>
              <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil?.telefono ?? "—"}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 px-1">Horarios de los doctores</h2>
          {(horariosSede ?? []).length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-500 px-1">No hay médicos registrados en tu sede.</p>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(horariosSede ?? []).map((doctor) => {
              const isEditing = editingDoctorId === doctor.id;
              return (
                <div key={doctor.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                      <Icon name="calendar_month" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 truncate">Dr. {doctor.nombre} {doctor.apellido}</h2>
                      {doctor.especialidad && <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{doctor.especialidad}</p>}
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => startEditDoctor(doctor)}
                        title="Editar horario"
                        className="shrink-0 w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Icon name="edit" size={15} />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    {DIAS.map((dia) => (
                      <DiaHorarioRow
                        key={dia.num}
                        dia={dia}
                        ranges={isEditing ? (draftHorariosSede[dia.num] ?? []) : (doctor.horarios[dia.num] ?? [])}
                        editing={isEditing}
                        onUpdate={(idx, field, value) => updateRangoSede(dia.num, idx, field, value)}
                        onRemove={(idx) => removeRangoSede(dia.num, idx)}
                        onAdd={() => addRangoSede(dia.num)}
                      />
                    ))}
                  </div>

                  {isEditing && (
                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <button
                        onClick={cancelEditDoctor}
                        disabled={savingHorarioSede}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={guardarHorarioDoctor}
                        disabled={savingHorarioSede}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors"
                      >
                        <Icon name="save" size={15} />
                        {savingHorarioSede ? "Guardando…" : "Guardar"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4">
      <div>
        <h1 className="text-[18px] font-bold text-slate-900 dark:text-slate-100">Configuración</h1>
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5">Perfil y disponibilidad de {nombreCompleto}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <Icon name="person" size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Información Personal</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Datos de perfil profesional</p>
            </div>
          </div>
          <div className="flex flex-col gap-3.5">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Nombre completo</p>
              <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{nombreCompleto}</p>
            </div>
            {perfil?.especialidad && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Especialidad</p>
                <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil.especialidad}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Email profesional</p>
              <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil?.email ?? "—"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Teléfono</p>
                <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil?.telefono ?? "—"}</p>
              </div>
              {perfil?.num_colegiatura && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">N.° Colegiatura</p>
                  <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil.num_colegiatura}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <Icon name="draw" size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Firma Digital</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Para recetas y documentos clínicos</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadingFirma}
            className="w-full rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 h-28 flex flex-col items-center justify-center gap-1 overflow-hidden mb-3 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/30 dark:hover:bg-cyan-900/10 transition-colors disabled:opacity-50"
          >
            {perfil?.firma_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfil.firma_url} alt="Firma digital" className="max-h-full max-w-full object-contain" />
            ) : (
              <>
                <Icon name="upload" size={18} className="text-slate-300 dark:text-slate-600" />
                <p className="text-[12px] text-slate-400 dark:text-slate-500">Sin firma registrada</p>
                <p className="text-[10.5px] text-slate-300 dark:text-slate-600">Haz clic para subir</p>
              </>
            )}
          </button>

          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
            Esta firma se usará en las recetas electrónicas y documentos clínicos emitidos bajo tu perfil profesional.
          </p>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFirmaChange} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingFirma}
            className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <Icon name="upload" size={15} />
            {uploadingFirma ? "Subiendo…" : "Actualizar Firma"}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <Icon name="calendar_month" size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Horario Profesional</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Semana actual · asignado desde base de datos</p>
          </div>
          <button
            onClick={startEditHorario}
            className="shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Icon name="edit" size={14} />
            Editar
          </button>
        </div>

        <div className="mt-4 mb-4">
          <HorarioStats horarios={horarios ?? {}} />
        </div>

        <div>
          <HorarioSemanaCalendar horarios={horarios ?? {}} />
        </div>

        <AnimatePresence>
            {editingHorario && (
              <ResponsiveSheet
                title="Editar horario profesional"
                onClose={cancelEditHorario}
                maxWidthDesktop="560px"
                footer={
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={cancelEditHorario}
                      disabled={savingHorario}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardarHorario}
                      disabled={savingHorario}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors"
                    >
                      <Icon name="save" size={15} />
                      {savingHorario ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                }
              >
                <div className="flex flex-col gap-3">
                  {DIAS.map((dia) => (
                    <DiaHorarioRow
                      key={dia.num}
                      dia={dia}
                      ranges={draftHorarios[dia.num] ?? []}
                      editing
                      onUpdate={(idx, field, value) => updateRango(dia.num, idx, field, value)}
                      onRemove={(idx) => removeRango(dia.num, idx)}
                      onAdd={() => addRango(dia.num)}
                    />
                  ))}
                </div>
              </ResponsiveSheet>
            )}
          </AnimatePresence>
        </div>
    </div>
  );
}
