"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getConsultaDetalleAction(consultaId: string) {
  const supabase = await createClient();

  // 1. Obtener la consulta con todos sus joins
  const { data: consulta, error } = await supabase
    .from("consultas")
    .select(`
      id,
      fecha_consulta,
      motivo,
      observaciones,
      examen_fisico,
      historia_clinica!inner (
        id,
        paciente_id,
        codigo_historia,
        pacientes!inner (
          id,
          nombre,
          apellido,
          fecha_nacimiento,
          dni
        )
      ),
      personal (
        nombre,
        apellido,
        especialidad_id
      )
    `)
    .eq("id", consultaId)
    .single();

  if (error || !consulta) {
    console.error("Error fetching consulta", error);
    return null;
  }

  // 2. Obtener diagnóstico si existe para esta consulta_origen_id
  const { data: diagnostico } = await supabase
    .from("diagnostico")
    .select(`
      id,
      diagnostico,
      es_tratado,
      es_definitivo,
      cie10 (
        id,
        codigo,
        descripcion
      ),
      archivos_clinicos (
        id,
        nombre_archivo,
        url,
        tipo_archivo,
        categoria,
        fecha_subida,
        tamaño_bytes
      )
    `)
    .eq("consulta_origen_id", consultaId)
    .maybeSingle();

  // Flatten structures
  const paciente = Array.isArray(consulta.historia_clinica) 
    ? consulta.historia_clinica[0].pacientes 
    : consulta.historia_clinica?.pacientes;
  
  const hc_id = Array.isArray(consulta.historia_clinica) 
    ? consulta.historia_clinica[0].id 
    : consulta.historia_clinica?.id;

  const doctorName = consulta.personal ? `${consulta.personal.nombre} ${consulta.personal.apellido}`.trim() : "Doctor";

  return {
    consulta: {
      id: String(consulta.id),
      fecha: consulta.fecha_consulta,
      motivo: consulta.motivo,
      observaciones: consulta.observaciones,
      examen_fisico: consulta.examen_fisico || {},
      doctor_nombre: doctorName,
      hc_id
    },
    paciente: {
      id: String(paciente?.id),
      nombre_completo: `${paciente?.nombre} ${paciente?.apellido}`.trim(),
      fecha_nacimiento: paciente?.fecha_nacimiento,
      dni: paciente?.dni
    },
    diagnostico: diagnostico ? {
      id: diagnostico.id,
      diagnostico_texto: diagnostico.diagnostico,
      es_tratado: diagnostico.es_tratado,
      es_definitivo: diagnostico.es_definitivo,
      cie10: diagnostico.cie10,
      archivos: diagnostico.archivos_clinicos || []
    } : null
  };
}

export async function searchCIE10Action(query: string) {
  const supabase = await createClient();
  if (!query || query.trim().length < 2) return [];

  // Search by code or description
  const { data, error } = await supabase
    .from("cie10")
    .select("id, codigo, descripcion")
    .or(`codigo.ilike.%${query.trim()}%,descripcion.ilike.%${query.trim()}%`)
    .limit(10);

  if (error) {
    console.error("Error buscando CIE10:", error);
    return [];
  }
  return data || [];
}

export async function saveDiagnosticoAction(data: {
  consulta_id: number;
  hc_id: string;
  diagnostico: string;
  es_tratado: boolean;
  es_definitivo: boolean;
  cie10_id?: number | null;
  archivos: Array<{
    nombre_archivo: string;
    url: string;
    tipo_archivo: string;
    categoria: string;
    tamaño_bytes: number;
  }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: personal } = await supabase.from("personal").select("id").eq("usuario_id", user.id).single();
  if (!personal) return { error: "Perfil no encontrado" };

  // 1. Insert Diagnóstico
  const { data: diagRes, error: diagError } = await supabase
    .from("diagnostico")
    .insert({
      id_historia_clinica: data.hc_id,
      consulta_origen_id: data.consulta_id,
      diagnostico: data.diagnostico,
      es_tratado: data.es_tratado,
      es_definitivo: data.es_definitivo,
      cie10_id: data.cie10_id || null,
      fecha_deteccion: new Date().toISOString()
    })
    .select("id")
    .single();

  if (diagError) {
    console.error("Error insertando diagnóstico", diagError);
    return { error: "No se pudo guardar el diagnóstico" };
  }

  const diagnostico_id = diagRes.id;

  // 2. Insert Archivos if es_definitivo and archivos exist
  if (data.es_definitivo && data.archivos && data.archivos.length > 0) {
    const archivosParaInsertar = data.archivos.map(a => ({
      nombre_archivo: a.nombre_archivo,
      url: a.url,
      tipo_archivo: a.tipo_archivo,
      categoria: a.categoria,
      tamaño_bytes: a.tamaño_bytes,
      diagnostico_id: diagnostico_id,
      subido_por: personal.id,
      fecha_subida: new Date().toISOString()
    }));

    const { error: archError } = await supabase.from("archivos_clinicos").insert(archivosParaInsertar);
    if (archError) {
      console.error("Error insertando archivos", archError);
      return { error: "Diagnóstico guardado, pero hubo un error registrando los archivos." };
    }
  }

  revalidatePath(`/pacientes/consulta/${data.consulta_id}`);
  return { success: true, diagnostico_id };
}
