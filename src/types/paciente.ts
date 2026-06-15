// UI-layer type derived from pacientes.activo + citas data
export type EstadoPaciente = "activo" | "inactivo" | "nuevo";

// Maps to public.pacientes
// NOTE: `nombre` = pacientes.nombre + " " + pacientes.apellido (combined for display)
export interface Paciente {
  id: string;
  nombre: string;          // combined full name for display
  dni: string;
  fecha_nacimiento: string;  // date YYYY-MM-DD
  telefono: string;
  email?: string;
  direccion?: string;
  sexo?: string;
  grupo_sanguineo?: string;  // pacientes.grupo_sanguineo
  alergias: string[];        // pacientes.alergias jsonb → string[]
  antecedentes: string[];    // pacientes.antecedentes jsonb → string[]
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  activo: boolean;           // pacientes.activo
  // Derived from citas (not stored in pacientes table):
  ultima_visita?: string;
  proxima_cita?: string;
}

// Maps to public.consultas
export interface NotaClinica {
  id: string;
  paciente_id: string;     // derived via historia_clinica
  doctor_nombre: string;   // derived from personal join
  fecha: string;           // consultas.fecha_consulta
  motivo: string;          // consultas.motivo (required)
  tipo: "consulta" | "procedimiento" | "seguimiento" | "urgencia"; // in examen_fisico jsonb
  observaciones?: string;  // consultas.observaciones
  // Stored in consultas.examen_fisico jsonb:
  tratamiento?: string;
  medicacion?: string;
}
