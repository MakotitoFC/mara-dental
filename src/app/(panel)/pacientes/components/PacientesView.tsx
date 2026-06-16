"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PACIENTES_MOCK, calcEdad, fmtFecha, estadoPaciente } from "@/lib/mock-pacientes";
import { NuevoPacienteModal } from "./NuevoPacienteModal";
import type { EstadoPaciente, Paciente } from "@/types/paciente";

const ESTADO_CFG: Record<EstadoPaciente, { label: string; bg: string; text: string }> = {
  activo:   { label: "Activo",   bg: "#dcfce7", text: "#15803d" },
  nuevo:    { label: "Nuevo",    bg: "#dbeafe", text: "#1d4ed8" },
  inactivo: { label: "Inactivo", bg: "#f1f5f9", text: "#64748b" },
};

function initials(nombre: string) {
  const p = nombre.trim().split(" ");
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

const AVATAR_COLORS = [
  "#0891b2","#7c3aed","#db2777","#059669","#d97706","#dc2626","#2563eb","#65a30d",
];
function avatarColor(id: string) {
  const n = parseInt(id.replace(/\D/g, "")) || 0;
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export function PacientesView() {
  const [query, setQuery]         = useState("");
  const [filtro, setFiltro]       = useState<EstadoPaciente | "todos">("todos");
  const [showModal, setShowModal] = useState(false);
  const [extra, setExtra]         = useState<Paciente[]>([]);

  const todos = [...extra, ...PACIENTES_MOCK];

  const filtrados = todos.filter((p) => {
    const matchFiltro = filtro === "todos" || estadoPaciente(p) === filtro;
    const matchQuery  = query === "" ||
      p.nombre.toLowerCase().includes(query.toLowerCase()) ||
      p.dni.toLowerCase().includes(query.toLowerCase()) ||
      p.telefono.includes(query);
    return matchFiltro && matchQuery;
  });

  const totales = {
    todos:    todos.length,
    activo:   todos.filter((p) => estadoPaciente(p) === "activo").length,
    nuevo:    todos.filter((p) => estadoPaciente(p) === "nuevo").length,
    inactivo: todos.filter((p) => estadoPaciente(p) === "inactivo").length,
  };

  function handleNuevoPaciente(p: Paciente) {
    setExtra((prev) => [p, ...prev]);
    setShowModal(false);
  }

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4 max-w-300">

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nombre, DNI o teléfono…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[13px] font-medium transition-colors shrink-0"
        >
          <Icon name="person_add" size={16} />
          <span className="hidden sm:inline">Nuevo paciente</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Stats + filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["todos", "activo", "nuevo", "inactivo"] as const).map((f) => {
          const label  = f === "todos" ? "Todos" : ESTADO_CFG[f].label;
          const count  = totales[f];
          const active = filtro === f;
          return (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border ${
                active
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
        <span className="text-[12px] text-slate-400 ml-1">{filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Cabecera */}
        <div
          className="grid text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-4 py-3 border-b border-slate-100"
          style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) 80px minmax(0,1fr) 100px 72px" }}
        >
          <span>Paciente</span>
          <span>Teléfono</span>
          <span>Edad</span>
          <span>Última visita</span>
          <span>Estado</span>
          <span />
        </div>

        {filtrados.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <Icon name="person_search" size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-[13px]">No se encontraron pacientes</p>
          </div>
        )}

        {filtrados.map((p) => (
          <PacienteRow key={p.id} paciente={p} />
        ))}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex flex-col gap-2">
        {filtrados.length === 0 && (
          <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Icon name="person_search" size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-[13px]">No se encontraron pacientes</p>
          </div>
        )}
        {filtrados.map((p) => (
          <PacienteCard key={p.id} paciente={p} />
        ))}
      </div>

      {showModal && (
        <NuevoPacienteModal
          onClose={() => setShowModal(false)}
          onGuardar={handleNuevoPaciente}
        />
      )}
    </div>
  );
}

// ─── Desktop row ──────────────────────────────────────────────────────────────

function PacienteRow({ paciente: p }: { paciente: Paciente }) {
  const router = useRouter();
  const cfg    = ESTADO_CFG[estadoPaciente(p)];
  const edad   = calcEdad(p.fecha_nacimiento);
  const color  = avatarColor(p.id);

  return (
    <div
      onClick={() => router.push(`/pacientes/${p.id}`)}
      className="grid items-center px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors group cursor-pointer"
      style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) 80px minmax(0,1fr) 100px 72px" }}
    >
      {/* Paciente */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
          style={{ background: color }}
        >
          {initials(p.nombre)}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900 truncate">{p.nombre}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-slate-400">{p.dni}</span>
            {p.alergias.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-600">
                <Icon name="warning_amber" size={11} />
                Alergias: {p.alergias.join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Teléfono */}
      <span className="text-[12px] text-slate-600 truncate">{p.telefono}</span>

      {/* Edad */}
      <span className="text-[12px] text-slate-600">{edad} años</span>

      {/* Última visita */}
      <span className="text-[12px] text-slate-500">
        {p.ultima_visita ? fmtFecha(p.ultima_visita) : <span className="text-slate-300">—</span>}
      </span>

      {/* Estado */}
      <span
        className="text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit"
        style={{ background: cfg.bg, color: cfg.text }}
      >
        {cfg.label}
      </span>

      {/* Acciones */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={`https://wa.me/${p.telefono.replace(/\D/g, "")}?text=Hola%20${encodeURIComponent(p.nombre.split(" ")[0])}%2C%20le%20recordamos%20su%20cita%20en%20MaraDental.`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-green-50 transition-colors"
          title="WhatsApp"
        >
          <Icon name="chat" size={16} className="text-[#25D366]" />
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/pacientes/${p.id}`); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-cyan-50 transition-colors"
          title="Ver ficha"
        >
          <Icon name="folder_open" size={16} className="text-cyan-600" />
        </button>
      </div>
    </div>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function PacienteCard({ paciente: p }: { paciente: Paciente }) {
  const router = useRouter();
  const cfg    = ESTADO_CFG[estadoPaciente(p)];
  const edad   = calcEdad(p.fecha_nacimiento);
  const color  = avatarColor(p.id);

  return (
    <div
      onClick={() => router.push(`/pacientes/${p.id}`)}
      className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3 active:bg-slate-50 cursor-pointer"
    >
      {/* Avatar */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
        style={{ background: color }}
      >
        {initials(p.nombre)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="text-[13px] font-semibold text-slate-900 truncate">{p.nombre}</p>
          <span
            className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.text }}
          >
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
          <span>{p.dni}</span>
          <span>·</span>
          <span>{edad} años</span>
          <span>·</span>
          <span>{p.telefono}</span>
        </div>
        {p.ultima_visita && (
          <p className="text-[11px] text-slate-400 mt-0.5">
            Última visita: {fmtFecha(p.ultima_visita)}
          </p>
        )}
        {p.alergias.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 mt-0.5">
            <Icon name="warning_amber" size={11} />
            {p.alergias.join(", ")}
          </span>
        )}
      </div>

      {/* Chevron */}
      <Icon name="chevron_right" size={20} className="text-slate-300 shrink-0" />
    </div>
  );
}
