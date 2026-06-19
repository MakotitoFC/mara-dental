"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { calcEdad, fmtFecha } from "@/lib/mock-pacientes";
import { RecetaTab } from "./RecetaTab";
import { OdontogramaTab } from "./OdontogramaTab";
import { ArchivosView } from "@/app/(panel)/archivos/components/ArchivosView";
import { crearNotaClinicaAction } from "../actions";
import { createCitaAction } from "@/app/(panel)/agenda/actions";

const TIPO_CFG: Record<string, { icon: string; bg: string; color: string; label: string }> = {
  consulta: { icon: "chat_bubble_outline", bg: "#eff6ff", color: "#2563eb", label: "Consulta" },
  procedimiento: { icon: "medical_services", bg: "#f0fdf4", color: "#16a34a", label: "Procedimiento" },
  seguimiento: { icon: "history", bg: "#fefce8", color: "#b45309", label: "Seguimiento" },
  urgencia: { icon: "priority_high", bg: "#fff1f2", color: "#dc2626", label: "Urgencia" },
};

const AVATAR_COLORS = ["#0891b2", "#7c3aed", "#db2777", "#059669", "#d97706", "#dc2626", "#2563eb", "#65a30d"];
function avatarColor(id: string) {
  const n = parseInt(id.replace(/\D/g, "")) || 0;
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}
function initials(nombre: string) {
  const p = nombre.trim().split(" ");
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

type Tab = "resumen" | "historial" | "odontograma" | "consultas" | "recetas" | "archivos";

export function HistoriaView({ paciente: p, citas, notas: consultasProps }: { paciente: any, citas: any[], notas: any[] }) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [showNuevaCita, setShowNuevaCita] = useState(false);
  const [showNuevaNota, setShowNuevaNota] = useState(false);

  const [consultas, setConsultas] = useState<any[]>(consultasProps);
  useEffect(() => { setConsultas(consultasProps); }, [consultasProps]);
  const edad = calcEdad(p.fecha_nacimiento);
  const color = avatarColor(p.id);

  const waLink = `https://wa.me/${p.telefono.replace(/\D/g, "")}?text=Hola%20${encodeURIComponent(p.nombre.split(" ")[0])}%2C%20le%20contactamos%20desde%20MaraDental.`;

  return (
    <div className="p-4 sm:p-5 md:p-6 flex flex-col gap-4 sm:gap-5 pb-24 sm:pb-6">

      {/* Header del paciente */}
      <div className="pt-1">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Avatar */}
          <div
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-[18px] sm:text-[22px] font-bold text-white shrink-0"
            style={{ background: color }}
          >
            {initials(p.nombre)}
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h1 className="text-[15px] sm:text-[18px] font-bold text-slate-900 leading-tight">{p.nombre}</h1>
              {p.alergias.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full shrink-0">
                  <Icon name="warning_amber" size={11} />
                  {p.alergias.join(" · ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 mt-1.5 flex-wrap text-[11px] sm:text-[12px] text-slate-500">
              <span className="flex items-center gap-1"><Icon name="badge" size={12} />{p.dni}</span>
              <span className="flex items-center gap-1"><Icon name="cake" size={12} />{edad} años</span>
              {p.grupo_sanguineo && (
                <span className="flex items-center gap-1"><Icon name="bloodtype" size={12} />{p.grupo_sanguineo}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] sm:text-[12px] text-slate-500">
              <span className="flex items-center gap-1"><Icon name="phone" size={12} className="shrink-0" />{p.telefono}</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 mt-4">
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Icon name="chat" size={15} className="text-[#25D366]" />
            WhatsApp
          </a>
          <button
            onClick={() => setShowNuevaCita(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[12px] font-medium transition-colors"
          >
            <Icon name="event_available" size={15} />
            Nueva cita
          </button>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <StatBox icon="event" label="Total citas" value={consultas.length > 0 ? String(consultas.length + 2) : "0"} color="#0891b2" />
          <StatBox icon="history" label="Última visita" value={p.ultima_visita ? fmtFecha(p.ultima_visita) : "—"} color="#7c3aed" />
          <StatBox icon="event_upcoming" label="Próxima cita" value={p.proxima_cita ? fmtFecha(p.proxima_cita) : "—"} color="#059669" />
          <StatBox icon="folder_open" label="Consultas" value={String(consultas.length)} color="#d97706" />
        </div>
      </div>

      {/* Tabs — Diseño móvil premium con scroll invisible y fade degradado */}
      <div className="relative -mx-4 sm:-mx-5 border-b border-slate-200 bg-white">
        {/* Fila scrollable: eliminamos barras de scroll en cualquier navegador */}
        <div
          className="flex items-center px-4 sm:px-5 overflow-x-auto select-none gap-1 scrollbar-none"
          style={{
            msOverflowStyle: 'none',  /* IE y Edge */
            scrollbarWidth: 'none',   /* Firefox */
          }}
        >
          {/* Contenedor interno para forzar la anulación de estilos heredados en WebKit */}
          <style>{`
      .scrollbar-none::-webkit-scrollbar { display: none; }
      .tab-btn-clean {
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        background: transparent;
        WebkitTapHighlightColor: transparent;
      }
      .tab-btn-clean:focus, .tab-btn-clean:active, .tab-btn-clean:focus-visible {
        outline: none !important;
        border: none !important;
        background: transparent !important;
      }
    `}</style>

          {(["resumen", "historial", "odontograma", "consultas", "recetas", "archivos"] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = {
              resumen: "Resumen",
              historial: "Historial",
              odontograma: "Odontograma",
              consultas: "Consultas",
              recetas: "Recetas",
              archivos: "Archivos"
            };
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`tab-btn-clean flex-none px-4 sm:px-5 py-3.5 min-h-[44px] text-[13px] font-medium whitespace-nowrap transition-all relative ${isActive ? "text-cyan-700 font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                {labels[t]}
                {/* Indicador inferior animado en lugar de usar un shadow inset rústico */}
                {isActive && (
                  <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-cyan-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Indicador ">" Premium: Degradado suave + Botón flotante con micro-sombra */}
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-14 sm:hidden flex items-center justify-end pr-2.5"
          style={{
            background: "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 45%, rgba(255,255,255,1) 100%)"
          }}
        >
          <div className="w-5 h-5 rounded-full bg-white/90 shadow-[0_1px_4px_rgba(0,0,0,0.1)] border border-slate-100 flex items-center justify-center backdrop-blur-[1px]">
            <Icon name="chevron_right" size={12} className="text-slate-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Contenido de tabs */}
      {tab === "resumen" && <TabResumen paciente={p} />}
      {tab === "historial" && <TabHistorial paciente={p} citas={citas} />}
      {tab === "odontograma" && <OdontogramaTab paciente={p} />}
      {tab === "consultas" && <TabConsultas consultas={consultas} onNuevaConsulta={() => setShowNuevaNota(true)} />}
      {tab === "recetas" && <RecetaTab paciente={p} />}
      {tab === "archivos" && <ArchivosView pacienteId={p.id} />}

      {showNuevaCita && (
        <NuevaCitaModal paciente={p} onClose={() => setShowNuevaCita(false)} />
      )}
      {showNuevaNota && (
        <NuevaConsultaModal
          paciente={p}
          onClose={() => setShowNuevaNota(false)}
          onSuccess={() => { setShowNuevaNota(false); }}
        />
      )}
    </div>
  );
}

// ─── Tab Resumen ──────────────────────────────────────────────────────────────

function TabResumen({ paciente: p }: { paciente: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Datos de contacto */}
      <Section title="Datos de contacto" icon="contact_page">
        <InfoRow icon="badge" label="DNI" value={p.dni} />
        <InfoRow icon="phone" label="Teléfono" value={p.telefono} />
        {p.email && <InfoRow icon="email" label="Email" value={p.email} />}
        <InfoRow icon="cake" label="Nacimiento" value={`${fmtFecha(p.fecha_nacimiento)} (${calcEdad(p.fecha_nacimiento)} años)`} />
        {p.grupo_sanguineo && <InfoRow icon="bloodtype" label="Grupo sanguíneo" value={p.grupo_sanguineo} />}
      </Section>

      {/* Alergias */}
      <Section title="Alergias" icon="warning_amber">
        {p.alergias.length === 0 ? (
          <p className="text-[12px] text-slate-400">Sin alergias registradas</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {p.alergias.map((a: string) => (
              <span key={a} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700">
                <Icon name="warning_amber" size={12} />
                {a}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Antecedentes médicos */}
      <Section title="Antecedentes médicos" icon="medical_information">
        {p.antecedentes.length === 0 ? (
          <p className="text-[12px] text-slate-400">Sin antecedentes registrados</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {p.antecedentes.map((a: string) => (
              <div key={a} className="flex items-center gap-2 text-[12px] text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                {a}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Contacto de emergencia */}
      {p.contacto_emergencia_nombre && (
        <Section title="Contacto de emergencia" icon="emergency">
          <InfoRow icon="person" label="Nombre" value={p.contacto_emergencia_nombre} />
          {p.contacto_emergencia_telefono && <InfoRow icon="phone" label="Teléfono" value={p.contacto_emergencia_telefono} />}
        </Section>
      )}
    </div>
  );
}

// ─── Tab Historial ────────────────────────────────────────────────────────────

function TabHistorial({ paciente: p, citas }: { paciente: any, citas: any[] }) {

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-slate-900">Historial de citas</p>
        <span className="text-[11px] text-slate-400">{citas.length} registro{citas.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-slate-50">
        {citas.map((c, i) => (
          <div key={i} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
              <Icon name="event" size={16} className="text-cyan-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-slate-900 truncate">{c.servicio}</p>
              <p className="text-[11px] text-slate-400 truncate">{fmtFecha(c.fecha)} · {c.hora} · {c.medico}</p>
            </div>
            <span className="hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 shrink-0">
              {c.estado}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab Consultas ──────────────────────────────────────────────────────────────

function TabConsultas({ consultas, onNuevaConsulta }: { consultas: any[]; onNuevaConsulta: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          onClick={onNuevaConsulta}
          className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[12px] font-semibold transition-colors shadow-sm"
        >
          <Icon name="add" size={16} />
          Nueva consulta
        </button>
      </div>

      {consultas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
            <Icon name="chat_bubble_outline" size={32} className="text-slate-300" />
          </div>
          <p className="text-[14px] font-semibold text-slate-800 mb-1">Sin consultas</p>
          <p className="text-[12px] text-slate-500 max-w-62.5">Este paciente aún no tiene consultas clínicas registradas en su historial.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {consultas.map((c) => {
            const cfg = TIPO_CFG[c.tipo] || TIPO_CFG["consulta"];
            return (
              <Link key={c.id} href={`/pacientes/consulta/${c.id}`} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer block">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                      <Icon name={cfg.icon} size={20} style={{ color: cfg.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-slate-800">{cfg.label}</p>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {fmtFecha(c.fecha)}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Icon name="person" size={14} />
                        {c.doctor_nombre}
                      </p>
                    </div>
                  </div>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                    <Icon name="more_vert" size={18} />
                  </button>
                </div>

                <div className="pl-13">
                  <p className="text-[13px] text-slate-700 font-medium mb-1">{c.motivo}</p>
                  {c.observaciones && <p className="text-[12px] text-slate-600 leading-relaxed">{c.observaciones}</p>}

                  {c.tratamiento && (
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Tratamiento e indicaciones</p>
                      <p className="text-[12px] text-slate-700">{c.tratamiento}</p>
                    </div>
                  )}

                  {c.medicacion && (
                    <div className="mt-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100/50 flex items-start gap-2.5">
                      <div className="mt-0.5">
                        <Icon name="medication" size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wide mb-0.5">Medicación prescrita</p>
                        <p className="text-[12px] text-blue-900 leading-relaxed">{c.medicacion}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon name={icon} size={16} className="text-cyan-600" />
        <p className="text-[13px] font-semibold text-slate-900">{title}</p>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-b-0">
      <Icon name={icon} size={14} className="text-slate-400 shrink-0 mt-0.5" />
      <span className="text-[11px] text-slate-400 w-20 sm:w-28 shrink-0">{label}</span>
      <span className="text-[12px] text-slate-700 font-medium min-w-0 wrap-break-word flex-1">{value}</span>
    </div>
  );
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "15" }}>
        <Icon name={icon} size={16} style={{ color } as React.CSSProperties} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-[13px] font-semibold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Modal Nueva Cita ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function NuevaCitaModal({ paciente, onClose }: { paciente: any; onClose: () => void }) {
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [duracion, setDuracion] = useState(60);
  const [tipoConsulta, setTipoConsulta] = useState("control");
  const [estado, setEstado] = useState("programada");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmForce, setConfirmForce] = useState(false);

  const canSave = fecha && horaInicio && !loading;

  async function handleGuardar(force = false) {
    if (!canSave) return;
    setLoading(true);
    setErrorMsg(null);

    const dateObj = new Date(`1970-01-01T${horaInicio}:00`);
    dateObj.setMinutes(dateObj.getMinutes() + duracion);
    const endH = String(dateObj.getHours()).padStart(2, "0");
    const endM = String(dateObj.getMinutes()).padStart(2, "0");
    const horaFin = `${endH}:${endM}`;

    const res = await createCitaAction({
      paciente_id: parseInt(paciente.id, 10),
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      tipo_consulta: tipoConsulta,
      estado,
      notas
    }, force);

    setLoading(false);

    if (res?.requiresConfirmation) {
      setErrorMsg(res.error || "Requiere confirmación");
      setConfirmForce(true);
      return;
    }

    if (res?.error) {
      setErrorMsg(res.error);
      return;
    }

    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 md:pb-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "min(92vh, calc(100dvh - 96px))" }}
      >
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div>
            <p className="text-[14px] font-semibold text-slate-900">Nueva cita</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{paciente.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto">
          <Field label="Paciente">
            <input
              readOnly
              value={paciente.nombre}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] bg-slate-50 text-slate-600 outline-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
            </Field>
            <Field label="Hora inicio">
              <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duración">
              <select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
              </select>
            </Field>
            <Field label="Estado">
              <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                <option value="programada">Programada</option>
                <option value="confirmada">Confirmada</option>
              </select>
            </Field>
          </div>
          <Field label="Tipo de consulta">
            <select value={tipoConsulta} onChange={(e) => setTipoConsulta(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
              <option value="primera vez">Primera vez</option>
              <option value="control">Control</option>
              <option value="emergencia">Emergencia</option>
            </select>
          </Field>
          <Field label="Notas internas">
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 resize-none"
              placeholder="Observaciones previas al tratamiento…"
            />
          </Field>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-[12px] flex items-start gap-1.5 border border-red-100 mt-2">
              <Icon name="warning" size={16} className="shrink-0" />
              <p className="font-medium">{errorMsg}</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[12px] font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>

          {confirmForce ? (
            <button
              onClick={() => handleGuardar(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Icon name="warning" size={14} />
              {loading ? "Guardando..." : "Confirmar excepción"}
            </button>
          ) : (
            <button
              onClick={() => handleGuardar(false)}
              disabled={!canSave}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Icon name="event_available" size={14} />
              {loading ? "Guardando..." : "Guardar cita"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Nueva Consulta ─────────────────────────────────────────────────

function NuevaConsultaModal({
  paciente,
  onClose,
  onSuccess,
}: {
  paciente: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [examenFisico, setExamenFisico] = useState<{ clave: string; valor: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canGuardar = motivo.trim().length > 0 && !loading;

  async function handleGuardar() {
    if (!canGuardar) return;
    setLoading(true);
    setErrorMsg(null);

    const examenFisicoObj: Record<string, string> = {};
    examenFisico.forEach(ef => {
      if (ef.clave.trim()) {
        examenFisicoObj[ef.clave.trim()] = ef.valor.trim();
      }
    });

    examenFisicoObj["tipo"] = "consulta";

    const res = await crearNotaClinicaAction(paciente.id, {
      motivo: motivo.trim(),
      observaciones: observaciones.trim() || undefined,
      examen_fisico: Object.keys(examenFisicoObj).length > 0 ? examenFisicoObj : undefined
    });

    setLoading(false);
    if (res?.error) {
      setErrorMsg(res.error);
      return;
    }

    onSuccess();
  }

  function addExamenFisico() {
    setExamenFisico([...examenFisico, { clave: "", valor: "" }]);
  }

  function updateExamenFisico(index: number, field: "clave" | "valor", val: string) {
    const arr = [...examenFisico];
    arr[index][field] = val;
    setExamenFisico(arr);
  }

  function removeExamenFisico(index: number) {
    setExamenFisico(examenFisico.filter((_, i) => i !== index));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 md:pb-4"
      style={{ background: "rgba(15,23,42,0.5)" }}
    >
      <div
        className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: 640, maxHeight: "min(92vh, calc(100dvh - 96px))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
              <Icon name="medical_services" size={18} className="text-cyan-600" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-900">Nueva consulta</p>
              <p className="text-[11px] text-slate-400">{paciente.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4 bg-slate-50/50">

          {/* Motivo */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <NField label="Motivo de consulta *">
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Control post-extracción, dolor en molar 46…"
                className="ninput"
              />
            </NField>
          </div>

          {/* Examen Físico (Dinámico) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Examen Físico / Signos Vitales</p>
              <button onClick={addExamenFisico} className="text-[11px] font-medium text-cyan-600 hover:underline flex items-center gap-1">
                <Icon name="add" size={14} /> Añadir campo
              </button>
            </div>

            {examenFisico.length === 0 ? (
              <p className="text-[12px] text-slate-400 py-2 text-center border border-dashed border-slate-200 rounded-lg">No hay signos vitales registrados.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {examenFisico.map((ef, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      placeholder="Ej: Temperatura"
                      value={ef.clave}
                      onChange={(e) => updateExamenFisico(idx, "clave", e.target.value)}
                      className="ninput flex-1"
                    />
                    <input
                      placeholder="Ej: 37.5 °C"
                      value={ef.valor}
                      onChange={(e) => updateExamenFisico(idx, "valor", e.target.value)}
                      className="ninput flex-1"
                    />
                    <button onClick={() => removeExamenFisico(idx)} className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg shrink-0 transition-colors">
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <NField label="Observaciones clínicas generales">
              <textarea
                rows={4}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Hallazgos del examen clínico, evolución del paciente…"
                className="ninput resize-none"
              />
            </NField>
          </div>
        </div>

        {errorMsg && (
          <div className="px-5 pb-3 bg-slate-50/50">
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-[12px] flex items-center gap-1.5 border border-red-100">
              <Icon name="warning" size={16} />
              <p className="font-medium">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 shrink-0 bg-white">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[12px] font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleGuardar}
            disabled={!canGuardar}
            className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[12px] font-semibold transition-colors"
          >
            <Icon name="save" size={15} />
            {loading ? "Guardando..." : "Guardar nota"}
          </button>
        </div>
      </div>

      <style>{`
        .ninput {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 12px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ninput:focus {
          border-color: #06b6d4;
          box-shadow: 0 0 0 3px rgba(6,182,212,0.12);
        }
      `}</style>
    </div>
  );
}

function NField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
