"use client";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { User, Stethoscope, Network, Info, type LucideIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export function esc(s?: string | number | null): string {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Acorta un identificador real (UUID o numérico) a una referencia legible
 * para mostrar en el membrete — nunca se inventa un correlativo, solo se
 * recorta el id real (los primeros 8 caracteres de un UUID ya lo identifican
 * de forma práctica, igual que un hash corto de git). */
export function shortCode(id: string | number): string {
  const s = String(id);
  return s.length > 8 ? s.slice(0, 8).toUpperCase() : s;
}

export function fmtGenerado(): string {
  return new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export interface ClinicaInfo {
  id?: number | string | null;
  nombre_clinica?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email_contacto?: string | null;
}

/** Datos del profesional que firma el documento — todos opcionales porque no
 * todo llamador tiene el join completo disponible. Nunca se inventa un valor
 * cuando falta: cada línea del bloque de firma se omite si no hay dato real. */
export interface FirmanteInfo {
  nombre?: string | null;
  especialidad?: string | null;
  numColegiatura?: string | null;
  firmaUrl?: string | null;
}

/** URL absoluta del logo de marca — usar siempre este helper para que funcione dentro de iframes/canvas offscreen. */
export function logoSrc(): string {
  if (typeof window === "undefined") return "/Cian_MaraDental.png";
  return `${window.location.origin}/Cian_MaraDental.png`;
}

// Cian de marca real (ver src/app/globals.css @theme) — mismo tono que usa
// el reporte del Dashboard Directivo, no el genérico de Tailwind.
const BRAND_CYAN = "#0A8EA0";
const BRAND_CYAN_LIGHT = "#6BBEBC";

/** Ola decorativa de ancho completo — mismo trazo que el membrete del
 * Dashboard Directivo, reutilizada acá para que todos los documentos
 * exportables compartan el mismo lenguaje visual. `preserveAspectRatio="none"`
 * para que se estire al ancho real de cada documento (varía entre 680 y
 * 900px según el llamador) sin distorsionar el resto del layout. */
function letterheadWaveSvg(heightPx: number): string {
  return `
    <svg viewBox="0 0 595 90" preserveAspectRatio="none" style="display:block;width:100%;height:${heightPx}px;">
      <path d="M0,0 L595,0 L595,45 C500,55 450,30 380,40 C300,52 260,25 180,45 C120,60 60,80 0,95 Z" fill="${BRAND_CYAN_LIGHT}" opacity="0.5" />
      <path d="M0,0 L595,0 L595,35 C500,45 450,20 380,30 C300,42 260,15 180,35 C120,50 60,70 0,85 Z" fill="${BRAND_CYAN}" />
    </svg>
  `;
}

const AT_ICON_SVG = `<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:7px;background:rgba(255,255,255,0.22);font-size:8.5px;font-weight:700;color:#FFFFFF;">@</span>`;
const PIN_ICON_SVG = `
  <svg width="12" height="14" viewBox="0 0 24 28" style="display:block;">
    <path d="M12 0C6.5 0 2 4.5 2 10c0 7.5 10 17.5 10 17.5S22 17.5 22 10c0-5.5-4.5-10-10-10z" fill="#FFFFFF" />
    <path d="M12 6a4 4 0 100 8 4 4 0 000-8z" fill="${BRAND_CYAN}" />
  </svg>
`;

/** Encabezado compartido de todos los documentos exportables — ola de marca
 * arriba (mismo diseño que la portada del reporte del Dashboard Directivo),
 * logo + datos de sede a la derecha, etiqueta de tipo de documento + código
 * real + paciente + fecha de generación a la izquierda. `docCode` debe ser un
 * identificador real del sistema (ej. "Presupuesto #12", el código de
 * historia clínica) — nunca un correlativo inventado tipo "PRES-001-2026",
 * ya que ese esquema no existe en la BD. */
export function buildLetterheadHeader(opts: {
  clinica: ClinicaInfo | null;
  docLabel: string;
  docCode: string;
  pacienteNombre?: string | null;
  generado: string;
  pagina?: string;
}): string {
  return `
    <div>
      ${letterheadWaveSvg(100)}
      <div style="display:flex;align-items:flex-end;justify-content:space-between;padding:14px 28px 18px;">
        <div>
          <div style="font-size:9.5px;font-weight:800;color:${BRAND_CYAN};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">${esc(opts.docLabel)}</div>
          <div style="font-size:17px;font-weight:800;color:#1A1A2E;">${esc(opts.docCode)}</div>
          ${opts.pacienteNombre ? `<div style="font-size:11.5px;font-weight:600;color:#2C3E50;margin-top:2px;">${esc(opts.pacienteNombre)}</div>` : ""}
          <div style="font-size:9.5px;color:#95A5A6;margin-top:3px;">Generado: ${esc(opts.generado)}</div>
          ${opts.pagina ? `<div style="font-size:9px;color:#D5D8DC;margin-top:1px;">${esc(opts.pagina)}</div>` : ""}
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="${logoSrc()}" style="height:44px;object-fit:contain;" crossorigin="anonymous" />
          ${opts.clinica?.nombre_clinica ? `
            <div style="text-align:right;">
              <div style="font-size:13px;font-weight:800;color:#1A1A2E;">${esc(opts.clinica.nombre_clinica)}</div>
              ${opts.clinica.direccion ? `<div style="font-size:9.5px;color:#95A5A6;">${esc(opts.clinica.direccion)}</div>` : ""}
            </div>
          ` : ""}
        </div>
      </div>
    </div>
  `;
}

/** Pie compartido — franja recta de marca (mismo diseño que el pie del
 * reporte del Dashboard Directivo) con correo y ubicación de la sede,
 * centrados como un solo grupo. No incluye numeración de página: cada
 * documento la resuelve por su cuenta (ver `downloadHtmlAsPaginatedPdf`, que
 * ya la agrega automáticamente cuando el documento ocupa más de una hoja). */
export function buildLetterheadFooter(opts: { clinica: ClinicaInfo | null; pacienteNombre?: string | null; docCode?: string | null }): string {
  const clinica = opts.clinica;
  if (!clinica?.email_contacto && !clinica?.direccion) return "";
  return `
    <div style="display:flex;align-items:center;justify-content:center;gap:22px;background:${BRAND_CYAN};padding:11px 28px;">
      ${clinica.email_contacto ? `
        <div style="display:inline-flex;align-items:center;gap:6px;">
          ${AT_ICON_SVG}
          <span style="font-size:8px;color:#FFFFFF;font-weight:500;">${esc(clinica.email_contacto)}</span>
        </div>
      ` : ""}
      ${clinica.direccion ? `
        <div style="display:inline-flex;align-items:center;gap:6px;">
          ${PIN_ICON_SVG}
          <span style="font-size:8px;color:#FFFFFF;font-weight:500;">${esc(clinica.direccion)}</span>
        </div>
      ` : ""}
    </div>
  `;
}

/** Trazo genérico de firma — se usa como reemplazo visual mientras el
 * profesional no tiene una firma digital real subida en Configuración, para
 * que el documento no salga con un espacio en blanco encima del nombre. */
const GENERIC_SIGNATURE_SVG = `
  <svg width="170" height="56" viewBox="0 0 130 42" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto 6px;">
    <path d="M4 30c8-20 15-20 19-6 3 10 6 10 10-3 4-13 8-13 12 3 3 11 6 11 10-4 3-12 7-12 11 0 3 9 6 9 10-3 3-12 7-12 11 0 2 6 5 6 8-1"
      stroke="#0e7490" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />
    <path d="M4 34q10 5 20 2" stroke="#0e7490" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.5" />
  </svg>
`;

/** Bloque de firma del profesional — imagen de firma digital (SVG subido en
 * Configuración, sin fondo) si existe; si no, un trazo genérico (no un
 * espacio en blanco) mientras no suba la real; nombre siempre (si hay);
 * especialidad y N° de colegiatura solo si el dato real está disponible.
 * Todo el bloque centrado (imagen, línea divisoria y texto) — antes iba
 * alineado a la derecha. La imagen se deja bastante más grande que antes
 * (antes 40px de alto): al ser SVG escala sin perder nitidez. */
export function buildSignatureBlock(f: FirmanteInfo): string {
  if (!f.nombre) return "";
  return `
    <div style="text-align:center;">
      ${f.firmaUrl
        ? `<img src="${f.firmaUrl}" style="height:70px;max-width:220px;object-fit:contain;margin:0 auto 6px;display:block;" crossorigin="anonymous" />`
        : GENERIC_SIGNATURE_SVG
      }
      <div style="height:1px;width:150px;background:#D5D8DC;margin:0 auto 6px;"></div>
      <div style="font-size:12px;font-weight:800;color:#1A1A2E;">Dr. ${esc(f.nombre)}</div>
      ${f.especialidad ? `<div style="font-size:10.5px;color:#0e7490;font-weight:600;">${esc(f.especialidad)}</div>` : ""}
      ${f.numColegiatura ? `<div style="font-size:9.5px;color:#95A5A6;">C.O.P. ${esc(f.numColegiatura)}</div>` : ""}
    </div>
  `;
}

/** Marca de agua tenue rotada de fondo — puramente decorativa, requiere que el
 * contenedor padre tenga position:relative. */
export function buildWatermark(text: string): string {
  return `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);font-size:64px;font-weight:800;color:#0891b2;opacity:0.05;white-space:nowrap;pointer-events:none;letter-spacing:0.05em;z-index:0;">${esc(text)}</div>`;
}

/** Etiqueta de sección — título teal en mayúsculas usado en todos los documentos. */
export function sectionLabel(text: string): string {
  return `<div data-keep-next style="font-size:9.5px;font-weight:800;color:#0e7490;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">${esc(text)}</div>`;
}

export function wrapDocument(bodyHtml: string, widthPx = 900): string {
  return `<div style="width:${widthPx}px;background:#ffffff;font-family:Poppins,Arial,sans-serif;color:#212E3D;overflow:hidden;">${bodyHtml}</div>`;
}

// ─── Anotaciones de archivos clínicos (imagen compuesta + leyenda) ──────────

export function drawArrowOnCanvas(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, lineWidth = 3) {
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

/** Compone la imagen base + trazos, flechas, pines numerados y textos en un
 * solo canvas a resolución natural. La imagen se descarga por el proxy del
 * sistema para que el canvas no quede "tainted". */
export async function composeAnnotatedCanvas(rawImgUrl: string, anotaciones: any[] = []): Promise<HTMLCanvasElement> {
  const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(rawImgUrl)}`);
  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = blobUrl;
  });
  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  const canvas = document.createElement("canvas");
  canvas.width = natW;
  canvas.height = natH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, natW, natH);
  window.URL.revokeObjectURL(blobUrl);

  const lw = Math.max(2, natW * 0.004);
  const pines = anotaciones.filter((x) => x.type === "pin");
  const textos = anotaciones.filter((x) => x.type === "text");
  const arrows = anotaciones.filter((x) => x.type === "arrow");
  const draws = anotaciones.filter((x) => x.type === "draw");

  draws.forEach((layer) => {
    layer.strokes?.forEach((stroke: any) => {
      if (!stroke.points || stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      stroke.points.forEach((pt: any, i: number) => {
        const px = (pt.x / 100) * natW;
        const py = (pt.y / 100) * natH;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
    });
  });

  arrows.forEach((ar) => {
    drawArrowOnCanvas(ctx, (ar.x1 / 100) * natW, (ar.y1 / 100) * natH, (ar.x2 / 100) * natW, (ar.y2 / 100) * natH, ar.color || "#ef4444", lw);
  });

  pines.forEach((pin, i) => {
    const px = (pin.x / 100) * natW;
    const py = (pin.y / 100) * natH;
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

  textos.forEach((tx) => {
    const px = (tx.x / 100) * natW;
    const py = (tx.y / 100) * natH;
    const fontSize = Math.max(14, natW * 0.02);
    ctx.font = `bold ${Math.round(fontSize)}px sans-serif`;
    const padX = fontSize * 0.5, padY = fontSize * 0.35;
    const textW = ctx.measureText(tx.texto).width;
    const rx = px - textW / 2 - padX, ry = py - fontSize / 2 - padY, rw = textW + padX * 2, rh = fontSize + padY * 2, rr = 6;
    ctx.fillStyle = tx.color || "#0891b2";
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
    ctx.fillText(tx.texto, px, py + fontSize * 0.05);
  });

  return canvas;
}

/** Leyenda de las notas del doctor: cada pin con su número (el mismo que se
 * dibuja sobre la imagen) y su nota completa, más los textos libres. Devuelve
 * "" si no hay ninguna nota. */
export function buildAnotacionesLeyenda(anotaciones?: any[] | null): string {
  if (!Array.isArray(anotaciones)) return "";
  const pines = anotaciones.filter((x) => x.type === "pin");
  const textos = anotaciones.filter((x) => x.type === "text" && x.texto);
  if (pines.length === 0 && textos.length === 0) return "";
  const pinRows = pines.map((pin, i) => `
    <div data-avoid-break style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;">
      <span style="width:20px;height:20px;border-radius:50%;background:#0891b2;color:#fff;font-size:10.5px;font-weight:800;text-align:center;line-height:20px;flex-shrink:0;">${i + 1}</span>
      <span style="font-size:11.5px;line-height:1.45;color:#212E3D;padding-top:1px;">${esc(pin.nota || "Sin nota")}${pin.fecha ? `<span style="color:#95A5A6;font-size:10px;"> · ${esc(pin.fecha)}</span>` : ""}</span>
    </div>`).join("");
  const textRows = textos.map((tx) => `
    <div data-avoid-break style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;">
      <span style="width:20px;height:20px;border-radius:5px;background:${tx.color || "#0891b2"};flex-shrink:0;"></span>
      <span style="font-size:11.5px;line-height:1.45;color:#212E3D;padding-top:1px;">${esc(tx.texto)}</span>
    </div>`).join("");
  return `<div>${pinRows}${textRows}</div>`;
}

// ─── Formatos nuevos (Diagnóstico y Plan / Receta Médica / Nota de Cuidados) ──
// Diseño propio, reemplaza el membrete cian con ola que usan el resto de
// documentos (Presupuesto/Archivo/Historia, que NO se tocan) — paleta y
// layout replicando las referencias que compartió el usuario. No comparte
// `buildLetterheadHeader`/`buildSignatureBlock`/`buildLetterheadFooter` a
// propósito: son documentos visualmente distintos.

export const FORMATO_PRIMARIO = "#0A8EA0";
export const FORMATO_SECUNDARIO = "#A9D8DE";
export const FORMATO_ACENTO = "#2E5C8A";

export function fmtMoneda(n: number, moneda = "PEN"): string {
  const simbolo = moneda === "PEN" ? "S/" : moneda;
  return `${simbolo} ${new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}

function fmtFechaFormato(iso?: string | null): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return String(iso); }
}

// Ícono de diente — mismo trazo que ya usa el resto de la app (Icon "tooth"),
// como SVG inline para poder recolorearlo con `currentColor` (azul marino en
// Diagnóstico y Plan, blanco sobre la franja azul en Receta/Cuidados) sin
// depender de un archivo PNG en un tono que no existe como asset.
function formatoToothIconSvg(color: string, size = 34): string {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2c-2.5 0-3.5 1.2-5 1.2S4 2 3 2C1.5 2 1 3.5 1 5.5c0 3 1 5 1.5 8 .4 2.3 1 6.5 2.7 6.5 1.5 0 1.3-3 2-5.5.4-1.4.8-2.5 1.8-2.5s1.4 1.1 1.8 2.5c.7 2.5.5 5.5 2 5.5 1.7 0 2.3-4.2 2.7-6.5.5-3 1.5-5 1.5-8C17 3.5 16.5 2 15 2c-1 0-2.5 1.2-3 1.2S14.5 2 12 2z" />
    </svg>
  `;
}

export function formatoLogoBlock(opts: { color: string; textColor: string; size?: number }): string {
  return `
    <div style="display:flex;align-items:center;gap:10px;">
      ${formatoToothIconSvg(opts.color, opts.size ?? 40)}
      <div style="line-height:1.15;">
        <div style="font-size:20px;font-weight:800;color:${opts.textColor};letter-spacing:0.02em;">MARA</div>
        <div style="font-size:10px;font-weight:700;color:${opts.textColor};letter-spacing:0.18em;">DENTAL GROUP</div>
      </div>
    </div>
  `;
}

/** Firma del doctor abajo a la derecha — variante de `buildSignatureBlock`
 * para Receta Médica (la referencia visual la muestra a la derecha, no
 * centrada como el resto de documentos). */
export function buildFirmaDerecha(f: FirmanteInfo): string {
  if (!f.nombre) return "";
  return `
    <div style="text-align:center;width:220px;">
      ${f.firmaUrl
        ? `<img src="${f.firmaUrl}" style="height:64px;max-width:220px;object-fit:contain;margin:0 auto 4px;display:block;" crossorigin="anonymous" />`
        : `<div style="height:64px;"></div>`
      }
      <div style="height:1px;width:100%;background:${FORMATO_SECUNDARIO};margin:0 0 4px;"></div>
      <div style="font-size:11px;font-weight:800;color:${FORMATO_PRIMARIO};">CD. ${esc(f.nombre)}</div>
      <div style="font-size:9.5px;color:#5D6D7E;">Cirujano Dentista</div>
      ${f.numColegiatura ? `<div style="font-size:9px;color:#95A5A6;">COP N° ${esc(f.numColegiatura)}</div>` : ""}
    </div>
  `;
}

// Datos fijos de la clínica para el membrete de la Receta (tomados de la
// plantilla oficial que compartió el usuario): los dos doctores con su COP y
// los contactos/redes del pie. La firma del documento sigue siendo la del
// doctor real de la consulta.
const RECETA_DOCTORES = [
  { nombre: "DRA. MARY STHEFANNY ESQUERRE VASQUEZ.", cop: "48076" },
  { nombre: "DR. ALONSO ENRIQUE REYES VILCHEZ.", cop: "53993" },
];
const RECETA_CONTACTO = {
  telefono: "912693455",
  direccion: "Santiago Mariños #1090 La Esperanza",
  instagram: "Maraclinicadental",
  facebook: "Maraclinicadental",
};

/** Franja cian superior de Receta Médica — logo blanco en la esquina y los
 * dos doctores con su COP, como en la plantilla original. */
export function buildRecetaBandaHeader(_f?: FirmanteInfo): string {
  return `
    <div style="background:${FORMATO_PRIMARIO};padding:18px 32px;display:flex;align-items:center;justify-content:space-between;gap:16px;">
      <img src="${logoBlancoSrc()}" style="height:48px;object-fit:contain;display:block;" crossorigin="anonymous" />
      <div style="display:flex;gap:22px;align-items:center;">
        <div style="text-align:right;">
          ${RECETA_DOCTORES.map((d) => `<div style="font-size:11px;font-weight:800;color:#FFFFFF;letter-spacing:0.02em;line-height:1.6;">${esc(d.nombre)}</div>`).join("")}
        </div>
        <div style="text-align:left;">
          ${RECETA_DOCTORES.map((d) => `<div style="font-size:11px;font-weight:800;color:#FFFFFF;line-height:1.6;">COP: ${esc(d.cop)}</div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function logoBlancoSrc(): string {
  if (typeof window === "undefined") return "/Logo_Blanco.png";
  return `${window.location.origin}/Logo_Blanco.png`;
}

/** Pie cian de Receta Médica: teléfono, ubicación, Instagram y Facebook de la
 * plantilla original. Argumento `clinica` sin uso: los datos son los fijos de
 * la plantilla. */
export function buildFormatoFooterAzul(clinica?: ClinicaInfo | null): string {
  const ico = (inner: string) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#FFFFFF;">${inner}</span>`;
  const phone = ico(`<svg width="12" height="12" viewBox="0 0 24 24" fill="${FORMATO_PRIMARIO}"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.4 21 3 13.6 3 4.5c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>`);
  const pin = ico(`<svg width="11" height="13" viewBox="0 0 24 28"><path d="M12 0C6.5 0 2 4.5 2 10c0 7.5 10 17.5 10 17.5S22 17.5 22 10c0-5.5-4.5-10-10-10z" fill="${FORMATO_PRIMARIO}"/><circle cx="12" cy="10" r="4" fill="#FFFFFF"/></svg>`);
  const ig = ico(`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${FORMATO_PRIMARIO}" stroke-width="2.4"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="${FORMATO_PRIMARIO}"/></svg>`);
  const fb = ico(`<svg width="11" height="12" viewBox="0 0 24 24" fill="${FORMATO_PRIMARIO}"><path d="M14 8V6c0-.9.2-1.5 1.6-1.5H17V1.2C16.7 1.2 15.700 1 14.500 1 12 1 10 2.500 10 5.500V8H7v3.500h3V23h4V11.500h3l.5-3.500H14z"/></svg>`);
  const item = (icon: string, text: string) => `<div style="display:inline-flex;align-items:center;gap:7px;height:22px;">${icon}<span style="display:inline-block;font-size:11px;line-height:22px;height:22px;position:relative;top:-3px;color:#FFFFFF;font-weight:600;">${esc(text)}</span></div>`;
  return `
    <div style="display:flex;align-items:center;justify-content:center;gap:22px;background:${FORMATO_PRIMARIO};padding:12px 24px;flex-wrap:wrap;">
      ${item(phone, RECETA_CONTACTO.telefono)}
      ${item(pin, clinica?.direccion || RECETA_CONTACTO.direccion)}
      ${item(ig, RECETA_CONTACTO.instagram)}
      ${item(fb, RECETA_CONTACTO.facebook)}
    </div>
  `;
}

// Íconos del sistema (lucide, los mismos que resuelve <Icon/>) como SVG
// estático para incrustar en el HTML del documento.
function iconoSistema(Comp: LucideIcon, color: string, size = 16): string {
  return renderToStaticMarkup(createElement(Comp, { size, color, strokeWidth: 2 }));
}

export const CIAN = "#0A8EA0";
export const CIAN_CLARO = "#A9D8DE";

const ICONOS_FORMATO = { user: User, stethoscope: Stethoscope, network: Network, info: Info } as const;

/** Título de sección con círculo cian + ícono del sistema (mismo estilo que
 * "Datos del Paciente" / "Diagnóstico" en Diagnóstico y Plan). */
export function formatoSeccionTitulo(icono: keyof typeof ICONOS_FORMATO, texto: string): string {
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <span style="width:26px;height:26px;border-radius:50%;background:${CIAN};display:inline-flex;align-items:center;justify-content:center;">${iconoSistema(ICONOS_FORMATO[icono], "#FFFFFF", 14)}</span>
      <span style="font-size:12px;font-weight:800;color:${CIAN};text-transform:uppercase;letter-spacing:0.04em;">${esc(texto)}</span>
    </div>`;
}

/** Encabezado de los formatos nuevos: logo del sistema arriba a la izquierda y,
 * a la derecha, título del documento en cian con dos líneas de datos. */
export function buildFormatoHeaderLogo(opts: { titulo: string; linea1?: string | null; linea2?: string | null }): string {
  return `
    <div style="padding:28px 32px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;">
      <img src="${logoSrc()}" style="height:52px;object-fit:contain;display:block;" crossorigin="anonymous" />
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:800;color:${CIAN};text-transform:uppercase;letter-spacing:0.06em;">${esc(opts.titulo)}</div>
        ${opts.linea1 ? `<div style="font-size:15px;font-weight:800;color:#1A1A2E;margin-top:2px;">${esc(opts.linea1)}</div>` : ""}
        ${opts.linea2 ? `<div style="font-size:9.5px;color:#95A5A6;margin-top:2px;">${esc(opts.linea2)}</div>` : ""}
      </div>
    </div>`;
}

export interface DiagnosticoPlanItem {
  nombre: string;
  precio: number | null;
  moneda: string;
}

/** Documento "Diagnóstico y Plan de Tratamiento" — distinto del Presupuesto:
 * sale del diagnóstico + los tratamientos del catálogo elegidos en la
 * consulta (con su precio de catálogo), no de un presupuesto formal armado
 * aparte. Cada tratamiento cuenta como 1 unidad — la tabla `tratamiento` no
 * guarda cantidad (cada fila ya es una unidad real; para "2x" de algo se
 * agregan dos filas), así que no se inventa ese campo. */
export function buildDiagnosticoPlanHtml(opts: {
  pacienteNombre?: string | null;
  fecha?: string | null;
  diagnosticos: string[];
  items: DiagnosticoPlanItem[];
}): string {
  const total = opts.items.reduce((acc, it) => acc + (it.precio ?? 0), 0);
  const moneda = opts.items[0]?.moneda ?? "PEN";

  const header = `
    <div style="padding:28px 32px 20px;text-align:left;">
      <img src="${logoSrc()}" style="height:52px;object-fit:contain;display:block;" crossorigin="anonymous" />
    </div>
  `;

  const infoBox = `
    <div style="margin:0 32px 20px;border:1px solid ${CIAN_CLARO};border-radius:12px;padding:16px 20px;display:flex;gap:24px;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="width:26px;height:26px;border-radius:50%;background:${CIAN};display:inline-flex;align-items:center;justify-content:center;">${iconoSistema(User, "#FFFFFF", 14)}</span>
          <span style="font-size:12px;font-weight:800;color:${CIAN};text-transform:uppercase;letter-spacing:0.04em;">Datos del Paciente</span>
        </div>
        <div style="font-size:11.5px;color:#2C3E50;margin-bottom:6px;">Nombre: <b>${esc(opts.pacienteNombre || "")}</b></div>
        <div style="font-size:11.5px;color:#2C3E50;">Fecha: <b>${esc(fmtFechaFormato(opts.fecha))}</b></div>
      </div>
      <div style="flex:1;min-width:200px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="width:26px;height:26px;border-radius:50%;background:${CIAN};display:inline-flex;align-items:center;justify-content:center;">${iconoSistema(Stethoscope, "#FFFFFF", 14)}</span>
          <span style="font-size:12px;font-weight:800;color:${CIAN};text-transform:uppercase;letter-spacing:0.04em;">Diagnóstico</span>
        </div>
        ${opts.diagnosticos.length > 0
          ? opts.diagnosticos.map((d) => `<div style="font-size:11.5px;color:#2C3E50;margin-bottom:4px;">• ${esc(d)}</div>`).join("")
          : `<div style="font-size:11.5px;color:#95A5A6;">Sin diagnóstico registrado</div>`}
      </div>
    </div>
  `;

  const filas = opts.items.length > 0 ? opts.items.map((it) => `
    <tr>
      <td style="padding:10px 14px;border:1px solid ${CIAN_CLARO};font-size:11.5px;color:#2C3E50;">${esc(it.nombre)}</td>
      <td style="padding:10px 14px;border:1px solid ${CIAN_CLARO};font-size:11.5px;color:#2C3E50;text-align:center;">1</td>
      <td style="padding:10px 14px;border:1px solid ${CIAN_CLARO};font-size:11.5px;color:#2C3E50;text-align:right;">${it.precio != null ? fmtMoneda(it.precio, it.moneda) : "—"}</td>
      <td style="padding:10px 14px;border:1px solid ${CIAN_CLARO};font-size:11.5px;color:#2C3E50;text-align:right;">${it.precio != null ? fmtMoneda(it.precio, it.moneda) : "—"}</td>
    </tr>
  `).join("") : `
    <tr><td colspan="4" style="padding:16px;border:1px solid ${CIAN_CLARO};font-size:11.5px;color:#95A5A6;text-align:center;">Sin tratamientos registrados</td></tr>
  `;

  const tabla = `
    <div style="margin:0 32px 20px;">
      <div style="background:${CIAN_CLARO};border-radius:10px 10px 0 0;padding:10px 16px;display:flex;align-items:center;gap:8px;">
        <span style="display:inline-flex;">${iconoSistema(Network, CIAN, 16)}</span>
        <span style="font-size:12px;font-weight:800;color:${CIAN};text-transform:uppercase;letter-spacing:0.04em;">Plan de Tratamiento</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#F7F8FA;">
            <th style="padding:9px 14px;border:1px solid ${CIAN_CLARO};font-size:10px;font-weight:800;color:${CIAN};text-align:left;">TRATAMIENTO</th>
            <th style="padding:9px 14px;border:1px solid ${CIAN_CLARO};font-size:10px;font-weight:800;color:${CIAN};">CANT.</th>
            <th style="padding:9px 14px;border:1px solid ${CIAN_CLARO};font-size:10px;font-weight:800;color:${CIAN};">PRECIO UNIT.</th>
            <th style="padding:9px 14px;border:1px solid ${CIAN_CLARO};font-size:10px;font-weight:800;color:${CIAN};">SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;

  const totalYNota = `
    <div style="margin:0 32px 24px;display:flex;gap:16px;flex-wrap:wrap;align-items:stretch;">
      <div style="flex:1;min-width:220px;border:1px solid ${CIAN_CLARO};border-radius:12px;padding:14px 18px;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-size:10px;font-weight:800;color:${CIAN};text-transform:uppercase;letter-spacing:0.04em;">Total del Tratamiento</div>
        <div style="font-size:18px;font-weight:800;color:${CIAN};margin-top:4px;">${fmtMoneda(total, moneda)}</div>
      </div>
      <div style="flex:1;min-width:260px;border:1px solid ${CIAN_CLARO};border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:12px;">
        <span style="width:32px;height:32px;border-radius:50%;background:${CIAN};flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">${iconoSistema(Info, "#FFFFFF", 18)}</span>
        <span style="font-size:11px;color:#2C3E50;line-height:1.5;">El plan de tratamiento puede ser modificado de acuerdo a la evolución del caso.</span>
      </div>
    </div>
  `;

  const pieTresColumnas = `
    <div style="margin:0 32px 32px;display:flex;gap:20px;flex-wrap:wrap;border-top:1px solid ${CIAN_CLARO};padding-top:18px;">
      <div style="flex:1;min-width:170px;">
        <div style="font-size:10px;font-weight:800;color:${CIAN};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Observaciones</div>
        <div style="font-size:10.5px;color:#2C3E50;line-height:1.6;">✓ El tratamiento se realizará por etapas.</div>
        <div style="font-size:10.5px;color:#2C3E50;line-height:1.6;">✓ El éxito del tratamiento dependerá del cuidado y controles periódicos.</div>
      </div>
      <div style="flex:1;min-width:170px;">
        <div style="font-size:10px;font-weight:800;color:${CIAN};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;text-align:center;">Formas de Pago</div>
        <div style="font-size:10.5px;color:#2C3E50;line-height:1.6;text-align:center;">Efectivo</div>
        <div style="font-size:10.5px;color:#2C3E50;line-height:1.6;text-align:center;">Yape / Transferencia</div>
        <div style="font-size:10.5px;color:#2C3E50;line-height:1.6;text-align:center;">Pagos por fases del tratamiento</div>
      </div>
      <div style="flex:1;min-width:170px;">
        <div style="font-size:10px;font-weight:800;color:${CIAN};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;text-align:right;">Duración Aproximada</div>
        <div style="font-size:10.5px;color:#2C3E50;line-height:1.6;text-align:right;">El tratamiento completo puede realizarse en varias semanas según la evolución del caso — cada paciente es único.</div>
      </div>
    </div>
  `;

  // Desde "Total del Tratamiento" hacia abajo es el pie del documento: se ancla
  // al fondo de la hoja (altura A4 a 900px de ancho, menos el margen inferior
  // de paginado). Se genera SIN el membrete/franja cian de `chrome` — ver
  // llamadores en TratamientoSection.
  return wrapDocument(`
    <div style="display:flex;flex-direction:column;min-height:1235px;">
      <div>${header}${infoBox}${tabla}</div>
      <div style="margin-top:auto;">${totalYNota}${pieTresColumnas}</div>
    </div>
  `, 900);
}

export interface PresupuestoFormatoItem { nombre: string; descripcion?: string | null; cantidad: number; precioUnitario: number; subtotal: number; moneda: string; }
export interface PresupuestoFormatoPago { fecha: string; metodo: string; referencia?: string | null; monto: number; }

/** Documento "Presupuesto" con el mismo diseño de "Diagnóstico y Plan"
 * (logo, cajas con íconos del sistema, tabla cian, pie anclado al fondo de la
 * hoja A4). Todos los datos son los reales del presupuesto. */
export function buildPresupuestoFormatoHtml(opts: {
  pacienteNombre?: string | null;
  pacienteDni?: string | null;
  fecha?: string | null;
  medico?: string | null;
  especialidad?: string | null;
  estado?: string | null;
  items: PresupuestoFormatoItem[];
  totalBruto: number;
  descuentoMonto: number;
  descuentoPorcentaje: number;
  totalNeto: number;
  pagado: number;
  saldo: number;
  moneda: string;
  pagos: PresupuestoFormatoPago[];
  firma: FirmanteInfo;
}): string {
  const m = opts.moneda;
  const th = `padding:9px 14px;border:1px solid ${CIAN_CLARO};font-size:10px;font-weight:800;color:${CIAN};`;
  const td = `padding:10px 14px;border:1px solid ${CIAN_CLARO};font-size:11.5px;color:#2C3E50;`;
  const header = `
    <div style="padding:28px 32px 20px;text-align:left;">
      <img src="${logoSrc()}" style="height:52px;object-fit:contain;display:block;" crossorigin="anonymous" />
    </div>
  `;
  const linea = (l: string, v?: string | null) => v ? `<div style="font-size:11.5px;color:#2C3E50;margin-bottom:6px;">${esc(l)}: <b>${esc(v)}</b></div>` : "";
  const titulo = (icono: string, t: string) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <span style="width:26px;height:26px;border-radius:50%;background:${CIAN};display:inline-flex;align-items:center;justify-content:center;">${icono}</span>
      <span style="font-size:12px;font-weight:800;color:${CIAN};text-transform:uppercase;letter-spacing:0.04em;">${esc(t)}</span>
    </div>`;
  const infoBox = `
    <div style="margin:0 32px 20px;border:1px solid ${CIAN_CLARO};border-radius:12px;padding:16px 20px;display:flex;gap:24px;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;">
        ${titulo(iconoSistema(User, "#FFFFFF", 14), "Datos del Paciente")}
        ${linea("Nombre", opts.pacienteNombre)}${linea("DNI", opts.pacienteDni)}${linea("Fecha", fmtFechaFormato(opts.fecha))}
      </div>
      <div style="flex:1;min-width:200px;">
        ${titulo(iconoSistema(Stethoscope, "#FFFFFF", 14), "Presupuesto")}
        ${linea("Médico tratante", opts.medico ? `Dr. ${opts.medico}` : null)}${linea("Especialidad", opts.especialidad)}${linea("Estado", opts.estado)}
      </div>
    </div>
  `;
  const filas = opts.items.length > 0 ? opts.items.map((it) => `
    <tr>
      <td style="${td}">${esc(it.nombre)}${it.descripcion ? `<div style="font-size:10px;color:#95A5A6;margin-top:2px;">${esc(it.descripcion)}</div>` : ""}</td>
      <td style="${td}text-align:center;">${it.cantidad}</td>
      <td style="${td}text-align:right;">${fmtMoneda(it.precioUnitario, it.moneda)}</td>
      <td style="${td}text-align:right;">${fmtMoneda(it.subtotal, it.moneda)}</td>
    </tr>`).join("") : `<tr><td colspan="4" style="${td}color:#95A5A6;text-align:center;">Sin ítems</td></tr>`;
  const tabla = `
    <div style="margin:0 32px 20px;">
      <div style="background:${CIAN_CLARO};border-radius:10px 10px 0 0;padding:10px 16px;display:flex;align-items:center;gap:8px;">
        <span style="display:inline-flex;">${iconoSistema(Network, CIAN, 16)}</span>
        <span style="font-size:12px;font-weight:800;color:${CIAN};text-transform:uppercase;letter-spacing:0.04em;">Detalle de Tratamientos</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#F7F8FA;">
          <th style="${th}text-align:left;">TRATAMIENTO</th><th style="${th}">CANT.</th><th style="${th}">PRECIO UNIT.</th><th style="${th}">SUBTOTAL</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
  const pagos = opts.pagos.length > 0 ? `
    <div style="margin:0 32px 20px;">
      <div style="font-size:11px;font-weight:800;color:${CIAN};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Registro de pagos</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#F7F8FA;">
          <th style="${th}text-align:left;">FECHA</th><th style="${th}text-align:left;">MÉTODO</th><th style="${th}text-align:left;">REFERENCIA</th><th style="${th}text-align:right;">MONTO</th>
        </tr></thead>
        <tbody>${opts.pagos.map((p) => `<tr>
          <td style="${td}">${esc(p.fecha)}</td><td style="${td}">${esc(p.metodo)}</td><td style="${td}color:#95A5A6;">${esc(p.referencia || "—")}</td><td style="${td}text-align:right;">${fmtMoneda(p.monto, m)}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>` : "";
  const firma = opts.firma.nombre ? `<div style="padding:8px 32px 24px;display:flex;justify-content:center;">${buildSignatureBlock(opts.firma)}</div>` : "";
  const caja = (l: string, v: string, color = CIAN) => `
    <div style="flex:1;min-width:150px;border:1px solid ${CIAN_CLARO};border-radius:12px;padding:12px 16px;">
      <div style="font-size:10px;font-weight:800;color:${CIAN};text-transform:uppercase;letter-spacing:0.04em;">${esc(l)}</div>
      <div style="font-size:16px;font-weight:800;color:${color};margin-top:4px;">${esc(v)}</div>
    </div>`;
  const pie = `
    <div style="margin:0 32px 12px;display:flex;gap:14px;flex-wrap:wrap;">
      ${opts.descuentoMonto > 0 ? caja(`Descuento (${opts.descuentoPorcentaje}%)`, `− ${fmtMoneda(opts.descuentoMonto, m)}`, "#E11D48") : caja("Subtotal", fmtMoneda(opts.totalBruto, m))}
      ${caja("Total del presupuesto", fmtMoneda(opts.totalNeto, m))}
      ${caja("Total pagado", fmtMoneda(opts.pagado, m), "#059669")}
      ${caja("Saldo pendiente", fmtMoneda(opts.saldo, m), opts.saldo > 0 ? "#D97706" : "#059669")}
    </div>
    <div style="margin:0 32px 32px;border:1px solid ${CIAN_CLARO};border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:12px;">
      <span style="width:32px;height:32px;border-radius:50%;background:${CIAN};flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">${iconoSistema(Info, "#FFFFFF", 18)}</span>
      <span style="font-size:11px;color:#2C3E50;line-height:1.5;">Este presupuesto tiene validez de 30 días desde la fecha de emisión y puede ser modificado de acuerdo a la evolución del caso.</span>
    </div>
  `;
  return wrapDocument(`
    <div style="display:flex;flex-direction:column;min-height:1235px;">
      <div>${header}${infoBox}${tabla}${pagos}</div>
      <div style="margin-top:auto;">${firma}${pie}</div>
    </div>
  `, 900);
}


/** Documento "Nota de Cuidados" — arma el listado real de `recomendaciones`
 * ya registradas en la consulta (no texto estático genérico). */
export function buildNotaCuidadosHtml(opts: {
  titulo: string;
  pacienteNombre?: string | null;
  fecha?: string | null;
  recomendaciones: string[];
}): string {
  const header = `
    <div style="background:${CIAN};padding:22px 32px;display:flex;align-items:center;gap:20px;">
      <img src="${logoBlancoSrc()}" style="height:52px;object-fit:contain;display:block;" crossorigin="anonymous" />
      <div style="font-size:14px;font-weight:800;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.03em;line-height:1.4;">${esc(opts.titulo)}</div>
    </div>
  `;

  const cuerpo = opts.recomendaciones.length > 0 ? opts.recomendaciones.map((r) => `
    <p style="font-size:11.5px;color:#2C3E50;line-height:1.6;margin:0 0 12px;">${esc(r)}</p>
  `).join("") : `
    <p style="font-size:11.5px;color:#95A5A6;">Sin recomendaciones registradas para esta consulta.</p>
  `;

  return wrapDocument(`${header}<div style="padding:24px 32px 32px;">${cuerpo}</div>`, 640);
}

async function withOffscreenContainer<T>(html: string, fn: (container: HTMLDivElement) => Promise<T>): Promise<T> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    const imgs = Array.from(container.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((res) => { img.onload = res; img.onerror = res; }))),
    );
    return await fn(container);
  } finally {
    document.body.removeChild(container);
  }
}

export async function downloadHtmlAsPng(html: string, filename: string) {
  const canvas = await exportHtmlAsCanvas(html);
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportHtmlAsCanvas(html: string): Promise<HTMLCanvasElement> {
  return await withOffscreenContainer(html, (container) =>
    html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" })
  );
}

/** Datos para el membrete fijo por página que dibuja `downloadHtmlAsPaginatedPdf`
 * (franja de pie en TODAS las páginas, franja de encabezado a partir de la
 * página 2) — independiente del membrete "portada" que ya trae el HTML en sí
 * (ver `buildLetterheadHeader`/`buildLetterheadFooter`), que solo aparece una
 * vez porque es parte del contenido recortado, no un overlay por página. */
export interface PaginatedPdfChrome {
  clinica: ClinicaInfo | null;
  /** Texto centrado en la franja de encabezado desde la página 2 (ej. "Historia Clínica Odontológica"). */
  docLabel: string;
}

async function loadImageAsDataUrl(src: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      img.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

const CHROME_HEADER_H = 34;
const CHROME_FOOTER_H = 34;

/** Construye el `jsPDF` recortando el HTML en páginas A4 — lógica compartida
 * entre `downloadHtmlAsPaginatedPdf` (dispara la descarga) y
 * `generatePaginatedPdfBlob` (devuelve el Blob para adjuntarlo a un envío). */
export type PdfFormato = "a4" | "a5-horizontal" | "a5-vertical";

async function buildPaginatedPdfDoc(html: string, widthPx: number, chrome?: PaginatedPdfChrome, formato: PdfFormato = "a4"): Promise<jsPDF> {
  // Bloques con `data-avoid-break` (tarjetas de archivos, etc.): sus límites se
  // miden en el DOM para no partirlos entre dos páginas al cortar el canvas.
  const avoidRanges: { top: number; bottom: number }[] = [];
  const canvas = await withOffscreenContainer(html, async (container) => {
    const base = container.getBoundingClientRect().top;
    container.querySelectorAll('[data-avoid-break], tr, [style*="page-break-inside:avoid"]').forEach((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      avoidRanges.push({ top: Math.round((r.top - base) * 2), bottom: Math.round((r.bottom - base) * 2) });
    });
    // Títulos de sección: se mantienen junto al primer elemento que les sigue
    // (no quedan solos al pie de una página).
    container.querySelectorAll("[data-keep-next]").forEach((el) => {
      let e: Element | null = el;
      while (e && !e.nextElementSibling) e = e.parentElement;
      const next = e?.nextElementSibling;
      if (!next) return;
      const target = next.firstElementChild || next;
      const r1 = (el as HTMLElement).getBoundingClientRect();
      const r2 = target.getBoundingClientRect();
      avoidRanges.push({ top: Math.round((r1.top - base) * 2), bottom: Math.round((r2.bottom - base) * 2) });
    });
    return html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  });

  const pdf = new jsPDF({ orientation: formato === "a5-horizontal" ? "landscape" : "portrait", unit: "px", format: formato === "a4" ? "a4" : "a5" });
  const margin = 0;
  const footerSpace = chrome ? CHROME_FOOTER_H : formato === "a4" ? 18 : 0;
  const headerSpace = chrome ? CHROME_HEADER_H : 0;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const pageWidth = pageW - margin * 2;
  const pageHeightFirst = pageH - margin * 2 - footerSpace;
  // Aire sobre el contenido de las páginas 2+: nada queda pegado al borde de la hoja.
  const topPad = formato === "a4" ? 22 : 0;
  const pageHeightRest = pageH - margin * 2 - footerSpace - headerSpace - topPad;
  const pxPerPageFirst = Math.floor((pageHeightFirst * canvas.width) / pageWidth);
  const pxPerPageRest = Math.floor((pageHeightRest * canvas.width) / pageWidth);

  // Receta (media hoja horizontal): si el contenido se pasa apenas de la hoja,
  // se reduce para que quepa completo en UNA página — así el pie nunca se
  // corta ni salta a una segunda hoja.
  if (formato === "a5-horizontal") {
    const naturalH = (canvas.height * pageWidth) / canvas.width;
    if (naturalH > pageH && naturalH <= pageH * 1.3) {
      const scale = pageH / naturalH;
      const w = pageWidth * scale;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", (pageW - w) / 2, 0, w, pageH);
      return pdf;
    }
  }

  const hasFooterInfo = !!(chrome?.clinica?.email_contacto || chrome?.clinica?.direccion);
  const logoDataUrl = chrome ? await loadImageAsDataUrl(`${window.location.origin}/Logo_Blanco.png`) : null;

  let renderedPx = 0;
  let pageIndex = 0;
  const fullCtx = canvas.getContext("2d");

  while (renderedPx < canvas.height) {
    const pxPerPage = pageIndex === 0 ? pxPerPageFirst : pxPerPageRest;
    let sliceHeight = Math.min(pxPerPage, canvas.height - renderedPx);

    // Buscar una línea horizontal blanca hacia arriba si no es la última página para cortar limpiamente entre párrafos o filas
    if (renderedPx + sliceHeight < canvas.height && fullCtx) {
      const searchStart = sliceHeight;
      const searchEnd = Math.max(20, sliceHeight - 80);
      const imgData = fullCtx.getImageData(0, renderedPx, canvas.width, sliceHeight);
      const data = imgData.data;

      for (let y = searchStart - 1; y >= searchEnd; y--) {
        let isWhiteRow = true;
        for (let x = 0; x < canvas.width; x += 8) {
          const idx = (y * canvas.width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          if (r < 235 || g < 235 || b < 235) {
            isWhiteRow = false;
            break;
          }
        }
        if (isWhiteRow) {
          sliceHeight = y;
          break;
        }
      }
    }

    // Si el corte cae dentro de un bloque que no debe partirse (y cabe en una
    // página), se corta justo antes de él y pasa completo a la siguiente.
    const cutAt = renderedPx + sliceHeight;
    if (cutAt < canvas.height) {
      const crossing = avoidRanges.filter((r) => r.top < cutAt && r.bottom > cutAt && r.top > renderedPx + 40 && r.bottom - r.top < pxPerPageRest);
      if (crossing.length > 0) sliceHeight = Math.min(...crossing.map((r) => r.top)) - renderedPx;
    }

    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = Math.max(10, sliceHeight);
    slice.getContext("2d")!.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    if (pageIndex > 0) pdf.addPage();
    const contentTop = margin + (chrome && pageIndex > 0 ? headerSpace : 0) + (pageIndex > 0 ? topPad : 0);
    pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", margin, contentTop, pageWidth, (sliceHeight * pageWidth) / canvas.width);

    renderedPx += sliceHeight;
    pageIndex += 1;
  }

  const totalPages = pageIndex;

  if (chrome) {
    for (let i = 0; i < totalPages; i++) {
      pdf.setPage(i + 1);

      // Franja de pie — cian, correo + ubicación centrados, en TODAS las páginas.
      if (hasFooterInfo) {
        pdf.setFillColor(10, 142, 160);
        pdf.rect(0, pageH - CHROME_FOOTER_H, pageW, CHROME_FOOTER_H, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        const contactLine = [chrome.clinica?.email_contacto, chrome.clinica?.direccion].filter(Boolean).join("      ");
        pdf.text(contactLine, pageW / 2, pageH - CHROME_FOOTER_H / 2 + 3, { align: "center" });
      }

      // Franja de encabezado — cian, logo + docLabel + paginación, desde la página 2.
      if (i > 0) {
        pdf.setFillColor(10, 142, 160);
        pdf.rect(0, 0, pageW, CHROME_HEADER_H, "F");
        if (logoDataUrl) {
          pdf.addImage(logoDataUrl, "PNG", 16, CHROME_HEADER_H / 2 - 9, 40, 18);
        }
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8.5);
        pdf.text(chrome.docLabel.toUpperCase(), pageW / 2, CHROME_HEADER_H / 2 + 3, { align: "center" });
        pdf.setFontSize(8);
        pdf.text(`Página ${i + 1} de ${totalPages}`, pageW - 16, CHROME_HEADER_H / 2 + 3, { align: "right" });
      }
    }
  } else if (totalPages > 1) {
    for (let i = 0; i < totalPages; i++) {
      pdf.setPage(i + 1);
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Página ${i + 1} de ${totalPages}`, pageW / 2, pageH - 10, { align: "center" });
    }
  }

  return pdf;
}

/** PDF en A4 — usado por los 5 documentos exportables (Receta, Presupuesto,
 * Archivo Clínico, Historia Clínica, Comprobante de Pago). Renderiza todo el
 * documento a un único canvas alto y lo recorta en páginas A4 — se evita
 * `pdf.html()` con `autoPaging:"text"`, que con CSS moderno (flex/grid) puede
 * producir un PDF en blanco sin lanzar ningún error. Funciona igual de bien
 * para un documento de una sola página que para uno largo: si el contenido
 * cabe en una página, genera una sola. Sin margen por defecto: el membrete
 * "portada" (ola arriba, franja cian abajo) debe llegar hasta el borde de la
 * hoja, no quedar recuadrado.
 *
 * Si se pasa `chrome`, además dibuja (fuera del contenido recortado, como
 * overlay directo con jsPDF, ya que este pipeline no tiene un equivalente al
 * `fixed` de react-pdf): una franja de pie cian con correo/ubicación en
 * TODAS las páginas, y a partir de la página 2 una franja de encabezado cian
 * con el logo en un extremo, `docLabel` centrado y la paginación en el otro
 * extremo — la página 1 no lleva esta franja de encabezado porque ya trae su
 * propio membrete grande (la ola) como parte del contenido. */
export async function downloadHtmlAsPaginatedPdf(html: string, filename: string, widthPx = 900, chrome?: PaginatedPdfChrome, formato: PdfFormato = "a4") {
  const pdf = await buildPaginatedPdfDoc(html, widthPx, chrome, formato);
  pdf.save(filename);
}

/** Mismo render que `downloadHtmlAsPaginatedPdf` pero devuelve el PDF como
 * `Blob` en vez de disparar la descarga — para adjuntarlo a un envío (ej.
 * Telegram) en lugar de guardarlo en el equipo del usuario. */
export async function generatePaginatedPdfBlob(html: string, widthPx = 900, chrome?: PaginatedPdfChrome, formato: PdfFormato = "a4"): Promise<Blob> {
  const pdf = await buildPaginatedPdfDoc(html, widthPx, chrome, formato);
  return pdf.output("blob");
}

export async function printHtml(html: string, title: string, formato: PdfFormato = "a4") {
  const pageCss = formato === "a5-horizontal" ? "@page{size:A5 landscape;margin:0}" : formato === "a5-vertical" ? "@page{size:A5 portrait;margin:0}" : "";
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
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${pageCss}</style></head><body style="margin:0;">${html}</body></html>`);
    doc.close();
  }
  await new Promise((r) => setTimeout(r, 500));
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => document.body.removeChild(iframe), 1000);
}
