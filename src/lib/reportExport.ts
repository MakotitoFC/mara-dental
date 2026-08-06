"use client";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export function esc(s?: string | number | null): string {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function fmtGenerado(): string {
  return new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export interface ClinicaInfo {
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
    <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:22px 28px 18px;border-bottom:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${logoSrc()}" style="height:38px;object-fit:contain;" crossorigin="anonymous" />
        ${opts.clinica?.nombre_clinica ? `
          <div>
            <div style="font-size:15px;font-weight:800;color:#0f172a;">${esc(opts.clinica.nombre_clinica)}</div>
            ${opts.clinica.direccion ? `<div style="font-size:10.5px;color:#94a3b8;">${esc(opts.clinica.direccion)}</div>` : ""}
          </div>
        ` : ""}
      </div>
      <div style="text-align:right;">
        <div style="font-size:9.5px;font-weight:800;color:#0e7490;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">${esc(opts.docLabel)}</div>
        <div style="font-size:17px;font-weight:800;color:#0f172a;">${esc(opts.docCode)}</div>
        ${opts.pacienteNombre ? `<div style="font-size:11.5px;font-weight:600;color:#334155;margin-top:2px;">${esc(opts.pacienteNombre)}</div>` : ""}
        <div style="font-size:9.5px;color:#94a3b8;margin-top:3px;">Generado: ${esc(opts.generado)}</div>
        ${opts.pagina ? `<div style="font-size:9px;color:#cbd5e1;margin-top:1px;">${esc(opts.pagina)}</div>` : ""}
      </div>
    </div>
  `;
}

/** Pie compartido — datos de contacto de la sede a la izquierda con el sello
 * "Documento Confidencial", paciente + código del documento a la derecha. */
export function buildLetterheadFooter(opts: { clinica: ClinicaInfo | null; pacienteNombre?: string | null; docCode?: string | null }): string {
  const clinica = opts.clinica;
  const left = [clinica?.nombre_clinica, clinica?.direccion].filter(Boolean).join(" · ");
  const rightContact = [clinica?.telefono, clinica?.email_contacto].filter(Boolean).join(" · ");
  const rightTop = [opts.pacienteNombre, opts.docCode].filter(Boolean).join(" · ");
  if (!left && !rightContact && !rightTop) return "";
  return `
    <div style="padding:14px 28px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div>
        ${left ? `<div style="font-size:9.5px;font-weight:700;color:#64748b;">${esc(left)}</div>` : ""}
        <div style="font-size:9px;color:#0e7490;display:flex;align-items:center;gap:4px;margin-top:2px;">
          <span style="width:5px;height:5px;border-radius:50%;background:#0e7490;display:inline-block;"></span>
          Documento Confidencial
        </div>
      </div>
      <div style="text-align:right;">
        ${rightTop ? `<div style="font-size:9.5px;font-weight:700;color:#64748b;">${esc(rightTop)}</div>` : ""}
        ${rightContact ? `<div style="font-size:9px;color:#94a3b8;margin-top:2px;">${esc(rightContact)}</div>` : ""}
      </div>
    </div>
  `;
}

/** Bloque de firma del profesional — imagen de firma digital si existe, si no
 * una línea en blanco; nombre siempre (si hay); especialidad y N° de
 * colegiatura solo si el dato real está disponible. */
export function buildSignatureBlock(f: FirmanteInfo): string {
  if (!f.nombre) return "";
  return `
    <div style="text-align:right;">
      ${f.firmaUrl
        ? `<img src="${f.firmaUrl}" style="height:40px;object-fit:contain;margin:0 0 6px auto;display:block;" crossorigin="anonymous" />`
        : `<div style="height:1px;width:150px;background:#cbd5e1;margin:0 0 6px auto;"></div>`
      }
      <div style="font-size:12px;font-weight:800;color:#0f172a;">Dr. ${esc(f.nombre)}</div>
      ${f.especialidad ? `<div style="font-size:10.5px;color:#0e7490;font-weight:600;">${esc(f.especialidad)}</div>` : ""}
      ${f.numColegiatura ? `<div style="font-size:9.5px;color:#94a3b8;">C.O.P. ${esc(f.numColegiatura)}</div>` : ""}
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
  return `<div style="width:${widthPx}px;background:#ffffff;font-family:Poppins,Arial,sans-serif;color:#1e293b;border-top:4px solid #0891b2;border-bottom:4px solid #0891b2;">${bodyHtml}</div>`;
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

/** PDF de una sola imagen completa — ideal para documentos cortos que caben en una página (ej. un presupuesto). */
export async function downloadHtmlAsSinglePagePdf(html: string, filename: string) {
  const canvas = await withOffscreenContainer(html, (container) =>
    html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" }),
  );
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({ orientation: canvas.width >= canvas.height ? "landscape" : "portrait", unit: "px", format: [canvas.width, canvas.height] });
  pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}

/** PDF paginado automáticamente en A4 — para documentos largos (ej. el expediente completo). */
export async function downloadHtmlAsPaginatedPdf(html: string, filename: string, widthPx = 900) {
  await withOffscreenContainer(html, (container) => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
    return new Promise<void>((resolve, reject) => {
      pdf.html(container, {
        margin: [24, 24, 24, 24],
        autoPaging: "text",
        width: pdf.internal.pageSize.getWidth() - 48,
        windowWidth: widthPx,
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        callback: (doc) => {
          doc.save(filename);
          resolve();
        },
      }).catch(reject);
    });
  });
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
