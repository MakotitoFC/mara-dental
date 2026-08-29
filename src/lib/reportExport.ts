"use client";

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

/** Encabezado compartido de todos los documentos exportables — barra de marca
 * arriba (ver wrapDocument), logo + datos de sede a la izquierda, etiqueta de
 * tipo de documento + código real + paciente + fecha de generación a la
 * derecha. `docCode` debe ser un identificador real del sistema (ej.
 * "Presupuesto #12", el código de historia clínica) — nunca un correlativo
 * inventado tipo "PRES-001-2026", ya que ese esquema no existe en la BD. */
export function buildLetterheadHeader(opts: {
  clinica: ClinicaInfo | null;
  docLabel: string;
  docCode: string;
  pacienteNombre?: string | null;
  generado: string;
  pagina?: string;
}): string {
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:22px 28px 18px;border-bottom:1px solid #EDF0F4;">
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${logoSrc()}" style="height:38px;object-fit:contain;" crossorigin="anonymous" />
        ${opts.clinica?.nombre_clinica ? `
          <div>
            <div style="font-size:15px;font-weight:800;color:#1A1A2E;">${esc(opts.clinica.nombre_clinica)}</div>
            ${opts.clinica.direccion ? `<div style="font-size:10.5px;color:#95A5A6;">${esc(opts.clinica.direccion)}</div>` : ""}
          </div>
        ` : ""}
      </div>
      <div style="text-align:right;">
        <div style="font-size:9.5px;font-weight:800;color:#0e7490;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">${esc(opts.docLabel)}</div>
        <div style="font-size:17px;font-weight:800;color:#1A1A2E;">${esc(opts.docCode)}</div>
        ${opts.pacienteNombre ? `<div style="font-size:11.5px;font-weight:600;color:#2C3E50;margin-top:2px;">${esc(opts.pacienteNombre)}</div>` : ""}
        <div style="font-size:9.5px;color:#95A5A6;margin-top:3px;">Generado: ${esc(opts.generado)}</div>
        ${opts.pagina ? `<div style="font-size:9px;color:#D5D8DC;margin-top:1px;">${esc(opts.pagina)}</div>` : ""}
      </div>
    </div>
  `;
}

/** Pie compartido — datos de contacto de la sede a la izquierda, paciente +
 * código del documento a la derecha. */
export function buildLetterheadFooter(opts: { clinica: ClinicaInfo | null; pacienteNombre?: string | null; docCode?: string | null }): string {
  const clinica = opts.clinica;
  const left = [clinica?.nombre_clinica, clinica?.direccion].filter(Boolean).join(" · ");
  const rightContact = [clinica?.telefono, clinica?.email_contacto].filter(Boolean).join(" · ");
  const rightTop = [opts.pacienteNombre, opts.docCode].filter(Boolean).join(" · ");
  if (!left && !rightContact && !rightTop) return "";
  return `
    <div style="padding:14px 28px;border-top:1px solid #EDF0F4;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div>
        ${left ? `<div style="font-size:9.5px;font-weight:700;color:#5D6D7E;">${esc(left)}</div>` : ""}
      </div>
      <div style="text-align:right;">
        ${rightTop ? `<div style="font-size:9.5px;font-weight:700;color:#5D6D7E;">${esc(rightTop)}</div>` : ""}
        ${rightContact ? `<div style="font-size:9px;color:#95A5A6;margin-top:2px;">${esc(rightContact)}</div>` : ""}
      </div>
    </div>
  `;
}

/** Trazo genérico de firma — se usa como reemplazo visual mientras el
 * profesional no tiene una firma digital real subida en Configuración, para
 * que el documento no salga con un espacio en blanco encima del nombre. */
const GENERIC_SIGNATURE_SVG = `
  <svg width="130" height="42" viewBox="0 0 130 42" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 0 6px auto;">
    <path d="M4 30c8-20 15-20 19-6 3 10 6 10 10-3 4-13 8-13 12 3 3 11 6 11 10-4 3-12 7-12 11 0 3 9 6 9 10-3 3-12 7-12 11 0 2 6 5 6 8-1"
      stroke="#0e7490" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />
    <path d="M4 34q10 5 20 2" stroke="#0e7490" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.5" />
  </svg>
`;

/** Bloque de firma del profesional — imagen de firma digital si existe; si no,
 * un trazo genérico (no un espacio en blanco) mientras no suba la real desde
 * Configuración; nombre siempre (si hay); especialidad y N° de colegiatura
 * solo si el dato real está disponible. */
export function buildSignatureBlock(f: FirmanteInfo): string {
  if (!f.nombre) return "";
  return `
    <div style="text-align:right;">
      ${f.firmaUrl
        ? `<img src="${f.firmaUrl}" style="height:40px;object-fit:contain;margin:0 0 6px auto;display:block;" crossorigin="anonymous" />`
        : GENERIC_SIGNATURE_SVG
      }
      <div style="height:1px;width:150px;background:#D5D8DC;margin:0 0 6px auto;"></div>
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
  return `<div style="font-size:9.5px;font-weight:800;color:#0e7490;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">${esc(text)}</div>`;
}

export function wrapDocument(bodyHtml: string, widthPx = 900): string {
  return `<div style="width:${widthPx}px;background:#ffffff;font-family:Poppins,Arial,sans-serif;color:#212E3D;border-top:4px solid #0891b2;border-bottom:4px solid #0891b2;">${bodyHtml}</div>`;
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

/** PDF en A4 con margen y numeración de página en el pie — usado por los 4
 * documentos exportables (Receta, Presupuesto, Archivo Clínico, Historia
 * Clínica). Renderiza todo el documento a un único canvas alto y lo recorta
 * en páginas A4 con margen (nunca ocupa el 100% de la hoja) — se evita
 * `pdf.html()` con `autoPaging:"text"`, que con CSS moderno (flex/grid) puede
 * producir un PDF en blanco sin lanzar ningún error. Funciona igual de bien
 * para un documento de una sola página que para uno largo: si el contenido
 * cabe en una página, genera una sola. */
export async function downloadHtmlAsPaginatedPdf(html: string, filename: string, widthPx = 900) {
  const canvas = await withOffscreenContainer(html, (container) =>
    html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" }),
  );

  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
  const margin = 24;
  const footerSpace = 18;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const pageWidth = pageW - margin * 2;
  const pageHeight = pageH - margin * 2 - footerSpace;
  const pxPerPage = Math.floor((pageHeight * canvas.width) / pageWidth);
  const totalPages = Math.max(1, Math.ceil(canvas.height / pxPerPage));

  let renderedPx = 0;
  let pageIndex = 0;
  while (renderedPx < canvas.height) {
    const sliceHeight = Math.min(pxPerPage, canvas.height - renderedPx);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeight;
    slice.getContext("2d")!.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", margin, margin, pageWidth, (sliceHeight * pageWidth) / canvas.width);

    if (totalPages > 1) {
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Página ${pageIndex + 1} de ${totalPages}`, pageW / 2, pageH - 10, { align: "center" });
    }

    renderedPx += sliceHeight;
    pageIndex += 1;
  }

  pdf.save(filename);
}

export async function printHtml(html: string, title: string) {
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
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="margin:0;">${html}</body></html>`);
    doc.close();
  }
  await new Promise((r) => setTimeout(r, 500));
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => document.body.removeChild(iframe), 1000);
}
