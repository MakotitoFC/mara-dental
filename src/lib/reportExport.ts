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

/** URL absoluta del logo de marca — usar siempre este helper para que funcione dentro de iframes/canvas offscreen. */
export function logoSrc(): string {
  if (typeof window === "undefined") return "/Cian_MaraDental.png";
  return `${window.location.origin}/Cian_MaraDental.png`;
}

export function buildLetterheadHeader(opts: { clinica: ClinicaInfo | null; titulo: string; sub?: string; generado: string }): string {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:2px solid #0891b2;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="${logoSrc()}" style="height:34px;object-fit:contain;" crossorigin="anonymous" />
        ${opts.clinica?.nombre_clinica ? `<span style="font-size:16px;font-weight:800;color:#0e7490;">${esc(opts.clinica.nombre_clinica)}</span>` : ""}
      </div>
      <div style="text-align:right;">
        <div style="font-size:13px;font-weight:700;color:#1e293b;">${esc(opts.titulo)}</div>
        ${opts.sub ? `<div style="font-size:10.5px;color:#64748b;">${esc(opts.sub)}</div>` : ""}
        <div style="font-size:10px;color:#94a3b8;">Generado: ${esc(opts.generado)}</div>
      </div>
    </div>
  `;
}

export function buildLetterheadFooter(clinica: ClinicaInfo | null): string {
  if (!clinica) return "";
  const left = [clinica.nombre_clinica, clinica.direccion].filter(Boolean).join(" · ");
  const right = [clinica.telefono, clinica.email_contacto].filter(Boolean).join(" · ");
  if (!left && !right) return "";
  return `
    <div style="padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
      <span style="font-size:9.5px;color:#94a3b8;">${esc(left)}</span>
      <span style="font-size:9.5px;color:#94a3b8;">${esc(right)}</span>
    </div>
  `;
}

export function wrapDocument(bodyHtml: string, widthPx = 900): string {
  return `<div style="width:${widthPx}px;background:#ffffff;font-family:Poppins,Arial,sans-serif;color:#1e293b;">${bodyHtml}</div>`;
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
