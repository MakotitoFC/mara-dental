// Maps to public.receta_medicamento
export interface Medicamento {
  id: string;
  nombre: string;         // receta_medicamento.medicamento_nombre
  dosis: string;          // receta_medicamento.dosis
  frecuencia: string;     // receta_medicamento.frecuencia
  indicaciones?: string;  // receta_medicamento.indicaciones
}

// Maps to public.recetas
export interface Receta {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  doctor_nombre: string;  // derived from personal join
  fecha: string;          // recetas.fecha_emision
  diagnostico_texto: string; // display text derived from diagnostico table
  medicamentos: Medicamento[];
  estado: "activa" | "cancelada"; // recetas.estado
}
