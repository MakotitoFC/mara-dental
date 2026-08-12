"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Icon } from "@/components/ui/Icon";
import { fadeIn, slideUp } from "@/lib/animations";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import { updateAnotacionesAction, getSedeInfoAction } from "../../consulta.actions";
import {
  buildLetterheadHeader, buildLetterheadFooter, buildSignatureBlock, sectionLabel, wrapDocument, fmtGenerado as fmtGeneradoShared,
  type ClinicaInfo,
} from "@/lib/reportExport";

interface Archivo {
  id: number | string;
  nombre_archivo: string;
  url: string;
  tipo_archivo: string;
  categoria: string;
  descripcion?: string | null;
  fecha_subida?: string;
  anotaciones?: any[];
  displayUrl?: string;
  personal?: { nombre: string; apellido: string; url_firma_digital?: string | null; num_colegiatura?: string | null; especialidad?: { especialidad: string } | null } | null;
}

type Mode = "view" | "pin" | "draw" | "arrow" | "text" | "eraser" | "pan";
type Pt = { x: number; y: number };

const MODE_HINT: Record<Exclude<Mode, "view">, { icon: string; text: string; bg: string }> = {
  pin: { icon: "pin_drop", text: "Modo anotación — haz clic en la imagen", bg: "rgba(8,145,178,0.9)" },
  draw: { icon: "draw", text: "Modo dibujo — arrastra sobre la imagen", bg: "rgba(239,68,68,0.9)" },
  arrow: { icon: "arrow_diagonal", text: "Modo flecha — arrastra para dibujarla", bg: "rgba(124,58,237,0.9)" },
  text: { icon: "text_fields", text: "Modo texto — haz clic para escribir", bg: "rgba(8,145,178,0.9)" },
  eraser: { icon: "eraser", text: "Modo borrador — haz clic o arrastra sobre una anotación", bg: "rgba(100,116,139,0.9)" },
  pan: { icon: "pan_tool", text: "Modo mano — arrastra para desplazarte por la imagen", bg: "rgba(15,118,110,0.9)" },
};

const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#ffffff", "#000000"];

function fmtFecha(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function getInitials(nombre: string, apellido: string) {
  return `${nombre?.[0] ?? ""}${apellido?.[0] ?? ""}`.toUpperCase();
}

function distToSegment(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function drawArrowOnCanvas(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, lineWidth = 3) {
  const headlen = lineWidth * 3.3;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function esc(s?: string | number | null) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildReportHtml(opts: {
  clinica: ClinicaInfo | null;
  pacienteNombre?: string | null;
  pacienteId?: string | number | null;
  archivoId: number;
  nombreArchivo: string;
  categoria: string;
  tipoArchivo: string;
  fechaSubida?: string | null;
  descripcion?: string | null;
  doctorNombre?: string | null;
  doctorEspecialidad?: string | null;
  doctorNumColegiatura?: string | null;
  firmaSrc?: string | null;
  generado: string;
  imagenSrc: string;
  relacionados: { nombre: string; categoria: string }[];
}): string {
  const row = (label: string, value?: string | null) =>
    value ? `<div style="margin-bottom:12px;"><div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">${esc(label)}</div><div style="font-size:12.5px;color:#1e293b;font-weight:600;">${esc(value)}</div></div>` : "";

  const docCode = `Archivo #${opts.archivoId}`;
  const header = buildLetterheadHeader({
    clinica: opts.clinica,
    docLabel: "Archivo Clínico",
    docCode,
    pacienteNombre: opts.pacienteNombre,
    generado: opts.generado,
  });

  const relacionadosHtml = opts.relacionados.length > 0 ? `
    <div style="padding:20px 28px 0;">
      ${sectionLabel("Archivos relacionados de esta consulta")}
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${opts.relacionados.map((r) => `
          <span style="display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border-radius:8px;background:#ecfeff;color:#0e7490;font-size:11px;font-weight:600;">
            ${esc(r.nombre)} <span style="color:#67a3ae;font-weight:500;">(${esc(r.categoria)})</span>
          </span>
        `).join("")}
      </div>
    </div>
  ` : "";

  const body = `
    <div style="display:flex;padding:24px 28px 0;gap:24px;">
      <div style="flex:1;min-width:0;">
        ${sectionLabel("Imagen clínica")}
        <div style="position:relative;border-radius:10px;overflow:hidden;background:#0f172a;min-height:320px;display:flex;align-items:center;justify-content:center;">
          <img src="${opts.imagenSrc}" style="max-width:100%;max-height:460px;object-fit:contain;" crossorigin="anonymous" />
          <span style="position:absolute;top:12px;right:12px;padding:3px 9px;border-radius:6px;background:rgba(15,23,42,0.75);color:#fff;font-size:10px;font-weight:700;">${esc(docCode)}</span>
        </div>
      </div>
      <div style="width:230px;flex-shrink:0;">
        ${sectionLabel("Datos del archivo")}
        ${row("Paciente", opts.pacienteNombre)}
        ${row("ID Paciente", opts.pacienteId != null ? String(opts.pacienteId) : undefined)}
        ${row("Archivo", opts.nombreArchivo)}
        ${row("Categoría", opts.categoria)}
        ${row("Tipo", opts.tipoArchivo === "image" ? "Imagen" : "PDF")}
        ${row("Fecha", opts.fechaSubida)}
        ${opts.doctorNombre ? `
          <div style="margin-top:6px;padding-top:14px;border-top:1px solid #e2e8f0;">
            <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Atendido por</div>
            <div style="font-size:12.5px;color:#1e293b;font-weight:700;">Dr. ${esc(opts.doctorNombre)}</div>
            ${opts.doctorEspecialidad ? `<div style="font-size:10.5px;color:#0e7490;font-weight:600;">${esc(opts.doctorEspecialidad)}</div>` : ""}
          </div>
        ` : ""}
      </div>
    </div>

    ${opts.descripcion ? `
      <div style="padding:20px 28px 0;">
        ${sectionLabel("Observaciones clínicas")}
        <div style="background:#f8fafc;border-radius:10px;padding:14px 16px;font-size:12px;color:#334155;line-height:1.65;">${esc(opts.descripcion)}</div>
      </div>
    ` : ""}

    ${relacionadosHtml}

    <div style="padding:20px 28px 24px;display:flex;justify-content:flex-end;">
      ${buildSignatureBlock({ nombre: opts.doctorNombre, especialidad: opts.doctorEspecialidad, numColegiatura: opts.doctorNumColegiatura, firmaUrl: opts.firmaSrc })}
    </div>
  `;

  return wrapDocument(`${header}${body}${buildLetterheadFooter({ clinica: opts.clinica, pacienteNombre: opts.pacienteNombre, docCode })}`, 900);
}

/** Overlay de "gira tu dispositivo" — solo mobile, mientras se edita (fullscreen)
 * en vertical. Fondo negro traslúcido (no opaco) + ícono de teléfono animado
 * rotando entre vertical/horizontal, enmarcado por dos flechas curvas. Se
 * puede descartar tocando la pantalla (por si el usuario no quiere girarla). */
function RotateDevicePrompt({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="fixed inset-0 z-110 flex flex-col items-center justify-center gap-6 bg-black/60"
      onClick={onDismiss}
    >
      <div className="relative w-30 h-30 flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full" fill="none">
          <path d="M 60 6 A 54 54 0 0 1 111 45" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          <polygon points="111,45 102,36 118,32" fill="white" opacity="0.85" />
          <path d="M 60 114 A 54 54 0 0 1 9 75" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          <polygon points="9,75 18,84 2,88" fill="white" opacity="0.85" />
        </svg>
        <motion.div
          className="w-11 h-19 rounded-[10px] border-[3px] border-white flex items-start justify-center pt-1.5"
          animate={{ rotate: [0, 90, 90, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.45, 0.85, 1], ease: "easeInOut" }}
        >
          <span className="w-3 h-0.5 rounded-full bg-white/90" />
        </motion.div>
      </div>
      <div className="flex flex-col items-center gap-1.5 px-10">
        <p className="text-white text-[13px] font-semibold text-center leading-relaxed">
          Gira tu dispositivo para editar la imagen
        </p>
        <p className="text-white/60 text-[11px] text-center">Toca la pantalla para continuar sin girar</p>
      </div>
    </div>
  );
}

function ToolButton({ icon, label, active, onClick, disabled }: {
  icon: string; label: string; active?: boolean; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? "bg-cyan-50 text-cyan-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      <Icon name={icon} size={16} />
      <span className="text-[8.5px] font-bold uppercase tracking-wide">{label}</span>
    </button>
  );
}

export function VisorModal({
  archivo: initialArchivo,
  todos,
  paciente,
  onClose,
  onNav,
  onNavigateTab,
}: {
  archivo: Archivo;
  todos: Archivo[];
  paciente?: { id: number | string; nombre_completo?: string; nombre?: string; apellido?: string } | null;
  onClose: () => void;
  onNav: (a: Archivo) => void;
  onNavigateTab?: (t: string) => void;
}) {
  const idx = todos.findIndex((x) => x.id === initialArchivo.id);
  const prev = idx > 0 ? todos[idx - 1] : null;
  const next = idx < todos.length - 1 ? todos[idx + 1] : null;

  const a = initialArchivo;
  const isImage = a.tipo_archivo === "imagen" || a.nombre_archivo.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const rawImgUrl = a.displayUrl || a.url;
  const imgUrl = `/api/proxy-image?url=${encodeURIComponent(rawImgUrl)}`;

  const [anotacionesState, setAnotacionesState] = useState<any[]>(a.anotaciones || []);
  const anotacionesRef = useRef<any[]>(a.anotaciones || []);
  const anotaciones = anotacionesState;

  function setAnotaciones(newArr: any[]) {
    anotacionesRef.current = newArr;
    setAnotacionesState(newArr);
  }

  const [mode, setMode] = useState<Mode>("view");

  // Pines
  const [pendingPin, setPendingPin] = useState<Pt | null>(null);
  const [pinNota, setPinNota] = useState("");

  // Texto
  const [pendingText, setPendingText] = useState<Pt | null>(null);
  const [textValue, setTextValue] = useState("");

  const [hoveredAnn, setHoveredAnn] = useState<string | null>(null);
  const [annotationToDelete, setAnnotationToDelete] = useState<string | null>(null);

  // Draw / Arrow
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const isDrawingRef = useRef(false);
  const strokeRef = useRef<Pt[]>([]);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [color, setColor] = useState("#ef4444");
  const [arrowPreview, setArrowPreview] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const pines = anotaciones.filter((x) => x.type === "pin");
  const textos = anotaciones.filter((x) => x.type === "text");
  const draws = anotaciones.filter((x) => x.type === "draw");
  const arrows = anotaciones.filter((x) => x.type === "arrow");

  useBodyScrollLock();
  const isMobile = useIsMobile();
  const [fullscreen, setFullscreen] = useState(false);
  const hideMobileTools = isMobile && !fullscreen;
  const [zoom, setZoom] = useState(1);

  // Al editar en mobile (fullscreen) conviene el apaisado — se pide girar el
  // celular en vez de forzar los controles a caber en un ancho angosto.
  const [isPortrait, setIsPortrait] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(orientation: portrait)");
    setIsPortrait(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  // El usuario puede descartar el aviso tocando la pantalla si no quiere
  // girar el celular — se reactiva si sale y vuelve a entrar en modo edición,
  // o si rota a horizontal y vuelve a vertical más tarde.
  const [rotateDismissed, setRotateDismissed] = useState(false);
  useEffect(() => { if (!fullscreen || !isPortrait) setRotateDismissed(false); }, [fullscreen, isPortrait]);
  const showRotatePrompt = isMobile && fullscreen && isPortrait && !rotateDismissed;

  // Tope de tamaño de la imagen medido en píxeles reales del viewport (no un
  // % ni un vh fijo) — así la imagen usa TODO el espacio disponible en cada
  // breakpoint/orientación sin depender de una estimación (antes era
  // max-h-[85vh], que podía quedar corto o largo según el layout real).
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewportSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // El overlay de trazos/flechas debe re-alinearse cuando la imagen cambia de
  // tamaño (antes solo se ajustaba una vez, al cargar la imagen).
  useEffect(() => {
    if (!viewportSize) return;
    const id = requestAnimationFrame(() => handleResizeCanvas());
    return () => cancelAnimationFrame(id);
  }, [viewportSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const ZOOM_MIN = 1;
  const ZOOM_MAX = 3;
  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + 0.5).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - 0.5).toFixed(2)));
  const zoomReset = () => setZoom(1);

  const [sede, setSede] = useState<{ nombre_clinica?: string; direccion?: string; telefono?: string; email_contacto?: string } | null>(null);
  useEffect(() => {
    getSedeInfoAction().then(setSede).catch(() => {});
  }, []);

  useEffect(() => {
    setAnotaciones(initialArchivo.anotaciones || []);
    setMode("view");
    setPendingPin(null);
    setPendingText(null);
    setZoom(1);
  }, [initialArchivo]);

  useEffect(() => {
    redrawCanvas();
  }, [anotaciones, mode, arrowPreview]); // eslint-disable-line react-hooks/exhaustive-deps

  function redrawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    draws.forEach((drawLayer) => {
      drawLayer.strokes?.forEach((stroke: any) => {
        if (!stroke.points || stroke.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width || 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        stroke.points.forEach((pt: any, i: number) => {
          const px = (pt.x / 100) * canvas.width;
          const py = (pt.y / 100) * canvas.height;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      });
    });

    arrows.forEach((ar) => {
      drawArrowOnCanvas(
        ctx,
        (ar.x1 / 100) * canvas.width, (ar.y1 / 100) * canvas.height,
        (ar.x2 / 100) * canvas.width, (ar.y2 / 100) * canvas.height,
        ar.color || "#ef4444",
      );
    });

    if (arrowPreview) {
      drawArrowOnCanvas(
        ctx,
        (arrowPreview.x1 / 100) * canvas.width, (arrowPreview.y1 / 100) * canvas.height,
        (arrowPreview.x2 / 100) * canvas.width, (arrowPreview.y2 / 100) * canvas.height,
        color,
      );
    }
  }

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  function handleUpdateDB(newArr: any[]) {
    setAnotaciones(newArr);
    a.anotaciones = newArr;
    updateAnotacionesAction(String(a.id), newArr).catch((err) => console.error(err));
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isImage) return;
    if ((e.target as HTMLElement).closest("[data-pin]") || (e.target as HTMLElement).closest("[data-text]")) return;
    if (mode === "view") {
      if (!fullscreen) setFullscreen(true);
      return;
    }
    if (mode !== "pin" && mode !== "text") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (mode === "pin") {
      setPendingPin({ x, y });
      setPinNota("");
    } else {
      setPendingText({ x, y });
      setTextValue("");
    }
  }

  async function savePin() {
    if (!pendingPin || !pinNota.trim()) return;
    const newAnn = {
      type: "pin",
      id: uid(),
      x: pendingPin.x,
      y: pendingPin.y,
      nota: pinNota.trim(),
      fecha: new Date().toISOString().split("T")[0],
    };
    handleUpdateDB([...anotacionesRef.current, newAnn]);
    setPendingPin(null);
    setPinNota("");
  }

  async function saveText() {
    if (!pendingText || !textValue.trim()) { setPendingText(null); setTextValue(""); return; }
    const newAnn = {
      type: "text",
      id: uid(),
      x: pendingText.x,
      y: pendingText.y,
      texto: textValue.trim(),
      color,
      fecha: new Date().toISOString().split("T")[0],
    };
    handleUpdateDB([...anotacionesRef.current, newAnn]);
    setPendingText(null);
    setTextValue("");
  }

  function deleteAnnotation(id: string) {
    setAnnotationToDelete(id);
  }

  function confirmDeleteAnnotation() {
    if (!annotationToDelete) return;
    handleUpdateDB(anotacionesRef.current.filter((x) => x.id !== annotationToDelete));
    setAnnotationToDelete(null);
  }

  function handleUndo() {
    if (anotacionesRef.current.length === 0) return;
    handleUpdateDB(anotacionesRef.current.slice(0, -1));
  }

  function eraseAt(pt: Pt) {
    const THRESH = 3;
    let victimId: string | null = null;
    let victimDist = THRESH;

    for (const p of pines) {
      const d = Math.hypot(p.x - pt.x, p.y - pt.y);
      if (d < victimDist) { victimId = p.id; victimDist = d; }
    }
    for (const t of textos) {
      const d = Math.hypot(t.x - pt.x, t.y - pt.y);
      if (d < victimDist) { victimId = t.id; victimDist = d; }
    }
    for (const ar of arrows) {
      const d = distToSegment(pt, { x: ar.x1, y: ar.y1 }, { x: ar.x2, y: ar.y2 });
      if (d < victimDist) { victimId = ar.id; victimDist = d; }
    }
    for (const dr of draws) {
      for (const s of dr.strokes || []) {
        for (const sp of s.points || []) {
          const d = Math.hypot(sp.x - pt.x, sp.y - pt.y);
          if (d < victimDist) { victimId = dr.id; victimDist = d; }
        }
      }
    }

    if (victimId) {
      handleUpdateDB(anotacionesRef.current.filter((x) => x.id !== victimId));
    }
  }

  // Mouse / touch handlers
  function getCanvasPoint(e: React.MouseEvent | React.TouchEvent): Pt | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    return { x, y };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (mode === "pan") {
      const vp = viewportRef.current;
      if (!vp) return;
      if (e.cancelable && e.type !== "touchstart") e.preventDefault();
      const point = "touches" in e ? e.touches[0] : e;
      panStartRef.current = { x: point.clientX, y: point.clientY, scrollLeft: vp.scrollLeft, scrollTop: vp.scrollTop };
      isDrawingRef.current = true;
      return;
    }
    if (mode !== "draw" && mode !== "arrow" && mode !== "eraser") return;
    if (e.cancelable && e.type !== "touchstart") e.preventDefault();
    const pt = getCanvasPoint(e);
    if (!pt) return;
    isDrawingRef.current = true;

    if (mode === "draw") {
      strokeRef.current = [pt];
    } else if (mode === "arrow") {
      strokeRef.current = [pt];
      setArrowPreview({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
    } else if (mode === "eraser") {
      eraseAt(pt);
    }
  }

  function moveDraw(e: React.MouseEvent | React.TouchEvent) {
    if (mode === "pan") {
      if (!isDrawingRef.current || !panStartRef.current) return;
      const vp = viewportRef.current;
      if (!vp) return;
      const point = "touches" in e ? e.touches[0] : e;
      const dx = point.clientX - panStartRef.current.x;
      const dy = point.clientY - panStartRef.current.y;
      vp.scrollLeft = panStartRef.current.scrollLeft - dx;
      vp.scrollTop = panStartRef.current.scrollTop - dy;
      return;
    }
    if (!isDrawingRef.current) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;

    if (mode === "draw") {
      const lastPt = strokeRef.current[strokeRef.current.length - 1];
      strokeRef.current.push(pt);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const px1 = (lastPt.x / 100) * canvas.width;
      const py1 = (lastPt.y / 100) * canvas.height;
      const px2 = (pt.x / 100) * canvas.width;
      const py2 = (pt.y / 100) * canvas.height;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();
    } else if (mode === "arrow") {
      const start = strokeRef.current[0];
      if (!start) return;
      setArrowPreview({ x1: start.x, y1: start.y, x2: pt.x, y2: pt.y });
    } else if (mode === "eraser") {
      eraseAt(pt);
    }
  }

  function endDraw() {
    if (mode === "pan") {
      isDrawingRef.current = false;
      panStartRef.current = null;
      return;
    }
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (mode === "draw") {
      const stroke = [...strokeRef.current];
      strokeRef.current = [];
      if (stroke.length < 2) return;
      const newDraw = {
        type: "draw",
        id: uid(),
        strokes: [{ color, width: 3, points: stroke }],
        fecha: new Date().toISOString().split("T")[0],
      };
      handleUpdateDB([...anotacionesRef.current, newDraw]);
    } else if (mode === "arrow") {
      const start = strokeRef.current[0];
      const preview = arrowPreview;
      strokeRef.current = [];
      setArrowPreview(null);
      if (!start || !preview) return;
      const dist = Math.hypot(preview.x2 - preview.x1, preview.y2 - preview.y1);
      if (dist < 1.5) return;
      const newArrow = {
        type: "arrow",
        id: uid(),
        x1: preview.x1, y1: preview.y1, x2: preview.x2, y2: preview.y2,
        color,
        fecha: new Date().toISOString().split("T")[0],
      };
      handleUpdateDB([...anotacionesRef.current, newArrow]);
    }
  }

  function handleResizeCanvas() {
    if (!imgRef.current || !canvasRef.current) return;
    canvasRef.current.width = imgRef.current.clientWidth;
    canvasRef.current.height = imgRef.current.clientHeight;
    redrawCanvas();
  }

  async function forceDownload() {
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = a.nombre_archivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(imgUrl, "_blank");
    }
  }

  async function fetchImageElement(url: string): Promise<{ img: HTMLImageElement; revoke: () => void }> {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("No se pudo cargar la imagen proxy"));
      img.src = blobUrl;
    });
    return { img, revoke: () => window.URL.revokeObjectURL(blobUrl) };
  }

  /** Compone la imagen base + trazos/flechas/pines/textos en un solo canvas a resolución natural. */
  async function composeAnnotatedCanvas(): Promise<HTMLCanvasElement> {
    const { img, revoke } = await fetchImageElement(imgUrl);
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    const canvas = document.createElement("canvas");
    canvas.width = natW;
    canvas.height = natH;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, natW, natH);
    revoke();

    const lw = Math.max(2, natW * 0.004);

    draws.forEach((drawLayer) => {
      drawLayer.strokes?.forEach((stroke: any) => {
        if (!stroke.points || stroke.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = lw;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        stroke.points.forEach((pt: any, i: number) => {
          const px = (pt.x / 100) * natW;
          const py = (pt.y / 100) * natH;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      });
    });

    arrows.forEach((ar) => {
      drawArrowOnCanvas(
        ctx,
        (ar.x1 / 100) * natW, (ar.y1 / 100) * natH,
        (ar.x2 / 100) * natW, (ar.y2 / 100) * natH,
        ar.color || "#ef4444",
        lw,
      );
    });

    pines.forEach((p, i) => {
      const px = (p.x / 100) * natW;
      const py = (p.y / 100) * natH;
      const r = Math.max(10, natW * 0.014);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = "#0891b2";
      ctx.fill();
      ctx.lineWidth = r * 0.25;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(r * 1.1)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), px, py + 1);
    });

    textos.forEach((t) => {
      const px = (t.x / 100) * natW;
      const py = (t.y / 100) * natH;
      const fontSize = Math.max(14, natW * 0.02);
      ctx.font = `bold ${Math.round(fontSize)}px sans-serif`;
      const padX = fontSize * 0.5, padY = fontSize * 0.35;
      const textW = ctx.measureText(t.texto).width;
      const rx = px - textW / 2 - padX, ry = py - fontSize / 2 - padY, rw = textW + padX * 2, rh = fontSize + padY * 2, rr = 6;
      ctx.fillStyle = t.color || "#0891b2";
      ctx.beginPath();
      ctx.moveTo(rx + rr, ry);
      ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, rr);
      ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, rr);
      ctx.arcTo(rx, ry + rh, rx, ry, rr);
      ctx.arcTo(rx, ry, rx + rw, ry, rr);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t.texto, px, py + fontSize * 0.05);
    });

    return canvas;
  }

  async function buildReportHtmlForCurrent(): Promise<string> {
    const canvas = await composeAnnotatedCanvas();
    const imagenSrc = canvas.toDataURL("image/jpeg", 0.92);
    const doctorNombre = a.personal ? `${a.personal.nombre} ${a.personal.apellido}` : undefined;
    const pacienteNombre = paciente?.nombre_completo || (paciente?.nombre ? `${paciente.nombre} ${paciente.apellido ?? ""}`.trim() : undefined);
    const relacionados = todos
      .filter((x) => x.id !== a.id)
      .map((x) => ({ nombre: x.nombre_archivo, categoria: x.categoria }));
    return buildReportHtml({
      clinica: sede,
      pacienteNombre,
      pacienteId: paciente?.id,
      archivoId: a.id as any,
      nombreArchivo: a.nombre_archivo,
      categoria: a.categoria,
      tipoArchivo: a.tipo_archivo,
      fechaSubida: fmtFecha(a.fecha_subida) ?? undefined,
      descripcion: a.descripcion,
      doctorNombre,
      doctorEspecialidad: a.personal?.especialidad?.especialidad,
      doctorNumColegiatura: a.personal?.num_colegiatura,
      firmaSrc: a.personal?.url_firma_digital || null,
      generado: fmtGeneradoShared(),
      imagenSrc,
      relacionados,
    });
  }

  const [exportingReport, setExportingReport] = useState<"png" | "pdf" | "print" | "telegram" | null>(null);

  async function renderReportCanvas(): Promise<HTMLCanvasElement> {
    const html = await buildReportHtmlForCurrent();
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-99999px";
    container.style.top = "0";
    container.innerHTML = html;
    document.body.appendChild(container);
    const imgs = Array.from(container.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((res) => { img.onload = res; img.onerror = res; }))),
    );
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    document.body.removeChild(container);
    return canvas;
  }

  async function handleDownloadReportImage() {
    setExportingReport("png");
    try {
      const canvas = await renderReportCanvas();
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = a.nombre_archivo.replace(/\.[^.]+$/, "") + "_reporte.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Error generando reporte:", e);
    } finally {
      setExportingReport(null);
    }
  }

  async function handleSendTelegram() {
    setExportingReport("telegram");
    try {
      const canvas = await renderReportCanvas();
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], a.nombre_archivo.replace(/\.[^.]+$/, "") + "_reporte.png", { type: "image/png" });
        (window as any).__pendingTelegramFile = file;
        
        if (onNavigateTab) {
          onNavigateTab("chat");
        }
        onClose();
      }, "image/png");
    } catch (e) {
      console.error("Error generating telegram report:", e);
    } finally {
      setExportingReport(null);
    }
  }

  async function handleDownloadPdf() {
    setExportingReport("pdf");
    try {
      const canvas = await renderReportCanvas();
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: canvas.width >= canvas.height ? "landscape" : "portrait", unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
      pdf.save(a.nombre_archivo.replace(/\.[^.]+$/, "") + "_reporte.pdf");
    } catch (e) {
      console.error("Error convirtiendo a PDF:", e);
    } finally {
      setExportingReport(null);
    }
  }

  async function handlePrint() {
    if (!isImage) {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = imgUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      };
      return;
    }

    setExportingReport("print");
    try {
      const html = await buildReportHtmlForCurrent();
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(a.nombre_archivo)}</title></head><body style="margin:0;">${html}</body></html>`);
        doc.close();
      }
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 400);
    } finally {
      setExportingReport(null);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-100 md:flex md:items-center md:justify-center md:p-6">
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ layout: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } }}
        layout
        className={
          fullscreen
            ? "fixed inset-0 w-full h-full max-h-none rounded-none bg-white dark:bg-slate-800 overflow-hidden flex flex-col shadow-2xl"
            : "fixed inset-x-0 bottom-0 max-h-[85vh] w-full rounded-t-2xl md:relative md:max-h-[min(92vh,calc(100dvh-96px))] md:max-w-280 md:rounded-2xl bg-white dark:bg-slate-800 overflow-hidden flex flex-col md:flex-row shadow-2xl"
        }
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {!fullscreen && (
          <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0 absolute top-0 inset-x-0 z-10">
            <span className="w-10 h-1.5 rounded-full bg-white/40" />
          </div>
        )}

        {/* VIEW PORT — el fondo de este contenedor solo debe notarse para archivos
            que no son imagen (PDF, etc.); para imágenes usa el mismo fondo que el
            resto del modal, así el "letterbox" que deja object-contain al no
            deformar la imagen (cuando su proporción no coincide con el marco) no
            se ve como una franja de color distinto — se mezcla con el modal. */}
        <div
          ref={viewportRef}
          className={`relative flex ${isImage ? "bg-white dark:bg-slate-800" : "bg-stone-50 dark:bg-slate-900/50"} ${fullscreen ? "flex-1 min-h-0" : "min-h-45 h-[60vh] md:h-auto md:flex-1"} ${zoom > 1 ? "overflow-auto items-start justify-start" : "overflow-hidden items-center justify-center"}`}
          style={{
            cursor: mode === "pin" || mode === "text" ? "crosshair" : mode === "pan" ? "grab" : mode === "view" && isImage && !fullscreen ? "zoom-in" : "default",
          }}
        >
          {fullscreen && (
            <button
              onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
              aria-label="Salir de pantalla completa"
              className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
              style={{ zIndex: 30 }}
            >
              <Icon name="close" size={18} />
            </button>
          )}
          {isImage && imgUrl ? (
            <div
              ref={containerRef}
              className="relative inline-block"
              style={{ transform: `scale(${zoom})`, transformOrigin: zoom > 1 ? "top left" : "center" }}
              onClick={handleImageClick}
              onMouseDown={startDraw}
              onMouseMove={moveDraw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={moveDraw}
              onTouchEnd={endDraw}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imgUrl}
                alt={a.nombre_archivo}
                crossOrigin="anonymous"
                className="object-contain select-none pointer-events-none"
                draggable={false}
                style={{
                  WebkitUserDrag: "none",
                  maxWidth: viewportSize ? viewportSize.w : "100%",
                  maxHeight: viewportSize ? viewportSize.h : (fullscreen ? "100%" : "85vh"),
                } as React.CSSProperties}
                onLoad={handleResizeCanvas}
              />

              <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ width: "100%", height: "100%" }}
              />

              {/* Pins existentes */}
              {pines.map((ann, i) => {
                const isHov = hoveredAnn === ann.id;
                return (
                  <div
                    key={ann.id}
                    data-pin="true"
                    className="absolute"
                    style={{
                      left: `${ann.x}%`,
                      top: `${ann.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 10,
                    }}
                    onMouseEnter={() => setHoveredAnn(ann.id)}
                    onMouseLeave={() => setHoveredAnn(null)}
                    onClick={(e) => e.stopPropagation()}
                  >
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
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[11px] font-semibold text-slate-700">Nota #{i + 1}</p>
                          <button onClick={() => deleteAnnotation(ann.id)} className="text-red-400 hover:text-red-600">
                            <Icon name="delete" size={14} />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{ann.nota}</p>
                        <p className="text-[9px] text-slate-400 mt-1.5">{ann.fecha}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pin pendiente */}
              {pendingPin && (
                <div
                  data-pin="true"
                  className="absolute"
                  style={{
                    left: `${pendingPin.x}%`,
                    top: `${pendingPin.y}%`,
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
                      onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) savePin(); }}
                      placeholder="Describe la zona o hallazgo clínico…"
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-[16px] sm:text-[13px] outline-none resize-none focus:border-cyan-400"
                      style={{ lineHeight: 1.5 }}
                    />
                    <p className="text-[9px] text-slate-400 mt-1 mb-2">Ctrl+Enter para guardar</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={savePin}
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

              {/* Textos existentes */}
              {textos.map((ann) => {
                const isHov = hoveredAnn === ann.id;
                return (
                  <div
                    key={ann.id}
                    data-text="true"
                    className="absolute"
                    style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: "translate(-50%, -50%)", zIndex: 10 }}
                    onMouseEnter={() => setHoveredAnn(ann.id)}
                    onMouseLeave={() => setHoveredAnn(null)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <span
                        className="inline-block px-2 py-1 rounded-lg text-[12px] font-semibold text-white select-none whitespace-nowrap"
                        style={{ background: ann.color || "#0891b2", boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }}
                      >
                        {ann.texto}
                      </span>
                      {isHov && (
                        <button
                          onClick={() => deleteAnnotation(ann.id)}
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center text-red-500 hover:bg-red-50"
                        >
                          <Icon name="close" size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Texto pendiente */}
              {pendingText && (
                <div
                  data-text="true"
                  className="absolute"
                  style={{ left: `${pendingText.x}%`, top: `${pendingText.y}%`, transform: "translate(-50%, -50%)", zIndex: 20 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-white rounded-xl shadow-2xl p-2 flex items-center gap-1.5" style={{ border: "1px solid #e2e8f0", minWidth: 200 }}>
                    <input
                      autoFocus
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveText();
                        if (e.key === "Escape") { setPendingText(null); setTextValue(""); }
                      }}
                      placeholder="Escribe el texto…"
                      className="flex-1 border-0 outline-none text-[16px] sm:text-[13px] min-w-0"
                    />
                    <button onClick={saveText} disabled={!textValue.trim()}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white disabled:opacity-40 shrink-0" style={{ background: "#0891b2" }}>
                      <Icon name="check" size={14} />
                    </button>
                    <button onClick={() => { setPendingText(null); setTextValue(""); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 shrink-0">
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full h-full justify-center p-4">
              {a.nombre_archivo.match(/\.pdf$/i) ? (
                <iframe src={imgUrl} className="w-full h-full rounded-xl border-0 bg-white" title={a.nombre_archivo} />
              ) : (
                <>
                  <Icon name="description" size={40} className="text-slate-400" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium text-[13px]">{a.nombre_archivo}</p>
                </>
              )}
            </div>
          )}

          {prev && (
            <button
              onClick={(e) => { e.stopPropagation(); onNav(prev); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
              style={{ zIndex: 5 }}
            >
              <Icon name="chevron_left" size={22} />
            </button>
          )}
          {next && (
            <button
              onClick={(e) => { e.stopPropagation(); onNav(next); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
              style={{ zIndex: 5 }}
            >
              <Icon name="chevron_right" size={22} />
            </button>
          )}

          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 dark:text-white/50" style={{ zIndex: 5 }}>
            {idx + 1} / {todos.length}
          </span>

          {mode !== "view" && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white"
              style={{ background: MODE_HINT[mode].bg, backdropFilter: "blur(4px)", zIndex: 5 }}
            >
              <Icon name={MODE_HINT[mode].icon} size={13} />
              {MODE_HINT[mode].text}
            </div>
          )}

          {/* Selector de color — solo para Dibujar / Flecha */}
          {isImage && !hideMobileTools && (mode === "draw" || mode === "arrow") && (
            <div
              className="absolute bottom-16.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white rounded-full shadow-lg border border-slate-200/70 px-2.5 py-1.5"
              style={{ zIndex: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: color === c ? "#0ea5e9" : "transparent", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
                />
              ))}
            </div>
          )}

          {/* Toolbar flotante de anotación */}
          {isImage && !hideMobileTools && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2" style={{ zIndex: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1 bg-white rounded-full shadow-xl border border-slate-200/70 px-2 py-1.5">
                <ToolButton icon="draw" label="Draw" active={mode === "draw"} onClick={() => setMode((m) => (m === "draw" ? "view" : "draw"))} />
                <ToolButton icon="arrow_diagonal" label="Arrow" active={mode === "arrow"} onClick={() => setMode((m) => (m === "arrow" ? "view" : "arrow"))} />
                <ToolButton icon="text_fields" label="Text" active={mode === "text"} onClick={() => setMode((m) => (m === "text" ? "view" : "text"))} />
                <ToolButton icon="pin_drop" label="Pin" active={mode === "pin"} onClick={() => setMode((m) => (m === "pin" ? "view" : "pin"))} />
                <ToolButton icon="eraser" label="Eraser" active={mode === "eraser"} onClick={() => setMode((m) => (m === "eraser" ? "view" : "eraser"))} />
                <ToolButton icon="pan_tool" label="Pan" active={mode === "pan"} onClick={() => setMode((m) => (m === "pan" ? "view" : "pan"))} />
                <div className="w-px h-7 bg-slate-200 mx-1" />
                <ToolButton icon="undo" label="Undo" onClick={handleUndo} disabled={anotaciones.length === 0} />
              </div>
            </div>
          )}

          {/* Controles de zoom */}
          {isImage && !hideMobileTools && (
            <div
              className="absolute bottom-4 right-4 flex items-center gap-0.5 bg-white rounded-full shadow-xl border border-slate-200/70 px-1 py-1"
              style={{ zIndex: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= ZOOM_MIN}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="zoom_out" size={15} />
              </button>
              <button
                type="button"
                onClick={zoomReset}
                className="px-1.5 text-[10.5px] font-bold text-slate-500 hover:text-slate-700 transition-colors min-w-8.5 text-center"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= ZOOM_MAX}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="zoom_in" size={15} />
              </button>
            </div>
          )}
        </div>

        {/* CONTROLES */}
        {!fullscreen && (
        <div className="w-full md:w-85 md:shrink-0 flex flex-col border-t border-slate-100 dark:border-slate-700 md:border-t-0 md:border-l overflow-hidden flex-1 md:flex-none">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 gap-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {a.tipo_archivo}
            </span>
            <button onClick={onClose} className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Icon name="close" size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-4">
            <div>
              <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Detalle del Archivo</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 break-all mt-0.5">{a.nombre_archivo}</p>
            </div>

            <div className="flex flex-col gap-3.5">
              {a.fecha_subida && (
                <div>
                  <p className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Fecha</p>
                  <p className="text-[12.5px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Icon name="calendar_today" size={13} className="text-slate-400 dark:text-slate-500" /> {fmtFecha(a.fecha_subida)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Categoría</p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-2.5 py-1 rounded-full">
                  <Icon name="category" size={12} /> {a.categoria}
                </span>
              </div>
              {a.descripcion && (
                <div>
                  <p className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Descripción</p>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{a.descripcion}</p>
                </div>
              )}
              {a.personal && (
                <div>
                  <p className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Subido por</p>
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-cyan-50 dark:bg-cyan-900/30 border-2 border-cyan-200 dark:border-cyan-800 flex items-center justify-center shrink-0">
                      <span className="text-[10.5px] font-bold text-cyan-700 dark:text-cyan-400">{getInitials(a.personal.nombre, a.personal.apellido)}</span>
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">Dr. {a.personal.nombre} {a.personal.apellido}</p>
                      {a.personal.especialidad?.especialidad && (
                        <p className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate">{a.personal.especialidad.especialidad}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {pines.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Pines ({pines.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {pines.map((ann, i) => {
                    const isHov = hoveredAnn === ann.id;
                    return (
                      <div
                        key={ann.id}
                        className="flex items-start gap-2 p-2.5 rounded-xl border transition-colors cursor-pointer dark:bg-slate-900/50"
                        style={{ borderColor: isHov ? "#7dd3fc" : undefined, background: isHov ? "#0891b21a" : undefined }}
                        onMouseEnter={() => setHoveredAnn(ann.id)}
                        onMouseLeave={() => setHoveredAnn(null)}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                          style={{ background: isHov ? "#ef4444" : "#0891b2", transition: "background 0.15s" }}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">{ann.nota}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">{ann.fecha}</p>
                        </div>
                        <button onClick={() => deleteAnnotation(ann.id)} className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 opacity-50 hover:opacity-100">
                          <Icon name="delete" size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {textos.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Textos ({textos.length})
                </p>
                <div className="flex flex-col gap-1">
                  {textos.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{t.texto}</span>
                      <button onClick={() => deleteAnnotation(t.id)} className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 shrink-0">
                        <Icon name="delete" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {arrows.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Flechas ({arrows.length})
                </p>
                <div className="flex flex-col gap-1">
                  {arrows.map((ar, i) => (
                    <div key={ar.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">Flecha #{i + 1}</span>
                      <button onClick={() => deleteAnnotation(ar.id)} className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400">
                        <Icon name="delete" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {draws.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Trazos de Dibujo ({draws.length})
                </p>
                <div className="flex flex-col gap-1">
                  {draws.map((d, i) => (
                    <div key={d.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">Trazo #{i + 1}</span>
                      <button onClick={() => deleteAnnotation(d.id)} className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400">
                        <Icon name="delete" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2.5">
            {isImage ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleDownloadReportImage} disabled={exportingReport !== null}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-[12.5px] font-semibold transition-colors w-full">
                    <Icon name="download" size={15} />
                    {exportingReport === "png" ? "Generando…" : "PNG"}
                  </button>
                  <button onClick={handleSendTelegram} disabled={exportingReport !== null}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] disabled:opacity-50 text-white text-[12.5px] font-semibold transition-colors w-full">
                    <Icon name="send" size={15} />
                    {exportingReport === "telegram" ? "Preparando…" : "Telegram"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleDownloadPdf} disabled={exportingReport !== null}
                    className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl border border-cyan-600 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 disabled:opacity-50 text-[12px] font-semibold transition-colors">
                    <Icon name="description" size={14} />
                    {exportingReport === "pdf" ? "Generando…" : "PDF"}
                  </button>
                  <button onClick={handlePrint} disabled={exportingReport !== null}
                    className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-[12px] font-semibold transition-colors">
                    <Icon name="print" size={14} />
                    {exportingReport === "print" ? "Preparando…" : "Imprimir"}
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={forceDownload} className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[12px] font-semibold transition-colors">
                  <Icon name="download" size={14} />
                  Descargar
                </button>
                <button onClick={handlePrint} className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-[12px] font-semibold transition-colors">
                  <Icon name="print" size={14} />
                  Imprimir
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </motion.div>

      {showRotatePrompt && <RotateDevicePrompt onDismiss={() => setRotateDismissed(true)} />}

      {/* Modal de confirmación de eliminación de anotación */}
      {annotationToDelete && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 max-w-xs w-full border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 mb-3">
              <Icon name="warning" size={24} />
            </div>
            <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 mb-1">¿Borrar anotación?</h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-5">
              Esta acción eliminará el elemento seleccionado de forma permanente.
            </p>
            <div className="flex gap-2 w-full">
              <button onClick={() => setAnnotationToDelete(null)}
                className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmDeleteAnnotation}
                className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}
