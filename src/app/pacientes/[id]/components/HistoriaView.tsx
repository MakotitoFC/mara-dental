"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { calcEdad, fmtFecha, getNotasPaciente } from "@/lib/mock-pacientes";
import type { Paciente, NotaClinica } from "@/types/paciente";
import { RecetaTab } from "./RecetaTab";
import { ArchivosView } from "@/app/archivos/components/ArchivosView";

const TIPO_CFG: Record<NotaClinica["tipo"], { icon: string; bg: string; color: string; label: string }> = {
  consulta:      { icon: "chat_bubble_outline", bg: "#eff6ff", color: "#2563eb", label: "Consulta" },
  procedimiento: { icon: "medical_services",    bg: "#f0fdf4", color: "#16a34a", label: "Procedimiento" },
  seguimiento:   { icon: "history",             bg: "#fefce8", color: "#b45309", label: "Seguimiento" },
  urgencia:      { icon: "priority_high",       bg: "#fff1f2", color: "#dc2626", label: "Urgencia" },
};

const AVATAR_COLORS = ["#0891b2","#7c3aed","#db2777","#059669","#d97706","#dc2626","#2563eb","#65a30d"];
function avatarColor(id: string) {
  const n = parseInt(id.replace(/\D/g, "")) || 0;
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}
function initials(nombre: string) {
  const p = nombre.trim().split(" ");
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

type Tab = "resumen" | "historial" | "notas" | "recetas" | "archivos";

export function HistoriaView({ paciente: p }: { paciente: Paciente }) {
  const [tab, setTab]             = useState<Tab>("resumen");
  const [showNuevaCita, setShowNuevaCita] = useState(false);
  const notas  = getNotasPaciente(p.id);
  const edad   = calcEdad(p.fecha_nacimiento);
  const color  = avatarColor(p.id);

  const waLink = `https://wa.me/${p.telefono.replace(/\D/g, "")}?text=Hola%20${encodeURIComponent(p.nombre.split(" ")[0])}%2C%20le%20contactamos%20desde%20MaraDental.`;

  return (
    <div className="p-5 flex flex-col gap-5 max-w-[960px]">

      {/* Botón volver */}
      <Link href="/pacientes" className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-900 transition-colors w-fit">
        <Icon name="arrow_back" size={16} />
        Volver a pacientes
      </Link>

      {/* Header del paciente */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start gap-4 flex-wrap">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-[22px] font-bold text-white shrink-0"
            style={{ background: color }}
          >
            {initials(p.nombre)}
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] font-bold text-slate-900">{p.nombre}</h1>
              {p.alergias.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  <Icon name="warning_amber" size={13} />
                  {p.alergias.join(" · ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap text-[12px] text-slate-500">
              <span className="flex items-center gap-1"><Icon name="badge" size={13} />{p.dni}</span>
              <span className="flex items-center gap-1"><Icon name="cake" size={13} />{edad} años · {fmtFecha(p.fecha_nacimiento)}</span>
              {p.grupo_sanguineo && (
                <span className="flex items-center gap-1"><Icon name="bloodtype" size={13} />{p.grupo_sanguineo}</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap text-[12px] text-slate-500">
              <span className="flex items-center gap-1"><Icon name="phone" size={13} />{p.telefono}</span>
              <span className="flex items-center gap-1"><Icon name="email" size={13} />{p.email}</span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Icon name="chat" size={15} className="text-[#25D366]" />
              WhatsApp
            </a>
            <button
              onClick={() => setShowNuevaCita(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[12px] font-medium transition-colors"
            >
              <Icon name="event_available" size={15} />
              Nueva cita
            </button>
          </div>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <StatBox icon="event" label="Total citas" value={notas.length > 0 ? String(notas.length + 2) : "0"} color="#0891b2" />
          <StatBox icon="history" label="Última visita" value={p.ultima_visita ? fmtFecha(p.ultima_visita) : "—"} color="#7c3aed" />
          <StatBox icon="event_upcoming" label="Próxima cita" value={p.proxima_cita ? fmtFecha(p.proxima_cita) : "—"} color="#059669" />
          <StatBox icon="folder_open" label="Notas clínicas" value={String(notas.length)} color="#d97706" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit">
        {(["resumen", "historial", "notas", "recetas", "archivos"] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = { resumen: "Resumen", historial: "Historial de citas", notas: "Notas clínicas", recetas: "Recetas", archivos: "Archivos" };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-colors ${tab === t ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* Contenido de tabs */}
      {tab === "resumen" && <TabResumen paciente={p} />}
      {tab === "historial" && <TabHistorial paciente={p} />}
      {tab === "notas" && <TabNotas notas={notas} />}
      {tab === "recetas" && <RecetaTab paciente={p} />}
      {tab === "archivos" && <ArchivosView pacienteId={p.id} />}

      {showNuevaCita && (
        <NuevaCitaModal paciente={p} onClose={() => setShowNuevaCita(false)} />
      )}
    </div>
  );
}

// ─── Tab Resumen ──────────────────────────────────────────────────────────────

function TabResumen({ paciente: p }: { paciente: Paciente }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Datos de contacto */}
      <Section title="Datos de contacto" icon="contact_page">
        <InfoRow icon="badge"  label="DNI"      value={p.dni} />
        <InfoRow icon="phone"  label="Teléfono" value={p.telefono} />
        <InfoRow icon="email"  label="Email"    value={p.email} />
        <InfoRow icon="cake"   label="Nacimiento" value={`${fmtFecha(p.fecha_nacimiento)} (${calcEdad(p.fecha_nacimiento)} años)`} />
        {p.grupo_sanguineo && <InfoRow icon="bloodtype" label="Grupo sanguíneo" value={p.grupo_sanguineo} />}
      </Section>

      {/* Alergias */}
      <Section title="Alergias" icon="warning_amber">
        {p.alergias.length === 0 ? (
          <p className="text-[12px] text-slate-400">Sin alergias registradas</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {p.alergias.map((a) => (
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
            {p.antecedentes.map((a) => (
              <div key={a} className="flex items-center gap-2 text-[12px] text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                {a}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Notas internas */}
      {p.notas && (
        <Section title="Notas internas" icon="sticky_note_2">
          <p className="text-[12px] text-slate-600 leading-relaxed">{p.notas}</p>
        </Section>
      )}
    </div>
  );
}

// ─── Tab Historial ────────────────────────────────────────────────────────────

function TabHistorial({ paciente: p }: { paciente: Paciente }) {
  const citas = [
    { fecha: p.ultima_visita ?? "2026-06-14", hora: "08:30", servicio: "Limpieza dental + profilaxis", estado: "completada", medico: "Dr. García" },
    { fecha: "2026-03-10", hora: "10:00", servicio: "Control de ortodoncia", estado: "completada", medico: "Dr. García" },
    { fecha: "2025-12-05", hora: "09:00", servicio: "Consulta inicial y plan de tratamiento", estado: "completada", medico: "Dr. García" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-slate-900">Historial de citas</p>
        <span className="text-[11px] text-slate-400">{citas.length} registro{citas.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-slate-50">
        {citas.map((c, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
              <Icon name="event" size={16} className="text-cyan-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-slate-900 truncate">{c.servicio}</p>
              <p className="text-[11px] text-slate-400">{fmtFecha(c.fecha)} · {c.hora} · {c.medico}</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 shrink-0">
              Completada
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab Notas ────────────────────────────────────────────────────────────────

function TabNotas({ notas }: { notas: NotaClinica[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[12px] font-medium transition-colors">
          <Icon name="add" size={15} />
          Nueva nota
        </button>
      </div>

      {notas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center text-slate-400">
          <Icon name="description" size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-[13px]">Sin notas clínicas registradas</p>
        </div>
      ) : (
        notas.map((n) => {
          const cfg = TIPO_CFG[n.tipo];
          return (
            <div key={n.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                  <Icon name={cfg.icon} size={18} style={{ color: cfg.color } as React.CSSProperties} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[13px] font-semibold text-slate-900">{n.titulo}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">{fmtFecha(n.fecha)} · {n.medico}</p>
                  <p className="text-[12px] text-slate-600 leading-relaxed">{n.descripcion}</p>
                  {n.tratamiento && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-500 mb-1">Tratamiento</p>
                      <p className="text-[12px] text-slate-700">{n.tratamiento}</p>
                    </div>
                  )}
                  {n.medicacion && (
                    <div className="mt-2 p-3 rounded-xl bg-cyan-50 border border-cyan-100">
                      <p className="text-[11px] font-semibold text-cyan-600 mb-1">Medicación</p>
                      <p className="text-[12px] text-cyan-800">{n.medicacion}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
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
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-b-0">
      <Icon name={icon} size={14} className="text-slate-400 shrink-0" />
      <span className="text-[11px] text-slate-400 w-28 shrink-0">{label}</span>
      <span className="text-[12px] text-slate-700 font-medium">{value}</span>
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

function NuevaCitaModal({ paciente, onClose }: { paciente: Paciente; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
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

        <div className="px-5 py-4 flex flex-col gap-3">
          <Field label="Paciente">
            <input
              readOnly
              value={paciente.nombre}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] bg-slate-50 text-slate-600 outline-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
            </Field>
            <Field label="Hora inicio">
              <input type="time" defaultValue="09:00" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duración">
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                <option>30 min</option>
                <option>45 min</option>
                <option value="60" defaultValue="60">60 min</option>
                <option>90 min</option>
                <option>120 min</option>
              </select>
            </Field>
            <Field label="Estado">
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                <option>Pendiente</option>
                <option>Confirmada</option>
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
            <textarea
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 resize-none"
              placeholder="Observaciones previas al tratamiento…"
            />
          </Field>
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <Icon name="event_available" size={14} />
            Guardar cita
          </button>
        </div>
      </div>
    </div>
  );
}
