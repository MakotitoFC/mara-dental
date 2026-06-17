"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

  const { data, error } = await supabase
    .from("pacientes")
    .select(`
      id,
      nombre,
      apellido,
      dni,
      fecha_nacimiento,
      telefono,
      alergias,
      activo,
      citas!inner (
        id,
        fecha
      )
    `)
    .eq("citas.doctor_id", personal.id);

  if (error || !data) {
    console.error("Error obteniendo pacientes:", error);
    return [];
  }

  // Use a map to filter distinct patients, since !inner join returns one row per cita matching if not grouped or distinct. 
  // Wait, Supabase (PostgREST) returns one row per parent (pacientes) with an array of children (citas). 
  // It handles the nesting automatically!
  return data.map((p: any) => {
    let alergiasArr: string[] = [];
    if (Array.isArray(p.alergias)) {
      alergiasArr = p.alergias;
    } else if (typeof p.alergias === "string") {
      try { alergiasArr = JSON.parse(p.alergias); } catch { /* ignore */ }
    }

    const citasInfo = Array.isArray(p.citas) ? p.citas : [];
    const numCitas = citasInfo.length;
    
    // Sort descending by date to get latest
    citasInfo.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    const ultima_visita = citasInfo.length > 0 ? citasInfo[0].fecha : null;

    let estado = "activo";
    if (!p.activo) {
      estado = "inactivo";
    } else if (numCitas === 1) {
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
      ultima_visita
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
  grupo_sanguineo?: string;
  estado_civil?: string;
  grado_instruccion?: string;
  alergias?: string[];
  antecedentes?: string[];
}) {
  const supabase = await createClient();

  const hoy = new Date().toISOString().split("T")[0];
  if (data.fecha_nacimiento > hoy) {
    return { error: "La fecha de nacimiento no puede ser mayor a la fecha actual." };
  }

  const { error } = await supabase.from("pacientes").insert({
    nombre: data.nombre.trim(),
    apellido: data.apellido.trim(),
    dni: data.dni.trim(),
    fecha_nacimiento: data.fecha_nacimiento,
    telefono: data.telefono.trim(),
    email: data.email || null,
    grupo_sanguineo: data.grupo_sanguineo || null,
    estado_civil: data.estado_civil || null,
    grado_instruccion: data.grado_instruccion || null,
    alergias: data.alergias || [],
    antecedentes: data.antecedentes || [],
    activo: true
  });

  if (error) {
    console.error("Error insertando paciente:", error);
    if (error.code === '23505') {
      return { error: "Ya existe un paciente registrado con ese DNI." };
    }
    return { error: "Ocurrió un error al guardar el paciente." };
  }

  revalidatePath("/pacientes");
  return { success: true };
}
