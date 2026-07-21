import type { EstadoCita } from "@/types/agenda";

export type TipoCita = "endodoncia" | "ortodoncia" | "cirugia" | "limpieza" | "revision" | "otros";

const TIPO_KEYWORDS: Record<TipoCita, string[]> = {
  endodoncia: ["endodoncia"],
  ortodoncia: ["ortodoncia"],
  cirugia: ["cirugia", "cirugía", "extraccion", "extracción"],
  limpieza: ["limpieza", "profilaxis"],
  revision: ["revision", "revisión", "control", "consulta"],
  otros: [],
};

/** Normaliza el texto libre `tipo_consulta` de la BD a una de las 6 categorías con color fijo. */
export function resolveTipoCita(tipoConsulta: string): TipoCita {
  const normalized = tipoConsulta.trim().toLowerCase();
  for (const [tipo, keywords] of Object.entries(TIPO_KEYWORDS) as [TipoCita, string[]][]) {
    if (keywords.some((k) => normalized.includes(k))) return tipo;
  }
  return "otros";
}

/** Lee los tokens --tipo-{tipo}-solid/bg/text definidos en globals.css. */
export function tipoCitaVars(tipo: TipoCita) {
  return {
    solid: `var(--tipo-${tipo}-solid)`,
    bg: `var(--tipo-${tipo}-bg)`,
    text: `var(--tipo-${tipo}-text)`,
  };
}

export const TIPO_CITA_LABEL: Record<TipoCita, string> = {
  endodoncia: "Endodoncia",
  ortodoncia: "Ortodoncia",
  cirugia: "Cirugía",
  limpieza: "Limpieza",
  revision: "Revisión",
  otros: "Otros",
};

export const TIPO_CITA_ORDER: TipoCita[] = ["endodoncia", "ortodoncia", "cirugia", "limpieza", "revision", "otros"];

/** Lee los tokens --estado-{estado}-solid/bg/text definidos en globals.css. */
export function estadoCitaVars(estado: EstadoCita) {
  return {
    solid: `var(--estado-${estado}-solid)`,
    bg: `var(--estado-${estado}-bg)`,
    text: `var(--estado-${estado}-text)`,
  };
}

export const ESTADO_CITA_LABEL: Record<EstadoCita, string> = {
  programada: "Programada",
  confirmada: "Confirmada",
  atendida: "Realizada",
  cancelada: "Cancelada",
};
