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
  return `<div style="width:${widthPx}px;background:#ffffff;font-family:Poppins,Arial,sans-serif;color:#212E3D;overflow:hidden;">${bodyHtml}</div>`;
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
async function buildPaginatedPdfDoc(html: string, widthPx: number, chrome?: PaginatedPdfChrome): Promise<jsPDF> {
  const canvas = await withOffscreenContainer(html, (container) =>
    html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" }),
  );

  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
  const margin = 0;
  const footerSpace = chrome ? CHROME_FOOTER_H : 18;
  const headerSpace = chrome ? CHROME_HEADER_H : 0;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const pageWidth = pageW - margin * 2;
  const pageHeightFirst = pageH - margin * 2 - footerSpace;
  const pageHeightRest = pageH - margin * 2 - footerSpace - headerSpace;
  const pxPerPageFirst = Math.floor((pageHeightFirst * canvas.width) / pageWidth);
  const pxPerPageRest = Math.floor((pageHeightRest * canvas.width) / pageWidth);

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

    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = Math.max(10, sliceHeight);
    slice.getContext("2d")!.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    if (pageIndex > 0) pdf.addPage();
    const contentTop = margin + (chrome && pageIndex > 0 ? headerSpace : 0);
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
export async function downloadHtmlAsPaginatedPdf(html: string, filename: string, widthPx = 900, chrome?: PaginatedPdfChrome) {
  const pdf = await buildPaginatedPdfDoc(html, widthPx, chrome);
  pdf.save(filename);
}

/** Mismo render que `downloadHtmlAsPaginatedPdf` pero devuelve el PDF como
 * `Blob` en vez de disparar la descarga — para adjuntarlo a un envío (ej.
 * Telegram) en lugar de guardarlo en el equipo del usuario. */
export async function generatePaginatedPdfBlob(html: string, widthPx = 900, chrome?: PaginatedPdfChrome): Promise<Blob> {
  const pdf = await buildPaginatedPdfDoc(html, widthPx, chrome);
  return pdf.output("blob");
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
