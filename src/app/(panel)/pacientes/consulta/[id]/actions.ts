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

  // 2. Obtener TODOS los diagnósticos de esta consulta (historial completo, más reciente primero)
  const { data: diagnosticosRaw } = await supabase
    .from("diagnostico")
    .select(`id, diagnostico, es_tratado, es_definitivo, fecha_deteccion, cie10(id, codigo, descripcion)`)
    .eq("consulta_origen_id", consultaId)
    .order("fecha_deteccion", { ascending: false });

  // Archivos solo del diagnóstico más reciente
  let archivosActuales: any[] = [];
  if (diagnosticosRaw && diagnosticosRaw.length > 0) {
    const { data: archivos } = await supabase
      .from("archivos_clinicos")
      .select("id, nombre_archivo, url, tipo_archivo, categoria, fecha_subida")
      .eq("diagnostico_id", diagnosticosRaw[0].id);
    archivosActuales = archivos || [];
  }

  // Flatten structures
  const paciente = Array.isArray(consulta.historia_clinica)
    ? consulta.historia_clinica[0].pacientes
    : consulta.historia_clinica?.pacientes;

  const hc_id = Array.isArray(consulta.historia_clinica)
    ? consulta.historia_clinica[0].id
    : consulta.historia_clinica?.id;

  const doctorName = consulta.personal
    ? `${(consulta.personal as any).nombre} ${(consulta.personal as any).apellido}`.trim()
    : "Doctor";

  const mapDiag = (d: any, archivos: any[]) => ({
    id: d.id,
    diagnostico_texto: d.diagnostico,
    es_tratado: d.es_tratado,
    es_definitivo: d.es_definitivo,
    fecha_deteccion: d.fecha_deteccion,
    cie10: d.cie10,
    archivos,
  });

  const diagnosticos = diagnosticosRaw
    ? diagnosticosRaw.map((d, i) => mapDiag(d, i === 0 ? archivosActuales : []))
    : [];

  return {
    consulta: {
      id: String(consulta.id),
      fecha: consulta.fecha_consulta,
      motivo: consulta.motivo,
      observaciones: consulta.observaciones,
      examen_fisico: (consulta.examen_fisico as Record<string, string>) || {},
      doctor_nombre: doctorName,
      hc_id,
    },
    paciente: {
      id: String((paciente as any)?.id),
      nombre_completo: `${(paciente as any)?.nombre} ${(paciente as any)?.apellido}`.trim(),
      fecha_nacimiento: (paciente as any)?.fecha_nacimiento,
      dni: (paciente as any)?.dni,
    },
    // diagnostico: el más reciente (null si no hay ninguno)
    diagnostico: diagnosticos.length > 0 ? diagnosticos[0] : null,
    // historial: versiones anteriores (índice 1 en adelante)
    historialDiagnosticos: diagnosticos.slice(1),
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

export async function updateDiagnosticoAction(data: {
  diagnostico_id: number;
  consulta_id: number;
  diagnostico: string;
  es_tratado: boolean;
  es_definitivo: boolean;
  cie10_id?: number | null;
  nuevos_archivos: Array<{
    nombre_archivo: string;
    url: string;
    tipo_archivo: string;
    categoria: string;
    tamaño_bytes: number;
  }>;
}) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("diagnostico")
    .update({
      diagnostico: data.diagnostico,
      es_tratado: data.es_tratado,
      es_definitivo: data.es_definitivo,
      cie10_id: data.cie10_id || null,
    })
    .eq("id", data.diagnostico_id);

  if (error) {
    console.error("updateDiagnosticoAction error:", error);
    return { error: "No se pudo actualizar el diagnóstico" };
  }

  if (data.es_definitivo && data.nuevos_archivos.length > 0) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: personal } = await supabase.from("personal").select("id").eq("usuario_id", user.id).maybeSingle();
      if (personal) {
        await supabase.from("archivos_clinicos").insert(
          data.nuevos_archivos.map(a => ({
            ...a,
            diagnostico_id: data.diagnostico_id,
            subido_por: personal.id,
            fecha_subida: new Date().toISOString(),
          }))
        );
      }
    }
  }

  revalidatePath(`/pacientes/consulta/${data.consulta_id}`);
  return { success: true };
}

// ── Plan de Trabajo ───────────────────────────────────────────────────────────

export async function getPlanTrabajoAction(diagnosticoId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("planTrabajo")
    .select("id, etapa, descripcion, tiempo_pronostico, estado")
    .eq("id_diagnostico", diagnosticoId)
    .order("id");
  return data || [];
}

export async function savePlanTrabajoAction(data: {
  diagnostico_id: number;
  etapa: string;
  descripcion: string;
  tiempo_pronostico: string;
  estado: string;
  consulta_id: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("planTrabajo").insert({
    id_diagnostico: data.diagnostico_id,
    etapa: data.etapa,
    descripcion: data.descripcion,
    tiempo_pronostico: data.tiempo_pronostico,
    estado: data.estado,
  });
  if (error) return { error: "No se pudo guardar el plan" };
  revalidatePath(`/pacientes/consulta/${data.consulta_id}`);
  return { success: true };
}

export async function deletePlanTrabajoAction(id: number, consultaId: number) {
  const supabase = await createClient();
  await supabase.from("planTrabajo").delete().eq("id", id);
  revalidatePath(`/pacientes/consulta/${consultaId}`);
  return { success: true };
}

// ── Tratamientos ──────────────────────────────────────────────────────────────

export async function getTratamientosAction(diagnosticoId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tratamiento")
    .select(`id, notas, catalogo_tratamientos(id, nombre, precio, moneda)`)
    .eq("diagnostico_id", diagnosticoId);
  return (data || []).map((t: any) => ({
    id: t.id,
    notas: t.notas,
    nombre: t.catalogo_tratamientos?.nombre,
    precio: t.catalogo_tratamientos?.precio,
    moneda: t.catalogo_tratamientos?.moneda ?? "PEN",
  }));
}

export async function searchCatalogoAction(query: string) {
  const supabase = await createClient();
  if (!query || query.trim().length < 2) return [];
  const { data } = await supabase
    .from("catalogo_tratamientos")
    .select("id, nombre, precio, moneda")
    .eq("activo", true)
    .ilike("nombre", `%${query.trim()}%`)
    .limit(10);
  return data || [];
}

export async function saveTratamientoAction(data: {
  diagnostico_id: number;
  catalogo_id: number;
  notas: string;
  consulta_id: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("tratamiento").insert({
    diagnostico_id: data.diagnostico_id,
    catalogo_tratamiento_id: data.catalogo_id,
    notas: data.notas || null,
  });
  if (error) return { error: "No se pudo guardar el tratamiento" };
  revalidatePath(`/pacientes/consulta/${data.consulta_id}`);
  return { success: true };
}

export async function deleteTratamientoAction(id: number, consultaId: number) {
  const supabase = await createClient();
  await supabase.from("tratamiento").delete().eq("id", id);
  revalidatePath(`/pacientes/consulta/${consultaId}`);
  return { success: true };
}

// ── Receta ────────────────────────────────────────────────────────────────────

export async function getRecetaAction(diagnosticoId: number) {
  const supabase = await createClient();
  const { data: receta } = await supabase
    .from("recetas")
    .select(`id, fecha_emision, estado, receta_medicamento(id, medicamento_nombre, dosis, frecuencia, indicaciones)`)
    .eq("diagnostico_id", diagnosticoId)
    .maybeSingle();
  return receta ?? null;
}

export async function saveRecetaAction(data: {
  diagnostico_id: number;
  consulta_id: number;
  medicamentos: Array<{ medicamento_nombre: string; dosis: string; frecuencia: string; indicaciones: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };
  const { data: personal } = await supabase.from("personal").select("id").eq("usuario_id", user.id).single();
  if (!personal) return { error: "Perfil no encontrado" };

  const { data: receta, error: rErr } = await supabase
    .from("recetas")
    .insert({ diagnostico_id: data.diagnostico_id, doctor_id: personal.id })
    .select("id").single();
  if (rErr) return { error: "No se pudo crear la receta" };

  if (data.medicamentos.length > 0) {
    await supabase.from("receta_medicamento").insert(
      data.medicamentos.map(m => ({ receta_id: receta.id, ...m }))
    );
  }
  revalidatePath(`/pacientes/consulta/${data.consulta_id}`);
  return { success: true };
}

// ── Recomendaciones ───────────────────────────────────────────────────────────

export async function getRecomendacionesAction() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recomendaciones")
    .select("id, categoria, titulo, contenido")
    .eq("activo", true)
    .order("categoria");
  return data || [];
}

export async function enviarRecomendacionAction(data: {
  consulta_id: number;
  recomendacion_id: number;
  recomendacion_texto: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("envio_recomendacion").insert({
    consulta_id: data.consulta_id,
    recomendacion_id: data.recomendacion_id,
    recomendacion: data.recomendacion_texto,
  });
  if (error) return { error: "No se pudo enviar la recomendación" };
  return { success: true };
}
