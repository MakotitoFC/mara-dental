import type { EstadoCita } from "@/types/agenda";

// ─── Vistas de calendario ──────────────────────────────────────────────────

export type CalView = "day" | "week" | "month" | "year" | "cronograma";

export const VIEW_LABELS: Record<CalView, string> = { day: "Día", week: "Semana", month: "Mes", year: "Año", cronograma: "Cronograma" };
export const VIEW_ICONS: Record<CalView, string> = {
  day: "today", week: "calendar_month", month: "event", year: "calendar_range", cronograma: "schedule_view",
};

// ─── Fechas ─────────────────────────────────────────────────────────────────

export function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}
export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
export function getMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  r.setHours(0, 0, 0, 0);
  return r;
}
export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
export function calcHoraFin(horaInicio: string, minutos: number): string {
  const total = timeToMin(horaInicio) + minutos;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "14:00" → "2:00 p.m." — para confirmar sin ambigüedad la hora elegida en el <input type="time"> nativo. */
export function fmtHora12(hhmm: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "a.m." : "p.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** "2026-07-20" → "lunes 20 de julio de 2026" */
export function fmtFechaLarga(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  const raw = d.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
export function initials(name: string): string {
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
export function shortName(name: string): string {
  const parts = name.trim().split(" ");
  return parts[0] + (parts[1] ? " " + parts[1][0] + "." : "");
}

/** Genera 6 semanas (lunes-domingo) para la cuadrícula del mes. */
export function getMonthGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay();
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = addDays(firstDay, -daysBack);
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d))
  );
}

export const DAY_SHORT = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
export const MONTHS_L = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Horario visible en las vistas Día/Semana: 07:00 – 20:00 en bloques de 1h.
export const HOURS = Array.from({ length: 14 }, (_, i) => `${String(7 + i).padStart(2, "0")}:00`);
export const SLOT_H = 68; // px por hora
export const FIRST_H = 7;

// ─── Estado de cita (iconos — los colores viven en src/lib/colors.ts) ──────

export const ESTADO_ICON: Record<EstadoCita, string> = {
  programada: "schedule",
  confirmada: "check_circle",
  atendida: "event_available",
  cancelada: "cancel",
};

export const ESTADO_ORDER: EstadoCita[] = ["programada", "confirmada", "atendida", "cancelada"];

// Tipos de consulta ofrecidos al crear/editar — alineados con TIPO_CITA_ORDER
// (src/lib/colors.ts) para que el sistema de colores tenga sentido en toda la agenda.
export const TIPO_CONSULTA_OPTIONS = ["endodoncia", "ortodoncia", "cirugia", "limpieza", "revision", "otros"] as const;
