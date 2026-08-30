"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextInput } from "@/components/ui/TextInput";
import { VisorModal } from "@/app/(panel)/pacientes/[id]/components/consulta/VisorModal";
import { getArchivosGlobalAction, type ArchivoGlobal } from "../actions";

type FiltroTipo = "todos" | "imagenes" | "documentos" | "Rx panoramica" | "Rx periapical" | "Foto intraoral" | "Tomografia";

const FILTROS: { key: FiltroTipo; label: string; icon: string }[] = [
  { key: "todos",           label: "Todos",          icon: "folder" },
  { key: "imagenes",        label: "Imágenes",       icon: "image" },
  { key: "documentos",      label: "Documentos",     icon: "description" },
  { key: "Rx panoramica",   label: "Rx Panorámica",  icon: "panorama" },
  { key: "Rx periapical",   label: "Rx Periapical",  icon: "sensors" },
  { key: "Foto intraoral",  label: "Foto intraoral", icon: "photo_camera" },
  { key: "Tomografia",      label: "Tomografía",     icon: "biotech" },
];

const CATEGORIA_CFG: Record<string, { color: string; bg: string }> = {
  "Rx panoramica":  { color: "#7c3aed", bg: "#7c3aed15" },
  "Rx periapical":  { color: "#0891b2", bg: "#0891b215" },
  "Foto intraoral": { color: "#059669", bg: "#05966915" },
  "Tomografia":     { color: "#dc2626", bg: "#dc262615" },
  otros:            { color: "#64748b", bg: "#64748b15" },
};

function fmtFechaArchivo(iso: string) {
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function isImagen(a: ArchivoGlobal) {
  return a.tipo_archivo === "image" || /\.(jpg|jpeg|png|gif|webp)$/i.test(a.nombre_archivo);
}

export function ArchivosView() {
  const [archivos, setArchivos] = useState<ArchivoGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroTipo>("todos");
  const [query, setQuery] = useState("");
  const [visor, setVisor] = useState<ArchivoGlobal | null>(null);

  useEffect(() => {
    getArchivosGlobalAction().then((data) => { setArchivos(data); setLoading(false); });
  }, []);

  const filtrados = archivos.filter((a) => {
    const matchTipo =
      filtro === "todos" ? true :
      filtro === "imagenes" ? isImagen(a) :
      filtro === "documentos" ? !isImagen(a) :
      a.categoria === filtro;
    const matchQuery = query === "" ||
      a.nombre_archivo.toLowerCase().includes(query.toLowerCase()) ||
      a.paciente_nombre.toLowerCase().includes(query.toLowerCase()) ||
      (a.descripcion ?? "").toLowerCase().includes(query.toLowerCase());
    return matchTipo && matchQuery;
  });

  const stats = {
    total: archivos.length,
    imagenes: archivos.filter(isImagen).length,
    docs: archivos.filter((a) => !isImagen(a)).length,
    rx: archivos.filter((a) => a.categoria?.startsWith("Rx")).length,
  };

  return (
    <div className="p-0 sm:p-2 flex flex-col gap-4">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="folder_open" label="Total archivos" value={stats.total} color="#0891b2" />
        <StatCard icon="image" label="Imágenes" value={stats.imagenes} color="#059669" />
        <StatCard icon="description" label="Documentos" value={stats.docs} color="#7c3aed" />
        <StatCard icon="sensors" label="Radiografías" value={stats.rx} color="#d97706" />
      </div>

      {/* Buscador */}
      <div className="relative">
 <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, paciente o descripción…"
          className="pl-9 pr-4 text-[12px]"
        />
      </div>

      {/* Filtros */}
      <div className="relative -mx-4 px-4 overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 pr-12 select-none">
          {FILTROS.map((f) => {
            const active = filtro === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all shrink-0 border outline-none focus:outline-none ${active
                    ? "bg-cyan-600 border-cyan-600 text-white"
 :"bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
              >
                <Icon name={f.icon} size={13} />
                {f.label}
              </button>
            );
          })}
 <span className="text-[11px] text-slate-400 ml-1 whitespace-nowrap shrink-0">
            {filtrados.length} ({filtro === "todos" ? "Total" : "Filtrados"})
          </span>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer rounded-2xl aspect-square sm:aspect-4/3" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
 <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon="folder_open" title="No se encontraron archivos" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtrados.map((a) => (
            <ArchivoCard key={a.id} archivo={a} onClick={() => setVisor(a)} />
          ))}
        </div>
      )}

      {/* Visor */}
      <AnimatePresence>
        {visor && (
          <VisorModal
            archivo={visor as any}
            todos={filtrados as any}
            paciente={{ id: visor.paciente_id ?? "", nombre: visor.paciente_nombre }}
            onClose={() => setVisor(null)}
            onNav={(a) => setVisor(a as any)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Card de archivo ──────────────────────────────────────────────────────────

function ArchivoCard({ archivo: a, onClick }: { archivo: ArchivoGlobal; onClick: () => void }) {
  const cfg = CATEGORIA_CFG[a.categoria] ?? CATEGORIA_CFG.otros;
  const showImg = isImagen(a) && a.displayUrl;

  return (
    <div
      onClick={onClick}
 className="bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group flex sm:flex-col"
    >
 <div className="relative aspect-square sm:aspect-4/3 w-28 sm:w-full shrink-0 overflow-hidden bg-slate-100" style={{ background: cfg.bg }}>
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.displayUrl} alt={a.nombre_archivo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            <Icon name={isImagen(a) ? "image" : "description"} size={28} style={{ color: cfg.color }} />
            <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: cfg.color }}>
              {a.nombre_archivo.split(".").pop()?.toUpperCase()}
            </span>
          </div>
        )}
        <span
          className="absolute top-1.5 left-1.5 text-[8px] sm:text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}
        >
          {a.categoria}
        </span>
      </div>

      <div className="p-3 flex flex-col justify-center min-w-0 flex-1">
 <p className="text-[12px] sm:text-[11px] font-semibold text-slate-800 truncate">{a.nombre_archivo}</p>
 <p className="text-[11px] sm:text-[10px] text-slate-400 truncate mt-0.5">{a.paciente_nombre}</p>
 <p className="text-[11px] sm:text-[10px] text-slate-400 mt-0.5">{fmtFechaArchivo(a.fecha_subida)}</p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
 <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "10", color }}>
        <Icon name={icon} size={18} />
      </div>
      <div>
 <p className="text-[16px] font-bold text-slate-800 leading-none">{value}</p>
 <p className="text-[10px] text-slate-400 font-medium mt-1">{label}</p>
      </div>
    </div>
  );
}
