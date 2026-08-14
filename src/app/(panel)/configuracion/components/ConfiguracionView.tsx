"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { TimePicker } from "@/components/ui/TimePicker";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import {
  updateFirmaDigitalAction,
  saveHorarioDiaAction,
  saveHorarioMedicoDiaAction,
  updatePerfilPersonalAction,
  updateSedeAction,
  updateLogoSedeAction,
  type PerfilProfesional,
  type HorarioRango,
  type DoctorHorarioSede,
  type SedeData,
  type Turno,
} from "../actions";

type DraftRango = { hora_inicio: string; hora_fin: string };
// Rangos de horario de un MÉDICO llevan turno (mañana/tarde/noche) — a
// diferencia de los rangos de horario de atención de la SEDE (clínica),
// que no tienen ese concepto y siguen usando DraftRango tal cual.
type DraftRangoMedico = DraftRango & { turno: Turno };

const TURNOS: { value: Turno; label: string; icon: string }[] = [
  { value: "mañana", label: "Mañana", icon: "light_mode" },
  { value: "tarde", label: "Tarde", icon: "schedule" },
  { value: "noche", label: "Noche", icon: "dark_mode" },
];
const TURNO_COLOR: Record<Turno, string> = {
  mañana: "bg-amber-400",
  tarde: "bg-orange-500",
  noche: "bg-indigo-600",
};
const TURNO_LABEL: Record<Turno, string> = { mañana: "Mañana", tarde: "Tarde", noche: "Noche" };

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
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{dia.label}</span>
        {!editing && (
          <span className={`text-sm font-medium ${ranges.length > 0 ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
            {ranges.length > 0 ? "Abierto" : "Cerrado"}
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
            <div key={idx} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300">
              {r.hora_inicio} – {r.hora_fin}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-slate-400 dark:text-slate-500">Sin horario de atención configurado.</p>
      )}
    </div>
  );
}

/** Compacto — un punto por turno (mañana/tarde/noche), relleno si el día
 * tiene un rango configurado en ese turno. Reemplaza el check/punto único
 * de antes, que solo indicaba "hay algo ese día" sin decir qué turnos. */
function TurnoDots({ rangos }: { rangos: { turno: Turno; hora_inicio: string; hora_fin: string }[] }) {
  const activos = new Set(rangos.map((r) => r.turno));
  const title = rangos.length > 0
    ? rangos.map((r) => `${TURNO_LABEL[r.turno]}: ${r.hora_inicio}–${r.hora_fin}`).join(" · ")
    : "No disponible";
  return (
    <div className="inline-flex items-center gap-1" title={title}>
      {TURNOS.map((t) => (
        <span
          key={t.value}
          className={`w-2 h-2 rounded-full ${activos.has(t.value) ? TURNO_COLOR[t.value] : "bg-slate-200 dark:bg-slate-700"}`}
        />
      ))}
    </div>
  );
}

/** Igual que DiaHorarioRow pero para horarios de MÉDICO — cada rango lleva
 * además un selector de turno (mañana/tarde/noche), que es lo que distingue
 * la tabla `horarios_medico` de `sede.horario_atencion` (que no tiene
 * turno y sigue usando el DiaHorarioRow original, sin tocar). */
function DiaHorarioMedicoRow({ dia, ranges, editing, onUpdate, onRemove, onAdd }: {
  dia: { num: number; label: string };
  ranges: DraftRangoMedico[];
  editing: boolean;
  onUpdate: (idx: number, field: keyof DraftRangoMedico, value: string) => void;
  onRemove: (idx: number) => void;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[13px] md:text-sm font-semibold text-slate-800 dark:text-slate-100">{dia.label}</span>
        {!editing && (
          <span className={`text-[13px] md:text-sm font-medium ${ranges.length > 0 ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
            {ranges.length > 0 ? "Abierto" : "Cerrado"}
          </span>
        )}
      </div>

      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          {ranges.map((r, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <Select
                value={r.turno}
                onChange={(v) => onUpdate(idx, "turno", v)}
                options={TURNOS.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))}
                className="w-full sm:w-32 shrink-0"
              />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <TimePicker
                  value={r.hora_inicio}
                  onChange={(v) => onUpdate(idx, "hora_inicio", v)}
                  className="flex-1"
                />
                <span className="text-slate-400 dark:text-slate-500 text-[13px] shrink-0">–</span>
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
            </div>
          ))}
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg border border-cyan-200 dark:border-cyan-800 text-[11px] md:text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
          >
            <Icon name="add" size={14} /> Agregar turno
          </button>
        </div>
      ) : ranges.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {ranges.map((r, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[13px] md:text-sm text-slate-700 dark:text-slate-300">
              <span className={`w-2 h-2 rounded-full shrink-0 ${TURNO_COLOR[r.turno]}`} />
              <span className="font-semibold shrink-0">{TURNO_LABEL[r.turno]}</span>
              <span className="text-slate-400 dark:text-slate-500">·</span>
              <span>{r.hora_inicio} – {r.hora_fin}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[13px] md:text-sm text-slate-400 dark:text-slate-500">Sin turnos configurados.</p>
      )}
    </div>
  );
}

const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// Un color por día de la semana (teal → cyan → azul), Lunes a Sábado —
// Domingo no tiene color propio porque casi nunca hay actividad y se pinta
// gris ("Sin actividad") en vez de con una barra.
const DIA_COLOR = ["#0f766e", "#0d9488", "#06b6d4", "#0284c7", "#0369a1", "#22d3ee", "#94a3b8"];

function initialsDoctor(nombre: string, apellido: string) {
  return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
}

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

export function ConfiguracionView({ perfil, rol, horarios, horariosSede, sede, sedes }: {
  perfil: PerfilProfesional | null;
  rol?: string;
  horarios?: Record<number, HorarioRango[]>;
  horariosSede?: DoctorHorarioSede[];
  sede?: SedeData | null;
  sedes?: SedeData[];
}) {
  const router = useRouter();
  const toast = useToast();
  const esAsistente = rol === "asistente";
  const esAdmin = rol === "admin";
  const esSuperAdmin = rol === "superadmin";
  const esDoctor = rol === "doctor";
  const esAdminOrSuperadmin = esAdmin || esSuperAdmin;

  // Estado de edición de Perfil Personal
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    nombre: perfil?.nombre ?? "",
    apellido: perfil?.apellido ?? "",
    email: perfil?.email ?? "",
    fecha_nacimiento: perfil?.fecha_nacimiento ?? "",
    telefono: perfil?.telefono ?? "",
  });

  // Estado de Firma Digital
  const [uploadingFirma, setUploadingFirma] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Estado de Horarios (Doctor)
  const [editingHorario, setEditingHorario] = useState(false);
  const [savingHorario, setSavingHorario] = useState(false);
  const [draftHorarios, setDraftHorarios] = useState<Record<number, DraftRangoMedico[]>>({});

  // Estado de Horarios (Asistente)
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [savingHorarioSede, setSavingHorarioSede] = useState(false);
  const [draftHorariosSede, setDraftHorariosSede] = useState<Record<number, DraftRangoMedico[]>>({});
  const [horarioSearch, setHorarioSearch] = useState("");

  // Estado para Sedes (Admin / Superadmin)
  const [selectedSedeId, setSelectedSedeId] = useState<number>(() => {
    if (sede) return sede.id;
    if (sedes && sedes.length > 0) return sedes[0].id;
    return 0;
  });

  const activeSede = esSuperAdmin
    ? (sedes?.find(s => s.id === selectedSedeId) ?? sedes?.[0] ?? null)
    : (sede ?? null);

  const [isEditingSede, setIsEditingSede] = useState(false);
  const [savingSede, setSavingSede] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const [sedeForm, setSedeForm] = useState<{
    nombre_clinica: string;
    telefono: string;
    email_contacto: string;
    direccion: string;
    business_phone: string;
    telegram_bot: string;
    horario_atencion: Record<number, DraftRango[]>;
  }>({
    nombre_clinica: activeSede?.nombre_clinica ?? "",
    telefono: activeSede?.telefono ?? "",
    email_contacto: activeSede?.email_contacto ?? "",
    direccion: activeSede?.direccion ?? "",
    business_phone: activeSede?.business_phone ?? "",
    telegram_bot: activeSede?.telegram_bot ?? "",
    horario_atencion: (activeSede?.horario_atencion as any) ?? { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] },
  });

  const startEditSede = (targetSede: SedeData) => {
    const rawHorario = (targetSede.horario_atencion as any) ?? {};
    const horarioDraft: Record<number, DraftRango[]> = {};
    for (const dia of DIAS) {
      horarioDraft[dia.num] = (rawHorario[dia.num] ?? []).map((r: any) => ({
        hora_inicio: r.hora_inicio ?? "08:00",
        hora_fin: r.hora_fin ?? "20:00"
      }));
    }
    setSedeForm({
      nombre_clinica: targetSede.nombre_clinica ?? "",
      telefono: targetSede.telefono ?? "",
      email_contacto: targetSede.email_contacto ?? "",
      direccion: targetSede.direccion ?? "",
      business_phone: targetSede.business_phone ?? "",
      telegram_bot: targetSede.telegram_bot ?? "",
      horario_atencion: horarioDraft,
    });
    setIsEditingSede(true);
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPersonal(true);
    const res = await updatePerfilPersonalAction(personalForm);
    setSavingPersonal(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Información personal actualizada correctamente");
      setIsEditingPersonal(false);
      router.refresh();
    }
  };

  const handleSaveSede = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSede) return;
    setSavingSede(true);
    const res = await updateSedeAction(activeSede.id, sedeForm);
    setSavingSede(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Datos de la sede guardados correctamente");
      setIsEditingSede(false);
      router.refresh();
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSede) return;

    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("logo", file);

    const res = await updateLogoSedeAction(activeSede.id, fd);
    setUploadingLogo(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Logo de la sede actualizado correctamente");
      router.refresh();
    }
  };

  function startEditHorario() {
    const draft: Record<number, DraftRangoMedico[]> = {};
    for (const dia of DIAS) {
      draft[dia.num] = (horarios?.[dia.num] ?? []).map((r) => ({ hora_inicio: r.hora_inicio, hora_fin: r.hora_fin, turno: r.turno }));
    }
    setDraftHorarios(draft);
    setEditingHorario(true);
  }

  function cancelEditHorario() {
    setEditingHorario(false);
    setDraftHorarios({});
  }

  function addRango(dia: number) {
    setDraftHorarios((prev) => ({ ...prev, [dia]: [...(prev[dia] ?? []), { hora_inicio: "09:00", hora_fin: "13:00", turno: "mañana" }] }));
  }

  function removeRango(dia: number, idx: number) {
    setDraftHorarios((prev) => ({ ...prev, [dia]: (prev[dia] ?? []).filter((_, i) => i !== idx) }));
  }

  function updateRango(dia: number, idx: number, field: keyof DraftRangoMedico, value: string) {
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
    const draft: Record<number, DraftRangoMedico[]> = {};
    for (const dia of DIAS) {
      draft[dia.num] = (doctor.horarios[dia.num] ?? []).map((r) => ({ hora_inicio: r.hora_inicio, hora_fin: r.hora_fin, turno: r.turno }));
    }
    setDraftHorariosSede(draft);
    setEditingDoctorId(doctor.id);
  }

  function cancelEditDoctor() {
    setEditingDoctorId(null);
    setDraftHorariosSede({});
  }

  function addRangoSede(dia: number) {
    setDraftHorariosSede((prev) => ({ ...prev, [dia]: [...(prev[dia] ?? []), { hora_inicio: "09:00", hora_fin: "13:00", turno: "mañana" }] }));
  }

  function removeRangoSede(dia: number, idx: number) {
    setDraftHorariosSede((prev) => ({ ...prev, [dia]: (prev[dia] ?? []).filter((_, i) => i !== idx) }));
  }

  function updateRangoSede(dia: number, idx: number, field: keyof DraftRangoMedico, value: string) {
    setDraftHorariosSede((prev) => ({
      ...prev,
      [dia]: (prev[dia] ?? []).map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    }));
  }

  function addSedeHorario(dia: number) {
    setSedeForm((f) => ({ ...f, horario_atencion: { ...f.horario_atencion, [dia]: [...(f.horario_atencion[dia] ?? []), { hora_inicio: "09:00", hora_fin: "18:00" }] } }));
  }
  function removeSedeHorario(dia: number, idx: number) {
    setSedeForm((f) => ({ ...f, horario_atencion: { ...f.horario_atencion, [dia]: (f.horario_atencion[dia] ?? []).filter((_, i) => i !== idx) } }));
  }
  function updateSedeHorario(dia: number, idx: number, field: keyof DraftRango, value: string) {
    setSedeForm((f) => ({
      ...f,
      horario_atencion: { ...f.horario_atencion, [dia]: (f.horario_atencion[dia] ?? []).map((r, i) => (i === idx ? { ...r, [field]: value } : r)) },
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
      toast.error("Error al subir la firma: " + res.error);
      return;
    }

    toast.success("Firma digital actualizada");
    router.refresh();
  }

  const nombreCompleto = perfil ? (esDoctor ? `Dr. ${perfil.nombre} ${perfil.apellido}` : `${perfil.nombre} ${perfil.apellido}`) : "—";

  // --- VISTA ASISTENTE ---
  if (esAsistente) {
    const horariosLista = horariosSede ?? [];
    const q = horarioSearch.trim().toLowerCase();
    const horariosFiltrados = q
      ? horariosLista.filter((d) => `${d.nombre} ${d.apellido} ${d.especialidad ?? ""}`.toLowerCase().includes(q))
      : horariosLista;
    const totalTurnosSemana = horariosLista.reduce(
      (sum, d) => sum + DIAS.reduce((s, dia) => s + (d.horarios[dia.num] ?? []).length, 0),
      0
    );
    const editingDoctor = horariosLista.find((d) => d.id === editingDoctorId) ?? null;

    return (
      <div className="p-4 sm:p-6 flex flex-col gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 max-w-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                <Icon name="person" size={18} />
              </div>
              <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Información Personal</h2>
            </div>
            <button
              onClick={() => setIsEditingPersonal(true)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1"
            >
              <Icon name="edit" size={14} /> Editar
            </button>
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

        {/* Horarios de doctores — tabla buscable en tablet/desktop, tarjetas
            en mobile. Editar (en cualquiera de las dos) abre un modal aparte
            que reutiliza el mismo editor por día que ya existía inline. */}
        <div className="flex flex-col gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[14px] sm:text-[15px] font-bold text-slate-800 dark:text-slate-100">Horarios de doctores</h2>
                <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5">Configura la disponibilidad semanal de cada médico</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {horariosLista.length} doctores
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                  {totalTurnosSemana} turnos/sem.
                </span>
              </div>
            </div>

            <div className="relative mt-3">
              <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={horarioSearch}
                onChange={(e) => setHorarioSearch(e.target.value)}
                placeholder="Buscar doctor o especialidad..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-[13px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {horariosLista.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-500 px-1">No hay médicos registrados en tu sede.</p>
          ) : horariosFiltrados.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-500 px-1">Ningún doctor coincide con la búsqueda.</p>
          ) : (
            <>
              {/* Tablet / Desktop — tabla */}
              <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse min-w-175">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        <th className="px-4 sm:px-5 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Doctor</th>
                        {DIAS_CORTO.map((d) => (
                          <th key={d} className="px-2 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-center">{d}</th>
                        ))}
                        <th className="px-4 sm:px-5 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {horariosFiltrados.map((doctor, i) => (
                        <tr key={doctor.id} className="group border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-4 sm:px-5 py-3 align-top">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10.5px] font-bold text-white shrink-0" style={{ background: DIA_COLOR[i % DIA_COLOR.length] }}>
                                {initialsDoctor(doctor.nombre, doctor.apellido)}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100 truncate">Dr. {doctor.nombre} {doctor.apellido}</p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{doctor.especialidad ?? "General"}</p>
                              </div>
                            </div>
                          </td>
                          {DIAS.map((dia) => (
                            <td key={dia.num} className="px-2 py-3 align-top text-center">
                              <TurnoDots rangos={doctor.horarios[dia.num] ?? []} />
                            </td>
                          ))}
                          <td className="px-4 sm:px-5 py-3 align-top text-right">
                            <button
                              onClick={() => startEditDoctor(doctor)}
                              title="Editar horario"
                              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 inline-flex w-8 h-8 rounded-lg items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                            >
                              <Icon name="edit" size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                    {TURNOS.map((t) => (
                      <span key={t.value} className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${TURNO_COLOR[t.value]}`} />
                        {t.label}
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                      Sin turno
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Pasa el cursor sobre un doctor para editar</p>
                </div>
              </div>

              {/* Mobile — tarjetas */}
              <div className="md:hidden flex flex-col gap-3">
                {horariosFiltrados.map((doctor, i) => {
                  const diasActivos = DIAS.filter((dia) => (doctor.horarios[dia.num] ?? []).length > 0);
                  return (
                    <div key={doctor.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: DIA_COLOR[i % DIA_COLOR.length] }}>
                          {initialsDoctor(doctor.nombre, doctor.apellido)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">Dr. {doctor.nombre} {doctor.apellido}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{doctor.especialidad ?? "General"} · {diasActivos.length} días activos</p>
                        </div>
                        <button
                          onClick={() => startEditDoctor(doctor)}
                          title="Editar horario"
                          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                        >
                          <Icon name="edit" size={15} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 mt-3">
                        {DIAS.map((dia, di) => {
                          const rangos = doctor.horarios[dia.num] ?? [];
                          const activo = rangos.length > 0;
                          return (
                            <div
                              key={dia.num}
                              className={`flex-1 flex flex-col items-center justify-center gap-1 h-9 rounded-lg ${activo ? "bg-slate-50 dark:bg-slate-900/40" : "bg-slate-100 dark:bg-slate-700"}`}
                            >
                              <span className={`text-[10px] font-bold ${activo ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
                                {DIAS_CORTO[di][0]}
                              </span>
                              <TurnoDots rangos={rangos} />
                            </div>
                          );
                        })}
                      </div>

                      {diasActivos.length > 0 && (
                        <div className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                          {diasActivos.map((dia) => (
                            <div key={dia.num} className="flex items-center justify-between gap-2 text-[12px]">
                              <span className="text-slate-500 dark:text-slate-400 shrink-0">{dia.label}</span>
                              <div className="flex flex-wrap justify-end gap-x-2 gap-y-0.5">
                                {(doctor.horarios[dia.num] ?? []).map((r, idx) => (
                                  <span key={idx} className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                    <span className={`w-1.5 h-1.5 rounded-full ${TURNO_COLOR[r.turno]}`} />
                                    {r.hora_inicio}–{r.hora_fin}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <AnimatePresence>
          {editingDoctor && (
            <ResponsiveSheet
              onClose={cancelEditDoctor}
              title={`Horario — Dr. ${editingDoctor.nombre} ${editingDoctor.apellido}`}
              footer={
                <div className="flex items-center justify-end gap-2">
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
              }
            >
              <div className="flex flex-col gap-3">
                {DIAS.map((dia) => (
                  <DiaHorarioMedicoRow
                    key={dia.num}
                    dia={dia}
                    ranges={draftHorariosSede[dia.num] ?? []}
                    editing
                    onUpdate={(idx, field, value) => updateRangoSede(dia.num, idx, field, value)}
                    onRemove={(idx) => removeRangoSede(dia.num, idx)}
                    onAdd={() => addRangoSede(dia.num)}
                  />
                ))}
              </div>
            </ResponsiveSheet>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isEditingPersonal && (
            <ResponsiveSheet
              onClose={() => setIsEditingPersonal(false)}
              title="Editar información personal"
              footer={
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingPersonal(false)}
                    disabled={savingPersonal}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    form="form-personal-asistente"
                    disabled={savingPersonal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors"
                  >
                    <Icon name="save" size={15} />
                    {savingPersonal ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              }
            >
              <form id="form-personal-asistente" onSubmit={handleSavePersonal} className="flex flex-col gap-3.5 py-1">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nombre</span>
                  <input
                    value={personalForm.nombre}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, nombre: e.target.value }))}
                    required
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Apellido</span>
                  <input
                    value={personalForm.apellido}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, apellido: e.target.value }))}
                    required
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email</span>
                  <input
                    type="email"
                    value={personalForm.email}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Teléfono</span>
                  <input
                    value={personalForm.telefono}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, telefono: e.target.value }))}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Fecha de nacimiento</span>
                  <DatePicker
                    value={personalForm.fecha_nacimiento}
                    onChange={(v) => setPersonalForm((f) => ({ ...f, fecha_nacimiento: v }))}
                  />
                </label>
              </form>
            </ResponsiveSheet>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // --- VISTA ADMIN / SUPERADMIN ---
  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6 max-w-6xl mx-auto">
      
      {/* SECCIÓN 1: DATOS PERSONALES */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <Icon name="person" size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Información Personal</h2>
              <p className="hidden sm:block text-[12px] text-slate-500">Tus datos registrados en la tabla de personal</p>
            </div>
          </div>
          <button
            onClick={() => {
              setPersonalForm({
                nombre: perfil?.nombre ?? "",
                apellido: perfil?.apellido ?? "",
                email: perfil?.email ?? "",
                fecha_nacimiento: perfil?.fecha_nacimiento ?? "",
                telefono: perfil?.telefono ?? "",
              });
              setIsEditingPersonal(true);
            }}
            className="shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Icon name="edit" size={14} /> Editar Datos
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Nombre completo</p>
            <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100 mt-0.5">{nombreCompleto}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Email</p>
            <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil?.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Teléfono</p>
            <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil?.telefono ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Fecha de Nacimiento</p>
            <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil?.fecha_nacimiento ?? "—"}</p>
          </div>
          {esDoctor && perfil?.num_colegiatura && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">N.° Colegiatura</p>
              <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil.num_colegiatura}</p>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 2: INFORMACIÓN DE SEDE(S) PARA ADMIN / SUPERADMIN */}
      {esAdminOrSuperadmin && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                <Icon name="description" size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">
                  {esSuperAdmin ? "Gestión de Sedes de la Clínica" : "Información de la Sede Asignada"}
                </h2>
                <p className="hidden sm:block text-[12px] text-slate-500">Configura la información institucional, contacto y horarios de atención</p>
              </div>
            </div>

            {activeSede && (
              <button
                onClick={() => startEditSede(activeSede)}
                className="shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Icon name="edit" size={15} /> Editar Sede
              </button>
            )}
          </div>

          {/* Selector de sedes para SUPERADMIN */}
          {esSuperAdmin && sedes && sedes.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-400 uppercase mr-2">Sedes:</span>
              {sedes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSedeId(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    activeSede?.id === s.id
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {s.nombre_clinica || `Sede #${s.id}`}
                </button>
              ))}
            </div>
          )}

          {activeSede ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Columna Logo + Contacto */}
              <div className="flex flex-col gap-4">
                {/* Logo Box */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/40 flex flex-col items-center gap-3">
                  <div className="w-32 h-32 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 flex items-center justify-center p-2 overflow-hidden shadow-inner relative">
                    {activeSede.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={activeSede.logo_url} alt="Logo Sede" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <Icon name="photo" size={28} />
                        <span className="text-[11px]">Sin Logo</span>
                      </div>
                    )}
                  </div>
                  <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  <button
                    onClick={() => logoFileRef.current?.click()}
                    disabled={uploadingLogo}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    <Icon name="upload" size={14} />
                    {uploadingLogo ? "Subiendo Logo…" : "Cambiar Logo"}
                  </button>
                </div>

                {/* Parámetros de la Sede */}
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Nombre de la Clínica</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{activeSede.nombre_clinica || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Teléfono de Contacto</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{activeSede.telefono || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Email Institucional</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{activeSede.email_contacto || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Dirección</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{activeSede.direccion || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Business WhatsApp / Phone</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{activeSede.business_phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Telegram Bot</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{activeSede.telegram_bot || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Columna Horario de Atención de la Sede — mismo estilo de
                  card que "Horarios de doctores" (vista asistente): card de
                  header con título+subtítulo+badges, y el contenido en su
                  propia card blanca (no un simple label suelto). */}
              {(() => {
                const rawH = (activeSede.horario_atencion as any) ?? {};
                const diasAbiertos = DIAS.filter((d) => (rawH[d.num] ?? []).length > 0).length;
                const totalMin = DIAS.flatMap((d) => rawH[d.num] ?? [])
                  .reduce((sum: number, r: any) => sum + (toMinutos(r.hora_fin) - toMinutos(r.hora_inicio)), 0);
                const horasSemanales = totalMin / 60;
                return (
                  <div className="lg:col-span-2 flex flex-col gap-3">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 className="text-[14px] sm:text-[15px] font-bold text-slate-800 dark:text-slate-100">Horarios de Atención de la Clínica</h2>
                          <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5">Días y horas en que la sede atiende al público</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {diasAbiertos}/7 días abiertos
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                            {fmtHoras(horasSemanales)}h/sem.
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {DIAS.map((dia) => {
                          const ranges: DraftRango[] = (rawH[dia.num] ?? []).map((r: any) => ({
                            hora_inicio: r.hora_inicio ?? "",
                            hora_fin: r.hora_fin ?? ""
                          }));
                          return (
                            <DiaHorarioRow
                              key={dia.num}
                              dia={dia}
                              ranges={ranges}
                              editing={false}
                              onUpdate={() => {}}
                              onRemove={() => {}}
                              onAdd={() => {}}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          ) : (
            <p className="text-sm text-slate-500 py-8 text-center">No hay información de la sede disponible.</p>
          )}
        </div>
      )}

      {/* SECCIÓN 3: FIRMA DIGITAL & HORARIO PROFESIONAL (SOLO PARA DOCTOR) */}
      {esDoctor && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
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

            {perfil?.especialidad && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Especialidad</p>
                <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil.especialidad}</p>
              </div>
            )}

            <div className="mb-3">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Email profesional</p>
              <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil?.email ?? "—"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
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
                      <DiaHorarioMedicoRow
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
      )}

      {/* Modal "Editar Datos" — el botón de la Sección 1 ya seteaba
          isEditingPersonal, pero antes no existía ningún ResponsiveSheet acá
          que lo consumiera (bug reportado en la auditoría: el botón no abría
          nada para admin/superadmin/doctor). */}
      <AnimatePresence>
        {isEditingPersonal && (
          <ResponsiveSheet
            onClose={() => setIsEditingPersonal(false)}
            title="Editar información personal"
            footer={
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingPersonal(false)}
                  disabled={savingPersonal}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="form-personal-admin"
                  disabled={savingPersonal}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors"
                >
                  <Icon name="save" size={15} />
                  {savingPersonal ? "Guardando…" : "Guardar"}
                </button>
              </div>
            }
          >
            <form id="form-personal-admin" onSubmit={handleSavePersonal} className="flex flex-col gap-3.5 py-1">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nombre</span>
                <input
                  value={personalForm.nombre}
                  onChange={(e) => setPersonalForm((f) => ({ ...f, nombre: e.target.value }))}
                  required
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Apellido</span>
                <input
                  value={personalForm.apellido}
                  onChange={(e) => setPersonalForm((f) => ({ ...f, apellido: e.target.value }))}
                  required
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email</span>
                <input
                  type="email"
                  value={personalForm.email}
                  onChange={(e) => setPersonalForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Teléfono</span>
                <input
                  value={personalForm.telefono}
                  onChange={(e) => setPersonalForm((f) => ({ ...f, telefono: e.target.value }))}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Fecha de nacimiento</span>
                <DatePicker
                  value={personalForm.fecha_nacimiento}
                  onChange={(v) => setPersonalForm((f) => ({ ...f, fecha_nacimiento: v }))}
                />
              </label>
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>

      {/* Modal "Editar Sede" — mismo bug: el botón seteaba isEditingSede pero
          no había ResponsiveSheet que lo consumiera. */}
      <AnimatePresence>
        {isEditingSede && activeSede && (
          <ResponsiveSheet
            onClose={() => setIsEditingSede(false)}
            title="Editar información de la sede"
            maxWidthDesktop="640px"
            footer={
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingSede(false)}
                  disabled={savingSede}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="form-sede"
                  disabled={savingSede}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors"
                >
                  <Icon name="save" size={15} />
                  {savingSede ? "Guardando…" : "Guardar"}
                </button>
              </div>
            }
          >
            <form id="form-sede" onSubmit={handleSaveSede} className="flex flex-col gap-3.5 py-1">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nombre de la clínica</span>
                <input
                  value={sedeForm.nombre_clinica}
                  onChange={(e) => setSedeForm((f) => ({ ...f, nombre_clinica: e.target.value }))}
                  required
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Teléfono</span>
                  <input
                    value={sedeForm.telefono}
                    onChange={(e) => setSedeForm((f) => ({ ...f, telefono: e.target.value }))}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email institucional</span>
                  <input
                    type="email"
                    value={sedeForm.email_contacto}
                    onChange={(e) => setSedeForm((f) => ({ ...f, email_contacto: e.target.value }))}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Dirección</span>
                <input
                  value={sedeForm.direccion}
                  onChange={(e) => setSedeForm((f) => ({ ...f, direccion: e.target.value }))}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Business WhatsApp / Phone</span>
                  <input
                    value={sedeForm.business_phone}
                    onChange={(e) => setSedeForm((f) => ({ ...f, business_phone: e.target.value }))}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Telegram Bot</span>
                  <input
                    value={sedeForm.telegram_bot}
                    onChange={(e) => setSedeForm((f) => ({ ...f, telegram_bot: e.target.value }))}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </label>
              </div>
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Horario de atención</span>
                {DIAS.map((dia) => (
                  <DiaHorarioRow
                    key={dia.num}
                    dia={dia}
                    ranges={sedeForm.horario_atencion[dia.num] ?? []}
                    editing
                    onUpdate={(idx, field, value) => updateSedeHorario(dia.num, idx, field, value)}
                    onRemove={(idx) => removeSedeHorario(dia.num, idx)}
                    onAdd={() => addSedeHorario(dia.num)}
                  />
                ))}
              </div>
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>
    </div>
  );
}

