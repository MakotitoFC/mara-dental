export type TipoArchivo =
  | "radiografia_periapical"
  | "radiografia_panoramica"
  | "foto_intraoral"
  | "foto_extraoral"
  | "tomografia"
  | "consentimiento"
  | "otro";

export interface Archivo {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  tipo: TipoArchivo;
  nombre: string;
  fecha: string;          // YYYY-MM-DD
  medico: string;
  notas?: string;
  es_imagen: boolean;
  /** URL o data URI para preview (mock) */
  preview_url?: string;
}
