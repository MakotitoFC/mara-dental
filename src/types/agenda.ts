// Maps to citas.estado CHECK constraint in DB
export type EstadoCita =
  | "programada"
  | "hecho"
  | "cancelada";

// Maps to public.citas
export interface Cita {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  alergias: string[];
  tipo_consulta_id: string;   // FK a tipo_consulta.id
  doctor_nombre: string;   // derived from personal join
  fecha: string;           // YYYY-MM-DD
  hora_inicio: string;     // HH:mm
  hora_fin: string;        // HH:mm — duración se calcula como diferencia
  estado: EstadoCita;
  notas?: string;          // citas.notas
}
