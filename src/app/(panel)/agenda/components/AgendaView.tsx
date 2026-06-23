"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import type { Cita, EstadoCita } from "@/types/agenda";
import { searchPatients, createCitaAction, updateCitaAction, deleteCitaAction, getCitasRealesAction, getPatientByIdAction } from "../actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function getMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  r.setHours(0, 0, 0, 0);
  return r;
}
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function initials(name: string): string {
  const parts = name.trim().split(" ");
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
function shortName(name: string): string {
  const parts = name.trim().split(" ");
  return parts[0] + (parts[1] ? " " + parts[1][0] + "." : "");
}

// Genera 6 semanas para la cuadrícula del mes (lunes como primer día)
function getMonthGrid(year: number, month: number): Date[][] {
  const firstDay  = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay();
  const daysBack  = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start     = addDays(firstDay, -daysBack);
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d))
  );
}

const DAY_SHORT  = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS     = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MONTHS_L   = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// Horario: 07:00 – 20:00 en bloques de 1 h
const HOURS = Array.from({ length: 14 }, (_, i) =>
  `${String(7 + i).padStart(2, "0")}:00`
);
const SLOT_H    = 72; // px por hora en timeline
const FIRST_H   = 7;  // hora de inicio del timeline

// Indicador de hora actual
function NowLine() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const mins = now.getHours() * 60 + now.getMinutes() - FIRST_H * 60;
  if (mins < 0 || mins > 14 * 60) return null;
  const top = (mins / 60) * SLOT_H;
  const label = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  return (
    <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center" style={{ top }}>
      <span className="text-[9px] font-bold text-slate-500 w-12 text-right pr-1.5 shrink-0 leading-none">{label}</span>
      <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0 -ml-1.5 border-2 border-white" />
      <div className="flex-1 h-px bg-slate-400" />
    </div>
  );
}

// ─── Status config ─────────────────────────────────────────────────────────────

const EST: Record<EstadoCita, {
  solid: string; bg: string; text: string;
  pillBg: string; pillText: string; label: string; icon: string;
}> = {
  programada: { solid: "#b45309", bg: "#fefce8", text: "#713f12", pillBg: "#fef9c3", pillText: "#a16207", label: "Programada", icon: "schedule" },
  confirmada:  { solid: "#16a34a", bg: "#f0fdf4", text: "#14532d", pillBg: "#dcfce7", pillText: "#15803d", label: "Confirmada", icon: "check_circle" },
  hecha:       { solid: "#2563eb", bg: "#eff6ff", text: "#1e3a8a", pillBg: "#dbeafe", pillText: "#1d4ed8", label: "Hecha",      icon: "task_alt" },
  cancelada:   { solid: "#94a3b8", bg: "#f8fafc", text: "#94a3b8", pillBg: "#f1f5f9", pillText: "#94a3b8", label: "Cancelada",  icon: "cancel" },
};

// ─── Appointment popup (Google Calendar style) ────────────────────────────────

interface MenuPos { x: number; y: number; }

// ─── AppointmentDetailPanel — Zendenta style ─────────────────────────────────

function AppointmentDetailPanel({
  cita, onClose, onEdit, onDeleted, onFinalizado,
}: {
  cita: Cita;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  onFinalizado: () => void;
}) {
  const cfg    = EST[cita.estado];
  const router = useRouter();

  const [confirmDel,     setConfirmDel]     = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [confirmFin,     setConfirmFin]     = useState(false);
  const [finalizing,     setFinalizing]     = useState(false);
  const [statusOpen,     setStatusOpen]     = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const dateLabel = new Date(cita.fecha + "T12:00:00").toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const avatarIni = initials(cita.paciente_nombre);
  const yaFinalizada = cita.estado === "hecha";

  async function handleDelete() {
    setDeleting(true);
    await deleteCitaAction(cita.id);
    onDeleted();
    onClose();
  }

  async function handleFinalizar() {
    setFinalizing(true);
    await updateCitaAction(cita.id, { estado: "hecha" });
    setFinalizing(false);
    setConfirmFin(false);
    onFinalizado();
  }

  async function handleStatusChange(newEstado: EstadoCita) {
    setUpdatingStatus(true);
    await updateCitaAction(cita.id, { estado: newEstado });
    setUpdatingStatus(false);
    setStatusOpen(false);
    onFinalizado(); // recarga citas
  }

  return (
    <div className="w-80 xl:w-88 shrink-0 border-r border-slate-200 flex flex-col bg-white overflow-hidden"
      style={{ minWidth: 300, maxWidth: 340 }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-end gap-0.5 px-2 py-2 border-b border-slate-200 shrink-0 bg-slate-50/80">
        <button onClick={onEdit} title="Editar cita"
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white text-slate-500 border-0 transition-colors">
          <Icon name="edit" size={15} />
        </button>
        {!confirmDel ? (
          <button onClick={() => setConfirmDel(true)} title="Eliminar cita"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 text-slate-500 hover:text-red-500 border-0 transition-colors">
            <Icon name="delete" size={15} />
          </button>
        ) : (
          <div className="flex items-center gap-1 px-1">
            <span className="text-[10px] text-red-500 font-semibold">¿Eliminar?</span>
            <button onClick={() => setConfirmDel(false)}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 border-0 text-[10px]">✕</button>
            <button onClick={handleDelete} disabled={deleting}
              className="w-6 h-6 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white border-0 disabled:opacity-50 text-[10px]">
              {deleting ? "…" : "✓"}
            </button>
          </div>
        )}
        <button onClick={() => router.push(`/pacientes/${cita.paciente_id}`)} title="Ver ficha del paciente"
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white text-slate-500 border-0 transition-colors">
          <Icon name="open_in_new" size={15} />
        </button>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        <button onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white text-slate-500 border-0 transition-colors">
          <Icon name="close" size={15} />
        </button>
      </div>

      {/* ── Patient card ── */}
      <div className="px-5 pt-5 pb-4 bg-white border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[15px] font-bold shrink-0 uppercase select-none">
            {avatarIni}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-slate-900 leading-snug truncate">{cita.paciente_nombre}</h2>
            <p className="text-[11.5px] text-slate-500 capitalize truncate">{dateLabel}</p>
          </div>
        </div>

        {/* Status badge — clic abre dropdown */}
        <div className="relative mt-3">
          <button
            onClick={() => setStatusOpen(o => !o)}
            disabled={updatingStatus}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11.5px] font-semibold border transition-all hover:opacity-80 disabled:opacity-60"
            style={{ background: cfg.pillBg, color: cfg.pillText, borderColor: cfg.solid + "40" }}
          >
            {updatingStatus
              ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              : <Icon name={cfg.icon} size={13} />
            }
            {cfg.label}
            <Icon name="expand_more" size={13} className="ml-0.5 opacity-60" />
          </button>

          {statusOpen && (
            <div className="absolute top-full left-0 mt-1.5 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
              {(["programada", "confirmada", "hecha", "cancelada"] as EstadoCita[]).map(e => {
                const c = EST[e];
                return (
                  <button key={e} onClick={() => handleStatusChange(e)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-left transition-colors border-0">
                    <Icon name={c.icon} size={14} style={{ color: c.solid } as React.CSSProperties} />
                    <span className="text-[12.5px] font-medium text-slate-700">{c.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Info rows ── */}
      <div className="px-5 py-4 flex flex-col gap-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <Icon name="schedule" size={15} className="text-slate-400 shrink-0" />
          <span className="text-[12.5px] font-medium text-slate-700">{cita.hora_inicio} – {cita.hora_fin}</span>
        </div>
        <div className="flex items-center gap-3">
          <Icon name="event_note" size={15} className="text-slate-400 shrink-0" />
          <span className="text-[12.5px] text-slate-600 capitalize">{cita.tipo_consulta}</span>
        </div>
        <div className="flex items-center gap-3">
          <Icon name="stethoscope" size={15} className="text-slate-400 shrink-0" />
          <span className="text-[12.5px] text-slate-600 truncate">{cita.doctor_nombre}</span>
        </div>
        {cita.alergias.length > 0 && (
          <div className="flex items-center gap-3 px-2.5 py-1.5 bg-orange-50 border border-orange-100 rounded-lg">
            <Icon name="warning_amber" size={15} className="text-orange-500 shrink-0" />
            <span className="text-[12px] text-orange-700 font-medium truncate">{cita.alergias.join(", ")}</span>
          </div>
        )}
        {cita.notas && (
          <div className="flex items-start gap-3">
            <Icon name="notes" size={15} className="text-slate-400 shrink-0 mt-0.5" />
            <span className="text-[12px] text-slate-500 leading-relaxed line-clamp-3">{cita.notas}</span>
          </div>
        )}
      </div>

      {/* ── Acciones ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

        {/* Ficha del paciente */}
        <button
          onClick={() => router.push(`/pacientes/${cita.paciente_id}`)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-left transition-colors border border-slate-200 group"
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-50 group-hover:bg-cyan-100 flex items-center justify-center shrink-0 transition-colors">
            <Icon name="person" size={18} className="text-cyan-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight text-slate-800">Ficha del paciente</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Historia clínica, diagnóstico y registro médico</p>
          </div>
          <Icon name="chevron_right" size={18} className="ml-auto shrink-0 text-slate-400" />
        </button>

        {/* Cobro */}
        <button className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-left transition-colors border border-slate-200 group">
          <div className="w-8 h-8 rounded-lg bg-slate-200 group-hover:bg-slate-300 flex items-center justify-center shrink-0 transition-colors">
            <Icon name="payments" size={18} className="text-slate-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight text-slate-800">Realizar cobro</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Registrar pago o generar recibo</p>
          </div>
          <Icon name="chevron_right" size={18} className="ml-auto shrink-0 text-slate-400" />
        </button>

        {/* Finalizar cita */}
        <div className="mt-auto pt-2">
          {yaFinalizada ? (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[12.5px] text-blue-700 font-medium">
              <Icon name="task_alt" size={16} />
              Cita finalizada
            </div>
          ) : !confirmFin ? (
            <button
              onClick={() => setConfirmFin(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[13px] font-semibold transition-colors"
            >
              <Icon name="task_alt" size={16} />
              Marcar como hecha
            </button>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col gap-2.5">
              <p className="text-[12.5px] font-semibold text-emerald-800 text-center">¿Confirmar que la cita fue atendida?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmFin(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-white transition-colors">
                  Cancelar
                </button>
                <button onClick={handleFinalizar} disabled={finalizing}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[12px] font-semibold transition-colors border-0">
                  {finalizing ? "…" : "Confirmar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal de edición completa — estilo imagen 2 (Google Calendar "More options")
function EditCitaModal({
  cita, onClose, onSaved,
}: { cita: Cita; onClose: () => void; onSaved: () => Promise<void> }) {
  const [fecha,   setFecha]   = useState(cita.fecha);
  const [hrIni,   setHrIni]   = useState(cita.hora_inicio);
  const [hrFin,   setHrFin]   = useState(cita.hora_fin);
  const [tipo,    setTipo]    = useState(cita.tipo_consulta);
  const [estado,  setEstado]  = useState<string>(cita.estado);
  const [notas,   setNotas]   = useState(cita.notas ?? "");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const dateLabel = new Date(fecha + "T12:00:00").toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await updateCitaAction(cita.id, {
      fecha,
      hora_inicio: hrIni,
      hora_fin: hrFin,
      tipo_consulta: tipo,
      estado,
      notas: notas || undefined,
    });
    setSaving(false);
    if (res && "error" in res) {
      setError(res.error as string);
      return;
    }
    // Esperar que los datos frescos se carguen antes de cerrar
    await onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer lateral */}
      <div className="relative w-full sm:w-[460px] max-w-full bg-white h-full flex flex-col shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 shrink-0">
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 border-0 transition-colors shrink-0">
            <Icon name="close" size={18} />
          </button>
          <h1 className="flex-1 text-[15px] font-semibold text-slate-900 truncate">{cita.paciente_nombre}</h1>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold border-0 transition-colors shrink-0">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-3 px-4 py-2.5 bg-red-50 border border-red-100 rounded-lg text-[12px] text-red-600 flex items-center gap-2 shrink-0">
            <Icon name="warning" size={15} className="shrink-0" />
            {error}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 flex flex-col gap-0">

            {/* Fecha y hora */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[13px] font-medium text-slate-800 border-0 outline-none focus:ring-2 focus:ring-cyan-300 cursor-pointer transition-colors" />
              <input type="time" value={hrIni} onChange={e => setHrIni(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[13px] font-medium text-slate-800 border-0 outline-none focus:ring-2 focus:ring-cyan-300 cursor-pointer transition-colors" />
              <span className="text-[13px] text-slate-400">a</span>
              <input type="time" value={hrFin} onChange={e => setHrFin(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[13px] font-medium text-slate-800 border-0 outline-none focus:ring-2 focus:ring-cyan-300 cursor-pointer transition-colors" />
              <span className="text-[12px] text-slate-400 capitalize hidden sm:block">{dateLabel}</span>
            </div>

            {/* Tipo de consulta */}
            <div className="flex items-center gap-4 py-3.5 border-b border-slate-100">
              <Icon name="event_note" size={17} className="text-slate-400 shrink-0" />
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Tipo de consulta</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] text-slate-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-colors">
                  <option value="primera vez">Primera vez</option>
                  <option value="control">Control</option>
                  <option value="emergencia">Emergencia</option>
                </select>
              </div>
            </div>

            {/* Estado */}
            <div className="flex items-center gap-4 py-3.5 border-b border-slate-100">
              <Icon name="flag" size={17} className="text-slate-400 shrink-0" />
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Estado</label>
                <div className="flex gap-2 flex-wrap">
                  {(["programada","confirmada","hecha","cancelada"] as const).map(e => {
                    const c = EST[e];
                    return (
                      <button key={e} onClick={() => setEstado(e)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border-2 transition-all ${
                          estado === e ? "border-current shadow-sm scale-105" : "border-transparent opacity-60 hover:opacity-80"
                        }`}
                        style={{ background: c.pillBg, color: c.pillText, borderColor: estado === e ? c.solid : "transparent" }}>
                        <Icon name={c.icon} size={12} />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Alergias (solo lectura) */}
            {cita.alergias.length > 0 && (
              <div className="flex items-center gap-4 py-3.5 border-b border-slate-100">
                <Icon name="warning_amber" size={17} className="text-orange-400 shrink-0" />
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Alergias</label>
                  <p className="text-[13px] text-orange-600 font-medium">{cita.alergias.join(", ")}</p>
                </div>
              </div>
            )}

            {/* Doctor */}
            <div className="flex items-center gap-4 py-3.5 border-b border-slate-100">
              <Icon name="stethoscope" size={17} className="text-slate-400 shrink-0" />
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Médico</label>
                <p className="text-[13px] text-slate-700">{cita.doctor_nombre}</p>
              </div>
            </div>

            {/* Notas */}
            <div className="flex items-start gap-4 py-3.5">
              <Icon name="notes" size={17} className="text-slate-400 shrink-0 mt-1" />
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Notas internas</label>
                <textarea rows={5} value={notas} onChange={e => setNotas(e.target.value)}
                  placeholder="Agrega una descripción o notas…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 resize-none placeholder:text-slate-300 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Popup de cita existente — diseño Google Calendar (imagen 1)
// Iconos en barra superior: ✏️ 🗑️ 💬 ×
function AppointmentPopup({
  cita, pos, onClose, onDeleted, onEdit, onOpenDetail,
}: { cita: Cita; pos: MenuPos; onClose: () => void; onDeleted: () => void; onEdit: () => void; onOpenDetail?: () => void }) {
  const ref    = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const cfg    = EST[cita.estado];

  const [confirm,  setConfirm]    = useState(false);
  const [deleting, setDeleting]   = useState(false);

  const POPUP_W = 320;
  const vw = typeof window !== "undefined" ? window.innerWidth  : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;
  const left = pos.x + POPUP_W + 12 < vw ? pos.x + 8 : Math.max(8, pos.x - POPUP_W - 8);
  const top  = Math.max(8, Math.min(pos.y - 20, vh - 300));

  useEffect(() => {
    let handler: ((e: MouseEvent) => void) | undefined;
    const id = setTimeout(() => {
      handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) onClose();
      };
      document.addEventListener("mousedown", handler);
    }, 50);
    return () => { clearTimeout(id); if (handler) document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  async function handleDelete() {
    setDeleting(true);
    await deleteCitaAction(cita.id);
    onDeleted();
    onClose();
  }

  // Formato de fecha legible
  const dateLabel = new Date(cita.fecha + "T12:00:00").toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div ref={ref} className="fixed z-50 bg-white rounded-2xl overflow-hidden"
      style={{ left, top, width: POPUP_W, boxShadow: "0 4px 6px -1px rgba(0,0,0,.1), 0 16px 32px -4px rgba(0,0,0,.18)", border: "1px solid #e2e8f0" }}>

      {/* Barra de acciones — iconos horizontales a la derecha */}
      <div className="flex items-center justify-end gap-0.5 px-2 pt-2 pb-1">
        <button onClick={onEdit} title="Editar"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 hover:text-slate-700 border-0 transition-colors">
          <Icon name="edit" size={17} />
        </button>
        {!confirm ? (
          <button onClick={() => setConfirm(true)} title="Eliminar"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-red-50 text-slate-500 hover:text-red-500 border-0 transition-colors">
            <Icon name="delete" size={17} />
          </button>
        ) : (
          <div className="flex items-center gap-1 px-1">
            <span className="text-[11px] text-red-500 font-semibold">¿Eliminar?</span>
            <button onClick={() => setConfirm(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 border-0 text-[11px] font-bold">✕</button>
            <button onClick={handleDelete} disabled={deleting}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white border-0 disabled:opacity-50 text-[11px] font-bold">
              {deleting ? "…" : "✓"}
            </button>
          </div>
        )}
        <button onClick={() => router.push(`/pacientes/${cita.paciente_id}`)} title="Ver historia del paciente"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 hover:text-slate-700 border-0 transition-colors">
          <Icon name="history" size={17} />
        </button>
        <div className="w-px h-5 bg-slate-200 mx-0.5" />
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 hover:text-slate-700 border-0 transition-colors">
          <Icon name="close" size={17} />
        </button>
      </div>

      {/* Contenido */}
      <div className="px-5 pb-5 pt-1">
        {/* Nombre del paciente */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-3 h-3 rounded-sm mt-1.5 shrink-0" style={{ background: cfg.solid }} />
          <div className="min-w-0">
            <p className="text-[18px] font-semibold text-slate-900 leading-tight">{cita.paciente_nombre}</p>
            <p className="text-[13px] text-slate-500 mt-0.5 capitalize">{dateLabel} · {cita.hora_inicio} – {cita.hora_fin}</p>
          </div>
        </div>

        {/* Info rows — estilo imagen 1 */}
        <div className="flex flex-col gap-3">
          {/* Estado */}
          <div className="flex items-center gap-3">
            <Icon name={cfg.icon} size={16} className="shrink-0" style={{ color: cfg.solid } as React.CSSProperties} />
            <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: cfg.pillBg, color: cfg.pillText }}>{cfg.label}</span>
            <span className="text-[12px] text-slate-500">· {cita.tipo_consulta}</span>
          </div>

          {/* Alergias */}
          {cita.alergias.length > 0 && (
            <div className="flex items-center gap-3">
              <Icon name="warning_amber" size={16} className="text-orange-400 shrink-0" />
              <span className="text-[12px] text-orange-600 font-medium">{cita.alergias.join(", ")}</span>
            </div>
          )}

          {/* Notas */}
          {cita.notas && (
            <div className="flex items-start gap-3">
              <Icon name="notes" size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <span className="text-[12px] text-slate-500 leading-relaxed">{cita.notas}</span>
            </div>
          )}

          {/* Doctor */}
          <div className="flex items-center gap-3">
            <Icon name="stethoscope" size={16} className="text-slate-400 shrink-0" />
            <span className="text-[12px] text-slate-600">{cita.doctor_nombre}</span>
          </div>

          {/* CTA */}
          {onOpenDetail && (
            <button onClick={() => { onOpenDetail(); onClose(); }}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[12.5px] font-semibold transition-colors border-0">
              <Icon name="clinical_notes" size={14} />
              Ver detalle de atención
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Popup de creación rápida — draggable con todos los campos; snap al panel lateral
interface QuickCreate { date: string; hour: string; pos: MenuPos; }

function QuickCreatePopup({
  initial, onClose, onSnapToPanel, onSnapPreview, onSuccess,
}: {
  initial: QuickCreate;
  onClose: () => void;
  onSnapToPanel: (date: string, hour: string) => void;
  onSnapPreview: (active: boolean) => void;
  onSuccess: () => void;
}) {
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const POPUP_W = 340;
  const vw = typeof window !== "undefined" ? window.innerWidth  : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;
  const initLeft = initial.pos.x + POPUP_W + 12 < vw ? initial.pos.x + 8 : Math.max(8, initial.pos.x - POPUP_W - 8);
  const initTop  = Math.max(8, Math.min(initial.pos.y - 20, vh - 520));

  const [px, setPx]     = useState(initLeft);
  const [py, setPy]     = useState(initTop);
  const [snapping, setSnapping] = useState(false);

  const [query,    setQuery]    = useState("");
  const [patients, setPatients] = useState<{ id: string; nombre: string; apellido: string; dni: string }[]>([]);
  const [patient,  setPatient]  = useState<{ id: string; nombre: string; apellido: string } | null>(null);

  const [fecha,   setFecha]   = useState(initial.date);
  const [hrIni,   setHrIni]   = useState(initial.hour);
  const [durMin,  setDurMin]  = useState("30");
  const [tipo,    setTipo]    = useState("primera vez");
  const [estado,  setEstado]  = useState("programada");
  const [notas,   setNotas]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const SNAP_X = () => (typeof window !== "undefined" ? window.innerWidth : 800) * 0.60;

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  useEffect(() => {
    if (!query || patient) { setPatients([]); return; }
    const id = setTimeout(() => searchPatients(query).then(setPatients), 250);
    return () => clearTimeout(id);
  }, [query, patient]);

  useEffect(() => {
    let handler: ((e: MouseEvent) => void) | undefined;
    const id = setTimeout(() => {
      handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) onClose();
      };
      document.addEventListener("mousedown", handler);
    }, 50);
    return () => { clearTimeout(id); if (handler) document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  function onHandleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const startMouse = { x: e.clientX, y: e.clientY };
    const startPos   = { x: px, y: py };
    let moved = false;
    let lastX = px;
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startMouse.x;
      const dy = ev.clientY - startMouse.y;
      if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;
      if (moved) {
        const nx = Math.max(0, startPos.x + dx);
        const ny = Math.max(0, startPos.y + dy);
        lastX = nx;
        setPx(nx); setPy(ny);
        const isSnap = nx > SNAP_X();
        setSnapping(isSnap);
        onSnapPreview(isSnap);
      }
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setSnapping(false);
      onSnapPreview(false);
      if (moved && lastX > SNAP_X()) onSnapToPanel(initial.date, initial.hour);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  async function handleSave() {
    if (!patient) { setError("Selecciona un paciente"); return; }
    setSaving(true); setError("");
    const [h, m] = hrIni.split(":").map(Number);
    const endMin = h * 60 + m + Number(durMin);
    const horaFin = `${String(Math.floor(endMin / 60)).padStart(2,"0")}:${String(endMin % 60).padStart(2,"0")}`;
    const res = await createCitaAction({
      paciente_id: Number(patient.id), fecha, hora_inicio: hrIni,
      hora_fin: horaFin, tipo_consulta: tipo, estado, notas,
    });
    setSaving(false);
    if (res && "error" in res) { setError(res.error as string); return; }
    onSuccess(); onClose();
  }

  const dateLabel = new Date(fecha + "T12:00:00").toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div ref={ref} className="fixed z-50 bg-white rounded-xl select-none"
      style={{
        left: px, top: py, width: POPUP_W,
        boxShadow: snapping ? "0 0 0 2px #06b6d4, 0 12px 28px rgba(0,0,0,.2)" : "0 4px 6px -1px rgba(0,0,0,.12), 0 12px 28px -4px rgba(0,0,0,.16)",
        border: snapping ? "1.5px solid #06b6d4" : "1px solid #e2e8f0",
      }}
    >
      {/* Handle drag + cerrar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100">
        <button onMouseDown={onHandleMouseDown}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border-0 cursor-grab active:cursor-grabbing"
          title="Arrastra al panel lateral para formulario expandido">
          <Icon name="drag_indicator" size={20} />
        </button>
        <div className="flex items-center gap-1">
          {snapping && <span className="text-[10px] text-cyan-600 font-semibold animate-pulse pr-1">Suelta →</span>}
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border-0">
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-3 flex flex-col gap-3">
        {/* Paciente */}
        <div className="relative">
          {patient ? (
            <div className="flex items-center justify-between border border-cyan-400 bg-cyan-50 rounded-lg px-3 py-2">
              <span className="text-[13px] font-semibold text-cyan-900">{patient.nombre} {patient.apellido}</span>
              <button onClick={() => { setPatient(null); setQuery(""); }} className="text-cyan-500 hover:text-cyan-700 border-0">
                <Icon name="close" size={14} />
              </button>
            </div>
          ) : (
            <>
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar paciente…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] pr-8 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
              <Icon name="search" size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              {patients.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-lg max-h-36 overflow-y-auto">
                  {patients.map(p => (
                    <div key={p.id} onClick={() => { setPatient(p); setPatients([]); setQuery(""); }}
                      className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                      <p className="text-[12px] font-medium text-slate-800">{p.nombre} {p.apellido}</p>
                      <p className="text-[10px] text-slate-400">DNI: {p.dni}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Fecha y hora inicio */}
        <div className="flex items-center gap-2">
          <Icon name="schedule" size={14} className="text-slate-400 shrink-0" />
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-cyan-400" />
          <input type="time" value={hrIni} onChange={e => setHrIni(e.target.value)}
            className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-cyan-400" />
        </div>

        {/* Duración */}
        <div className="flex items-center gap-2">
          <Icon name="timelapse" size={14} className="text-slate-400 shrink-0" />
          <select value={durMin} onChange={e => setDurMin(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-cyan-400">
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">1 hora</option>
            <option value="90">1h 30m</option>
            <option value="120">2 horas</option>
          </select>
        </div>

        {/* Tipo de consulta */}
        <div className="flex items-center gap-2">
          <Icon name="event_note" size={14} className="text-slate-400 shrink-0" />
          <select value={tipo} onChange={e => setTipo(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-cyan-400">
            <option value="primera vez">Primera vez</option>
            <option value="control">Control</option>
            <option value="emergencia">Emergencia</option>
          </select>
        </div>

        {/* Estado */}
        <div className="flex items-center gap-2">
          <Icon name="flag" size={14} className="text-slate-400 shrink-0" />
          <select value={estado} onChange={e => setEstado(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-cyan-400">
            <option value="programada">Programada</option>
            <option value="confirmada">Confirmada</option>
          </select>
        </div>

        {/* Notas */}
        <div className="flex items-start gap-2">
          <Icon name="notes" size={14} className="text-slate-400 shrink-0 mt-1.5" />
          <textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)}
            placeholder="Notas internas…"
            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-cyan-400 resize-none" />
        </div>

        {/* Error */}
        {error && (
          <p className="text-[11px] text-red-600 font-medium flex items-center gap-1.5">
            <Icon name="warning" size={12} />{error}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 pb-4 border-t border-slate-100 pt-3">
        <button onClick={onClose} className="px-3 py-1.5 border border-slate-200 rounded-lg text-[12px] text-slate-600 hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={!patient || saving}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-[12px] font-medium border-0 transition-colors">
          <Icon name="event_available" size={14} />
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

// Panel lateral de creación completa (estilo imagen 2 / Google Calendar)
interface CreatePanelState { date: string; hour: string; }

function CreateSidePanel({
  initial, onClose, onSuccess, onDateChange, preloadedPatient,
}: {
  initial: CreatePanelState;
  onClose: () => void;
  onSuccess: () => void;
  onDateChange: (date: string) => void;
  preloadedPatient?: { id: string; nombre: string; apellido: string } | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery]               = useState("");
  const [patients, setPatients]         = useState<{ id: string; nombre: string; apellido: string; dni: string }[]>([]);
  const [selectedPatient, setSelected]  = useState<{ id: string; nombre: string; apellido: string } | null>(preloadedPatient ?? null);
  const [fecha,        setFecha]        = useState(initial.date);
  const [horaInicio,   setHoraInicio]   = useState(initial.hour);
  const [duracion,     setDuracion]     = useState("30");
  const [tipoConsulta, setTipo]         = useState("primera vez");
  const [estado,       setEstado]       = useState("programada");
  const [notas,        setNotas]        = useState("");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  useEffect(() => {
    if (!query || selectedPatient) { setPatients([]); return; }
    const id = setTimeout(() => searchPatients(query).then(setPatients), 250);
    return () => clearTimeout(id);
  }, [query, selectedPatient]);

  async function handleSave() {
    if (!selectedPatient) { setError("Selecciona un paciente"); return; }
    setSaving(true); setError("");
    const [h, m] = horaInicio.split(":").map(Number);
    const endMin = h * 60 + m + Number(duracion);
    const horaFin = `${String(Math.floor(endMin / 60)).padStart(2,"0")}:${String(endMin % 60).padStart(2,"0")}`;
    const res = await createCitaAction({
      paciente_id: Number(selectedPatient.id),
      fecha, hora_inicio: horaInicio, hora_fin: horaFin,
      tipo_consulta: tipoConsulta, estado, notas,
    });
    setSaving(false);
    if (res && "error" in res) { setError(res.error as string); return; }
    onSuccess();
    onClose();
  }

  const dateLabel = new Date(fecha + "T12:00:00").toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="w-72 xl:w-80 shrink-0 border-l border-slate-200 flex flex-col bg-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-1 px-4 py-3 border-b border-slate-200 shrink-0">
        <p className="text-[13px] font-semibold text-slate-800">Nueva cita</p>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 border-0 transition-colors">
          <Icon name="close" size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Paciente */}
        <div className="px-4 pt-3 pb-3 border-b border-slate-100">
          {selectedPatient ? (
            <div className="flex items-center justify-between bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2">
              <span className="text-[13px] font-semibold text-cyan-900 leading-tight truncate">
                {selectedPatient.nombre} {selectedPatient.apellido}
              </span>
              <button onClick={() => { setSelected(null); setQuery(""); }} className="text-cyan-400 hover:text-cyan-600 border-0 shrink-0 ml-2">
                <Icon name="close" size={14} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar paciente…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] pr-8 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-colors" />
              <Icon name="search" size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              {patients.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                  {patients.map(p => (
                    <div key={p.id} onClick={() => { setSelected(p); setPatients([]); setQuery(""); }}
                      className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                      <p className="text-[13px] font-medium text-slate-800">{p.nombre} {p.apellido}</p>
                      <p className="text-[11px] text-slate-400">DNI: {p.dni}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fecha y hora */}
        <div className="px-5 py-4 flex flex-col gap-3 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <Icon name="schedule" size={18} className="text-slate-400 shrink-0 mt-2" />
            <div className="flex flex-col gap-2 flex-1">
              <input type="date" value={fecha} onChange={e => {
                setFecha(e.target.value);
                if (e.target.value) onDateChange(e.target.value);
              }}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
              <div className="flex gap-2">
                <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-cyan-400" />
                <select value={duracion} onChange={e => setDuracion(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-cyan-400">
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hora</option>
                  <option value="90">1h 30m</option>
                  <option value="120">2 horas</option>
                </select>
              </div>
              <p className="text-[10px] text-slate-400 capitalize">{dateLabel} · No se repite</p>
            </div>
          </div>
        </div>

        {/* Tipo de consulta */}
        <div className="px-5 py-3 flex items-center gap-4 border-b border-slate-100">
          <Icon name="event_note" size={18} className="text-slate-400 shrink-0" />
          <select value={tipoConsulta} onChange={e => setTipo(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100">
            <option value="primera vez">Primera vez</option>
            <option value="control">Control</option>
            <option value="emergencia">Emergencia</option>
          </select>
        </div>

        {/* Estado */}
        <div className="px-5 py-3 flex items-center gap-4 border-b border-slate-100">
          <Icon name="flag" size={18} className="text-slate-400 shrink-0" />
          <select value={estado} onChange={e => setEstado(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100">
            <option value="programada">Programada</option>
            <option value="confirmada">Confirmada</option>
          </select>
        </div>

        {/* Notas */}
        <div className="px-5 py-3 flex items-start gap-4 border-b border-slate-100">
          <Icon name="notes" size={18} className="text-slate-400 shrink-0 mt-1" />
          <textarea rows={3} value={notas} onChange={e => setNotas(e.target.value)}
            placeholder="Agregar descripción o nota…"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 resize-none" />
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-3 p-2.5 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-600 font-medium flex items-center gap-2">
            <Icon name="warning" size={14} className="shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-100 flex gap-2 shrink-0">
        <button onClick={onClose}
          className="flex-1 py-2 border border-slate-200 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-[12px] font-medium border-0 transition-colors">
          <Icon name="event_available" size={14} />
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

// ─── Event pill (month grid) ───────────────────────────────────────────────────

function EventPill({
  cita, onClick,
}: { cita: Cita; onClick: (c: Cita, e: React.MouseEvent) => void }) {
  const cfg = EST[cita.estado];
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(cita, e); }}
      className="flex items-center gap-1.5 rounded-lg px-2 py-[3px] text-[10px] font-semibold cursor-pointer hover:opacity-85 transition-opacity truncate min-w-0 border-l-2"
      style={{ background: cfg.pillBg, color: cfg.pillText, borderLeftColor: cfg.solid }}
    >
      <span className="truncate">{cita.paciente_nombre.split(" ")[0]}</span>
      <span className="ml-auto shrink-0 text-[9px] opacity-60 pl-1">{cita.hora_inicio}</span>
    </div>
  );
}

// ─── Month Grid View ───────────────────────────────────────────────────────────

function MonthView({
  year, month, citas, selectedDate,
  onSelectDate, onEventClick, onDayClick, onCellClick,
}: {
  year: number; month: number; citas: Cita[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onEventClick: (c: Cita, e: React.MouseEvent) => void;
  onDayClick: (d: Date) => void;
  onCellClick: (d: Date, e: React.MouseEvent) => void;
}) {
  const grid     = useMemo(() => getMonthGrid(year, month), [year, month]);
  const todayStr = useMemo(() => toDateStr(new Date()), []);

  const getCitas = (d: Date) =>
    citas
      .filter(c => c.fecha === toDateStr(d))
      .sort((a, b) => timeToMin(a.hora_inicio) - timeToMin(b.hora_inicio));

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 shrink-0 bg-white">
        {DAY_SHORT.map(d => (
          <div key={d} className="py-2.5 text-center border-r border-slate-100 last:border-r-0">
            <span className="text-[11px] font-semibold text-slate-400 tracking-wide">{d}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-hidden" style={{ display: "grid", gridTemplateRows: "repeat(6, 1fr)" }}>
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0 min-h-0">
            {week.map((day, di) => {
              const ds       = toDateStr(day);
              const inMonth  = day.getMonth() === month;
              const isToday  = ds === todayStr;
              const isSel    = ds === toDateStr(selectedDate);
              const dayCitas = getCitas(day);
              const overflow = Math.max(0, dayCitas.length - 3);

              return (
                <div
                  key={di}
                  onClick={e => { onSelectDate(day); onCellClick(day, e); }}
                  className={`border-r border-slate-100 last:border-r-0 p-1 flex flex-col gap-[3px] min-h-0 overflow-hidden cursor-pointer transition-colors ${
                    isSel && !isToday ? "bg-cyan-50/50" : "hover:bg-slate-50/70"
                  } ${!inMonth ? "opacity-30" : ""}`}
                >
                  {/* Número del día — clic navega a vista Día */}
                  <div className="shrink-0 flex items-center">
                    <span
                      onClick={e => { e.stopPropagation(); onDayClick(day); }}
                      className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full leading-none cursor-pointer hover:ring-2 hover:ring-cyan-300 transition-all ${
                        isToday ? "bg-slate-900 text-white"
                        : isSel ? "text-cyan-700 font-bold"
                        :         "text-slate-600"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {dayCitas.slice(0, 3).map(c => (
                    <EventPill key={c.id} cita={c} onClick={onEventClick} />
                  ))}
                  {overflow > 0 && (
                    <span
                      className="text-[9px] font-semibold text-slate-400 hover:text-cyan-600 px-1 shrink-0 transition-colors leading-none"
                      onClick={e => { e.stopPropagation(); onSelectDate(day); }}
                    >
                      +{overflow} más
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Week Grid View ────────────────────────────────────────────────────────────

function WeekView({
  weekDays, citas, selectedDate, today,
  onSelectDate, onEventClick, onDayClick, onCellClick, scrollRef,
}: {
  weekDays: Date[]; citas: Cita[]; selectedDate: Date; today: Date;
  onSelectDate: (d: Date) => void;
  onEventClick: (c: Cita, e: React.MouseEvent) => void;
  onDayClick: (d: Date) => void;
  onCellClick: (d: Date, hr: string, e: React.MouseEvent) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const getCitas     = (d: Date) => citas.filter(c => c.fecha === toDateStr(d));
  const getSlotCitas = (d: Date, hr: string) => {
    const s = timeToMin(hr);
    return getCitas(d).filter(c => { const t = timeToMin(c.hora_inicio); return t >= s && t < s + 60; });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="grid shrink-0 bg-white border-b border-slate-200" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
        <div className="border-r border-slate-100" />
        {weekDays.map((d, i) => {
          const isSel = toDateStr(d) === toDateStr(selectedDate);
          const isTod = toDateStr(d) === toDateStr(today);
          const cnt   = getCitas(d).length;
          return (
            <div key={i} onClick={() => onSelectDate(d)}
              className={`py-3 flex flex-col items-center border-r border-slate-100 last:border-r-0 cursor-pointer transition-colors ${isSel ? "bg-cyan-50" : "hover:bg-slate-50"}`}
            >
              <span className={`text-[10px] font-semibold mb-1 tracking-wide ${isSel ? "text-cyan-600" : "text-slate-400"}`}>
                {DAY_SHORT[i]}
              </span>
              {/* Número — clic navega a vista Día */}
              <div
                onClick={e => { e.stopPropagation(); onDayClick(d); }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold hover:ring-2 hover:ring-cyan-300 transition-all ${
                  isTod ? "bg-slate-900 text-white" : isSel ? "bg-cyan-100 text-cyan-800" : "text-slate-700"
                }`}
              >
                {d.getDate()}
              </div>
              {cnt > 0 && (
                <span className={`text-[9px] mt-0.5 font-medium ${isSel ? "text-cyan-600" : "text-slate-400"}`}>
                  {cnt} cita{cnt !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="relative">
          {weekDays.some(d => toDateStr(d) === toDateStr(today)) && <NowLine />}
          {HOURS.map(hr => (
            <div key={hr} className="grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)", height: SLOT_H, borderBottom: "0.5px solid #f1f5f9" }}>
              <div className="border-r border-slate-100 pt-1 pr-2 text-right shrink-0">
                <span className="text-[9px] text-slate-400 font-medium">{hr}</span>
              </div>
              {weekDays.map((d, i) => {
                const blocks = getSlotCitas(d, hr);
                const isSel  = toDateStr(d) === toDateStr(selectedDate);
                return (
                  <div key={i}
                    onClick={e => { if (blocks.length === 0) onCellClick(d, hr, e); }}
                    className={`border-r border-slate-100 last:border-r-0 p-0.5 overflow-hidden ${isSel ? "bg-cyan-50/20" : ""} ${blocks.length === 0 ? "cursor-pointer hover:bg-cyan-50/30" : ""}`}
                  >
                    {blocks.map(c => {
                      const cfg = EST[c.estado];
                      return (
                        <div key={c.id} onClick={e => { e.stopPropagation(); onEventClick(c, e); }}
                          className="rounded-lg mb-0.5 px-2 py-1 cursor-pointer hover:opacity-90 transition-all border-l-[3px] overflow-hidden"
                          style={{ background: cfg.pillBg, borderLeftColor: cfg.solid, boxShadow: `inset 0 0 0 1px ${cfg.solid}20` }}>
                          <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: cfg.pillText }}>{shortName(c.paciente_nombre)}</p>
                          <p className="text-[9px] leading-none mt-0.5 opacity-75 truncate" style={{ color: cfg.pillText }}>{c.hora_inicio} · {c.tipo_consulta}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Day View ──────────────────────────────────────────────────────────────────

function DayView({
  date, citas, today, onEventClick, onCellClick, scrollRef,
}: {
  date: Date; citas: Cita[]; today: Date;
  onEventClick: (c: Cita, e: React.MouseEvent) => void;
  onCellClick: (d: Date, hr: string, e: React.MouseEvent) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ds = toDateStr(date);
  const isToday = ds === toDateStr(today);
  const dayCitas = citas.filter(c => c.fecha === ds);
  const getSlotCitas = (hr: string) => {
    const s = timeToMin(hr);
    return dayCitas.filter(c => { const t = timeToMin(c.hora_inicio); return t >= s && t < s + 60; });
  };
  const dateLabel = date.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header del día */}
      <div className="shrink-0 px-6 py-3 border-b border-slate-200 bg-white flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[18px] font-bold shrink-0 ${isToday ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"}`}>
          {date.getDate()}
        </div>
        <div>
          <p className="text-[14px] font-semibold text-slate-900 capitalize leading-tight">{dateLabel}</p>
          <p className="text-[11px] text-slate-400">{dayCitas.length} cita{dayCitas.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative">
          {isToday && <NowLine />}
          {HOURS.map(hr => {
            const blocks = getSlotCitas(hr);
            return (
              <div key={hr} className="flex border-b border-slate-100" style={{ height: SLOT_H }}>
                <div className="w-14 shrink-0 pt-1 pr-3 text-right">
                  <span className="text-[10px] text-slate-400 font-medium">{hr}</span>
                </div>
                <div
                  onClick={e => { if (blocks.length === 0) onCellClick(date, hr, e); }}
                  className={`flex-1 p-1 overflow-hidden ${blocks.length === 0 ? "cursor-pointer hover:bg-cyan-50/40" : ""}`}
                >
                  {blocks.map(c => {
                    const cfg = EST[c.estado];
                    return (
                      <div key={c.id} onClick={e => { e.stopPropagation(); onEventClick(c, e); }}
                        className="rounded-xl mb-1 px-3 py-2 cursor-pointer hover:opacity-90 transition-all border-l-[3px] max-w-lg"
                        style={{ background: cfg.pillBg, borderLeftColor: cfg.solid, boxShadow: `inset 0 0 0 1px ${cfg.solid}25` }}>
                        <p className="text-[13px] font-semibold leading-tight" style={{ color: cfg.pillText }}>{c.paciente_nombre}</p>
                        <p className="text-[11px] mt-0.5 opacity-75" style={{ color: cfg.pillText }}>{c.hora_inicio} – {c.hora_fin} · {c.tipo_consulta}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Year View ─────────────────────────────────────────────────────────────────

function YearView({
  year, citas, onMonthClick, onDayClick,
}: {
  year: number; citas: Cita[];
  onMonthClick: (month: number) => void;
  onDayClick: (d: Date) => void;
}) {
  const todayStr = toDateStr(new Date());
  const citaDates = useMemo(() => new Set(citas.map(c => c.fecha)), [citas]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {Array.from({ length: 12 }, (_, m) => {
          const grid = getMonthGrid(year, m);
          return (
            <div key={m} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <button onClick={() => onMonthClick(m)}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors border-0">
                <span className="text-[13px] font-bold text-slate-800">{MONTHS_L[m]}</span>
              </button>
              <div className="px-2 pb-2">
                <div className="grid grid-cols-7 mb-1">
                  {["L","M","X","J","V","S","D"].map(d => (
                    <div key={d} className="text-center">
                      <span className="text-[8px] font-semibold text-slate-300">{d}</span>
                    </div>
                  ))}
                </div>
                {grid.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7">
                    {week.map((day, di) => {
                      const ds = toDateStr(day);
                      const inMonth = day.getMonth() === m;
                      const isToday = ds === todayStr;
                      const hasCita = citaDates.has(ds);
                      return (
                        <button key={di} onClick={() => inMonth && onDayClick(day)}
                          className={`text-center rounded-full w-full aspect-square flex items-center justify-center text-[9px] font-medium relative border-0 transition-colors ${
                            !inMonth ? "opacity-0 pointer-events-none" :
                            isToday  ? "bg-slate-900 text-white" :
                                       "hover:bg-cyan-50 text-slate-700"
                          }`}>
                          {inMonth ? day.getDate() : ""}
                          {hasCita && inMonth && !isToday && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day detail card (side panel + mobile) ────────────────────────────────────

function DayCard({ cita, onClick }: { cita: Cita; onClick: (c: Cita, e: React.MouseEvent) => void }) {
  const cfg = EST[cita.estado];
  return (
    <div
      onClick={e => onClick(cita, e)}
      className="rounded-xl cursor-pointer overflow-hidden border-l-[3px] mb-2 hover:shadow-sm transition-shadow"
      style={{ background: cfg.bg, borderLeftColor: cfg.solid }}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="text-[12px] font-semibold truncate" style={{ color: cfg.text }}>
            {cita.paciente_nombre}
          </p>
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1"
            style={{ background: cfg.pillBg, color: cfg.pillText }}
          >
            <Icon name={cfg.icon} size={10} />
            {cfg.label}
          </span>
        </div>
        <p className="text-[10px] truncate" style={{ color: cfg.text, opacity: 0.75 }}>{cita.tipo_consulta}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-[9.5px]" style={{ color: cfg.text, opacity: 0.55 }}>
            <Icon name="schedule" size={10} />
            {cita.hora_inicio} – {cita.hora_fin}
          </span>
          {cita.alergias.length > 0 && (
            <span className="flex items-center gap-1 text-[9.5px] font-semibold text-orange-600">
              <Icon name="warning_amber" size={10} />
              {cita.alergias[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New cita modal ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function NewCitaModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [query,           setQuery]           = useState("");
  const [patients,        setPatients]        = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [fecha,           setFecha]           = useState(toDateStr(new Date()));
  const [horaInicio,      setHoraInicio]      = useState("09:00");
  const [duracion,        setDuracion]        = useState("30");
  const [estado,          setEstado]          = useState("programada");
  const [tipoConsulta,    setTipoConsulta]    = useState("control");
  const [notas,           setNotas]           = useState("");
  const [loading,         setLoading]         = useState(false);
  const [errorMsg,        setErrorMsg]        = useState<string | null>(null);
  const [needConfirm,     setNeedConfirm]     = useState(false);

  useEffect(() => {
    if (query.trim().length >= 2 && !selectedPatient) {
      const t = setTimeout(() => searchPatients(query).then(setPatients), 500);
      return () => clearTimeout(t);
    } else if (!selectedPatient) {
      setPatients([]);
    }
  }, [query, selectedPatient]);

  function calcHoraFin(start: string, mins: number) {
    const [h, m] = start.split(":").map(Number);
    const total  = h * 60 + m + mins;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  async function handleSave(force = false) {
    if (!selectedPatient) { setErrorMsg("Debe seleccionar un paciente."); return; }
    setErrorMsg(null);
    setLoading(true);
    const res = await createCitaAction({
      paciente_id: selectedPatient.id,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: calcHoraFin(horaInicio, Number(duracion)),
      estado,
      tipo_consulta: tipoConsulta,
      notas,
    }, force);
    setLoading(false);
    if (res?.error) {
      setErrorMsg(res.error);
      if (res.requiresConfirmation) setNeedConfirm(true);
      return;
    }
    onSuccess();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 md:pb-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "min(92vh, calc(100dvh - 96px))" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div>
            <p className="text-[14px] font-semibold text-slate-900">Nueva cita</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Completa los datos para agendar</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-[11px] flex flex-col gap-2 border border-red-100">
              <p className="font-medium flex items-start gap-1">
                <Icon name="warning" size={14} className="shrink-0" /> {errorMsg}
              </p>
              {needConfirm && (
                <button
                  onClick={() => handleSave(true)}
                  disabled={loading}
                  className="self-end bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-md font-semibold transition-colors border-0"
                >
                  Confirmar excepción
                </button>
              )}
            </div>
          )}

          <Field label="Paciente">
            <div className="relative">
              {selectedPatient ? (
                <div className="flex items-center justify-between w-full border border-cyan-500 bg-cyan-50 rounded-lg px-3 py-2 text-[12px]">
                  <span className="font-medium text-cyan-900">{selectedPatient.nombre} {selectedPatient.apellido}</span>
                  <button onClick={() => { setSelectedPatient(null); setQuery(""); }} className="text-cyan-600 hover:text-cyan-800 border-0">
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar por nombre o DNI…"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] pr-8 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                  <Icon name="search" size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  {patients.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                      {patients.map(p => (
                        <div
                          key={p.id}
                          onClick={() => { setSelectedPatient(p); setPatients([]); }}
                          className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                        >
                          <p className="text-[12px] font-medium text-slate-800">{p.nombre} {p.apellido}</p>
                          <p className="text-[10px] text-slate-400">DNI: {p.dni}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
            </Field>
            <Field label="Hora inicio">
              <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Duración">
              <select value={duracion} onChange={e => setDuracion(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
                <option value="120">120 min</option>
              </select>
            </Field>
            <Field label="Estado">
              <select value={estado} onChange={e => setEstado(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                <option value="programada">Programada</option>
                <option value="confirmada">Confirmada</option>
              </select>
            </Field>
          </div>

          <Field label="Tipo de consulta">
            <select value={tipoConsulta} onChange={e => setTipoConsulta(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
              <option value="primera vez">Primera vez</option>
              <option value="control">Control</option>
              <option value="emergencia">Emergencia</option>
            </select>
          </Field>

          <Field label="Notas internas">
            <textarea
              rows={2} value={notas} onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones previas al tratamiento…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 resize-none"
            />
          </Field>
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2 shrink-0 border-t border-slate-100 pt-4">
          <button onClick={onClose} disabled={loading}
            className="px-4 py-2 text-[12px] font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={() => handleSave(false)} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg transition-colors border-0">
            <Icon name="event_available" size={14} />
            {loading ? "Guardando..." : "Guardar cita"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type CalView = "day" | "week" | "month" | "year";

const VIEW_LABELS: Record<CalView, string> = { day: "Día", week: "Semana", month: "Mes", year: "Año" };

function AgendaViewInner() {
  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
  const today = todayDate;
  const searchParams = useSearchParams();
  const preselectedPacienteId = searchParams?.get("paciente") ?? null;

  const [view,         setView]       = useState<CalView>("month");
  const [selectedDate, setSelectedDate] = useState(today);
  const [calMonth,     setCalMonth]   = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [weekStart,    setWeekStart]  = useState(getMonday(today));
  const [calYear,      setCalYear]    = useState(today.getFullYear());
  const [showModal,    setShowModal]   = useState(false);
  const [menuCita,     setMenuCita]   = useState<Cita | null>(null);
  const [menuPos,      setMenuPos]    = useState<MenuPos>({ x: 0, y: 0 });
  const [editCita,     setEditCita]   = useState<Cita | null>(null);
  const [detailCita,   setDetailCita] = useState<Cita | null>(null);
  const [quickCreate,  setQuickCreate] = useState<QuickCreate | null>(null);
  const [createPanel,  setCreatePanel] = useState<CreatePanelState | null>(null);
  const [snapPreview,  setSnapPreview] = useState(false);
  const [citas,        setCitas]      = useState<Cita[]>([]);
  const [mobileDate,   setMobileDate] = useState(today);
  const [loadingCitas, setLoadingCitas] = useState(true);
  const [preloadedPatient, setPreloadedPatient] = useState<{ id: string; nombre: string; apellido: string } | null>(null);

  const weekScrollRef = useRef<HTMLDivElement>(null);
  const dayScrollRef  = useRef<HTMLDivElement>(null);

  const loadCitas = async () => {
    setLoadingCitas(true);
    await getCitasRealesAction().then(setCitas);
    setLoadingCitas(false);
  };
  useEffect(() => { loadCitas(); }, []);

  // Si viene ?paciente=id desde la ficha del paciente, carga el paciente y abre CreateSidePanel
  useEffect(() => {
    if (!preselectedPacienteId) return;
    getPatientByIdAction(preselectedPacienteId).then(p => {
      if (p) {
        setPreloadedPatient(p);
        setCreatePanel({ date: toDateStr(today), hour: "09:00" });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedPacienteId]);

  function openMenu(cita: Cita, e: React.MouseEvent) {
    e.stopPropagation();
    // Desktop: abre el panel clínico directamente sin pasar por el popup
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setDetailCita(cita);
      setMenuCita(null);
    } else {
      setMenuCita(cita);
      setMenuPos({ x: e.clientX, y: e.clientY });
    }
    setQuickCreate(null);
    setCreatePanel(null);
  }

  function openDetail(cita: Cita) {
    setDetailCita(cita);
    setMenuCita(null);
    setQuickCreate(null);
    setCreatePanel(null);
  }

  function openQuickCreate(date: Date, hr: string, e: React.MouseEvent) {
    e.stopPropagation();
    setMenuCita(null);
    setDetailCita(null);
    setCreatePanel(null);   // cerrar panel si estaba abierto
    setSnapPreview(false);
    setQuickCreate({ date: toDateStr(date), hour: hr, pos: { x: e.clientX, y: e.clientY } });
  }

  function snapToPanel(date: string, hour: string) {
    setQuickCreate(null);
    setDetailCita(null);
    setCreatePanel({ date, hour });
  }

  // Navegar a vista "día" para una fecha concreta
  function goToDay(d: Date) {
    setSelectedDate(d);
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    setWeekStart(getMonday(d));
    setView("day");
  }

  // Derived data
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const citasForDate = (d: Date) =>
    citas.filter(c => c.fecha === toDateStr(d)).sort((a, b) => timeToMin(a.hora_inicio) - timeToMin(b.hora_inicio));
  const selectedDayCitas = citasForDate(selectedDate);
  const mobileCitas      = citasForDate(mobileDate);

  // Nav labels
  const currentLabel = (() => {
    if (view === "day")   return selectedDate.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (view === "week")  return `${weekDays[0].getDate()} ${MONTHS[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;
    if (view === "month") return `${MONTHS_L[calMonth.month]} ${calMonth.year}`;
    return String(calYear);
  })();

  const selectedDayLabel = selectedDate.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
  const mobileDateLabel  = mobileDate.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" });

  function prevPeriod() {
    if (view === "day")   setSelectedDate(p => addDays(p, -1));
    else if (view === "week")  setWeekStart(p => addDays(p, -7));
    else if (view === "month") setCalMonth(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 });
    else setCalYear(p => p - 1);
  }
  function nextPeriod() {
    if (view === "day")   setSelectedDate(p => addDays(p, 1));
    else if (view === "week")  setWeekStart(p => addDays(p, 7));
    else if (view === "month") setCalMonth(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 });
    else setCalYear(p => p + 1);
  }
  function goToday() {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    setSelectedDate(t);
    setMobileDate(t);
    setCalMonth({ year: t.getFullYear(), month: t.getMonth() });
    setWeekStart(getMonday(t));
    setCalYear(t.getFullYear());
  }

  function handleSelectDate(d: Date) {
    setSelectedDate(d);
    if (view === "month" && d.getMonth() !== calMonth.month) {
      setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  }

  const mobileWeekStart = getMonday(mobileDate);
  const mobileWeekDays  = Array.from({ length: 7 }, (_, i) => addDays(mobileWeekStart, i));

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* ── HEADER ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 shrink-0 bg-white">
        {/* Mobile nav */}
        <div className="flex items-center gap-1.5 md:hidden">
          <button onClick={() => setMobileDate(p => addDays(p, -1))}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
            <Icon name="chevron_left" size={18} />
          </button>
          <span className="text-[13px] font-medium text-slate-700 min-w-32 text-center capitalize">{mobileDateLabel}</span>
          <button onClick={() => setMobileDate(p => addDays(p, 1))}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
            <Icon name="chevron_right" size={18} />
          </button>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1.5">
          <button onClick={prevPeriod}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
            <Icon name="chevron_left" size={18} />
          </button>
          <button onClick={goToday}
            className="h-8 px-3 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Hoy
          </button>
          <button onClick={nextPeriod}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
            <Icon name="chevron_right" size={18} />
          </button>
        </div>

        <div className="hidden md:flex flex-col min-w-0 ml-1">
          <p className="text-[15px] font-bold text-slate-900 leading-tight capitalize">{currentLabel}</p>
        </div>

        <div className="flex-1" />

        {/* View toggle: Día | Semana | Mes | Año */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {(["day", "week", "month", "year"] as CalView[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 h-7 rounded-md text-[12px] font-medium transition-colors border-0 ${
                view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        {/* "Nueva cita" solo en mobile — en desktop se usa clic en celda */}
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 sm:px-4 h-8 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[12px] font-medium transition-colors shrink-0 border-0 md:hidden">
          <Icon name="add" size={16} />
          <span className="hidden sm:inline">Nueva cita</span>
        </button>

      </div>

      {/* ── MOBILE BODY ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden md:hidden">
        <div className="flex overflow-x-auto shrink-0 border-b border-slate-100 px-3 py-2 gap-1 bg-white" style={{ scrollbarWidth: "none" }}>
          {mobileWeekDays.map((d, i) => {
            const isSel = toDateStr(d) === toDateStr(mobileDate);
            const isTod = toDateStr(d) === toDateStr(today);
            const cnt   = citasForDate(d).length;
            return (
              <button key={i} onClick={() => setMobileDate(d)}
                className={`flex flex-col items-center min-w-[42px] rounded-xl py-2 px-1 transition-colors shrink-0 border-0 ${
                  isSel ? "bg-slate-900" : isTod ? "bg-slate-100" : "hover:bg-slate-50"
                }`}>
                <span className={`text-[9px] font-semibold mb-0.5 ${isSel ? "text-white/60" : "text-slate-400"}`}>{DAY_SHORT[i]}</span>
                <span className={`text-[17px] font-bold leading-tight ${isSel ? "text-white" : isTod ? "text-slate-900" : "text-slate-800"}`}>{d.getDate()}</span>
                <span className={`w-1.5 h-1.5 rounded-full mt-1 ${cnt > 0 ? (isSel ? "bg-white/50" : "bg-cyan-500") : "opacity-0"}`} />
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {mobileCitas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <Icon name="event_busy" size={44} className="text-slate-200 mb-3" />
              <p className="text-[14px] font-medium text-slate-500 mb-1">Sin citas este día</p>
              <button onClick={() => setShowModal(true)}
                className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[12px] font-medium transition-colors border-0">
                <Icon name="add" size={15} />Agregar cita
              </button>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-3">
                {mobileCitas.length} CITA{mobileCitas.length !== 1 ? "S" : ""}
              </p>
              {mobileCitas.map(c => <DayCard key={c.id} cita={c} onClick={openMenu} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP BODY ──────────────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden relative">

        {/* Loading overlay */}
        {loadingCitas && (
          <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-3 border-slate-200" />
              <div className="absolute inset-0 rounded-full border-3 border-t-cyan-500 animate-spin" style={{ borderWidth: 3 }} />
            </div>
            <p className="text-[12px] font-medium text-slate-500">Cargando citas…</p>
          </div>
        )}

        {/* Panel izquierdo: detalle de cita existente */}
        {detailCita && !createPanel && (
          <AppointmentDetailPanel
            cita={detailCita}
            onClose={() => setDetailCita(null)}
            onEdit={() => { setEditCita(detailCita); setDetailCita(null); }}
            onDeleted={() => { loadCitas(); setDetailCita(null); }}
            onFinalizado={() => { loadCitas(); setDetailCita(null); }}
          />
        )}

        {/* Área central: la vista del calendario */}
        <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
          {view === "day" && (
            <DayView
              date={selectedDate}
              citas={citas}
              today={today}
              onEventClick={openMenu}
              onCellClick={(d, hr, e) => openQuickCreate(d, hr, e)}
              scrollRef={dayScrollRef}
            />
          )}

          {view === "week" && (
            <WeekView
              weekDays={weekDays}
              citas={citas}
              selectedDate={selectedDate}
              today={today}
              onSelectDate={d => { setSelectedDate(d); setWeekStart(getMonday(d)); }}
              onEventClick={openMenu}
              onDayClick={goToDay}
              onCellClick={(d, hr, e) => openQuickCreate(d, hr, e)}
              scrollRef={weekScrollRef}
            />
          )}

          {view === "month" && (
            <MonthView
              year={calMonth.year}
              month={calMonth.month}
              citas={citas}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onEventClick={openMenu}
              onDayClick={goToDay}
              onCellClick={(d, e) => openQuickCreate(d, "09:00", e)}
            />
          )}

          {view === "year" && (
            <YearView
              year={calYear}
              citas={citas}
              onMonthClick={m => { setCalMonth({ year: calYear, month: m }); setView("month"); }}
              onDayClick={goToDay}
            />
          )}
        </div>

        {/* Panel derecho: zona de drop (preview mientras arrastras) o formulario completo */}
        {(snapPreview || createPanel) && (
          <div
            className="w-72 xl:w-80 shrink-0 border-l flex flex-col overflow-hidden transition-all duration-200"
            style={{ borderColor: snapPreview && !createPanel ? "#06b6d4" : "#e2e8f0" }}
          >
            {createPanel ? (
              <CreateSidePanel
                initial={createPanel}
                onClose={() => { setCreatePanel(null); setPreloadedPatient(null); }}
                onSuccess={() => { loadCitas(); setCreatePanel(null); setPreloadedPatient(null); }}
                preloadedPatient={preloadedPatient}
                onDateChange={d => {
                  const date = new Date(d + "T12:00:00");
                  setSelectedDate(date);
                  setCalMonth({ year: date.getFullYear(), month: date.getMonth() });
                  setWeekStart(getMonday(date));
                }}
              />
            ) : (
              /* Zona de drop visible mientras arrastras */
              <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-cyan-50/60">
                <div className="w-14 h-14 rounded-full bg-cyan-100 flex items-center justify-center">
                  <Icon name="add_circle" size={30} className="text-cyan-400" />
                </div>
                <p className="text-[12px] text-cyan-600 font-semibold">Suelta aquí</p>
                <p className="text-[11px] text-cyan-400 text-center px-4">El formulario se abrirá en este panel</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Tooltip estático de cita existente */}
      {menuCita && (
        <AppointmentPopup
          cita={menuCita}
          pos={menuPos}
          onClose={() => setMenuCita(null)}
          onDeleted={() => { loadCitas(); setMenuCita(null); }}
          onEdit={() => { setEditCita(menuCita); setMenuCita(null); }}
          onOpenDetail={() => openDetail(menuCita)}
        />
      )}

      {/* Modal de edición completa — se abre al pulsar ✏️ */}
      {editCita && (
        <EditCitaModal
          cita={editCita}
          onClose={() => setEditCita(null)}
          onSaved={async () => { await loadCitas(); }}
        />
      )}

      {/* Popup de creación rápida draggable (solo desktop) */}
      {quickCreate && (
        <QuickCreatePopup
          initial={quickCreate}
          onClose={() => { setQuickCreate(null); setSnapPreview(false); }}
          onSnapToPanel={snapToPanel}
          onSnapPreview={setSnapPreview}
          onSuccess={loadCitas}
        />
      )}

      {/* Modal nueva cita — solo para mobile */}
      {showModal && <NewCitaModal onClose={() => setShowModal(false)} onSuccess={loadCitas} />}
    </div>
  );
}

export function AgendaView() {
  return (
    <Suspense fallback={null}>
      <AgendaViewInner />
    </Suspense>
  );
}
