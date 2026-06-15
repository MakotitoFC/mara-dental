"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Cita, EstadoCita } from "@/types/agenda";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
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

const DAY_ABBR = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const MONTHS   = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MONTHS_L = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const SLOTS_30 = Array.from({ length: 23 }, (_, i) => {
  const m = 480 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});
const SLOTS_1H = Array.from({ length: 12 }, (_, i) =>
  `${String(8 + i).padStart(2, "0")}:00`
);

// ─── Status config ────────────────────────────────────────────────────────────

const EST: Record<EstadoCita, {
  solid: string;
  bg: string;
  text: string;
  bar: string;
  pillBg: string;
  pillText: string;
  label: string;
  icon: string;
}> = {
  programada:  { solid:"#b45309", bg:"#fefce8", text:"#713f12", bar:"#eab308", pillBg:"#fef9c3", pillText:"#a16207", label:"Programada",  icon:"schedule" },
  confirmada:  { solid:"#16a34a", bg:"#f0fdf4", text:"#14532d", bar:"#22c55e", pillBg:"#dcfce7", pillText:"#15803d", label:"Confirmada",  icon:"check_circle" },
  hecha:       { solid:"#2563eb", bg:"#eff6ff", text:"#1e3a8a", bar:"#3b82f6", pillBg:"#dbeafe", pillText:"#1d4ed8", label:"Hecha",       icon:"task_alt" },
  cancelada:   { solid:"#94a3b8", bg:"#f8fafc", text:"#94a3b8", bar:"#cbd5e1", pillBg:"#f1f5f9", pillText:"#94a3b8", label:"Cancelada",   icon:"cancel" },
};

// ─── Mock data ────────────────────────────────────────────────────────────────

function getMockCitas(): Cita[] {
  const t   = toDateStr(new Date());
  const tm1 = toDateStr(addDays(new Date(), -1));
  const t1  = toDateStr(addDays(new Date(), 1));
  const t2  = toDateStr(addDays(new Date(), 2));
  const t3  = toDateStr(addDays(new Date(), 3));
  const t4  = toDateStr(addDays(new Date(), 4));

  return [
    { id:"1",  paciente_id:"p1",  paciente_nombre:"María González",  alergias:["Penicilina"],              tipo_consulta:"Limpieza dental",      doctor_nombre:"Dr. García", fecha:t,   hora_inicio:"08:30", hora_fin:"09:15", estado:"confirmada" },
    { id:"2",  paciente_id:"p2",  paciente_nombre:"Carlos Ríos",     alergias:[],                          tipo_consulta:"Ortodoncia",            doctor_nombre:"Dr. García", fecha:t,   hora_inicio:"10:00", hora_fin:"11:00", estado:"hecha"      },
    { id:"3",  paciente_id:"p3",  paciente_nombre:"Ana Torres",      alergias:["Penicilina","Ibuprofeno"], tipo_consulta:"Extracción molar",      doctor_nombre:"Dr. García", fecha:t,   hora_inicio:"11:30", hora_fin:"12:00", estado:"programada" },
    { id:"4",  paciente_id:"p4",  paciente_nombre:"Luis Vargas",     alergias:[],                          tipo_consulta:"Urgencia",              doctor_nombre:"Dr. García", fecha:t,   hora_inicio:"14:30", hora_fin:"15:30", estado:"confirmada" },
    { id:"5",  paciente_id:"p5",  paciente_nombre:"Rosa Méndez",     alergias:[],                          tipo_consulta:"Control ortodoncia",    doctor_nombre:"Dr. García", fecha:t,   hora_inicio:"16:00", hora_fin:"16:30", estado:"cancelada"  },
    { id:"6",  paciente_id:"p6",  paciente_nombre:"Pedro Díaz",      alergias:[],                          tipo_consulta:"Blanqueamiento",        doctor_nombre:"Dr. García", fecha:tm1, hora_inicio:"09:00", hora_fin:"10:00", estado:"hecha"      },
    { id:"7",  paciente_id:"p7",  paciente_nombre:"Julia Flores",    alergias:[],                          tipo_consulta:"Endodoncia molar",      doctor_nombre:"Dr. García", fecha:t1,  hora_inicio:"09:00", hora_fin:"10:30", estado:"confirmada" },
    { id:"8",  paciente_id:"p8",  paciente_nombre:"Sandra Ruiz",     alergias:["Aspirina"],                tipo_consulta:"Ortodoncia",            doctor_nombre:"Dr. García", fecha:t1,  hora_inicio:"11:00", hora_fin:"11:30", estado:"programada" },
    { id:"9",  paciente_id:"p9",  paciente_nombre:"Kevin López",     alergias:[],                          tipo_consulta:"Profilaxis",            doctor_nombre:"Dr. García", fecha:t2,  hora_inicio:"08:00", hora_fin:"08:45", estado:"confirmada" },
    { id:"10", paciente_id:"p10", paciente_nombre:"Nora Cruz",       alergias:[],                          tipo_consulta:"Urgencia",              doctor_nombre:"Dr. García", fecha:t2,  hora_inicio:"14:00", hora_fin:"15:00", estado:"confirmada" },
    { id:"11", paciente_id:"p11", paciente_nombre:"Gustavo Ramos",   alergias:[],                          tipo_consulta:"Blanqueamiento",        doctor_nombre:"Dr. García", fecha:t3,  hora_inicio:"10:00", hora_fin:"11:00", estado:"programada" },
    { id:"12", paciente_id:"p12", paciente_nombre:"Carmen Vega",     alergias:["Penicilina"],               tipo_consulta:"Implante dental",       doctor_nombre:"Dr. García", fecha:t4,  hora_inicio:"09:00", hora_fin:"11:00", estado:"programada" },
  ];
}

// ─── Context menu ─────────────────────────────────────────────────────────────

interface MenuPos { x: number; y: number }

function ContextMenu({ cita, pos, onClose }: { cita: Cita; pos: MenuPos; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cfg = EST[cita.estado];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Ajustar posición para no salir de la pantalla
  const left = Math.min(pos.x, window.innerWidth - 260);
  const top  = Math.min(pos.y, window.innerHeight - 360);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-xl overflow-hidden"
      style={{
        left,
        top,
        width: 252,
        boxShadow: "0 8px 32px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.1)",
        border: "0.5px solid #e2e8f0",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: "0.5px solid #f1f5f9" }}>
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: cfg.solid }}
          >
            {initials(cita.paciente_nombre)}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900 truncate">{cita.paciente_nombre}</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">{cita.hora_inicio} – {cita.hora_fin}</p>
        <p className="text-[11px] text-slate-400 truncate">{cita.tipo_consulta}</p>
        {cita.alergias.length > 0 && (
          <p className="text-[10px] text-orange-600 font-semibold mt-1 flex items-center gap-1">
            <Icon name="warning_amber" size={12} />
            {cita.alergias.join(" · ")}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="py-1">
        <MenuAction icon="chat" label="Enviar recordatorio por WhatsApp" iconColor="#25D366" />
        <MenuAction icon="person" label="Datos del paciente" />
        <MenuAction icon="folder_open" label="Ficha médica" />
        <MenuAction icon="payments" label="Realizar cobro" />
        <MenuAction icon="link" label="Generar link de pago" />
        <MenuAction icon="pause_circle" label="Marcar en espera" />
        <div style={{ height: "0.5px", background: "#f1f5f9", margin: "4px 0" }} />
        <MenuAction icon="delete" label="Eliminar cita" iconColor="#dc2626" labelColor="#dc2626" />
      </div>
    </div>
  );
}

function MenuAction({
  icon, label, iconColor = "#64748b", labelColor = "#334155",
}: {
  icon: string; label: string; iconColor?: string; labelColor?: string;
}) {
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 transition-colors"
    >
      <Icon name={icon} size={17} style={{ color: iconColor } as React.CSSProperties} />
      <span className="text-[12px]" style={{ color: labelColor }}>{label}</span>
    </button>
  );
}

// ─── Day panel card ───────────────────────────────────────────────────────────

function DayCard({ cita, onClick }: { cita: Cita; onClick: (c: Cita, e: React.MouseEvent) => void }) {
  const cfg = EST[cita.estado];
  return (
    <div
      onClick={(e) => onClick(cita, e)}
      className="rounded-lg cursor-pointer mb-1.5 overflow-hidden"
      style={{ background: cfg.bg }}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <p className="text-[12px] font-semibold truncate" style={{ color: cfg.text }}>{cita.paciente_nombre}</p>
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1"
            style={{ background: cfg.pillBg, color: cfg.pillText }}
          >
            <Icon name={cfg.icon} size={10} />
            {cfg.label}
          </span>
        </div>
        <p className="text-[10px] truncate mt-0.5" style={{ color: cfg.text, opacity: 0.75 }}>{cita.tipo_consulta}</p>
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

// ─── Week grid appt block (diseño sólido) ─────────────────────────────────────

function WeekBlock({ cita, onClick }: { cita: Cita; onClick: (c: Cita, e: React.MouseEvent) => void }) {
  const cfg = EST[cita.estado];
  return (
    <div
      onClick={(e) => onClick(cita, e)}
      className="rounded-md cursor-pointer mb-0.5 px-1.5 py-1 overflow-hidden"
      style={{ background: cfg.bg }}
    >
      <p className="text-[12px] font-semibold leading-tight truncate" style={{ color: cfg.text }}>
        {shortName(cita.paciente_nombre)}
      </p>
      <p className="text-[10px] leading-tight truncate mt-0.5" style={{ color: cfg.text, opacity: 0.75 }}>
        {cita.tipo_consulta.split("·")[0].trim()}
      </p>
      <p className="text-[9.5px] leading-none mt-0.5" style={{ color: cfg.text, opacity: 0.55 }}>
        {cita.hora_inicio}
      </p>
    </div>
  );
}

// ─── New appointment modal ────────────────────────────────────────────────────

function NewCitaModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 md:pb-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "min(92vh, calc(100dvh - 96px))" }}
        onClick={(e) => e.stopPropagation()}
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
          <Field label="Paciente">
            <div className="relative">
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] pr-8 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" placeholder="Buscar por nombre o DNI…" />
              <Icon name="search" size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Fecha">
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
            </Field>
            <Field label="Hora inicio">
              <input type="time" defaultValue="09:00" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Duración">
              <select defaultValue="60 min" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                <option>30 min</option>
                <option>45 min</option>
                <option>60 min</option>
                <option>90 min</option>
                <option>120 min</option>
              </select>
            </Field>
            <Field label="Estado">
              <select defaultValue="confirmada" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                <option value="programada">Programada</option>
                <option value="confirmada">Confirmada</option>
              </select>
            </Field>
          </div>
          <Field label="Tipo de tratamiento">
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
              <option>Limpieza dental</option>
              <option>Extracción</option>
              <option>Ortodoncia</option>
              <option>Blanqueamiento</option>
              <option>Endodoncia</option>
              <option>Implante dental</option>
            </select>
          </Field>
          <Field label="Notas internas">
            <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 resize-none" placeholder="Observaciones previas al tratamiento…" />
          </Field>
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2 shrink-0 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="px-4 py-2 text-[12px] font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
            <Icon name="event_available" size={14} />
            Guardar cita
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

// ─── Stat tag ─────────────────────────────────────────────────────────────────

function StatTag({ icon, value, label, color, bg }: { icon: string; value: number; label: string; color: string; bg: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1" style={{ background: bg }}>
      <Icon name={icon} size={14} style={{ color } as React.CSSProperties} />
      <span className="text-[12px] font-semibold" style={{ color }}>
        {value} <span className="font-normal opacity-80">{label}</span>
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgendaView() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart]       = useState(getMonday(today));
  const [showNewModal, setShowNewModal] = useState(false);
  const [menuCita, setMenuCita]         = useState<Cita | null>(null);
  const [menuPos, setMenuPos]           = useState<MenuPos>({ x: 0, y: 0 });

  const citas    = getMockCitas();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const citasForDate = (d: Date) =>
    citas
      .filter((c) => c.fecha === toDateStr(d))
      .sort((a, b) => timeToMin(a.hora_inicio) - timeToMin(b.hora_inicio));

  const citasHoy = citasForDate(selectedDate);

  const citasForSlot30 = (slot: string) =>
    citasHoy.filter((c) => {
      const s = timeToMin(slot);
      const t = timeToMin(c.hora_inicio);
      return t >= s && t < s + 30;
    });

  const citasForWeekSlot = (day: Date, slot: string) =>
    citasForDate(day).filter((c) => {
      const s = timeToMin(slot);
      const t = timeToMin(c.hora_inicio);
      return t >= s && t < s + 60;
    });

  const isToday    = (d: Date) => toDateStr(d) === toDateStr(today);
  const isSelected = (d: Date) => toDateStr(d) === toDateStr(selectedDate);

  function openMenu(cita: Cita, e: React.MouseEvent) {
    e.stopPropagation();
    setMenuCita(cita);
    setMenuPos({ x: e.clientX, y: e.clientY });
  }

  const totalHoy = citasHoy.length;
  const stats = {
    confirmadas: citasHoy.filter((c) => c.estado === "confirmada").length,
    pendientes:  citasHoy.filter((c) => c.estado === "programada").length,
    hechas:      citasHoy.filter((c) => c.estado === "hecha").length,
  };

  const weekLabel = `${weekDays[0].getDate()} ${MONTHS[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;
  const dayLabel  = `${DAY_ABBR[selectedDate.getDay()]}, ${selectedDate.getDate()} ${MONTHS_L[selectedDate.getMonth()]}`;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
        {/* Mobile: navegación por día */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => {
              const newDate = addDays(selectedDate, -1);
              setSelectedDate(newDate);
              if (newDate < weekDays[0]) setWeekStart(getMonday(newDate));
            }}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Icon name="chevron_left" size={18} />
          </button>
          <span className="text-[13px] font-medium text-slate-700 min-w-[130px] text-center">{dayLabel}</span>
          <button
            onClick={() => {
              const newDate = addDays(selectedDate, 1);
              setSelectedDate(newDate);
              if (newDate > weekDays[6]) setWeekStart(getMonday(newDate));
            }}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Icon name="chevron_right" size={18} />
          </button>
        </div>

        {/* Desktop: navegación por semana */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Icon name="chevron_left" size={18} />
          </button>
          <span className="text-[13px] font-medium text-slate-700 min-w-[160px] text-center">{weekLabel}</span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Icon name="chevron_right" size={18} />
          </button>
          <button
            onClick={() => { setWeekStart(getMonday(today)); setSelectedDate(today); }}
            className="px-3 h-8 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
          >
            <Icon name="today" size={14} />
            Hoy
          </button>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-3 sm:px-4 h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[12px] font-medium transition-colors shrink-0"
        >
          <Icon name="add" size={16} />
          <span>Nueva cita</span>
        </button>
      </div>

      {/* ── MOBILE: vista de día ── */}
      <div className="flex flex-col flex-1 overflow-hidden md:hidden">
        {/* Strip de semana horizontal */}
        <div className="flex overflow-x-auto shrink-0 bg-white border-b border-slate-100 px-3 py-2 gap-1.5 scrollbar-none">
          {weekDays.map((d, i) => {
            const isSel = isSelected(d);
            const isTod = isToday(d);
            const cnt   = citasForDate(d).length;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(d)}
                className={`flex flex-col items-center min-w-[46px] rounded-xl py-2 px-1.5 transition-colors shrink-0 ${
                  isSel ? "bg-cyan-600" : isTod ? "bg-cyan-50" : "hover:bg-slate-50"
                }`}
              >
                <span className={`text-[9px] font-semibold mb-0.5 ${isSel ? "text-white/70" : "text-slate-400"}`}>
                  {DAY_ABBR[d.getDay()]}
                </span>
                <span className={`text-[17px] font-bold leading-tight ${
                  isSel ? "text-white" : isTod ? "text-cyan-600" : "text-slate-800"
                }`}>
                  {d.getDate()}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full mt-1 ${
                  cnt > 0 ? (isSel ? "bg-white/60" : "bg-cyan-500") : "opacity-0"
                }`} />
              </button>
            );
          })}
        </div>

        {/* Lista de citas del día */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {citasHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400">
              <Icon name="event_busy" size={44} className="opacity-20 mb-3" />
              <p className="text-[14px] font-medium text-slate-500">Sin citas este día</p>
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[12px] font-medium transition-colors"
              >
                <Icon name="add" size={15} />
                Agregar cita
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-slate-400 tracking-widest mb-3">
                {citasHoy.length} CITA{citasHoy.length !== 1 ? "S" : ""}
              </p>
              {citasHoy.map((c) => (
                <DayCard key={c.id} cita={c} onClick={openMenu} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP: dos paneles ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">

        {/* Panel izquierdo: vista diaria */}
        <div className="w-[260px] shrink-0 border-r border-slate-200 flex flex-col bg-white overflow-hidden">
          <div className="px-3 py-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100">
                <Icon name="chevron_left" size={16} />
              </button>
              <div className="text-center">
                <p className="text-[12px] font-semibold text-slate-900">{dayLabel}</p>
                <p className="text-[10px] text-slate-400">{totalHoy} cita{totalHoy !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100">
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {SLOTS_30.map((slot) => {
              const slotCitas  = citasForSlot30(slot);
              const isHalfHour = slot.endsWith(":30");
              return (
                <div
                  key={slot}
                  className="flex min-h-[54px]"
                  style={{ borderBottom: `0.5px solid ${isHalfHour ? "#f1f5f9" : "#e2e8f0"}` }}
                >
                  <div className="w-[42px] shrink-0 pt-2 pr-2 text-right">
                    {!isHalfHour && (
                      <span className="text-[9px] text-slate-400">{slot}</span>
                    )}
                  </div>
                  <div className="flex-1 p-1 pt-1.5">
                    {slotCitas.map((c) => (
                      <DayCard key={c.id} cita={c} onClick={openMenu} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel derecho: vista semanal */}
        <div className="flex-1 overflow-hidden bg-slate-50 min-w-0">
          <div className="h-full overflow-y-scroll overflow-x-hidden">
            {/* Cabecera sticky */}
            <div
              className="grid sticky top-0 z-10 bg-white border-b border-slate-200"
              style={{ gridTemplateColumns: "40px repeat(7, 1fr)" }}
            >
              <div className="border-r border-slate-200" />
              {weekDays.map((d, i) => {
                const isSel = isSelected(d);
                const isTod = isToday(d);
                const count = citasForDate(d).length;
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(d)}
                    className={`py-2 text-center border-r border-slate-200 last:border-r-0 cursor-pointer transition-colors ${isSel ? "bg-cyan-50" : "hover:bg-slate-50"}`}
                  >
                    <p className={`text-[9px] font-semibold mb-1 ${isSel ? "text-cyan-700" : "text-slate-500"}`}>
                      {DAY_ABBR[d.getDay()]}
                    </p>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto text-[14px] font-semibold ${isTod ? "bg-cyan-600 text-white" : isSel ? "text-cyan-700" : "text-slate-800"}`}>
                      {d.getDate()}
                    </div>
                    {count > 0 && (
                      <p className={`text-[8px] mt-0.5 font-medium ${isSel ? "text-cyan-600" : "text-slate-400"}`}>
                        {count} cita{count !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Filas horarias */}
            {SLOTS_1H.map((slot) => (
              <div
                key={slot}
                className="grid"
                style={{ gridTemplateColumns: "40px repeat(7, 1fr)", borderBottom: "0.5px solid #e2e8f0", minHeight: 56 }}
              >
                <div className="border-r border-slate-200 pt-1 pr-1.5 text-right shrink-0">
                  <span className="text-[9px] text-slate-400">{slot}</span>
                </div>
                {weekDays.map((d, i) => {
                  const blocks = citasForWeekSlot(d, slot);
                  const isSel  = isSelected(d);
                  return (
                    <div
                      key={i}
                      className={`border-r border-slate-200 last:border-r-0 p-0.5 ${isSel ? "bg-cyan-50/30" : ""}`}
                    >
                      {blocks.map((c) => (
                        <WeekBlock key={c.id} cita={c} onClick={openMenu} />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Context menu */}
      {menuCita && (
        <ContextMenu
          cita={menuCita}
          pos={menuPos}
          onClose={() => setMenuCita(null)}
        />
      )}

      {/* Modal nueva cita */}
      {showNewModal && <NewCitaModal onClose={() => setShowNewModal(false)} />}
    </div>
  );
}
