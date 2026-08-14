"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { DatePicker } from "@/components/ui/DatePicker";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { calcEdad } from "@/lib/date-utils";
import { getExpedienteCompletoAction } from "../actions";
import {
  esc, fmtGenerado, buildLetterheadHeader, buildLetterheadFooter, sectionLabel, wrapDocument,
  downloadHtmlAsPaginatedPdf, printHtml, type ClinicaInfo,
} from "@/lib/reportExport";

type Secciones = {
  resumenClinico: boolean;
  tratamientos: boolean;
  recetas: boolean;
  presupuestos: boolean;
  archivos: boolean;
  odontogramas: boolean;
};

const SECCION_OPTIONS: { key: keyof Secciones; label: string; icon: string }[] = [
  { key: "resumenClinico", label: "Resumen clínico (alergias, antecedentes)", icon: "medical_information" },
  { key: "tratamientos", label: "Tratamientos y plan de trabajo", icon: "medical_services" },
  { key: "recetas", label: "Recetas médicas", icon: "medication" },
  { key: "presupuestos", label: "Presupuestos y pagos", icon: "payments" },
  { key: "archivos", label: "Archivos clínicos", icon: "photo_library" },
  { key: "odontogramas", label: "Odontogramas por visita", icon: "tooth" },
];

function slugify(s: string) {
  return (s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase();
}

function Checkbox({ checked, onChange, icon, label }: { checked: boolean; onChange: () => void; icon: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
    >
      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
        checked ? "bg-cyan-600 border-cyan-600" : "border-slate-300"
      }`}>
        {checked && <Icon name="check" size={13} className="text-white" />}
      </span>
      <Icon name={icon} size={16} className="text-slate-400 shrink-0" />
      <span className="text-[12.5px] text-slate-700 font-medium">{label}</span>
    </button>
  );
}

// ─── Documento "Historia Clínica Odontológica" ─────────────────────────────
// Reutiliza el mismo sistema de membrete/badges/firma que Receta, Presupuesto
// y Archivo Clínico (src/lib/reportExport.ts) en vez del @react-pdf/renderer
// que tenía antes ExpedientePDF.tsx — así los 4 documentos comparten un único
// lenguaje visual. El paginado a PDF es automático (downloadHtmlAsPaginatedPdf),
// por lo que el HTML se arma como un flujo continuo, no en "páginas" fijas.

const fmtFechaCorta = (iso?: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
};
const fmtFechaLarga = (iso?: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return iso; }
};

const PLAN_LABEL: Record<string, string> = { "No iniciado": "No iniciado", "En proceso": "En proceso", "Terminado": "Terminado" };
const PLAN_STYLE: Record<string, { bg: string; fg: string }> = {
  "No iniciado": { bg: "#f1f5f9", fg: "#64748b" },
  "En proceso": { bg: "#fef3c7", fg: "#b45309" },
  "Terminado": { bg: "#d1fae5", fg: "#059669" },
};

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

/** Colores del odontograma a partir del nombre real de la condición registrada
 * (no hay un mapa fijo condición→color en BD; se infiere del texto). */
function toothStyle(convention?: string) {
  const c = (convention || "").toLowerCase();
  if (c.includes("caries")) return { bg: "#dc2626", fg: "#fff" };
  if (c.includes("obtur") || c.includes("restaur")) return { bg: "#b45309", fg: "#fff" };
  return { bg: "#0891b2", fg: "#fff" };
}

function buildOdontogramaHtml(entries: any[]): string {
  const allFindings = entries.flatMap((o: any) => o.findings || []);
  if (allFindings.length === 0) return "";
  const byTooth = new Map(allFindings.map((f: any) => [f.toothNumber, f]));

  const row = (teeth: number[]) => `
    <div style="display:grid;grid-template-columns:repeat(16,1fr);gap:3px;margin-bottom:3px;">
      ${teeth.map((n) => {
        const f = byTooth.get(n);
        const style = f ? toothStyle(f.isAll ? f.allConvention : f.surfaceConditions?.[0]?.convention) : null;
        return `<div style="aspect-ratio:1;border:1px solid ${style ? style.bg : "#e2e8f0"};border-radius:4px;background:${style ? style.bg : "#f8fafc"};color:${style ? style.fg : "#94a3b8"};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;">${n}</div>`;
      }).join("")}
    </div>
  `;

  const findingLines = allFindings.map((f: any) => {
    const cond = f.isAll ? f.allConvention : (f.surfaceConditions || []).map((s: any) => `${s.surface}: ${s.convention}`).join(", ");
    return `<div style="font-size:10px;color:#64748b;margin-top:3px;"><b style="color:#1e293b;font-weight:700;">Pieza ${f.toothNumber}</b> — ${esc(cond)}${f.observaciones ? ` · ${esc(f.observaciones)}` : ""}</div>`;
  }).join("");

  return `
    <div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-top:10px;">
      ${row(UPPER_TEETH)}
      ${row(LOWER_TEETH)}
      ${findingLines}
    </div>
  `;
}

function buildHistoriaClinicaHtml(data: any): string {
  const p = data.paciente;
  const nombreCompleto = [p.nombre, p.apellido].filter(Boolean).join(" ") || "Paciente";
  const clinica: ClinicaInfo | null = data.sede;
  const hc = data.historiaClinica;
  const ant = p.antecedentes_estructurados || { cronicas: [], medicacion_habitual: [], quirurgicos: [] };
  const alergias: string[] = Array.isArray(p.alergias) ? p.alergias : [];
  const docCode = hc?.codigo_historia || "Historia Clínica";
  const generado = fmtGenerado();
  const edad = p.fecha_nacimiento ? calcEdad(p.fecha_nacimiento) : null;
  const initials = [p.nombre, p.apellido].filter(Boolean).map((s: string) => s[0]).join("").toUpperCase().slice(0, 2) || "PA";

  const header = buildLetterheadHeader({ clinica, docLabel: "Historia Clínica Odontológica", docCode, pacienteNombre: nombreCompleto, generado });
  const footer = buildLetterheadFooter({ clinica, pacienteNombre: nombreCompleto, docCode });

  const field = (label: string, value?: string | null) => `
    <div style="padding-left:11px;border-left:2px solid #d3edf1;">
      <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;">${esc(label)}</div>
      <div style="font-size:12.5px;color:#1e293b;font-weight:500;margin-top:2px;">${esc(value ?? "—")}</div>
    </div>
  `;
  const infoItem = (label: string, value?: string | null) => value ? `
    <div>
      <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;">${esc(label)}</div>
      <div style="font-size:11.5px;color:#1e293b;font-weight:500;margin-top:2px;">${esc(value)}</div>
    </div>
  ` : "";
  const pillRow = (items: string[], bg: string, fg: string) => items.length === 0 ? "" : `
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
      ${items.map((a) => `<span style="display:inline-flex;padding:3.5px 11px;border-radius:999px;font-size:10.5px;font-weight:700;background:${bg};color:${fg};">${esc(a)}</span>`).join("")}
    </div>
  `;

  const patientPage = `
    <table style="width:100%;border-collapse:collapse;margin-top:24px;"><tr>
      <td style="width:56px;padding:0 16px 0 28px;vertical-align:middle;">
        <table style="width:56px;height:56px;border-collapse:collapse;"><tr>
          <td style="width:56px;height:56px;border-radius:50%;background:linear-gradient(155deg,#0891b2,#0e7490);color:#fff;text-align:center;vertical-align:middle;font-size:18px;font-weight:800;">${esc(initials)}</td>
        </tr></table>
      </td>
      <td style="vertical-align:middle;padding-right:28px;">
        <div style="font-size:20px;font-weight:800;color:#1e293b;">${esc(nombreCompleto)}</div>
        <div style="font-size:11.5px;color:#64748b;margin-top:3px;">DNI ${esc(p.dni || "—")} · ${esc(p.sexo || "—")}${edad != null ? ` · ${edad} años` : ""}</div>
        <div style="margin-top:8px;">
          ${hc?.codigo_historia ? `<span style="display:inline-block;padding:4px 11px 3px;border-radius:999px;font-size:10.5px;font-weight:700;line-height:1;background:#e3f4f6;color:#0e7490;">${esc(hc.codigo_historia)}</span>` : ""}
          ${p.activo != null ? `<span style="display:inline-block;padding:4px 11px 3px;border-radius:999px;font-size:10.5px;font-weight:700;line-height:1;margin-left:6px;background:${p.activo ? "#d1fae5" : "#f1f5f9"};color:${p.activo ? "#059669" : "#64748b"};">${p.activo ? "Activo" : "Inactivo"}</span>` : ""}
        </div>
      </td>
    </tr></table>

    <div style="padding:22px 28px 0;display:grid;grid-template-columns:repeat(2,1fr);gap:14px 28px;">
      ${field("Fecha de nacimiento", fmtFechaCorta(p.fecha_nacimiento))}
      ${field("Sexo", p.sexo)}
      ${field("Grupo sanguíneo", p.grupo_sanguineo)}
      ${field("Teléfono", p.telefono)}
      ${field("Email", p.email)}
      ${field("Dirección", p.direccion || p.domicilio)}
    </div>

    <div style="margin:20px 28px 0;padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      ${sectionLabel("Resumen clínico")}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px 20px;margin-bottom:12px;">
        ${infoItem("Ocupación", p.ocupacion)}
        ${infoItem("Estado civil", p.estado_civil)}
        ${infoItem("Instrucción", p.grado_instruccion)}
        ${infoItem("Procedencia", p.lugar_procedencia)}
        ${infoItem("Religión", p.religion)}
        ${infoItem("Lugar de nacimiento", p.lugar_nacimiento)}
      </div>
      <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;">Alergias</div>
      ${alergias.length > 0 ? pillRow(alergias, "#fee2e2", "#dc2626") : `<div style="font-size:11px;color:#94a3b8;margin-top:3px;">Ninguna registrada</div>`}
      ${ant.cronicas?.length > 0 ? `<div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin-top:10px;">Enfermedades crónicas</div>${pillRow(ant.cronicas, "#fef3c7", "#b45309")}` : ""}
      ${ant.medicacion_habitual?.length > 0 ? `<div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin-top:10px;">Medicación habitual</div>${pillRow(ant.medicacion_habitual, "#ede9fe", "#7c3aed")}` : ""}
      ${ant.quirurgicos?.length > 0 ? `<div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin-top:10px;">Antecedentes quirúrgicos</div>${pillRow(ant.quirurgicos, "#e3f4f6", "#0e7490")}` : ""}
      ${p.enfermedad_actual ? `<div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin-top:10px;">Enfermedad actual / restricciones</div><div style="font-size:11.5px;color:#1e293b;margin-top:3px;">${esc(p.enfermedad_actual)}</div>` : ""}
    </div>
  `;

  const consultasHtml = data.consultas.length === 0
    ? `<div style="padding:22px 28px 0;"><p style="font-size:11.5px;color:#94a3b8;">Sin consultas registradas en el rango seleccionado.</p></div>`
    : data.consultas.map((c: any) => {
      const diagnosticosRows = (c.diagnosticos || []).map((d: any) => `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;font-weight:700;color:#0e7490;">${esc(d.cie10?.codigo || "—")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11.5px;color:#1e293b;">${esc(d.texto)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;">
            <span style="display:inline-flex;padding:3px 9px;border-radius:5px;font-size:10px;font-weight:700;background:${d.es_definitivo ? "#fee2e2" : "#fef3c7"};color:${d.es_definitivo ? "#dc2626" : "#b45309"};">${d.es_definitivo ? "Definitivo" : "Presuntivo"}</span>
          </td>
        </tr>
      `).join("");

      const planItems = (c.diagnosticos || []).flatMap((d: any) => d.tratamientos || []);
      const planRows = planItems.map((t: any) => `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11.5px;color:#1e293b;font-weight:600;">${esc(t.nombre)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#64748b;">${esc(t.notas || "—")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11.5px;color:#1e293b;text-align:right;">${t.precio > 0 ? `${t.moneda === "PEN" ? "S/" : t.moneda} ${Number(t.precio).toFixed(2)}` : "—"}</td>
        </tr>
      `).join("");

      const faseItems = (c.diagnosticos || []).flatMap((d: any) => d.plan || []);
      const faseRows = faseItems.map((f: any) => {
        const st = PLAN_STYLE[f.estado] || PLAN_STYLE["No iniciado"];
        return `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11.5px;color:#1e293b;font-weight:600;">${esc(f.etapa)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#64748b;">${esc(f.descripcion || "—")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;"><span style="display:inline-flex;padding:3px 9px;border-radius:5px;font-size:10px;font-weight:700;background:${st.bg};color:${st.fg};">${esc(PLAN_LABEL[f.estado] || f.estado)}</span></td>
        </tr>
      `;}).join("");

      const medsItems = (c.diagnosticos || []).flatMap((d: any) => (d.recetas || []).flatMap((r: any) => r.medicamentos || []));
      const medsRows = medsItems.map((m: any) => `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11.5px;color:#1e293b;font-weight:700;">${esc(m.nombre)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#334155;">${esc(m.dosis || "—")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#334155;">${esc(m.frecuencia || "—")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#64748b;">${esc(m.indicaciones || "—")}</td>
        </tr>
      `).join("");

      const presupuestosHtml = (c.presupuestos || []).map((p: any) => `
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;">
          <thead><tr>
            <th style="text-align:left;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Ítem</th>
            <th style="text-align:center;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Cant.</th>
            <th style="text-align:right;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Subtotal</th>
          </tr></thead>
          <tbody>
            ${(p.items || []).map((it: any) => `
              <tr>
                <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#1e293b;">${esc(it.nombre)}</td>
                <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#334155;text-align:center;">${it.cantidad}</td>
                <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#1e293b;text-align:right;">S/ ${Number(it.subtotal).toFixed(2)}</td>
              </tr>
            `).join("")}
            <tr>
              <td style="padding:7px 10px;font-size:11px;font-weight:700;color:#1e293b;" colspan="2">Total neto / Pagado / Saldo</td>
              <td style="padding:7px 10px;font-size:11px;font-weight:700;color:#0e7490;text-align:right;">S/ ${Number(p.neto).toFixed(2)} / S/ ${Number(p.pagado).toFixed(2)} / S/ ${Number(p.saldo).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      `).join("");

      const odontoHtml = buildOdontogramaHtml(c.odontogramaDetalle || []);

      const archivosHtml = (c.archivos || []).length === 0 ? "" : `
        <div style="margin-bottom:4px;">${sectionLabel(`Archivos de la visita (${c.archivos.length})`)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
          ${(c.archivos || []).map((a: any) => {
            const isImg = /\.(jpe?g|png|gif|webp)$/i.test(a.nombre_archivo || "");
            return `
              <div style="width:120px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;flex-shrink:0;">
                <div style="height:84px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                  ${isImg
                    ? `<img src="${a.displayUrl}" style="width:100%;height:100%;object-fit:cover;" crossorigin="anonymous" />`
                    : `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" stroke="#94a3b8" stroke-width="1.6"/><path d="M14 2v5h5" stroke="#94a3b8" stroke-width="1.6"/></svg>`
                  }
                </div>
                <div style="padding:5px 7px;">
                  <div style="font-size:9px;color:#334155;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(a.nombre_archivo)}</div>
                  <div style="font-size:8px;color:#94a3b8;margin-top:1px;">${esc(a.categoria || a.tipo_archivo || "")}</div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;

      const recomendacionesHtml = (c.recomendaciones || []).length === 0 ? "" : `
        <div style="margin:14px 0 4px;">${sectionLabel("Recomendaciones")}</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:6px;">
          ${(c.recomendaciones || []).map((r: any) => `
            <div style="border:1px solid #e2e8f0;border-radius:8px;padding:9px 12px;font-size:11px;color:#1e293b;line-height:1.5;">${esc(r.contenido)}</div>
          `).join("")}
        </div>
      `;

      return `
        <div style="padding:26px 28px 0;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:12px;">
            <div>
              <div style="font-size:15px;font-weight:800;color:#1e293b;">${esc(c.motivo)}</div>
              <div style="font-size:11px;color:#64748b;margin-top:2px;">${esc(c.doctor)}${c.doctorEspecialidad ? ` · ${esc(c.doctorEspecialidad)}` : ""}</div>
            </div>
            <div style="font-size:12px;font-weight:700;color:#0e7490;white-space:nowrap;">${esc(fmtFechaLarga(c.fecha))}</div>
          </div>

          ${c.observaciones ? `
            <div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;margin-bottom:10px;">
              ${sectionLabel("Anamnesis / Observaciones")}
              <div style="font-size:11.5px;color:#1e293b;line-height:1.55;">${esc(c.observaciones)}</div>
            </div>
          ` : ""}

          ${diagnosticosRows ? `
            <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;">
              <thead><tr>
                <th style="text-align:left;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">CIE-10</th>
                <th style="text-align:left;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Diagnóstico</th>
                <th style="text-align:left;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Tipo</th>
              </tr></thead>
              <tbody>${diagnosticosRows}</tbody>
            </table>
          ` : `<p style="font-size:11px;color:#94a3b8;margin-bottom:10px;">Sin diagnóstico registrado en esta consulta.</p>`}

          ${archivosHtml}

          ${odontoHtml ? `<div style="margin-bottom:4px;">${sectionLabel("Odontograma de la visita")}</div>${odontoHtml}` : ""}

          ${planRows ? `
            <div style="margin:14px 0 4px;">${sectionLabel("Tratamientos")}</div>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;">
              <thead><tr>
                <th style="text-align:left;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Tratamiento</th>
                <th style="text-align:left;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Notas</th>
                <th style="text-align:right;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Costo</th>
              </tr></thead>
              <tbody>${planRows}</tbody>
            </table>
          ` : ""}

          ${faseRows ? `
            <div style="margin-bottom:4px;">${sectionLabel("Fases del tratamiento")}</div>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;">
              <thead><tr>
                <th style="text-align:left;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Fase</th>
                <th style="text-align:left;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Descripción</th>
                <th style="text-align:left;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Estado</th>
              </tr></thead>
              <tbody>${faseRows}</tbody>
            </table>
          ` : ""}

          ${recomendacionesHtml}

          ${medsRows ? `
            <div style="margin:14px 0 4px;">${sectionLabel("Receta — medicamentos prescritos")}</div>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;">
              <thead><tr>
                <th style="text-align:left;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Medicamento</th>
                <th style="text-align:left;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Dosis</th>
                <th style="text-align:left;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Frecuencia</th>
                <th style="text-align:left;padding:7px 10px;font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Indicaciones</th>
              </tr></thead>
              <tbody>${medsRows}</tbody>
            </table>
          ` : ""}

          ${presupuestosHtml ? `<div style="margin:14px 0 4px;">${sectionLabel("Presupuestos de la visita")}</div>${presupuestosHtml}` : ""}
        </div>
        <div style="padding:0 28px 22px;border-bottom:1px solid #e2e8f0;"></div>
      `;
    }).join("");

  const body = `${patientPage}${consultasHtml}`;
  return wrapDocument(`${header}${body}${footer}`, 850);
}

export function DescargarExpedienteModal({ paciente, onClose }: {
  paciente: { id: number | string; nombre?: string; apellido?: string; dni?: string; codigoHistoria?: string | null };
  onClose: () => void;
}) {
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [secciones, setSecciones] = useState<Secciones>({
    resumenClinico: true, tratamientos: true, recetas: true, presupuestos: true, archivos: true, odontogramas: true,
  });
  const [generando, setGenerando] = useState<"print" | "pdf" | null>(null);
  const [error, setError] = useState("");

  function toggle(key: keyof Secciones) {
    setSecciones((s) => ({ ...s, [key]: !s[key] }));
  }

  function aplicarSecciones(data: any) {
    if (secciones.resumenClinico && secciones.tratamientos && secciones.recetas && secciones.presupuestos && secciones.archivos && secciones.odontogramas) {
      return data;
    }
    return {
      ...data,
      paciente: secciones.resumenClinico ? data.paciente : { ...data.paciente, alergias: [], antecedentes_estructurados: null, enfermedad_actual: null },
      consultas: data.consultas.map((c: any) => ({
        ...c,
        diagnosticos: (c.diagnosticos || []).map((d: any) => ({
          ...d,
          tratamientos: secciones.tratamientos ? d.tratamientos : [],
          plan: secciones.tratamientos ? d.plan : [],
          recetas: secciones.recetas ? d.recetas : [],
        })),
        presupuestos: secciones.presupuestos ? c.presupuestos : [],
        archivos: secciones.archivos ? c.archivos : [],
        odontogramaDetalle: secciones.odontogramas ? c.odontogramaDetalle : [],
      })),
    };
  }

  async function generar(mode: "print" | "pdf") {
    setGenerando(mode);
    setError("");
    try {
      const data = await getExpedienteCompletoAction(String(paciente.id), {
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      });
      if (!data) { setError("No se pudo cargar el expediente del paciente."); return; }

      const filtrado = aplicarSecciones(data);
      const html = buildHistoriaClinicaHtml(filtrado);
      const nombreCompleto = [paciente.nombre, paciente.apellido].filter(Boolean).join(" ") || "Paciente";

      if (mode === "print") {
        await printHtml(html, `Historia Clínica · ${nombreCompleto}`);
      } else {
        const codigo = data.historiaClinica?.codigo_historia || slugify(`${paciente.nombre ?? ""}${paciente.apellido ?? ""}`);
        const apellido = slugify(paciente.apellido || data.paciente?.apellido || "PACIENTE");
        const fecha = new Date().toISOString().split("T")[0];
        const filename = `HC-${codigo}-${apellido}-${fecha}.pdf`;
        await downloadHtmlAsPaginatedPdf(html, filename, 850);
      }
      onClose();
    } catch (err) {
      console.error("Error generando expediente:", err);
      setError("Ocurrió un error generando el PDF. Intenta de nuevo.");
    } finally {
      setGenerando(null);
    }
  }

  return (
    <ResponsiveSheet
      onClose={onClose}
      title="Descargar expediente"
      maxWidthDesktop="480px"
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-[12px] text-red-600">
              <Icon name="warning" size={14} className="shrink-0" /> {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => generar("print")}
              disabled={generando !== null}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-xl text-[13px] font-semibold transition-colors"
            >
              <Icon name="print" size={15} />
              {generando === "print" ? "Preparando…" : "Imprimir"}
            </button>
            <button
              onClick={() => generar("pdf")}
              disabled={generando !== null}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-colors"
            >
              <Icon name="download" size={15} />
              {generando === "pdf" ? "Generando…" : "Descargar PDF"}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Rango de fechas (opcional)</p>
          <div className="grid grid-cols-2 gap-2">
            <DatePicker value={fechaDesde} onChange={setFechaDesde} placeholder="Desde" max={fechaHasta || undefined} />
            <DatePicker value={fechaHasta} onChange={setFechaHasta} placeholder="Hasta" min={fechaDesde || undefined} />
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1.5">Deja en blanco para incluir todo el historial.</p>
        </div>

        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Secciones a incluir</p>
          <div className="flex flex-col gap-1.5">
            {SECCION_OPTIONS.map((opt) => (
              <Checkbox key={opt.key} icon={opt.icon} label={opt.label} checked={secciones[opt.key]} onChange={() => toggle(opt.key)} />
            ))}
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1.5">
            Datos personales, diagnósticos e historial de consultas siempre se incluyen.
          </p>
        </div>
      </div>
    </ResponsiveSheet>
  );
}
