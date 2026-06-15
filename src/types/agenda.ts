export type EstadoCita =
  | "confirmada"
  | "pendiente"
  | "en_progreso"
  | "emergencia"
  | "ausente"
  | "cancelada";

export interface Cita {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  alergias: string[];
  servicio_nombre: string;
  medico_nombre: string;
  fecha: string;        // YYYY-MM-DD
  hora_inicio: string;  // HH:mm
  hora_fin: string;     // HH:mm
  duracion_min: number;
  estado: EstadoCita;
  notas_internas?: string;
}
