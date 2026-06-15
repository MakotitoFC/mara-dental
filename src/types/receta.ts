export interface Medicamento {
  id: string;
  nombre: string;
  dosis: string;
  via: string;
  frecuencia: string;
  duracion: string;
  instrucciones?: string;
}

export interface Receta {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  medico: string;
  fecha: string;
  diagnostico: string;
  medicamentos: Medicamento[];
  indicaciones?: string;
}
