import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface HistoriaClinicaInfo {
  id: string;
  codigo_historia: string;
  estado: string;
  fecha_creacion: string;
}

/**
 * Devuelve la historia clínica del paciente si ya existe; si no, la crea.
 * Código = 4 iniciales del nombre+apellido + YYMMDD de nacimiento + correlativo (3 dígitos).
 * Usado tanto al registrar un paciente nuevo como al iniciar su primera consulta.
 */
export async function resolveOrCrearHistoriaClinica(
  supabase: Supabase,
  pacienteId: string,
  dni: string
): Promise<HistoriaClinicaInfo | { error: string }> {
  const { data: existente } = await supabase
    .from("historia_clinica")
    .select("id, codigo_historia, estado, fecha_creacion")
    .eq("paciente_id", pacienteId)
    .maybeSingle();

  if (existente) return existente as HistoriaClinicaInfo;

  const year = new Date().getFullYear();
  const codigo_historia = `HC${year}-${dni}`;

  const newId = crypto.randomUUID();
  const fechaCreacion = new Date().toISOString();
  
  const { error } = await supabase
    .from("historia_clinica")
    .insert({
      id: newId,
      paciente_id: pacienteId,
      codigo_historia,
      fecha_creacion: fechaCreacion,
      estado: "activa"
    });

  if (error) {
    console.error("Error creando historia clínica:", error);
    return { error: "No se pudo crear la historia clínica." };
  }
  
  return {
    id: newId,
    codigo_historia,
    estado: "activa",
    fecha_creacion: fechaCreacion
  } as HistoriaClinicaInfo;
}
