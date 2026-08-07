import type { ContextoClinicoPaciente } from "../../pacientes/[id]/consulta.actions";

// TEMPORAL — solo para probar visualmente el flujo de "contexto clínico" en
// la vista del asistente mientras no hay datos reales de
// diagnostico/tratamiento/plan_tratamiento cargados para pacientes de los
// médicos mock, y no está confirmado si esas tablas son legibles bajo RLS
// para el asistente (ver CitaFormSheet.tsx). Ejemplos de contenido —no
// corresponden a ningún paciente real— solo para validar el diseño.
const EJEMPLOS: ContextoClinicoPaciente[] = [
  { tipo: "fase", texto: "Endodoncia — sesión 2 de 3: obturación de conductos" },
  { tipo: "fase", texto: "Ortodoncia — ajuste mensual de brackets" },
  { tipo: "tratamiento", texto: "Limpieza profunda y control periodontal" },
  { tipo: "diagnostico", texto: "Caries profunda en pieza 36, pendiente de tratamiento" },
];

/** Determinístico por paciente (mismo paciente → mismo ejemplo) — 1 de cada
 * 4 pacientes no tiene contexto, para simular también el caso "sin tratamiento activo". */
export function contextoClinicoMockDePaciente(pacienteId: string): ContextoClinicoPaciente | null {
  let hash = 0;
  for (let i = 0; i < pacienteId.length; i++) hash = (hash * 31 + pacienteId.charCodeAt(i)) >>> 0;
  if (hash % 4 === 0) return null;
  return EJEMPLOS[hash % EJEMPLOS.length];
}
