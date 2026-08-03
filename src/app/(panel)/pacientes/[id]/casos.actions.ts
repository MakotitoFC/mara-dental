"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCasosClinicosAction(pacienteId: string) {
  const supabase = await createClient();

  // 1. Obtener la historia clínica
  const { data: hc } = await supabase
    .from("historia_clinica")
    .select("id, codigo_historia, fecha_creacion, estado")
    .eq("paciente_id", pacienteId)
    .maybeSingle();

  if (!hc) return { historia_clinica: null, casos: [] };

  // 2. Obtener las notas clínicas (casos)
  const { data: notas } = await supabase
    .from("nota_clinica")
    .select("id, titulo_caso_clinico, estado, created_at, updated_at")
    .eq("historia_clinica_id", hc.id)
    .order("created_at", { ascending: false });

  if (!notas || notas.length === 0) return { historia_clinica: hc, casos: [] };

  const notaIds = notas.map(n => n.id);

  // 3. Obtener consultas asociadas
  const { data: consultas } = await supabase
    .from("consultas")
    .select(`
      id, nota_clinica_id, fecha_consulta, motivo, observaciones, tipo_consulta_id,
      usuarios!consultas_doctor_id_fkey ( personal ( nombre, apellido ) )
    `)
    .in("nota_clinica_id", notaIds)
    .order("fecha_consulta", { ascending: false });

  // Agrupar consultas por nota clínica
  const consultasPorNota = new Map<string, any[]>();
  for (const c of consultas || []) {
    if (!consultasPorNota.has(c.nota_clinica_id)) {
      consultasPorNota.set(c.nota_clinica_id, []);
    }
    const per = (c.usuarios as any)?.personal?.[0] || (c.usuarios as any)?.personal;
    const doctor = per ? `Dr. ${per.nombre} ${per.apellido}` : "Doctor";
    
    consultasPorNota.get(c.nota_clinica_id)!.push({
      ...c,
      doctor
    });
  }

  // Estructurar los casos
  const casos = notas.map(n => {
    const cons = consultasPorNota.get(n.id) || [];
    // Usar el título de la nota, o el motivo de la consulta más antigua si no hay título
    const motivo_principal = n.titulo_caso_clinico || (cons.length > 0 ? cons[cons.length - 1].motivo : "Caso sin motivo principal");
    
    return {
      ...n,
      consultas: cons,
      motivo_consulta: motivo_principal
    };
  });

  return {
    historia_clinica: hc,
    casos
  };
}

export async function cambiarEstadoNotaAction(notaId: string, nuevoEstado: string, pacienteId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("nota_clinica")
    .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
    .eq("id", notaId);

  if (error) {
    console.error("Error cambiando estado:", error);
    return { error: "No se pudo actualizar el estado" };
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

export async function crearHistoriaClinicaAction(pacienteId: string) {
  const supabase = await createClient();
  const { data: p, error: errP } = await supabase.from("pacientes")
    .select("dni")
    .eq("id", pacienteId)
    .limit(1)
    .maybeSingle();
    
  if (errP) console.error("Error obteniendo paciente para HC:", errP);
  if (!p) return { error: "Paciente no existe o no tienes permisos (RLS)" };
  
  const year = new Date().getFullYear();
  const baseDni = p.dni && p.dni.trim() !== "" ? p.dni : Date.now().toString().slice(-6);
  const codigo_historia = `HC${year}-${baseDni}`;
  
  const { error } = await supabase.from("historia_clinica").insert({
    paciente_id: pacienteId,
    codigo_historia,
    fecha_creacion: new Date().toISOString(),
    estado: "activa"
  });

  if (error) {
    console.error("Error insertando HC:", error);
    // 23505 = unique_violation
    if (error.code === '23505') {
       return { error: "La historia clínica ya existe (código duplicado)" };
    }
    return { error: "No se pudo crear historia: " + error.message };
  }
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

export async function crearCasoClinicoAction(pacienteId: string, motivo: string, tituloCaso?: string) {
  const supabase = await createClient();
  let { data: hc } = await supabase.from("historia_clinica")
    .select("id")
    .eq("paciente_id", pacienteId)
    .limit(1)
    .maybeSingle();
  
  if (!hc) {
    // Intentar crear la HC automáticamente
    const hcRes = await crearHistoriaClinicaAction(pacienteId);
    if (hcRes.error) {
      return { error: "No se pudo autogenerar la Historia Clínica: " + hcRes.error };
    }
    // Volver a consultar
    const { data: newHc } = await supabase.from("historia_clinica")
      .select("id")
      .eq("paciente_id", pacienteId)
      .limit(1)
      .maybeSingle();
      
    if (!newHc) return { error: "Error inesperado al autogenerar la Historia Clínica. Es probable que no tengas permisos (RLS)." };
    hc = newHc;
  }

  const { data: nota, error } = await supabase.from("nota_clinica").insert({
    historia_clinica_id: hc.id,
    titulo_caso_clinico: tituloCaso || motivo,
    estado: "En Consulta"
  }).select("id").single();

  if (error) return { error: "No se pudo crear el caso: " + error.message };
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true, notaId: nota.id };
}

export async function agregarConsultaAction(notaId: string, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: tc } = await supabase.from("tipo_consulta").select("id").limit(1).single();

  const { data: consulta, error } = await supabase.from("consultas").insert({
    nota_clinica_id: notaId,
    doctor_id: user.id,
    cita_id: data.cita_id || null,
    tipo_consulta_id: data.tipo_consulta_id || tc?.id,
    motivo: data.motivo,
    observaciones: data.observaciones,
    examen_fisico: data.examen_fisico,
    fecha_consulta: data.fecha_consulta || new Date().toISOString()
  }).select("id");

  if (error) return { error: "No se pudo agregar consulta" };
  
  // Extraer el id ya sea si retorna un objeto o un arreglo
  const idValue = Array.isArray(consulta) && consulta.length > 0 ? consulta[0].id : (consulta as any)?.id;
  
  return { success: true, consultaId: String(idValue) };
}
