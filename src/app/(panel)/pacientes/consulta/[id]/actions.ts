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
    .select(`
      id, 
      diagnostico, 
      es_tratado, 
      es_definitivo, 
      fecha_deteccion, 
      cie10(id, codigo, descripcion),
      archivos_clinicos (
        id,
        nombre_archivo,
        url,
        tipo_archivo,
        categoria,
        fecha_subida,
        tamaño_bytes,
        anotaciones
      )
    `)
    .eq("consulta_origen_id", consultaId)
    .order("fecha_deteccion", { ascending: false });

  // Procesar archivos para obtener URLs firmadas
  const procesarArchivos = async (archivos: any[]) => {
    if (!archivos || archivos.length === 0) return [];
    return await Promise.all(
      archivos.map(async (a: any) => {
        if (a.url && !a.url.startsWith("http")) {
          const { data: signed } = await supabase.storage
            .from("archivos_clinicos")
            .createSignedUrl(a.url, 60 * 60); // 1 hour
          return { ...a, displayUrl: signed?.signedUrl || a.url };
        }
        return { ...a, displayUrl: a.url };
      })
    );
  };

  const diagnosticos = diagnosticosRaw
    ? await Promise.all(
        diagnosticosRaw.map(async (d: any) => ({
          id: d.id,
          diagnostico_texto: d.diagnostico,
          es_tratado: d.es_tratado,
          es_definitivo: d.es_definitivo,
          fecha_deteccion: d.fecha_deteccion,
          cie10: d.cie10,
          archivos: await procesarArchivos(d.archivos_clinicos || []),
        }))
      )
    : [];

  const paciente = Array.isArray(consulta.historia_clinica)
    ? consulta.historia_clinica[0].pacientes
    : consulta.historia_clinica?.pacientes;

  const hc_id = Array.isArray(consulta.historia_clinica)
    ? consulta.historia_clinica[0].id
    : consulta.historia_clinica?.id;

  const doctorName = consulta.personal
    ? `${(consulta.personal as any).nombre} ${(consulta.personal as any).apellido}`.trim()
    : "Doctor";

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

export async function saveDiagnosticoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: personal } = await supabase.from("personal").select("id").eq("usuario_id", user.id).single();
  if (!personal) return { error: "Perfil no encontrado" };

  const consulta_id = Number(formData.get("consulta_id"));
  const hc_id = formData.get("hc_id") as string;
  const diagnosticoStr = formData.get("diagnostico") as string;
  const es_tratado = formData.get("es_tratado") === "true";
  const es_definitivo = formData.get("es_definitivo") === "true";
  const cie10_id_str = formData.get("cie10_id") as string | null;
  const cie10_id = cie10_id_str ? Number(cie10_id_str) : null;

  // 1. Insert Diagnóstico
  const { data: diagRes, error: diagError } = await supabase
    .from("diagnostico")
    .insert({
      id_historia_clinica: hc_id,
      consulta_origen_id: consulta_id,
      diagnostico: diagnosticoStr,
      es_tratado: es_tratado,
      es_definitivo: es_definitivo,
      cie10_id: cie10_id,
      fecha_deteccion: new Date().toISOString()
    })
    .select("id")
    .single();

  if (diagError) {
    console.error("Error insertando diagnóstico", diagError);
    return { error: "No se pudo guardar el diagnóstico" };
  }

  const diagnostico_id = diagRes.id;

  // 2. Upload Archivos if es_definitivo
  if (es_definitivo) {
    const archivos = formData.getAll("archivos") as File[];
    const archivosParaInsertar = [];

    for (const file of archivos) {
      if (file.size === 0) continue;
      
      const ext = file.name.split('.').pop();
      const safeName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `private/diagnosticos/${consulta_id}/${safeName}`;

      // Upload al bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("archivos_clinicos")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Error subiendo archivo:", uploadError);
        continue; // Opcional: abortar o continuar. Aquí continuamos con los que sí funcionen.
      }

      const categoria = formData.get(`categoria_${file.name}`) as string || "otros";

      archivosParaInsertar.push({
        nombre_archivo: file.name,
        url: filePath, // Se guarda el path interno para luego pedir la URL firmada
        tipo_archivo: file.type.startsWith("image/") ? "imagen" : "pdf",
        categoria: categoria,
        tamaño_bytes: file.size,
        diagnostico_id: diagnostico_id,
        subido_por: personal.id,
        fecha_subida: new Date().toISOString()
      });
    }

    if (archivosParaInsertar.length > 0) {
      const { error: archError } = await supabase.from("archivos_clinicos").insert(archivosParaInsertar);
      if (archError) {
        console.error("Error insertando archivos", archError);
        return { error: "Diagnóstico guardado, pero hubo un error registrando los archivos." };
      }
    }
  }

  revalidatePath(`/pacientes/consulta/${consulta_id}`);
  return { success: true, diagnostico_id };
}

export async function updateAnotacionesAction(archivoId: number, anotacionesJSON: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("archivos_clinicos")
    .update({ anotaciones: anotacionesJSON })
    .eq("id", archivoId);

  if (error) {
    console.error("Error actualizando anotaciones:", error);
    return { error: "No se pudieron guardar las anotaciones" };
  }
  
  return { success: true };
}

export async function updateDiagnosticoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: personal } = await supabase.from("personal").select("id").eq("usuario_id", user.id).single();
  if (!personal) return { error: "Perfil no encontrado" };

  const diagnostico_id = Number(formData.get("diagnostico_id"));
  const consulta_id = Number(formData.get("consulta_id"));
  const diagnosticoStr = formData.get("diagnostico") as string;
  const es_tratado = formData.get("es_tratado") === "true";
  const es_definitivo = formData.get("es_definitivo") === "true";
  const cie10_id_str = formData.get("cie10_id") as string | null;
  const cie10_id = cie10_id_str ? Number(cie10_id_str) : null;

  const { error } = await supabase
    .from("diagnostico")
    .update({
      diagnostico: diagnosticoStr,
      es_tratado: es_tratado,
      es_definitivo: es_definitivo,
      cie10_id: cie10_id,
    })
    .eq("id", diagnostico_id);

  if (error) {
    console.error("updateDiagnosticoAction error:", error);
    return { error: "No se pudo actualizar el diagnóstico" };
  }

  if (es_definitivo) {
    const archivos = formData.getAll("archivos") as File[];
    const archivosParaInsertar = [];

    for (const file of archivos) {
      if (file.size === 0) continue;
      
      const ext = file.name.split('.').pop();
      const safeName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `private/diagnosticos/${consulta_id}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("archivos_clinicos")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Error subiendo archivo:", uploadError);
        continue;
      }

      const categoria = formData.get(`categoria_${file.name}`) as string || "otros";

      archivosParaInsertar.push({
        nombre_archivo: file.name,
        url: filePath,
        tipo_archivo: file.type.startsWith("image/") ? "imagen" : "pdf",
        categoria: categoria,
        tamaño_bytes: file.size,
        diagnostico_id: diagnostico_id,
        subido_por: personal.id,
        fecha_subida: new Date().toISOString()
      });
    }

    if (archivosParaInsertar.length > 0) {
      await supabase.from("archivos_clinicos").insert(archivosParaInsertar);
    }
  }

  revalidatePath(`/pacientes/consulta/${consulta_id}`);
  return { success: true };
}

export async function deleteArchivoClinicoAction(archivoId: number, urlPath: string, consultaId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  if (urlPath && !urlPath.startsWith("http")) {
    const { error: storageError } = await supabase.storage.from("archivos_clinicos").remove([urlPath]);
    if (storageError) console.error("Error eliminando del bucket:", storageError);
  }

  const { error: dbError } = await supabase.from("archivos_clinicos").delete().eq("id", archivoId);
  if (dbError) return { error: "Error eliminando el registro" };

  revalidatePath(`/pacientes/consulta/${consultaId}`);
  return { success: true };
}

// ── Plan de Trabajo ───────────────────────────────────────────────────────────

export async function getPlanTrabajoAction(diagnosticoId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_trabajo")
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
  const { error } = await supabase.from("plan_trabajo").insert({
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

export async function editPlanTrabajoAction(data: {
  id: number;
  etapa: string;
  descripcion: string;
  tiempo_pronostico: string;
  estado: string;
  consulta_id: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("plan_trabajo").update({
    etapa: data.etapa,
    descripcion: data.descripcion,
    tiempo_pronostico: data.tiempo_pronostico,
    estado: data.estado,
  }).eq("id", data.id);
  if (error) return { error: "No se pudo actualizar el plan" };
  revalidatePath(`/pacientes/consulta/${data.consulta_id}`);
  return { success: true };
}

export async function deletePlanTrabajoAction(id: number, consultaId: number) {
  const supabase = await createClient();
  await supabase.from("plan_trabajo").delete().eq("id", id);
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
    catalogo_tratamiento_id: t.catalogo_tratamientos?.id,
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
    .select("id, nombre, descripcion, precio, moneda")
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

export async function editTratamientoAction(data: {
  id: number;
  catalogo_id: number;
  notas: string;
  consulta_id: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("tratamiento").update({
    catalogo_tratamiento_id: data.catalogo_id,
    notas: data.notas || null,
  }).eq("id", data.id);
  if (error) return { error: "No se pudo actualizar el tratamiento" };
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

export async function getRecetasAction(diagnosticoId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recetas")
    .select(`id, fecha_emision, estado, receta_medicamento(id, medicamento_nombre, medicamento_id, dosis, frecuencia, indicaciones)`)
    .eq("diagnostico_id", diagnosticoId)
    .order("fecha_emision", { ascending: false });
  return data || [];
}

export async function saveRecetaAction(data: {
  diagnostico_id: number;
  consulta_id: number;
  medicamentos: Array<{ medicamento_id?: number | null; medicamento_nombre: string; dosis: string; frecuencia: string; indicaciones: string }>;
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

export async function toggleEstadoRecetaAction(id: number, estado: string, consultaId: number) {
  const supabase = await createClient();
  await supabase.from("recetas").update({ estado }).eq("id", id);
  revalidatePath(`/pacientes/consulta/${consultaId}`);
  return { success: true };
}

export async function deleteRecetaAction(id: number, consultaId: number) {
  const supabase = await createClient();
  await supabase.from("receta_medicamento").delete().eq("receta_id", id);
  await supabase.from("recetas").delete().eq("id", id);
  revalidatePath(`/pacientes/consulta/${consultaId}`);
  return { success: true };
}

export async function searchMedicamentosAction(query: string) {
  const supabase = await createClient();
  if (!query || query.trim().length < 2) return [];
  const { data } = await supabase
    .from("medicamentos")
    .select("id, nombre_generico, nombre_comercial, concentracion, forma_farmaceutica")
    .or(`nombre_generico.ilike.%${query.trim()}%,nombre_comercial.ilike.%${query.trim()}%`)
    .limit(10);
  return data || [];
}

export async function addMedicamentoAction(data: { receta_id: number; medicamento_id?: number | null; medicamento_nombre: string; dosis: string; frecuencia: string; indicaciones: string; consulta_id: number; }) {
  const supabase = await createClient();
  await supabase.from("receta_medicamento").insert({
    receta_id: data.receta_id,
    medicamento_id: data.medicamento_id,
    medicamento_nombre: data.medicamento_nombre,
    dosis: data.dosis,
    frecuencia: data.frecuencia,
    indicaciones: data.indicaciones
  });
  revalidatePath(`/pacientes/consulta/${data.consulta_id}`);
  return { success: true };
}

export async function editMedicamentoAction(data: { id: number; medicamento_id?: number | null; medicamento_nombre: string; dosis: string; frecuencia: string; indicaciones: string; consulta_id: number; }) {
  const supabase = await createClient();
  await supabase.from("receta_medicamento").update({
    medicamento_id: data.medicamento_id,
    medicamento_nombre: data.medicamento_nombre,
    dosis: data.dosis,
    frecuencia: data.frecuencia,
    indicaciones: data.indicaciones
  }).eq("id", data.id);
  revalidatePath(`/pacientes/consulta/${data.consulta_id}`);
  return { success: true };
}

export async function deleteMedicamentoAction(id: number, consultaId: number) {
  const supabase = await createClient();
  await supabase.from("receta_medicamento").delete().eq("id", id);
  revalidatePath(`/pacientes/consulta/${consultaId}`);
  return { success: true };
}

// ── Recomendaciones ───────────────────────────────────────────────────────────

export async function getRecomendacionesConsultaAction(consultaId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recomendacion")
    .select("id, contenido, created_at")
    .eq("consulta_id", consultaId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function saveRecomendacionAction(data: { consulta_id: number; contenido: string; }) {
  const supabase = await createClient();
  const { error } = await supabase.from("recomendacion").insert({
    consulta_id: data.consulta_id,
    contenido: data.contenido,
  });
  if (error) return { error: "No se pudo guardar la recomendación" };
  revalidatePath(`/pacientes/consulta/${data.consulta_id}`);
  return { success: true };
}

export async function editRecomendacionAction(data: { id: number; contenido: string; consulta_id: number; }) {
  const supabase = await createClient();
  const { error } = await supabase.from("recomendacion").update({
    contenido: data.contenido,
  }).eq("id", data.id);
  if (error) return { error: "No se pudo actualizar la recomendación" };
  revalidatePath(`/pacientes/consulta/${data.consulta_id}`);
  return { success: true };
}

export async function deleteRecomendacionAction(id: number, consultaId: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("recomendacion").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar la recomendación" };
  revalidatePath(`/pacientes/consulta/${consultaId}`);
  return { success: true };
}
