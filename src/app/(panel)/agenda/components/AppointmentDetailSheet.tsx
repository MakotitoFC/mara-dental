"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SmartPopover } from "@/components/ui/SmartPopover";
import type { Cita, EstadoCita } from "@/types/agenda";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { deleteCitaAction, updateCitaAction } from "../actions";
import { estadoCitaVars, ESTADO_CITA_LABEL } from "@/lib/colors";
import { useTipoConsultaVars } from "@/providers/TipoConsultaProvider";
import { ESTADO_ICON, ESTADO_ORDER, initials } from "./agendaUtils";

export function AppointmentDetailSheet({
  cita, onClose, onEdit, onChanged, role,
}: {
  cita: Cita;
  onClose: () => void;
  onEdit: (c: Cita) => void;
  onChanged: () => void;
  role?: string;
}) {
  const isAsistente = role === "asistente";
  const router = useRouter();
  const [statusOpen, setStatusOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const { getVars } = useTipoConsultaVars();
  const tipoVars = getVars(cita.tipo_consulta_id);
  const estVars = estadoCitaVars(cita.estado);

  const dateLabel = new Date(cita.fecha + "T12:00:00").toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  async function handleStatusChange(estado: EstadoCita) {
    setUpdating(true);
    await updateCitaAction(cita.id, { estado });
    setUpdating(false);
    setStatusOpen(false);
    onChanged();
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteCitaAction(cita.id);
    setDeleting(false);
    onChanged();
    onClose();
  }

  function handleIniciarConsulta() {
    router.push(`/pacientes/${cita.paciente_id}?tab=timeline&nueva=1&citaId=${cita.id}`);
  }

  function goToPatient() {
    router.push(`/pacientes/${cita.paciente_id}`);
  }

  return (
    <ResponsiveSheet
      onClose={onClose}
      title="Detalle de la cita"
      footer={
        <div className="flex flex-col gap-2">
          {error && (
 <p className="text-[11.5px] text-red-600 font-medium flex items-center gap-1.5">
              <Icon name="warning" size={13} /> {error}
            </p>
          )}
          {!confirmDelete ? (
            <>
              {!isAsistente && (
                <button
                  onClick={handleIniciarConsulta}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[13px] font-semibold transition-colors"
                >
                  <Icon name="stethoscope" size={16} />
                  Iniciar consulta
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(cita)}
 className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-[13px] font-semibold transition-colors"
                >
                  <Icon name="edit" size={15} /> Editar
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
 className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-[13px] font-semibold transition-colors"
                >
                  <Icon name="delete" size={15} /> Eliminar
                </button>
              </div>
            </>
          ) : (
 <div className="rounded-xl border border-red-200 p-3 flex flex-col gap-2.5">
 <p className="text-[12.5px] font-semibold text-red-700 text-center">
                ¿Eliminar esta cita? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
 className="flex-1 h-9 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 h-9 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[12px] font-semibold transition-colors"
                >
                  {deleting ? "Eliminando…" : "Sí, eliminar"}
                </button>
              </div>
            </div>
          )}
        </div>
      }
    >
      {/* Paciente */}
      <div className="flex items-center gap-3 pt-2 pb-4">
        <button
          onClick={goToPatient}
          title="Ver ficha del paciente"
          className="w-12 h-12 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[16px] font-bold shrink-0 hover:bg-cyan-700 transition-colors"
        >
          {initials(cita.paciente_nombre)}
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={goToPatient} className="text-left w-full">
 <p className="text-[16px] font-bold text-slate-900 truncate hover:text-cyan-700 transition-colors">{cita.paciente_nombre}</p>
          </button>
 <p className="text-[12px] text-slate-500 capitalize truncate">{dateLabel}</p>
        </div>
      </div>

      {/* Estado */}
      <div className="mb-4">
        <SmartPopover
          open={statusOpen}
          onClose={() => setStatusOpen(false)}
          placement="bottom-start"
          renderTrigger={(ref) => (
            <button
              ref={ref}
              onClick={() => setStatusOpen(o => !o)}
              disabled={updating}
              className="flex items-center gap-2 px-3 h-9 rounded-full text-[12px] font-semibold border transition-colors disabled:opacity-60"
              style={{ background: estVars.bg, color: estVars.text, borderColor: estVars.solid }}
            >
              {updating
                ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                : <Icon name={ESTADO_ICON[cita.estado]} size={14} />}
              {ESTADO_CITA_LABEL[cita.estado]}
              <Icon name="expand_more" size={14} className="opacity-60" />
            </button>
          )}
        >
 <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden min-w-[170px]">
            {ESTADO_ORDER.map(e => {
              const v = estadoCitaVars(e);
              return (
                <button
                  key={e}
                  onClick={() => handleStatusChange(e)}
 className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors"
                >
                  <Icon name={ESTADO_ICON[e]} size={14} style={{ color: v.solid } as React.CSSProperties} />
 <span className="text-[12.5px] font-medium text-slate-700">{ESTADO_CITA_LABEL[e]}</span>
                </button>
              );
            })}
          </div>
        </SmartPopover>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-3 pb-2">
 <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          <div className="flex items-center gap-3 px-3.5 py-3">
 <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
 <Icon name="schedule" size={15} className="text-slate-400"/>
            </div>
            <div className="min-w-0">
 <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">Horario</p>
 <p className="text-[13.5px] font-bold text-slate-900">{cita.hora_inicio} – {cita.hora_fin}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3.5 py-3">
 <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
 <Icon name="event" size={15} className="text-slate-400"/>
            </div>
            <div className="min-w-0">
 <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">Tipo de cita</p>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2 py-0.5 mt-0.5 rounded-full" style={{ background: tipoVars.bg, color: tipoVars.text }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tipoVars.solid }} />
                {tipoVars.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3.5 py-3">
 <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
 <Icon name="stethoscope" size={15} className="text-slate-400"/>
            </div>
            <div className="min-w-0">
 <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide">Doctor</p>
 <p className="text-[13.5px] font-bold text-slate-900 truncate">{cita.doctor_nombre}</p>
            </div>
          </div>
        </div>

        {cita.alergias.length > 0 && (
 <div className="flex items-center gap-3 px-3.5 py-3 border border-red-200 rounded-xl">
 <Icon name="warning_amber" size={17} className="text-red-500 shrink-0"/>
            <div className="min-w-0">
 <p className="text-[10.5px] font-semibold text-red-400 uppercase tracking-wide">Alergias del paciente</p>
 <p className="text-[12.5px] text-red-700 font-semibold">{cita.alergias.join(",")}</p>
            </div>
          </div>
        )}
        {cita.notas && (
 <div className="flex items-start gap-3 px-3.5 py-3 bg-slate-50 rounded-xl">
 <Icon name="notes" size={16} className="text-slate-400 shrink-0 mt-0.5"/>
 <span className="text-[12.5px] text-slate-600 leading-relaxed">{cita.notas}</span>
          </div>
        )}
      </div>
    </ResponsiveSheet>
  );
}
