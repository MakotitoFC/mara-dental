// Maps to archivos_clinicos.tipo_archivo
export type TipoArchivo =
  | "radiografia_periapical"
  | "radiografia_panoramica"
  | "foto_intraoral"
  | "foto_extraoral"
  | "tomografia"
  | "consentimiento"
  | "otro";

// Maps to public.archivos_clinicos
export interface Archivo {
  id: string;
  // paciente_id is derived via diagnostico_id → historia_clinica → paciente
  // kept here for mock convenience only:
  paciente_id: string;
  paciente_nombre: string;
  tipo: TipoArchivo;          // archivos_clinicos.tipo_archivo
  nombre: string;             // archivos_clinicos.nombre_archivo
  categoria?: string;         // archivos_clinicos.categoria
  fecha: string;              // archivos_clinicos.fecha_subida (YYYY-MM-DD)
  doctor_nombre: string;      // derived from subido_por → personal
  descripcion?: string;       // archivos_clinicos.descripcion (NOT notas)
  tamanio_bytes?: number;     // archivos_clinicos.tamaño_bytes
  es_imagen: boolean;         // derived: tipo starts with foto_ or radiografia_ or tomografia
  url?: string;               // archivos_clinicos.url
  preview_url?: string;       // mock only
}
