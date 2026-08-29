// No existe una columna de color por doctor en BD (solo tipo_consulta.color) —
// se deriva un color determinístico del uuid del doctor vía src/lib/avatarUtils.ts
// (paleta curada de marca, tonos derivados del cian).
export { hashDoctorColor, getDoctorVars } from "@/lib/avatarUtils";

// Mapa doctorId → info de badge, usado por las vistas agregadas (Mes/Semana/
// Cronograma) para identificar visualmente al médico de cada cita cuando el
// asistente ve la agenda de varios médicos a la vez. `undefined`/vacío para
// los demás roles → cero cambio visual.
export type { DoctorMapEntry, DoctorMap } from "./agendaUtils";
