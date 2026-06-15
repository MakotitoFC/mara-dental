import type { Archivo, TipoArchivo } from "@/types/archivo";

export const TIPO_CFG: Record<TipoArchivo, { label: string; icon: string; color: string; bg: string }> = {
  radiografia_periapical: { label: "Rx Periapical",   icon: "sensors",      color: "#0891b2", bg: "#ecfeff" },
  radiografia_panoramica: { label: "Rx Panorámica",   icon: "panorama",     color: "#7c3aed", bg: "#f5f3ff" },
  foto_intraoral:         { label: "Foto intraoral",  icon: "photo_camera", color: "#059669", bg: "#f0fdf4" },
  foto_extraoral:         { label: "Foto extraoral",  icon: "portrait",     color: "#d97706", bg: "#fefce8" },
  tomografia:             { label: "Tomografía CBCT", icon: "biotech",      color: "#dc2626", bg: "#fff1f2" },
  consentimiento:         { label: "Consentimiento",  icon: "description",  color: "#64748b", bg: "#f8fafc" },
  otro:                   { label: "Otro",            icon: "attach_file",  color: "#94a3b8", bg: "#f8fafc" },
};

// Placeholders SVG inline como data URI para simular miniaturas de imágenes dentales
function rxSvg(label: string, color: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'><rect width='320' height='240' fill='%23111827'/><rect x='40' y='30' width='240' height='180' rx='4' fill='%23${color.slice(1)}22'/><text x='160' y='120' font-family='monospace' font-size='13' fill='%23${color.slice(1)}' text-anchor='middle' dominant-baseline='middle'>${label}</text><text x='160' y='145' font-family='monospace' font-size='10' fill='%23ffffff44' text-anchor='middle'>MaraDental · RX</text></svg>`;
  return `data:image/svg+xml,${svg}`;
}
function fotoSvg(label: string, color: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'><rect width='320' height='240' fill='%23f8fafc'/><rect x='20' y='20' width='280' height='200' rx='8' fill='%23${color.slice(1)}18'/><circle cx='160' cy='100' r='40' fill='%23${color.slice(1)}33'/><text x='160' y='165' font-family='sans-serif' font-size='12' fill='%23${color.slice(1)}' text-anchor='middle'>${label}</text></svg>`;
  return `data:image/svg+xml,${svg}`;
}

export const ARCHIVOS_MOCK: Archivo[] = [
  // Paciente p1 — María González
  { id:"a1",  paciente_id:"p1", paciente_nombre:"María González López", tipo:"radiografia_panoramica", nombre:"Rx_panoramica_inicial.jpg",  fecha:"2025-12-05", medico:"Dr. García", notas:"Radiografía panorámica de diagnóstico inicial. Se observa apiñamiento moderado.", es_imagen:true,  preview_url: rxSvg("RX PANORÁMICA","#7c3aed") },
  { id:"a2",  paciente_id:"p1", paciente_nombre:"María González López", tipo:"radiografia_periapical", nombre:"Rx_periapical_17.jpg",        fecha:"2025-12-05", medico:"Dr. García", notas:"Pieza 17 con caries oclusal extensa. Evaluar necesidad de endodoncia.", es_imagen:true,  preview_url: rxSvg("RX PERIAPICAL #17","#0891b2") },
  { id:"a3",  paciente_id:"p1", paciente_nombre:"María González López", tipo:"foto_intraoral",         nombre:"Foto_intraoral_frontal.jpg",   fecha:"2026-03-10", medico:"Dr. García", notas:"Vista frontal con brackets colocados. Control de alineación.",              es_imagen:true,  preview_url: fotoSvg("INTRAORAL FRONTAL","#059669") },
  { id:"a4",  paciente_id:"p1", paciente_nombre:"María González López", tipo:"consentimiento",         nombre:"Consentimiento_ortodoncia.pdf", fecha:"2025-12-05", medico:"Dr. García", notas:"Consentimiento informado firmado para tratamiento de ortodoncia.",          es_imagen:false },
  { id:"a5",  paciente_id:"p1", paciente_nombre:"María González López", tipo:"foto_intraoral",         nombre:"Foto_oclusal_superior.jpg",    fecha:"2026-06-14", medico:"Dr. García", notas:"Control post-limpieza. Sector oclusal superior.",                          es_imagen:true,  preview_url: fotoSvg("OCLUSAL SUPERIOR","#059669") },

  // Paciente p3 — Ana Torres
  { id:"a6",  paciente_id:"p3", paciente_nombre:"Ana Torres Vidal",     tipo:"radiografia_periapical", nombre:"Rx_periapical_46.jpg",        fecha:"2026-06-14", medico:"Dr. García", notas:"Pieza 46 con raíces convergentes. Pre-extracción.",                        es_imagen:true,  preview_url: rxSvg("RX PERIAPICAL #46","#0891b2") },
  { id:"a7",  paciente_id:"p3", paciente_nombre:"Ana Torres Vidal",     tipo:"consentimiento",         nombre:"Consentimiento_extraccion.pdf", fecha:"2026-06-14", medico:"Dr. García", notas:"Consentimiento para extracción molar con historial de diabetes.",           es_imagen:false },

  // Paciente p6 — Pedro Díaz
  { id:"a8",  paciente_id:"p6", paciente_nombre:"Pedro Díaz Rojas",     tipo:"radiografia_panoramica", nombre:"Rx_panoramica_control.jpg",   fecha:"2025-11-15", medico:"Dr. García", notas:"Control anual. Sin hallazgos relevantes.",                                 es_imagen:true,  preview_url: rxSvg("RX PANORÁMICA","#7c3aed") },
  { id:"a9",  paciente_id:"p6", paciente_nombre:"Pedro Díaz Rojas",     tipo:"foto_extraoral",         nombre:"Foto_perfil_izquierdo.jpg",   fecha:"2025-11-15", medico:"Dr. García", notas:"Foto de perfil para análisis cefalométrico.",                              es_imagen:true,  preview_url: fotoSvg("PERFIL IZQ.","#d97706") },

  // Paciente p12 — Carmen Vega
  { id:"a10", paciente_id:"p12", paciente_nombre:"Carmen Vega Mora",    tipo:"tomografia",             nombre:"CBCT_maxilar.dcm",            fecha:"2026-05-20", medico:"Dr. García", notas:"Tomografía CBCT para planificación de implante. Zona 36.",                 es_imagen:false },
  { id:"a11", paciente_id:"p12", paciente_nombre:"Carmen Vega Mora",    tipo:"radiografia_periapical", nombre:"Rx_periapical_36.jpg",        fecha:"2026-06-17", medico:"Dr. García", notas:"Rx pre-quirúrgica fase 2 de implante pieza 36.",                           es_imagen:true,  preview_url: rxSvg("RX PERIAPICAL #36","#0891b2") },
  { id:"a12", paciente_id:"p12", paciente_nombre:"Carmen Vega Mora",    tipo:"consentimiento",         nombre:"Consentimiento_implante.pdf",  fecha:"2026-05-20", medico:"Dr. García", notas:"Consentimiento quirúrgico para implante dental.",                          es_imagen:false },
];

export function fmtFechaArchivo(iso: string): string {
  const [y, m, d] = iso.split("-");
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
}

export function getArchivosPaciente(id: string): Archivo[] {
  return ARCHIVOS_MOCK.filter((a) => a.paciente_id === id).sort((a,b) => b.fecha.localeCompare(a.fecha));
}
