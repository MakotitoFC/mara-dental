export type EstadoPaciente = "activo" | "inactivo" | "nuevo";

export interface Paciente {
  id: string;
  nombre: string;
  dni: string;
  fecha_nacimiento: string;   // YYYY-MM-DD
  telefono: string;
  email: string;
  grupo_sanguineo?: string;
  alergias: string[];
  antecedentes: string[];     // diabetes, hipertensión, etc.
  estado: EstadoPaciente;
  ultima_visita?: string;     // YYYY-MM-DD
  proxima_cita?: string;      // YYYY-MM-DD
  notas?: string;
}

export interface NotaClinica {
  id: string;
  paciente_id: string;
  fecha: string;
  medico: string;
  tipo: "consulta" | "procedimiento" | "seguimiento" | "urgencia";
  titulo: string;
  descripcion: string;
  tratamiento?: string;
  medicacion?: string;
}
