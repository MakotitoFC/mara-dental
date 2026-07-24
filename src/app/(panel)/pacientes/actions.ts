"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { resolveOrCrearHistoriaClinica } from "./historia.helpers";

export async function getPreviewPacienteAction(pacienteId: string) {
  const supabase = await createClient();
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("sexo, grupo_sanguineo, telefono, alergias")
    .eq("id", pacienteId)
    .single();

  if (paciente) {
    let alergiasArr: string[] = [];
    if (Array.isArray(paciente.alergias)) {
      alergiasArr = paciente.alergias;
    } else if (typeof paciente.alergias === "string") {
      try { alergiasArr = JSON.parse(paciente.alergias); } catch { /* ignore */ }
    }
    paciente.alergias = alergiasArr as any;
  }

  return { paciente };
}

export async function getDoctorPacientesAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: personal } = await supabase
    .from("personal")
    .select("id")
    .eq("usuario_id", user.id)
    .single();

  if (!personal) return [];

  // Llama a la función optimizada en la BD
  const { data, error } = await supabase
    .rpc("get_doctor_pacientes_summary", { p_doctor_id: personal.id });

  if (error || !data) {
    console.error("Error obteniendo pacientes optimizados:", error);
    return [];
  }

  return data.map((p: any) => {
    let alergiasArr: string[] = [];
    if (Array.isArray(p.alergias)) {
      alergiasArr = p.alergias;
    } else if (typeof p.alergias === "string") {
      try { alergiasArr = JSON.parse(p.alergias); } catch { /* ignore */ }
    }

    let estado = "activo";
    if (!p.activo) {
      estado = "inactivo";
    } else if (Number(p.total_citas) === 1) {
      estado = "nuevo";
    }

    return {
      id: String(p.id),
      nombre: `${p.nombre} ${p.apellido}`.trim(),
      dni: p.dni,
      fecha_nacimiento: p.fecha_nacimiento,
      telefono: p.telefono,
      alergias: alergiasArr,
      estado,
      ultima_visita: p.ultima_visita
    };
  });
}

export async function createPacienteAction(data: {
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
  telefono: string;
  email?: string;
  sexo?: string;
  lugar_nacimiento?: string;
  raza?: string;
  direccion?: string;
  domicilio?: string;
  lugar_procedencia?: string;
  ocupacion?: string;
  religion?: string;
  grupo_sanguineo?: string;
  estado_civil?: string;
  grado_instruccion?: string;
  enfermedad_actual?: string;
  alergias?: string[];
  antecedentes?: { cronicas: string[]; medicacion_habitual: string[]; quirurgicos: string[] };
}) {
  const supabase = await createClient();

  const hoy = new Date().toISOString().split("T")[0];
  if (data.fecha_nacimiento > hoy) {
    return { error: "La fecha de nacimiento no puede ser mayor a la fecha actual." };
  }

  const { data: inserted, error } = await supabase.from("pacientes").insert({
    nombre:            data.nombre.trim(),
    apellido:          data.apellido.trim(),
    dni:               data.dni.trim(),
    fecha_nacimiento:  data.fecha_nacimiento,
    telefono:          data.telefono.trim(),
    email:             data.email             || null,
    sexo:              data.sexo              || null,
    lugar_nacimiento:  data.lugar_nacimiento  || null,
    raza:              data.raza              || null,
    direccion:         data.direccion         || null,
    domicilio:         data.domicilio         || null,
    lugar_procedencia: data.lugar_procedencia || null,
    ocupacion:         data.ocupacion         || null,
    religion:          data.religion          || null,
    grupo_sanguineo:   data.grupo_sanguineo   || null,
    estado_civil:      data.estado_civil      || null,
    grado_instruccion: data.grado_instruccion || null,
    enfermedad_actual: data.enfermedad_actual || null,
    alergias:          data.alergias          || [],
    antecedentes:      data.antecedentes      || { cronicas: [], medicacion_habitual: [], quirurgicos: [] },
    activo: true
  }).select("id").single();

  if (error) {
    console.error("Error insertando paciente:", error);
    if (error.code === '23505') {
      return { error: "Ya existe un paciente registrado con ese DNI." };
    }
    return { error: "Ocurrió un error al guardar el paciente." };
  }

  const pacienteId = inserted!.id as number;
  const historia = await resolveOrCrearHistoriaClinica(
    supabase, pacienteId, data.nombre.trim(), data.apellido.trim(), data.fecha_nacimiento,
  );
  if ("error" in historia) return historia;

  revalidatePath("/pacientes");
  return { success: true, id: String(pacienteId), historia };
}
