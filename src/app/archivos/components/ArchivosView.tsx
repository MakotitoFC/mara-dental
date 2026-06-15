"use client";

import { useState, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { ARCHIVOS_MOCK, TIPO_CFG, fmtFechaArchivo, getArchivosPaciente } from "@/lib/mock-archivos";
import { PACIENTES_MOCK } from "@/lib/mock-pacientes";
import type { Archivo, TipoArchivo } from "@/types/archivo";

type FiltroTipo = TipoArchivo | "todos" | "imagenes" | "documentos";

const FILTROS: { key: FiltroTipo; label: string; icon: string }[] = [
  { key: "todos",                  label: "Todos",          icon: "folder" },
  { key: "imagenes",               label: "Imágenes",       icon: "image" },
  { key: "documentos",             label: "Documentos",     icon: "description" },
  { key: "radiografia_panoramica", label: "Rx Panorámica",  icon: "panorama" },
  { key: "radiografia_periapical", label: "Rx Periapical",  icon: "sensors" },
  { key: "foto_intraoral",         label: "Foto intraoral", icon: "photo_camera" },
  { key: "tomografia",             label: "Tomografía",     icon: "biotech" },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Annotation type ──────────────────────────────────────────────────────────

interface Annotation {
  id: string;
  x: number;  // % relative to image container
  y: number;
  nota: string;
  fecha: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ArchivosView({ pacienteId }: { pacienteId?: string }) {
  const esVistaGlobal = !pacienteId;

  const [archivos, setArchivos] = useState<Archivo[]>(() =>
    pacienteId ? getArchivosPaciente(pacienteId) : [...ARCHIVOS_MOCK]
  );
  const [filtro, setFiltro]         = useState<FiltroTipo>("todos");
  const [query, setQuery]           = useState("");
  const [visor, setVisor]           = useState<Archivo | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [annMap, setAnnMap]         = useState<Record<string, Annotation[]>>({});

  const filtrados = archivos.filter((a) => {
    const matchTipo =
      filtro === "todos"      ? true :
      filtro === "imagenes"   ? a.es_imagen :
      filtro === "documentos" ? !a.es_imagen :
      a.tipo === filtro;
    const matchQuery = query === "" ||
      a.nombre.toLowerCase().includes(query.toLowerCase()) ||
      a.paciente_nombre.toLowerCase().includes(query.toLowerCase()) ||
      (a.notas ?? "").toLowerCase().includes(query.toLowerCase());
    return matchTipo && matchQuery;
  });

  const stats = {
    total:    archivos.length,
    imagenes: archivos.filter((a) => a.es_imagen).length,
    docs:     archivos.filter((a) => !a.es_imagen).length,
    rx:       archivos.filter((a) => a.tipo.startsWith("radiografia")).length,
  };

  function handleSubir(nuevo: Archivo) {
    setArchivos((p) => [nuevo, ...p]);
    setShowUpload(false);
  }

  function handleAddAnnotation(archivoId: string, ann: Annotation) {
    setAnnMap((prev) => ({
      ...prev,
      [archivoId]: [...(prev[archivoId] ?? []), ann],
    }));
  }

  return (
    <div className="p-5 flex flex-col gap-4">

      {/* Stats — solo en vista global */}
      {esVistaGlobal && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon="folder_open"  label="Total archivos"  value={stats.total}    color="#0891b2" />
          <StatCard icon="image"        label="Imágenes"        value={stats.imagenes} color="#059669" />
          <StatCard icon="description"  label="Documentos"      value={stats.docs}     color="#7c3aed" />
          <StatCard icon="sensors"      label="Radiografías"    value={stats.rx}       color="#d97706" />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, paciente o descripción…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-[12px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[12px] font-medium transition-colors shrink-0"
        >
          <Icon name="upload_file" size={15} />
          Subir archivo
        </button>
      </div>

      {/* Filtros de tipo */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTROS.map((f) => {
          const active = filtro === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${
                active
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              <Icon name={f.icon} size={13} />
              {f.label}
            </button>
          );
        })}
        <span className="text-[11px] text-slate-400 ml-1">{filtrados.length} archivo{filtrados.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Grid de archivos */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400">
          <Icon name="folder_open" size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-[13px]">No se encontraron archivos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtrados.map((a) => (
            <ArchivoCard
              key={a.id}
              archivo={a}
              annotationCount={(annMap[a.id] ?? []).length}
              onClick={() => setVisor(a)}
              esVistaGlobal={esVistaGlobal}
            />
          ))}
        </div>
      )}

      {/* Visor */}
      {visor && (
        <VisorModal
          archivo={visor}
          todos={filtrados}
          annotations={annMap[visor.id] ?? []}
          onAddAnnotation={(ann) => handleAddAnnotation(visor.id, ann)}
          onClose={() => setVisor(null)}
          onNav={(a) => setVisor(a)}
        />
      )}

      {/* Upload modal */}
      {showUpload && (
        <SubirModal
          pacienteId={pacienteId}
          onClose={() => setShowUpload(false)}
          onSubir={handleSubir}
        />
      )}
    </div>
  );
}

// ─── Card de archivo ──────────────────────────────────────────────────────────

function ArchivoCard({
  archivo: a, onClick, esVistaGlobal, annotationCount,
}: {
  archivo: Archivo;
  onClick: () => void;
  esVistaGlobal: boolean;
  annotationCount: number;
}) {
  const cfg = TIPO_CFG[a.tipo];
  const [imgError, setImgError] = useState(false);
  const showImg = a.es_imagen && a.preview_url && !imgError;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: cfg.bg }}>
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.preview_url}
            alt={a.nombre}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Icon name={cfg.icon} size={36} style={{ color: cfg.color } as React.CSSProperties} />
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: cfg.color }}>
              {a.nombre.split(".").pop()?.toUpperCase()}
            </span>
          </div>
        )}
        {/* Badge tipo */}
        <span
          className="absolute top-2 left-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}
        >
          {cfg.label}
        </span>
        {/* Badge anotaciones */}
        {annotationCount > 0 && (
          <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "#0891b2" }}>
            {annotationCount}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-[11px] font-semibold text-slate-800 truncate">{a.nombre}</p>
        {esVistaGlobal && (
          <p className="text-[10px] text-slate-400 truncate mt-0.5">{a.paciente_nombre}</p>
        )}
        <p className="text-[10px] text-slate-400 mt-0.5">{fmtFechaArchivo(a.fecha)}</p>
      </div>
    </div>
  );
}

// ─── Visor / Lightbox con anotaciones ────────────────────────────────────────

function VisorModal({
  archivo: a, todos, annotations, onAddAnnotation, onClose, onNav,
}: {
  archivo: Archivo;
  todos: Archivo[];
  annotations: Annotation[];
  onAddAnnotation: (ann: Annotation) => void;
  onClose: () => void;
  onNav: (a: Archivo) => void;
}) {
  const cfg = TIPO_CFG[a.tipo];
  const idx  = todos.findIndex((x) => x.id === a.id);
  const prev = idx > 0 ? todos[idx - 1] : null;
  const next = idx < todos.length - 1 ? todos[idx + 1] : null;

  const [annotating,   setAnnotating]   = useState(false);
  const [pendingPin,   setPendingPin]   = useState<{ x: number; y: number } | null>(null);
  const [pinNota,      setPinNota]      = useState("");
  const [hoveredAnn,   setHoveredAnn]   = useState<string | null>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  function handleImageAreaClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!annotating || !a.es_imagen) return;
    if ((e.target as HTMLElement).closest("[data-pin]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x, y });
    setPinNota("");
  }

  function saveAnnotation() {
    if (!pendingPin || !pinNota.trim()) return;
    onAddAnnotation({
      id:    uid(),
      x:     pendingPin.x,
      y:     pendingPin.y,
      nota:  pinNota.trim(),
      fecha: new Date().toISOString().split("T")[0],
    });
    setPendingPin(null);
    setPinNota("");
  }

  function toggleAnnotating() {
    setAnnotating((v) => !v);
    setPendingPin(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden flex w-full shadow-2xl"
        style={{ maxWidth: 900, maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Panel imagen ── */}
        <div
          ref={imgContainerRef}
          className="flex-1 relative overflow-hidden"
          style={{
            background: "#0f172a",
            minHeight: 300,
            cursor: annotating && a.es_imagen ? "crosshair" : "default",
          }}
          onClick={handleImageAreaClick}
        >
          {a.es_imagen && a.preview_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.preview_url}
                alt={a.nombre}
                className="absolute inset-0 w-full h-full object-contain select-none"
                draggable={false}
              />

              {/* ── Pins existentes ── */}
              {annotations.map((ann, i) => {
                const isHov = hoveredAnn === ann.id;
                return (
                  <div
                    key={ann.id}
                    data-pin="true"
                    className="absolute"
                    style={{
                      left: `${ann.x}%`,
                      top:  `${ann.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 10,
                    }}
                    onMouseEnter={() => setHoveredAnn(ann.id)}
                    onMouseLeave={() => setHoveredAnn(null)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Círculo del pin */}
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white select-none"
                      style={{
                        background: isHov ? "#ef4444" : "#0891b2",
                        border: "2.5px solid white",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                        transition: "background 0.15s",
                      }}
                    >
                      {i + 1}
                    </div>

                    {/* Tooltip al hover */}
                    {isHov && (
                      <div
                        className="absolute z-20 bg-white rounded-xl p-3 shadow-2xl"
                        style={{
                          left: ann.x > 70 ? "auto" : "34px",
                          right: ann.x > 70 ? "34px" : "auto",
                          top: ann.y > 70 ? "auto" : 0,
                          bottom: ann.y > 70 ? 0 : "auto",
                          width: 200,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <p className="text-[11px] font-semibold text-slate-700 mb-1">Nota #{i + 1}</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{ann.nota}</p>
                        <p className="text-[9px] text-slate-400 mt-1.5">{ann.fecha}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── Pin pendiente (en proceso de anotación) ── */}
              {pendingPin && (
                <div
                  data-pin="true"
                  className="absolute"
                  style={{
                    left: `${pendingPin.x}%`,
                    top:  `${pendingPin.y}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 20,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center animate-pulse"
                    style={{
                      background: "#f59e0b",
                      border: "2.5px solid white",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                    }}
                  >
                    <Icon name="add" size={12} className="text-white" />
                  </div>

                  {/* Popup de nota */}
                  <div
                    className="absolute z-30 bg-white rounded-2xl shadow-2xl p-3.5"
                    style={{
                      left: pendingPin.x > 65 ? "auto" : "34px",
                      right: pendingPin.x > 65 ? "34px" : "auto",
                      top: pendingPin.y > 65 ? "auto" : 0,
                      bottom: pendingPin.y > 65 ? 0 : "auto",
                      width: 220,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#f59e0b" }}>
                        <Icon name="pin_drop" size={9} className="text-white" />
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700">Nueva anotación</p>
                    </div>
                    <textarea
                      autoFocus
                      rows={3}
                      value={pinNota}
                      onChange={(e) => setPinNota(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) saveAnnotation(); }}
                      placeholder="Describe la zona o hallazgo clínico…"
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-[11px] outline-none resize-none focus:border-cyan-400"
                      style={{ lineHeight: 1.5 }}
                    />
                    <p className="text-[9px] text-slate-400 mt-1 mb-2">Ctrl+Enter para guardar</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={saveAnnotation}
                        disabled={!pinNota.trim()}
                        className="flex-1 py-1.5 text-[11px] font-semibold text-white rounded-lg disabled:opacity-40 transition-opacity"
                        style={{ background: "#0891b2" }}
                      >
                        Guardar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingPin(null); }}
                        className="flex-1 py-1.5 text-[11px] font-medium text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Documento / sin imagen */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: cfg.bg }}>
                <Icon name={cfg.icon} size={40} style={{ color: cfg.color } as React.CSSProperties} />
              </div>
              <p className="text-white font-medium text-[13px]">{a.nombre}</p>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[12px] transition-colors">
                <Icon name="download" size={15} />
                Descargar
              </button>
            </div>
          )}

          {/* Nav prev/next */}
          {prev && (
            <button
              onClick={(e) => { e.stopPropagation(); onNav(prev); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
              style={{ zIndex: 5 }}
            >
              <Icon name="chevron_left" size={22} />
            </button>
          )}
          {next && (
            <button
              onClick={(e) => { e.stopPropagation(); onNav(next); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
              style={{ zIndex: 5 }}
            >
              <Icon name="chevron_right" size={22} />
            </button>
          )}

          {/* Contador */}
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white/50" style={{ zIndex: 5 }}>
            {idx + 1} / {todos.length}
          </span>

          {/* Badge modo anotación */}
          {annotating && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white"
              style={{ background: "rgba(8,145,178,0.9)", backdropFilter: "blur(4px)", zIndex: 5 }}
            >
              <Icon name="pin_drop" size={13} />
              Modo anotación — haz clic en la imagen
            </div>
          )}
        </div>

        {/* ── Panel info ── */}
        <div className="w-64 shrink-0 flex flex-col border-l border-slate-100">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 gap-2">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              {cfg.label}
            </span>
            <div className="flex items-center gap-1.5">
              {a.es_imagen && (
                <button
                  onClick={toggleAnnotating}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors border"
                  style={
                    annotating
                      ? { background: "#e0f2fe", color: "#0369a1", borderColor: "#7dd3fc" }
                      : { background: "white", color: "#475569", borderColor: "#e2e8f0" }
                  }
                >
                  <Icon name="pin_drop" size={12} />
                  {annotating ? "Salir" : "Anotar"}
                </button>
              )}
              <button onClick={onClose} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
                <Icon name="close" size={15} />
              </button>
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <p className="text-[12px] font-semibold text-slate-900 break-all">{a.nombre}</p>
            <InfoLine icon="person"      label="Paciente" value={a.paciente_nombre} />
            <InfoLine icon="today"       label="Fecha"    value={fmtFechaArchivo(a.fecha)} />
            <InfoLine icon="stethoscope" label="Médico"   value={a.medico} />

            {a.notas && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-500 mb-1">Notas</p>
                <p className="text-[11px] text-slate-700 leading-relaxed">{a.notas}</p>
              </div>
            )}

            {/* Historial de anotaciones */}
            {annotations.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Anotaciones ({annotations.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {annotations.map((ann, i) => {
                    const isHov = hoveredAnn === ann.id;
                    return (
                      <div
                        key={ann.id}
                        className="flex items-start gap-2 p-2.5 rounded-xl border transition-colors cursor-pointer"
                        style={{ borderColor: isHov ? "#7dd3fc" : "#f1f5f9", background: isHov ? "#f0f9ff" : "white" }}
                        onMouseEnter={() => setHoveredAnn(ann.id)}
                        onMouseLeave={() => setHoveredAnn(null)}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                          style={{ background: isHov ? "#ef4444" : "#0891b2", transition: "background 0.15s" }}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-700 leading-snug">{ann.nota}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{ann.fecha}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Guía de anotación vacía */}
            {annotating && annotations.length === 0 && !pendingPin && (
              <div className="bg-cyan-50 rounded-xl p-3 text-center">
                <Icon name="pin_drop" size={22} className="mx-auto mb-1.5 text-cyan-500" />
                <p className="text-[11px] text-cyan-700 font-medium leading-relaxed">
                  Haz clic en cualquier zona de la imagen para agregar una nota médica
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors w-full">
              <Icon name="download" size={14} className="text-cyan-600" />
              Descargar archivo
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-100 text-[12px] text-red-500 hover:bg-red-50 transition-colors w-full">
              <Icon name="delete" size={14} />
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal subir archivo ──────────────────────────────────────────────────────

function SubirModal({
  pacienteId, onClose, onSubir,
}: {
  pacienteId?: string;
  onClose: () => void;
  onSubir: (a: Archivo) => void;
}) {
  const today    = new Date().toISOString().split("T")[0];
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedPaciente, setSelectedPaciente] = useState(pacienteId ?? "");
  const [tipo, setTipo]         = useState<TipoArchivo>("radiografia_periapical");
  const [notas, setNotas]       = useState("");
  const [file, setFile]         = useState<File | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(f: File) {
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleSubir() {
    if (!selectedPaciente || !file) return;
    const pac      = PACIENTES_MOCK.find((p) => p.id === selectedPaciente);
    const esImagen = file.type.startsWith("image/");
    const nuevo: Archivo = {
      id:               uid(),
      paciente_id:      selectedPaciente,
      paciente_nombre:  pac?.nombre ?? "Paciente",
      tipo,
      nombre:           file.name,
      fecha:            today,
      medico:           "Dr. García",
      notas:            notas || undefined,
      es_imagen:        esImagen,
      preview_url:      preview ?? undefined,
    };
    onSubir(nuevo);
  }

  const canSubir = selectedPaciente && file;
  const cfg      = TIPO_CFG[tipo];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden"
        style={{ maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-[14px] font-semibold text-slate-900">Subir archivo clínico</p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Zona de drop */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
              dragging ? "border-cyan-400 bg-cyan-50" : "border-slate-200 hover:border-cyan-300 hover:bg-slate-50"
            }`}
            style={{ minHeight: 160 }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf,.dcm"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="max-h-36 rounded-xl object-contain" />
            ) : file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: cfg.bg }}>
                  <Icon name={cfg.icon} size={24} style={{ color: cfg.color } as React.CSSProperties} />
                </div>
                <p className="text-[12px] font-medium text-slate-700">{file.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Icon name="cloud_upload" size={32} />
                <p className="text-[13px] font-medium">Arrastra o haz clic para seleccionar</p>
                <p className="text-[11px]">JPEG, PNG, PDF · Máx. 50 MB</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Paciente */}
            {!pacienteId && (
              <div className="col-span-2">
                <FormLabel>Paciente</FormLabel>
                <select
                  value={selectedPaciente}
                  onChange={(e) => setSelectedPaciente(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-cyan-500"
                >
                  <option value="">— Seleccionar paciente —</option>
                  {PACIENTES_MOCK.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tipo */}
            <div>
              <FormLabel>Tipo de archivo</FormLabel>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoArchivo)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-cyan-500"
              >
                {(Object.keys(TIPO_CFG) as TipoArchivo[]).map((k) => (
                  <option key={k} value={k}>{TIPO_CFG[k].label}</option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <FormLabel>Fecha</FormLabel>
              <input
                type="date"
                defaultValue={today}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <FormLabel>Notas / descripción</FormLabel>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones sobre el archivo…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-cyan-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-[12px] font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubir}
            disabled={!canSubir}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[12px] font-medium transition-colors"
          >
            <Icon name="cloud_upload" size={14} />
            Subir archivo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "15" }}>
        <Icon name={icon} size={20} style={{ color } as React.CSSProperties} />
      </div>
      <div>
        <p className="text-[20px] font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function InfoLine({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon name={icon} size={13} className="text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-[11px] text-slate-700 font-medium">{value}</p>
      </div>
    </div>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{children}</label>;
}
