// No existe una columna de color por doctor en BD (solo tipo_consulta.color) —
// se deriva un color determinístico del uuid del doctor, igual que
// PacientesView.tsx hace para los avatares de paciente (hash*31+charCode).
const DOCTOR_PALETTE = [
  "#0891b2", // cyan-600
  "#7c3aed", // violet-600
  "#db2777", // pink-600
  "#d97706", // amber-600
  "#059669", // emerald-600
  "#dc2626", // red-600
  "#4f46e5", // indigo-600
  "#0d9488", // teal-600
];

export function hashDoctorColor(doctorId: string): string {
  let hash = 0;
  for (let i = 0; i < doctorId.length; i++) hash = (hash * 31 + doctorId.charCodeAt(i)) >>> 0;
  return DOCTOR_PALETTE[hash % DOCTOR_PALETTE.length];
}

export function getDoctorVars(doctorId: string): { solid: string; bg: string; text: string } {
  const hex = hashDoctorColor(doctorId);
  return { solid: hex, bg: `${hex}26`, text: hex };
}

// Mapa doctorId → info de badge, usado por las vistas agregadas (Mes/Semana/
// Cronograma) para identificar visualmente al médico de cada cita cuando el
// asistente ve la agenda de varios médicos a la vez. `undefined`/vacío para
// los demás roles → cero cambio visual.
export type { DoctorMapEntry, DoctorMap } from "./agendaUtils";
