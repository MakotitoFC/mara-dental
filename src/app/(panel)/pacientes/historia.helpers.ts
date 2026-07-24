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
  pacienteId: number,
  nombre: string,
  apellido: string,
  fechaNacimiento: string,
): Promise<HistoriaClinicaInfo | { error: string }> {
  const { data: existente } = await supabase
    .from("historia_clinica")
    .select("id, codigo_historia, estado, fecha_creacion")
    .eq("paciente_id", pacienteId)
    .maybeSingle();

  if (existente) return existente as HistoriaClinicaInfo;

  const full = `${nombre} ${apellido}`.trim().split(/\s+/);
  let inits = full.map((w) => w[0]?.toUpperCase() ?? "").join("");
  if (inits.length < 4) inits = inits.padEnd(4, "X");
  inits = inits.substring(0, 4);

  const yymmdd = fechaNacimiento.substring(2, 4) + fechaNacimiento.substring(5, 7) + fechaNacimiento.substring(8, 10);
  const prefix = `${inits}${yymmdd}`;

  const { data: existentes } = await supabase
    .from("historia_clinica")
    .select("codigo_historia")
    .like("codigo_historia", `${prefix}%`)
    .order("codigo_historia", { ascending: false })
    .limit(1);

  let num = 0;
  if (existentes && existentes.length > 0) {
    const parsedNum = parseInt(existentes[0].codigo_historia.substring(10), 10);
    if (!isNaN(parsedNum)) num = parsedNum + 1;
  }
  const codigo_historia = `${prefix}${String(num).padStart(3, "0")}`;

  const newId = crypto.randomUUID();
  const { data: inserted, error } = await supabase
    .from("historia_clinica")
    .insert({
      id: newId,
      paciente_id: pacienteId,
      codigo_historia,
      fecha_creacion: new Date().toISOString(),
    })
    .select("id, codigo_historia, estado, fecha_creacion")
    .single();

  if (error) {
    console.error("Error creando historia clínica:", error);
    return { error: "No se pudo crear la historia clínica." };
  }
  return inserted as HistoriaClinicaInfo;
}
