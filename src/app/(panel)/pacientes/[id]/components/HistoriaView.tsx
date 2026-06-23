"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { calcEdad, fmtFecha } from "@/lib/mock-pacientes";
import { OdontogramaTab } from "./OdontogramaTab";
import { RecetaTab } from "./RecetaTab";
import { iniciarConsultaAction } from "../actions";
import { ArchivosView } from "@/app/(panel)/archivos/components/ArchivosView";

// ─── Tipos de sección ─────────────────────────────────────────────────────────

type Sec =
  | "consulta"
  | "diagnostico"
  | "historia"
  | "odontograma"
  | "plan"
  | "tratamiento"
  | "receta"
  | "recomendacion";

const SECTIONS: { key: Sec; icon: string; label: string }[] = [
  { key: "consulta",      icon: "stethoscope",     label: "Consulta" },
  { key: "diagnostico",   icon: "biotech",          label: "Diagnóstico" },
  { key: "historia",      icon: "person",           label: "Historia clínica" },
  { key: "odontograma",   icon: "dentistry",        label: "Odontograma" },
  { key: "plan",          icon: "checklist",        label: "Plan de trabajo" },
  { key: "tratamiento",   icon: "medical_services", label: "Tratamiento" },
  { key: "receta",        icon: "medication",       label: "Receta" },
  { key: "recomendacion", icon: "tips_and_updates", label: "Recomendación" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#0891b2","#7c3aed","#db2777","#059669",
  "#d97706","#dc2626","#2563eb","#65a30d",
];
function avatarColor(id: string) {
  return AVATAR_COLORS[(parseInt(id.replace(/\D/g, "")) || 0) % AVATAR_COLORS.length];
}
function initials(nombre: string) {
  const p = nombre.trim().split(" ");
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}
function money(n: number, m = "PEN") {
  return `${m === "PEN" ? "S/" : m} ${Number(n).toFixed(2)}`;
}
const fmtFull = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("es-PE", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return d; }
};

// ─── Componente principal ─────────────────────────────────────────────────────

export function HistoriaView({
  paciente: p,
  citas,
  notas: _notas,
  historial,
}: {
  paciente: any;
  citas: any[];
  notas: any[];
  historial: any[];
}) {
  const [sec, setSec]     = useState<Sec>("consulta");
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const color   = avatarColor(p.id);
  const waLink  = `https://wa.me/${p.telefono?.replace(/\D/g, "")}?text=Hola%20${encodeURIComponent(p.nombre?.split(" ")[0] ?? "")}%2C%20le%20contactamos%20desde%20MaraDental.`;

  const hoy = new Date().toISOString().split("T")[0];
  const proximaCita = (citas || [])
    .filter((c) => (c.estado === "programada" || c.estado === "confirmada") && c.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];

  return (
    <div className="flex flex-col min-h-full bg-slate-50/40">

      {/* ── Sub-breadcrumb ── */}
      <div className="flex items-center justify-between px-3 sm:px-6 md:px-8 py-2.5 border-b border-slate-200 bg-white shrink-0 gap-2">
        <nav className="flex items-center gap-1 min-w-0">
          <Link href="/pacientes" className="text-[12px] text-slate-400 hover:text-slate-700 font-medium shrink-0">
            Pacientes
          </Link>
          <Icon name="chevron_right" size={14} className="text-slate-300 shrink-0" />
          <span className="text-[12px] font-semibold text-slate-800 truncate">
            {[p.nombre, p.apellido].filter(Boolean).join(" ")}
          </span>
        </nav>
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href={`/agenda?paciente=${p.id}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[11.5px] font-semibold transition-colors"
          >
            <Icon name="event_available" size={14} />
            <span className="hidden sm:inline">Crear cita</span>
          </Link>
          <Link
            href={`/pacientes/${p.id}/editar`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11.5px] font-semibold transition-colors border border-slate-200"
          >
            <Icon name="edit" size={13} />
            <span className="hidden sm:inline">Editar</span>
          </Link>
        </div>
      </div>

      {/* ── Header paciente ── */}
      <div className="px-3 sm:px-6 md:px-8 py-3 sm:py-5 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-start gap-2.5 sm:gap-4">

          {/* Avatar */}
          <div
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-[15px] sm:text-[22px] font-bold text-white shrink-0 select-none uppercase mt-0.5"
            style={{ background: color }}
          >
            {initials([p.nombre, p.apellido].filter(Boolean).join(" "))}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Nombre + alergias en la misma fila */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[14px] sm:text-[19px] font-bold text-slate-900 leading-snug">
                {[p.nombre, p.apellido].filter(Boolean).join(" ")}
              </h1>
              {Array.isArray(p.alergias) && p.alergias.length > 0 && p.alergias.map((a: string) => (
                <span key={a} className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded-full">
                  <Icon name="warning_amber" size={10} className="shrink-0" />{a}
                </span>
              ))}
            </div>

            {/* Chips — flex wrap, una sola fila en mobile */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              <Chip icon="badge"    label={`DNI ${p.dni}`} />
              <Chip icon="cake"     label={`${calcEdad(p.fecha_nacimiento)} años`} />
              {p.telefono       && <Chip icon="phone"     label={p.telefono} />}
              {p.grupo_sanguineo && <Chip icon="bloodtype" label={p.grupo_sanguineo} highlight />}
            </div>

            {/* Próxima cita — solo sm+ para no saturar mobile */}
            <div className="hidden sm:block mt-2.5">
              <ProximaCitaDisplay fecha={proximaCita?.fecha ?? null} />
            </div>
          </div>

          {/* Menú 3 puntos */}
          <div className="relative shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <Icon name="more_vert" size={17} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-30 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden w-44"
                onClick={(e) => e.stopPropagation()}>
                <a href={waLink} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2.5 px-4 py-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <Icon name="chat" size={16} className="text-[#25D366]" />WhatsApp
                </a>
                <button className="w-full flex items-center gap-2.5 px-4 py-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100 border-0">
                  <Icon name="picture_as_pdf" size={16} className="text-red-500" />Exportar PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Layout: sidebar + content ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Sidebar — desktop md+ */}
        <aside className="hidden md:flex flex-col shrink-0 w-52 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-3 flex flex-col gap-0.5">
            {SECTIONS.map(({ key, icon, label }) => {
              const active = sec === key;
              return (
                <button
                  key={key}
                  onClick={() => setSec(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border-0 ${
                    active
                      ? "bg-cyan-50 text-cyan-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Icon name={icon} size={17} className={active ? "text-cyan-600" : "text-slate-400"} />
                  <span className="text-[13px] font-medium">{label}</span>
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-500" />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Columna principal: tabs móvil + contenido */}
        <div className="flex flex-col flex-1 min-h-0 min-w-0">

          {/* Tabs móvil — scroll horizontal, sticky bajo el header */}
          <div className="md:hidden sticky top-0 z-10 bg-white border-b border-slate-200 overflow-x-auto flex shrink-0"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            {SECTIONS.map(({ key, icon, label }) => {
              const active = sec === key;
              return (
                <button
                  key={key}
                  onClick={() => setSec(key)}
                  className={`flex-none flex flex-col items-center gap-1 px-3.5 py-2.5 transition-colors border-0 relative whitespace-nowrap ${
                    active ? "text-cyan-600" : "text-slate-400"
                  }`}
                >
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-cyan-500 rounded-t-full" />
                  )}
                  <Icon name={icon} size={18} />
                  <span className="text-[10px] font-semibold">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Contenido principal */}
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
            {sec === "consulta"      && <SecConsulta historial={historial} pacienteId={p.id} />}
            {sec === "diagnostico"   && <SecDiagnostico historial={historial} />}
            {sec === "historia"      && <SecHistoria paciente={p} />}
            {sec === "odontograma"   && <OdontogramaTab paciente={p} />}
            {sec === "plan"          && <SecPlan historial={historial} />}
            {sec === "tratamiento"   && <SecTratamiento historial={historial} />}
            {sec === "receta"        && <RecetaTab paciente={p} />}
            {sec === "recomendacion" && <SecRecomendacion historial={historial} />}
          </main>

        </div>{/* fin columna principal */}
      </div>{/* fin flex layout */}
    </div>
  );
}

// ─── 1. CONSULTA ──────────────────────────────────────────────────────────────

function SecConsulta({ historial, pacienteId }: { historial: any[]; pacienteId: string }) {
  const router = useRouter();
  const [iniciando, setIniciando] = useState(false);
  const [err, setErr] = useState("");

  async function handleNuevaConsulta() {
    setIniciando(true); setErr("");
    const res = await iniciarConsultaAction(pacienteId);
    if ((res as any)?.consultaId) {
      router.push(`/pacientes/consulta/${(res as any).consultaId}`);
    } else {
      setErr("No se pudo iniciar la consulta.");
      setIniciando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header sección */}
      <div className="flex items-center justify-between">
        <SecHeader icon="stethoscope" title="Consultas" count={historial.length} />
        <button
          onClick={handleNuevaConsulta}
          disabled={iniciando}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-[12.5px] font-semibold transition-colors border-0"
        >
          {iniciando
            ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            : <Icon name="add" size={16} />
          }
          {iniciando ? "Iniciando…" : "Nueva consulta"}
        </button>
      </div>

      {err && (
        <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-[12px] text-red-600 flex items-center gap-2">
          <Icon name="warning" size={13} /> {err}
        </div>
      )}

      {historial.length === 0 ? (
        <EmptyState icon="stethoscope" text="No hay consultas registradas. Inicia una nueva para comenzar el registro clínico." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {historial.map((c: any) => (
            <Link
              key={c.id}
              href={`/pacientes/consulta/${c.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-cyan-200 transition-all block group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                  <Icon name="stethoscope" size={18} className="text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-bold text-slate-900 truncate">
                      {c.motivo || "Consulta sin motivo"}
                    </p>
                    <Icon name="chevron_right" size={15} className="text-slate-300 group-hover:text-cyan-400 transition-colors shrink-0" />
                  </div>
                  <p className="text-[11.5px] text-slate-500">{fmtFull(c.fecha)}</p>
                  {c.doctor && (
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Icon name="person" size={12} />{c.doctor}
                    </p>
                  )}
                </div>
              </div>
              {c.observaciones && (
                <p className="mt-2.5 text-[12px] text-slate-500 leading-relaxed line-clamp-2 pl-13">
                  {c.observaciones}
                </p>
              )}
              {/* Badges resumen */}
              {c.diagnosticos?.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 pl-13">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-semibold">
                    {c.diagnosticos.length} dx
                  </span>
                  {c.diagnosticos[0]?.tratamientos?.length > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-semibold">
                      {c.diagnosticos[0].tratamientos.length} trat.
                    </span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 2. DIAGNÓSTICO ───────────────────────────────────────────────────────────

function SecDiagnostico({ historial }: { historial: any[] }) {
  const all = historial.flatMap((c: any) =>
    (c.diagnosticos || []).map((d: any) => ({
      ...d,
      consultaFecha: c.fecha,
      consultaId: c.id,
      consultaMotivo: c.motivo,
    }))
  );

  return (
    <div className="flex flex-col gap-4">
      <SecHeader icon="biotech" title="Diagnósticos" count={all.length} />

      {all.length === 0 ? (
        <EmptyState icon="biotech" text="No hay diagnósticos registrados aún." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {all.map((d: any) => (
            <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
              {/* Cabecera */}
              <div className="flex items-start gap-2 justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    d.es_definitivo ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {d.es_definitivo ? "Definitivo" : "Presuntivo"}
                  </span>
                  {d.es_tratado && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                      Se trata
                    </span>
                  )}
                </div>
                <span className="text-[10.5px] text-slate-400 shrink-0">{fmtFull(d.consultaFecha)}</span>
              </div>

              <p className="text-[13px] font-semibold text-slate-800 leading-snug">{d.texto}</p>

              {d.cie10 && (
                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-100 rounded-lg w-fit">
                  <span className="text-[10.5px] font-bold text-slate-500">{d.cie10.codigo}</span>
                  <span className="text-[11.5px] text-slate-600">{d.cie10.descripcion}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Icon name="stethoscope" size={12} />
                Consulta: {d.consultaMotivo || "—"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 3. HISTORIA CLÍNICA ──────────────────────────────────────────────────────

function SecHistoria({ paciente: p }: { paciente: any }) {
  const antecedentes = Array.isArray(p.antecedentes) ? p.antecedentes : (p.antecedentes ? [p.antecedentes] : []);
  const ant = p.antecedentes_estructurados || {
    cronicas: antecedentes,
    medicacion_habitual: [],
    quirurgicos: [],
  };
  const alergias = Array.isArray(p.alergias) ? p.alergias : [];

  function v(x: any) {
    return x !== null && x !== undefined && x !== "" ? String(x) : null;
  }

  return (
    <div className="flex flex-col gap-5">
      <SecHeader icon="person" title="Historia clínica" />

      {/* Datos personales */}
      <InfoCard title="Datos personales">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          {v(p.nombre)           && <DataField label="Nombre"           value={p.nombre} />}
          {v(p.apellido)         && <DataField label="Apellido"         value={p.apellido} />}
          {v(p.dni)              && <DataField label="DNI"              value={p.dni} />}
          {v(p.fecha_nacimiento) && <DataField label="Nacimiento"       value={`${fmtFecha(p.fecha_nacimiento)} · ${calcEdad(p.fecha_nacimiento)} años`} />}
          {v(p.sexo)             && <DataField label="Sexo"             value={p.sexo} />}
          {v(p.lugar_nacimiento) && <DataField label="Lugar nac."       value={p.lugar_nacimiento} />}
          {v(p.raza)             && <DataField label="Raza"             value={p.raza} />}
        </div>
      </InfoCard>

      {/* Contacto y domicilio */}
      <InfoCard title="Contacto y domicilio">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          {v(p.telefono)          && <DataField label="Teléfono"   value={p.telefono} />}
          {v(p.email)             && <DataField label="Email"      value={p.email} />}
          {v(p.direccion)         && <DataField label="Dirección"  value={p.direccion} />}
          {v(p.domicilio)         && <DataField label="Domicilio"  value={p.domicilio} />}
          {v(p.lugar_procedencia) && <DataField label="Procedencia" value={p.lugar_procedencia} />}
        </div>
      </InfoCard>

      {/* Datos socioeconómicos */}
      <InfoCard title="Datos socioeconómicos">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          {v(p.ocupacion)         && <DataField label="Ocupación"   value={p.ocupacion} />}
          {v(p.grado_instruccion) && <DataField label="Instrucción" value={p.grado_instruccion} />}
          {v(p.estado_civil)      && <DataField label="Estado civil" value={p.estado_civil} />}
          {v(p.religion)          && <DataField label="Religión"    value={p.religion} />}
        </div>
      </InfoCard>

      {/* Datos clínicos + alergias */}
      <InfoCard title="Datos clínicos">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          {v(p.grupo_sanguineo) && <DataField label="Grupo sanguíneo" value={p.grupo_sanguineo} />}
          {alergias.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Alergias</span>
              <div className="flex flex-wrap gap-1">
                {alergias.map((a: string) => (
                  <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-100">
                    <Icon name="warning_amber" size={11} />{a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        {v(p.enfermedad_actual) && (
          <div className="mt-4 flex flex-col gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Enfermedad actual</span>
            <p className="text-[13px] font-medium text-slate-700 leading-relaxed">{p.enfermedad_actual}</p>
          </div>
        )}
      </InfoCard>

      {/* Antecedentes patológicos */}
      <InfoCard title="Antecedentes patológicos">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AntecedenteGrupo titulo="Enfermedades crónicas"   items={ant.cronicas}           color="rose" />
          <AntecedenteGrupo titulo="Medicación habitual"     items={ant.medicacion_habitual} color="cyan" />
          <AntecedenteGrupo titulo="Antecedentes quirúrgicos" items={ant.quirurgicos}        color="violet" />
        </div>
      </InfoCard>
    </div>
  );
}

// ─── 4. PLAN DE TRABAJO ───────────────────────────────────────────────────────

const PLAN_CFG: Record<string, { bg: string; text: string; label: string }> = {
  hacer:    { bg: "bg-slate-100",    text: "text-slate-600",   label: "Por hacer" },
  haciendo: { bg: "bg-amber-100",   text: "text-amber-700",   label: "Haciendo" },
  hecho:    { bg: "bg-emerald-100", text: "text-emerald-700", label: "Hecho" },
};

function SecPlan({ historial }: { historial: any[] }) {
  const all = historial.flatMap((c: any) =>
    (c.diagnosticos || []).flatMap((d: any) =>
      (d.plan || []).map((p: any) => ({
        ...p,
        dxTexto: d.texto,
        consultaFecha: c.fecha,
      }))
    )
  );

  const pending = all.filter((p: any) => p.estado !== "hecho");
  const done    = all.filter((p: any) => p.estado === "hecho");

  return (
    <div className="flex flex-col gap-4">
      <SecHeader icon="checklist" title="Plan de trabajo" count={all.length} />

      {all.length === 0 ? (
        <EmptyState icon="checklist" text="No hay plan de trabajo registrado." />
      ) : (
        <>
          {pending.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pendientes ({pending.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pending.map((p: any) => <PlanCard key={p.id} item={p} />)}
              </div>
            </div>
          )}
          {done.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completados ({done.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {done.map((p: any) => <PlanCard key={p.id} item={p} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const PLAN_ICON: Record<string, string> = {
  hacer:    "radio_button_unchecked",
  haciendo: "pending",
  hecho:    "task_alt",
};

function PlanCard({ item: p }: { item: any }) {
  const cfg  = PLAN_CFG[p.estado] ?? PLAN_CFG.hacer;
  const icon = PLAN_ICON[p.estado] ?? "radio_button_unchecked";
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-start gap-3 min-h-[72px]">
      {/* Icono identificador de estado */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
        <Icon name={icon} size={20} className={cfg.text} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-slate-800 leading-snug">{p.etapa}</p>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        </div>
        {p.descripcion && <p className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">{p.descripcion}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {p.dxTexto && <span className="text-[10.5px] text-slate-400 truncate max-w-[120px]">{p.dxTexto}</span>}
          {p.tiempo  && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Icon name="schedule" size={11} />{p.tiempo}</span>}
          <span className="text-[10px] text-slate-300">·</span>
          <span className="text-[10px] text-slate-400">{fmtFull(p.consultaFecha)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── 5. TRATAMIENTO ───────────────────────────────────────────────────────────

function SecTratamiento({ historial }: { historial: any[] }) {
  const all = historial.flatMap((c: any) =>
    (c.diagnosticos || []).flatMap((d: any) =>
      (d.tratamientos || []).map((t: any) => ({
        ...t,
        dxTexto: d.texto,
        consultaFecha: c.fecha,
      }))
    )
  );

  const total = all.reduce((sum: number, t: any) => sum + Number(t.precio || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <SecHeader icon="medical_services" title="Tratamientos" count={all.length} />
        {all.length > 0 && (
          <div className="text-right shrink-0">
            <p className="text-[10.5px] text-slate-400">Total acumulado</p>
            <p className="text-[15px] font-bold text-slate-800">{money(total)}</p>
          </div>
        )}
      </div>

      {all.length === 0 ? (
        <EmptyState icon="medical_services" text="No hay tratamientos registrados." />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {all.map((t: any, i: number) => (
            <div key={t.id ?? i} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 truncate">{t.nombre}</p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <p className="text-[11px] text-slate-400 truncate">{t.dxTexto}</p>
                  <span className="text-[10.5px] text-slate-300">·</span>
                  <p className="text-[11px] text-slate-400">{fmtFull(t.consultaFecha)}</p>
                </div>
                {t.notas && <p className="text-[11.5px] text-slate-500 mt-0.5">{t.notas}</p>}
              </div>
              <span className="text-[13px] font-bold text-slate-700 shrink-0">{money(t.precio, t.moneda)}</span>
            </div>
          ))}
          {/* Total */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
            <span className="text-[12px] font-semibold text-slate-600">Total</span>
            <span className="text-[14px] font-bold text-slate-900">{money(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 6. RECOMENDACIÓN ────────────────────────────────────────────────────────

function SecRecomendacion({ historial }: { historial: any[] }) {
  const all = historial.flatMap((c: any) =>
    (c.recomendaciones || []).map((r: any) => ({
      ...r,
      consultaFecha: c.fecha,
    }))
  );

  return (
    <div className="flex flex-col gap-4">
      <SecHeader icon="tips_and_updates" title="Recomendaciones" count={all.length} />

      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Icon name="tips_and_updates" size={26} className="text-amber-400" />
          </div>
          <p className="text-[13px] font-medium text-slate-600">Sin recomendaciones registradas</p>
          <p className="text-[12px] text-slate-400 max-w-xs">
            Las recomendaciones se agregan desde la pestaña de Receta dentro de cada consulta.
          </p>
          <Link
            href="#"
            onClick={e => { e.preventDefault(); }}
            className="mt-1 text-[12px] text-cyan-600 hover:underline font-medium"
          >
            Ir a una consulta para agregar →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {all.map((r: any, i: number) => (
            <div key={r.id ?? i} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <Icon name="tips_and_updates" size={16} className="text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-800">{r.titulo || "Recomendación"}</p>
                  {r.descripcion && <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">{r.descripcion}</p>}
                  <p className="text-[10.5px] text-slate-400 mt-1.5">{fmtFull(r.consultaFecha)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Componentes comunes ──────────────────────────────────────────────────────

function SecHeader({
  icon, title, count,
}: { icon: string; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2.5 mb-1">
      <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
        <Icon name={icon} size={16} className="text-cyan-600" />
      </div>
      <h2 className="text-[16px] font-bold text-slate-900">{title}</h2>
      {count !== undefined && (
        <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[11px] font-semibold">
          {count}
        </span>
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div className="w-[3px] h-[14px] bg-cyan-500 rounded-full shrink-0" />
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-slate-400 font-medium">{label}</span>
      <span className="text-[13px] font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 py-14 flex flex-col items-center justify-center text-center px-6 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
        <Icon name={icon} size={26} className="text-slate-300" />
      </div>
      <p className="text-[13px] text-slate-400 max-w-xs">{text}</p>
    </div>
  );
}

function Chip({ icon, label, highlight }: { icon: string; label: string; highlight?: boolean }) {
  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium ${
      highlight ? "bg-red-50 text-red-700 border border-red-100" : "bg-slate-100 text-slate-600"
    }`}>
      <Icon name={icon} size={11} className="shrink-0" />{label}
    </span>
  );
}

function ProximaCitaDisplay({ fecha }: { fecha: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
        <Icon name="event" size={16} className="text-emerald-500" />
      </div>
      <div>
        <p className="text-[10px] text-slate-400 font-medium leading-tight uppercase tracking-wide">
          Próxima cita
        </p>
        <p className="text-[13px] font-semibold text-slate-700 leading-tight">
          {fecha ? fmtFull(fecha) : "Sin cita programada"}
        </p>
      </div>
    </div>
  );
}

const ANT_COLORS: Record<string, string> = {
  rose:   "bg-rose-50 text-rose-700 border-rose-100",
  cyan:   "bg-cyan-50 text-cyan-700 border-cyan-100",
  violet: "bg-violet-50 text-violet-700 border-violet-100",
};

function AntecedenteGrupo({
  titulo, items, color,
}: { titulo: string; items?: string[]; color: string }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] text-slate-400 font-medium">{titulo}</span>
      {list.length === 0 ? (
        <span className="text-[12px] text-slate-300">—</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {list.map((it) => (
            <span key={it} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${ANT_COLORS[color]}`}>
              {it}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
