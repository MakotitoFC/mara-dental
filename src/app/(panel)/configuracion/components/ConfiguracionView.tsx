"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
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
              <input
                type="time"
                value={r.hora_inicio}
                onChange={(e) => onUpdate(idx, "hora_inicio", e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-cyan-500"
              />
              <span className="text-slate-400 dark:text-slate-500 text-sm shrink-0">–</span>
              <input
                type="time"
                value={r.hora_fin}
                onChange={(e) => onUpdate(idx, "hora_fin", e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-cyan-500"
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
  const [draftHorarios, setDraftHorarios] = useState<Record<number, DraftRango[]>>({});

  // Estado de Horarios (Asistente)
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [savingHorarioSede, setSavingHorarioSede] = useState(false);
  const [draftHorariosSede, setDraftHorariosSede] = useState<Record<number, DraftRango[]>>({});

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
    toast.success("Horario profesional guardado");
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
    toast.success("Horario del doctor guardado");
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

  // --- VISTA ADMIN / SUPERADMIN ---
  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6 max-w-6xl mx-auto">
      
      {/* SECCIÓN 1: DATOS PERSONALES */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <Icon name="person" size={20} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Información Personal</h2>
              <p className="text-[12px] text-slate-500">Tus datos registrados en la tabla de personal</p>
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
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Icon name="edit" size={15} /> Editar Datos
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                <Icon name="storefront" size={20} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">
                  {esSuperAdmin ? "Gestión de Sedes de la Clínica" : "Información de la Sede Asignada"}
                </h2>
                <p className="text-[12px] text-slate-500">Configura la información institucional, contacto y horarios de atención</p>
              </div>
            </div>

            {activeSede && (
              <button
                onClick={() => startEditSede(activeSede)}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm shrink-0 self-start sm:self-auto"
              >
                <Icon name="edit" size={15} /> Editar Sede
              </button>
            )}
          </div>

          {/* Selector de sedes para SUPERADMIN */}
          {esSuperAdmin && sedes && sedes.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-400 uppercase mr-2">Sedes:</span>
              {sedes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSedeId(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
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

              {/* Columna Horario de Atención de la Sede */}
              <div className="lg:col-span-2 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Icon name="schedule" size={16} /> Horarios de Atención de la Clínica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DIAS.map((dia) => {
                    const rawH = (activeSede.horario_atencion as any) ?? {};
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
              <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Firma Digital</h2>
            </div>

            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 h-28 flex items-center justify-center overflow-hidden mb-3">
              {perfil?.firma_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={perfil.firma_url} alt="Firma digital" className="max-h-full max-w-full object-contain" />
              ) : (
                <p className="text-[12px] text-slate-400 dark:text-slate-500">Sin firma registrada</p>
              )}
            </div>

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
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Horario asignado desde la base de datos</p>
              </div>
              {!editingHorario && (
                <button
                  onClick={startEditHorario}
                  title="Editar horario"
                  className="shrink-0 w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Icon name="edit" size={15} />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-4">
              {DIAS.map((dia) => (
                <DiaHorarioRow
                  key={dia.num}
                  dia={dia}
                  ranges={editingHorario ? (draftHorarios[dia.num] ?? []) : (horarios?.[dia.num] ?? [])}
                  editing={editingHorario}
                  onUpdate={(idx, field, value) => updateRango(dia.num, idx, field, value)}
                  onRemove={(idx) => removeRango(dia.num, idx)}
                  onAdd={() => addRango(dia.num)}
                />
              ))}
            </div>

            {editingHorario && (
              <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
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
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: EDITAR INFORMACIÓN PERSONAL */}
      {isEditingPersonal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Editar Datos Personales</h3>
              <button
                onClick={() => setIsEditingPersonal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePersonal} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Nombre</label>
                  <input
                    type="text"
                    required
                    value={personalForm.nombre}
                    onChange={(e) => setPersonalForm(f => ({ ...f, nombre: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Apellido</label>
                  <input
                    type="text"
                    required
                    value={personalForm.apellido}
                    onChange={(e) => setPersonalForm(f => ({ ...f, apellido: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  required
                  value={personalForm.email}
                  onChange={(e) => setPersonalForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Teléfono</label>
                  <input
                    type="text"
                    value={personalForm.telefono}
                    onChange={(e) => setPersonalForm(f => ({ ...f, telefono: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={personalForm.fecha_nacimiento}
                    onChange={(e) => setPersonalForm(f => ({ ...f, fecha_nacimiento: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsEditingPersonal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPersonal}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingPersonal ? "Guardando…" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR INFORMACIÓN DE SEDE */}
      {isEditingSede && activeSede && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-6 shadow-xl flex flex-col gap-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Editar Datos de la Sede ({activeSede.nombre_clinica || `ID ${activeSede.id}`})
              </h3>
              <button
                onClick={() => setIsEditingSede(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSede} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Nombre de la Clínica</label>
                  <input
                    type="text"
                    required
                    value={sedeForm.nombre_clinica}
                    onChange={(e) => setSedeForm(f => ({ ...f, nombre_clinica: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={sedeForm.telefono}
                    onChange={(e) => setSedeForm(f => ({ ...f, telefono: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Email Institucional</label>
                  <input
                    type="email"
                    value={sedeForm.email_contacto}
                    onChange={(e) => setSedeForm(f => ({ ...f, email_contacto: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">WhatsApp / Business Phone</label>
                  <input
                    type="text"
                    value={sedeForm.business_phone}
                    onChange={(e) => setSedeForm(f => ({ ...f, business_phone: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Dirección</label>
                  <input
                    type="text"
                    value={sedeForm.direccion}
                    onChange={(e) => setSedeForm(f => ({ ...f, direccion: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Telegram Bot Username / Token</label>
                  <input
                    type="text"
                    value={sedeForm.telegram_bot}
                    onChange={(e) => setSedeForm(f => ({ ...f, telegram_bot: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Editor de Horario de Atención de la Sede */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Horario de Atención por Día</label>
                <div className="max-h-60 overflow-y-auto flex flex-col gap-2 pr-1">
                  {DIAS.map((dia) => (
                    <DiaHorarioRow
                      key={dia.num}
                      dia={dia}
                      ranges={sedeForm.horario_atencion[dia.num] ?? []}
                      editing={true}
                      onUpdate={(idx, field, value) => {
                        setSedeForm(f => ({
                          ...f,
                          horario_atencion: {
                            ...f.horario_atencion,
                            [dia.num]: (f.horario_atencion[dia.num] ?? []).map((r, i) => i === idx ? { ...r, [field]: value } : r)
                          }
                        }));
                      }}
                      onRemove={(idx) => {
                        setSedeForm(f => ({
                          ...f,
                          horario_atencion: {
                            ...f.horario_atencion,
                            [dia.num]: (f.horario_atencion[dia.num] ?? []).filter((_, i) => i !== idx)
                          }
                        }));
                      }}
                      onAdd={() => {
                        setSedeForm(f => ({
                          ...f,
                          horario_atencion: {
                            ...f.horario_atencion,
                            [dia.num]: [...(f.horario_atencion[dia.num] ?? []), { hora_inicio: "08:00", hora_fin: "20:00" }]
                          }
                        }));
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsEditingSede(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSede}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingSede ? "Guardando Sede…" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

