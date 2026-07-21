"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// ── Helpers internos ────────────────────────────────────────────────────────

/** consultas → nota_clinica_id (ya viene directo en la fila de consultas). */
async function resolveNotaClinicaId(supabase: SupabaseClient, consultaId: number): Promise<number | null> {
  const { data } = await supabase.from("consultas").select("nota_clinica_id").eq("id", consultaId).single();
  return data?.nota_clinica_id ?? null;
}

/**
 * plan_tratamiento no se referencia por diagnóstico directo — la cadena real
 * es diagnostico → tratamiento → plan_tratamiento. Se usa el tratamiento más
 * reciente registrado para ese diagnóstico (el flujo natural es: primero se
 * registra el tratamiento, luego se planifican sus fases).
 */
async function resolveTratamientoIdParaDiagnostico(supabase: SupabaseClient, diagnosticoId: number): Promise<number | null> {
  const { data } = await supabase
    .from("tratamiento")
    .select("id")
    .eq("diagnostico_id", diagnosticoId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Todas las consultas del paciente — cadena real historia_clinica → nota_clinica → consultas (sin FK directa). */
async function resolveConsultaIdsParaPaciente(supabase: SupabaseClient, pacienteId: number): Promise<number[]> {
  const { data: hc } = await supabase.from("historia_clinica").select("id").eq("paciente_id", pacienteId).maybeSingle();
  if (!hc) return [];
  const { data: notas } = await supabase.from("nota_clinica").select("id").eq("historia_clinica_id", hc.id);
  const notaIds = (notas || []).map((n) => n.id);
  if (notaIds.length === 0) return [];
  const { data: consultas } = await supabase.from("consultas").select("id").in("nota_clinica_id", notaIds);
  return (consultas || []).map((c) => c.id);
}

// ── Consulta activa — bundle consolidado para los tabs de la Ficha ─────────

export async function getConsultaActivaAction(consultaId: number, pacienteId: number) {
  const supabase = await createClient();

  const { data: consulta, error } = await supabase
    .from("consultas")
    .select(`
      id, fecha_consulta, motivo, observaciones, examen_fisico, cita_id, nota_clinica_id,
      citas ( id, estado ),
      personal ( nombre, apellido )
    `)
    .eq("id", consultaId)
    .single();

  if (error || !consulta) {
    console.error("Error fetching consulta activa", error);
    return null;
  }

  const { data: diagnosticosRaw } = await supabase
    .from("diagnostico")
    .select(`
      id, diagnostico, "esTratado", es_definitivo, fecha_deteccion,
      cie10(id, codigo, descripcion),
      archivos_clinicos ( id, nombre_archivo, url, tipo_archivo, categoria, fecha_subida, tam_bytes, anotaciones )
    `)
    .eq("consulta_origen_id", consultaId)
    .order("fecha_deteccion", { ascending: false });

  const procesarArchivos = async (archivos: any[]) => {
    if (!archivos || archivos.length === 0) return [];
    return await Promise.all(
      archivos.map(async (a: any) => {
        if (a.url && !a.url.startsWith("http")) {
          const { data: signed } = await supabase.storage.from("archivos_clinicos").createSignedUrl(a.url, 60 * 60);
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
          es_tratado: d.esTratado,
          es_definitivo: d.es_definitivo,
          fecha_deteccion: d.fecha_deteccion,
          cie10: d.cie10,
          archivos: await procesarArchivos(d.archivos_clinicos || []),
        }))
      )
    : [];

  const diagnostico = diagnosticos.length > 0 ? diagnosticos[0] : null;

  const [planTrabajo, tratamientos, recetas, recomendaciones, presupuesto, mediosPago] = await Promise.all([
    diagnostico ? getPlanTrabajoAction(diagnostico.id) : Promise.resolve([]),
    diagnostico ? getTratamientosAction(diagnostico.id) : Promise.resolve([]),
    diagnostico ? getRecetasAction(diagnostico.id) : Promise.resolve([]),
    getRecomendacionesConsultaAction(consultaId),
    getPresupuestoActivoAction(pacienteId),
    getMediosPagoAction(),
  ]);

  const doctorName = consulta.personal ? `${(consulta.personal as any).nombre} ${(consulta.personal as any).apellido}`.trim() : "Doctor";
  const citaRaw = Array.isArray(consulta.citas) ? consulta.citas[0] : consulta.citas;

  return {
    consulta: {
      id: consulta.id,
      fecha: consulta.fecha_consulta,
      motivo: consulta.motivo,
      observaciones: consulta.observaciones,
      examen_fisico: (consulta.examen_fisico as Record<string, string>) || {},
      doctor_nombre: doctorName,
      nota_clinica_id: consulta.nota_clinica_id,
      cita_id: consulta.cita_id ?? null,
      cita_estado: (citaRaw as any)?.estado ?? null,
    },
    diagnostico,
    historialDiagnosticos: diagnosticos.slice(1),
    planTrabajo,
    tratamientos,
    recetas,
    recomendaciones,
    presupuesto,
    mediosPago,
  };
}

export async function searchCIE10Action(query: string) {
  const supabase = await createClient();
  if (!query || query.trim().length < 2) return [];
  const { data, error } = await supabase
    .from("cie10")
    .select("id, codigo, descripcion")
    .or(`codigo.ilike.%${query.trim()}%,descripcion.ilike.%${query.trim()}%`)
    .limit(10);
  if (error) return [];
  return data || [];
}

/**
 * Todos los diagnósticos del paciente a través de su historial completo de
 * consultas (no solo la consulta activa) — usado por DiagnosticoTab para
 * mostrar el historial cuando no hay una consulta en curso.
 */
export async function getDiagnosticosPacienteAction(pacienteId: number) {
  const supabase = await createClient();
  const consultaIds = await resolveConsultaIdsParaPaciente(supabase, pacienteId);
  if (consultaIds.length === 0) return [];

  const { data: diagnosticosRaw } = await supabase
    .from("diagnostico")
    .select(`
      id, diagnostico, "esTratado", es_definitivo, fecha_deteccion, consulta_origen_id,
      cie10(id, codigo, descripcion),
      archivos_clinicos ( id, nombre_archivo, url, tipo_archivo, categoria, fecha_subida, tam_bytes, anotaciones )
    `)
    .in("consulta_origen_id", consultaIds)
    .order("fecha_deteccion", { ascending: false });

  if (!diagnosticosRaw) return [];

  const procesarArchivos = async (archivos: any[]) => {
    if (!archivos || archivos.length === 0) return [];
    return await Promise.all(
      archivos.map(async (a: any) => {
        if (a.url && !a.url.startsWith("http")) {
          const { data: signed } = await supabase.storage.from("archivos_clinicos").createSignedUrl(a.url, 60 * 60);
          return { ...a, displayUrl: signed?.signedUrl || a.url };
        }
        return { ...a, displayUrl: a.url };
      })
    );
  };

  return Promise.all(
    diagnosticosRaw.map(async (d: any) => ({
      id: d.id,
      diagnostico_texto: d.diagnostico,
      es_tratado: d.esTratado,
      es_definitivo: d.es_definitivo,
      fecha_deteccion: d.fecha_deteccion,
      consulta_id: d.consulta_origen_id,
      cie10: d.cie10,
      archivos: await procesarArchivos(d.archivos_clinicos || []),
    }))
  );
}

/**
 * Todas las recetas del paciente a través de su historial completo de
 * consultas — usado por RecetasTab cuando no hay una consulta en curso.
 */
export async function getRecetasPacienteAction(pacienteId: number) {
  const supabase = await createClient();
  const consultaIds = await resolveConsultaIdsParaPaciente(supabase, pacienteId);
  if (consultaIds.length === 0) return [];

  const { data: diagnosticos } = await supabase
    .from("diagnostico")
    .select("id, diagnostico")
    .in("consulta_origen_id", consultaIds);

  const diagIds = (diagnosticos || []).map((d) => d.id);
  if (diagIds.length === 0) return [];
  const textoPorDiag = new Map((diagnosticos || []).map((d: any) => [d.id, d.diagnostico]));

  const { data: recetasRaw } = await supabase
    .from("recetas")
    .select(`
      id, fecha_emision, estado, diagnostico_id,
      personal ( nombre, apellido ),
      receta_medicamento(id, medicamento_nombre, medicamento_id, dosis, frecuencia, indicaciones)
    `)
    .in("diagnostico_id", diagIds)
    .order("fecha_emision", { ascending: false });

  return (recetasRaw || []).map((r: any) => ({
    id: r.id,
    fecha_emision: r.fecha_emision,
    estado: r.estado,
    diagnostico_id: r.diagnostico_id,
    diagnostico_texto: textoPorDiag.get(r.diagnostico_id) ?? "",
    doctor_nombre: r.personal ? `${r.personal.nombre} ${r.personal.apellido}`.trim() : "Doctor",
    medicamentos: r.receta_medicamento || [],
  }));
}

// ── Diagnóstico ──────────────────────────────────────────────────────────────

export async function saveDiagnosticoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: personal } = await supabase.from("personal").select("id").eq("usuario_id", user.id).single();
  if (!personal) return { error: "Perfil no encontrado" };

  const consulta_id = Number(formData.get("consulta_id"));
  const paciente_id = formData.get("paciente_id") as string;
  const nota_clinica_id = await resolveNotaClinicaId(supabase, consulta_id);
  if (!nota_clinica_id) return { error: "No se encontró la nota clínica de esta consulta." };

  const diagnosticoStr = formData.get("diagnostico") as string;
  const es_tratado = formData.get("es_tratado") === "true";
  const es_definitivo = formData.get("es_definitivo") === "true";
  const cie10_id_str = formData.get("cie10_id") as string | null;
  const cie10_id = cie10_id_str ? Number(cie10_id_str) : null;

  const { data: diagRes, error: diagError } = await supabase
    .from("diagnostico")
    .insert({
      nota_clinica_id,
      consulta_origen_id: consulta_id,
      diagnostico: diagnosticoStr,
      esTratado: es_tratado,
      es_definitivo,
      cie10_id,
      fecha_deteccion: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (diagError) {
    console.error("Error insertando diagnóstico", diagError);
    return { error: "No se pudo guardar el diagnóstico" };
  }

  const diagnostico_id = diagRes.id;

  if (es_definitivo) {
    const uploadErr = await subirArchivosDiagnostico(supabase, formData, diagnostico_id, consulta_id, personal.id);
    if (uploadErr) return { error: uploadErr };
  }

  if (paciente_id) revalidatePath(`/pacientes/${paciente_id}`);
  return { success: true, diagnostico_id, es_tratado };
}

async function subirArchivosDiagnostico(
  supabase: SupabaseClient, formData: FormData, diagnostico_id: number, consulta_id: number, subido_por: number,
): Promise<string | null> {
  const archivos = formData.getAll("archivos") as File[];
  const archivosParaInsertar = [];

  for (const file of archivos) {
    if (file.size === 0) continue;
    const ext = file.name.split(".").pop();
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `private/diagnosticos/${consulta_id}/${safeName}`;

    const { error: uploadError } = await supabase.storage.from("archivos_clinicos").upload(filePath, file);
    if (uploadError) {
      console.error("Error subiendo archivo:", uploadError);
      continue;
    }

    const categoria = (formData.get(`categoria_${file.name}`) as string) || "otros";
    const descripcion = (formData.get(`descripcion_${file.name}`) as string) || null;
    archivosParaInsertar.push({
      nombre_archivo: file.name,
      url: filePath,
      tipo_archivo: file.type.startsWith("image/") ? "image" : "pdf",
      categoria,
      descripcion,
      tam_bytes: file.size,
      diagnostico_id,
      subido_por,
      fecha_subida: new Date().toISOString(),
    });
  }

  if (archivosParaInsertar.length > 0) {
    const { error: archError } = await supabase.from("archivos_clinicos").insert(archivosParaInsertar);
    if (archError) {
      console.error("Error insertando archivos", archError);
      return "Diagnóstico guardado, pero hubo un error registrando los archivos.";
    }
  }
  return null;
}

export async function updateDiagnosticoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: personal } = await supabase.from("personal").select("id").eq("usuario_id", user.id).single();
  if (!personal) return { error: "Perfil no encontrado" };

  const diagnostico_id = Number(formData.get("diagnostico_id"));
  const consulta_id = Number(formData.get("consulta_id"));
  const paciente_id = formData.get("paciente_id") as string;
  const diagnosticoStr = formData.get("diagnostico") as string;
  const es_tratado = formData.get("es_tratado") === "true";
  const es_definitivo = formData.get("es_definitivo") === "true";
  const cie10_id_str = formData.get("cie10_id") as string | null;
  const cie10_id = cie10_id_str ? Number(cie10_id_str) : null;

  const { error } = await supabase
    .from("diagnostico")
    .update({ diagnostico: diagnosticoStr, esTratado: es_tratado, es_definitivo, cie10_id })
    .eq("id", diagnostico_id);

  if (error) {
    console.error("updateDiagnosticoAction error:", error);
    return { error: "No se pudo actualizar el diagnóstico" };
  }

  if (es_definitivo) {
    await subirArchivosDiagnostico(supabase, formData, diagnostico_id, consulta_id, personal.id);
  }

  if (paciente_id) revalidatePath(`/pacientes/${paciente_id}`);
  return { success: true };
}

export async function updateAnotacionesAction(archivoId: number, anotacionesJSON: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };
  const { error } = await supabase.from("archivos_clinicos").update({ anotaciones: anotacionesJSON }).eq("id", archivoId);
  if (error) return { error: "No se pudieron guardar las anotaciones" };
  return { success: true };
}

export async function deleteArchivoClinicoAction(archivoId: number, urlPath: string, pacienteId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  if (urlPath && !urlPath.startsWith("http")) {
    const { error: storageError } = await supabase.storage.from("archivos_clinicos").remove([urlPath]);
    if (storageError) console.error("Error eliminando del bucket:", storageError);
  }

  const { error: dbError } = await supabase.from("archivos_clinicos").delete().eq("id", archivoId);
  if (dbError) return { error: "Error eliminando el registro" };

  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

// ── Tratamiento ────────────────────────────────────────────────────────────
// tratamiento = { id, tratamiento: texto libre, diagnostico_id, nota_clinica_id }
// (no tiene relación directa a catalogo_tratamientos — la búsqueda de catálogo
// es solo una ayuda para redactar el texto, no se persiste precio/ítem aquí;
// los ítems con precio viven en Presupuesto vía tratamiento_catalogo_planeado).

export async function getTratamientosAction(diagnosticoId: number) {
  const supabase = await createClient();
  const { data } = await supabase.from("tratamiento").select("id, tratamiento").eq("diagnostico_id", diagnosticoId).order("id");
  return (data || []).map((t: any) => ({ id: t.id, notas: t.tratamiento as string }));
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

export async function saveTratamientoAction(data: { diagnostico_id: number; consulta_id: number; notas: string; paciente_id: number }) {
  const supabase = await createClient();
  const nota_clinica_id = await resolveNotaClinicaId(supabase, data.consulta_id);
  if (!nota_clinica_id) return { error: "No se encontró la nota clínica de esta consulta." };

  const { error } = await supabase.from("tratamiento").insert({
    diagnostico_id: data.diagnostico_id,
    nota_clinica_id,
    tratamiento: data.notas,
  });
  if (error) {
    console.error("saveTratamientoAction error:", error);
    return { error: "No se pudo guardar el tratamiento" };
  }
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function editTratamientoAction(data: { id: number; notas: string; paciente_id: number }) {
  const supabase = await createClient();
  const { error } = await supabase.from("tratamiento").update({ tratamiento: data.notas }).eq("id", data.id);
  if (error) return { error: "No se pudo actualizar el tratamiento" };
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function deleteTratamientoAction(id: number, pacienteId: number) {
  const supabase = await createClient();
  await supabase.from("tratamiento").delete().eq("id", id);
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

// ── Plan de trabajo ──────────────────────────────────────────────────────────
// plan_tratamiento se cuelga de tratamiento_id (no de diagnostico directo) —
// se usa el tratamiento más reciente de ese diagnóstico. Los nombres de
// parámetro/salida (etapa, tiempo_pronostico) se mantienen para no tocar el
// componente de UI; internamente mapean a las columnas reales (fase,
// tiempo_estimado).

export async function getPlanTrabajoAction(diagnosticoId: number) {
  const supabase = await createClient();
  const tratamientoId = await resolveTratamientoIdParaDiagnostico(supabase, diagnosticoId);
  if (!tratamientoId) return [];
  const { data } = await supabase
    .from("plan_tratamiento")
    .select("id, fase, descripcion, tiempo_estimado, estado")
    .eq("tratamiento_id", tratamientoId)
    .order("orden");
  return (data || []).map((p: any) => ({
    id: p.id, etapa: p.fase, descripcion: p.descripcion, tiempo_pronostico: p.tiempo_estimado, estado: p.estado,
  }));
}

export async function savePlanTrabajoAction(data: {
  diagnostico_id: number; etapa: string; descripcion: string; tiempo_pronostico: string; estado: string; paciente_id: number;
}) {
  const supabase = await createClient();
  const tratamientoId = await resolveTratamientoIdParaDiagnostico(supabase, data.diagnostico_id);
  if (!tratamientoId) return { error: "Registra primero un tratamiento antes de agregar fases del plan." };

  const { count } = await supabase
    .from("plan_tratamiento")
    .select("id", { count: "exact", head: true })
    .eq("tratamiento_id", tratamientoId);

  const { error } = await supabase.from("plan_tratamiento").insert({
    tratamiento_id: tratamientoId,
    fase: data.etapa,
    orden: (count ?? 0) + 1,
    descripcion: data.descripcion,
    tiempo_estimado: data.tiempo_pronostico,
    estado: data.estado,
  });
  if (error) {
    console.error("savePlanTrabajoAction error:", error);
    return { error: "No se pudo guardar el plan" };
  }
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function editPlanTrabajoAction(data: {
  id: number; etapa: string; descripcion: string; tiempo_pronostico: string; estado: string; paciente_id: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("plan_tratamiento").update({
    fase: data.etapa, descripcion: data.descripcion, tiempo_estimado: data.tiempo_pronostico, estado: data.estado,
  }).eq("id", data.id);
  if (error) return { error: "No se pudo actualizar el plan" };
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function deletePlanTrabajoAction(id: number, pacienteId: number) {
  const supabase = await createClient();
  await supabase.from("plan_tratamiento").delete().eq("id", id);
  revalidatePath(`/pacientes/${pacienteId}`);
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
  diagnostico_id: number; paciente_id: number;
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
    await supabase.from("receta_medicamento").insert(data.medicamentos.map((m) => ({ receta_id: receta.id, ...m })));
  }
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function toggleEstadoRecetaAction(id: number, estado: string, pacienteId: number) {
  const supabase = await createClient();
  await supabase.from("recetas").update({ estado }).eq("id", id);
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

export async function deleteRecetaAction(id: number, pacienteId: number) {
  const supabase = await createClient();
  await supabase.from("receta_medicamento").delete().eq("receta_id", id);
  await supabase.from("recetas").delete().eq("id", id);
  revalidatePath(`/pacientes/${pacienteId}`);
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

export async function deleteMedicamentoAction(id: number, pacienteId: number) {
  const supabase = await createClient();
  await supabase.from("receta_medicamento").delete().eq("id", id);
  revalidatePath(`/pacientes/${pacienteId}`);
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

export async function saveRecomendacionAction(data: { consulta_id: number; contenido: string; paciente_id: number }) {
  const supabase = await createClient();
  const { error } = await supabase.from("recomendacion").insert({ consulta_id: data.consulta_id, contenido: data.contenido });
  if (error) return { error: "No se pudo guardar la recomendación" };
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function editRecomendacionAction(data: { id: number; contenido: string; paciente_id: number }) {
  const supabase = await createClient();
  const { error } = await supabase.from("recomendacion").update({ contenido: data.contenido }).eq("id", data.id);
  if (error) return { error: "No se pudo actualizar la recomendación" };
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function deleteRecomendacionAction(id: number, pacienteId: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("recomendacion").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar la recomendación" };
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

// ── Presupuesto + Pagos ──────────────────────────────────────────────────────

export async function getMediosPagoAction() {
  const supabase = await createClient();
  const { data } = await supabase.from("medio_pago").select("id, nombre").order("id");
  return data || [];
}

/** Presupuesto más reciente del paciente (no está scoped por consulta — el esquema no lo permite). */
export async function getPresupuestoActivoAction(pacienteId: number) {
  const supabase = await createClient();
  if (!pacienteId) return null;

  const { data: presupuesto } = await supabase
    .from("presupuestos")
    .select(`
      id, fecha_emision, total_bruto, descuento_porcentaje, descuento_monto, estado, fecha_aprobacion, notas,
      personal ( nombre, apellido ),
      detalle_presupuesto ( id, catalogo_tratamiento_id, cantidad, precio_unitario, subtotal, catalogo_tratamientos ( id, nombre, descripcion, moneda ) ),
      pagos ( id, monto, fecha_pago, medio_pago_id, referencia, estado, observaciones, medio_pago ( id, nombre ) )
    `)
    .eq("paciente_id", pacienteId)
    .order("fecha_emision", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!presupuesto) return null;

  const doctor = presupuesto.personal as any;

  return {
    id: presupuesto.id,
    fecha_emision: presupuesto.fecha_emision,
    doctor_nombre: doctor ? `${doctor.nombre} ${doctor.apellido}` : null,
    total_bruto: Number(presupuesto.total_bruto),
    descuento_porcentaje: Number(presupuesto.descuento_porcentaje) || 0,
    descuento_monto: Number(presupuesto.descuento_monto) || 0,
    estado: presupuesto.estado,
    fecha_aprobacion: presupuesto.fecha_aprobacion,
    notas: presupuesto.notas,
    items: (presupuesto.detalle_presupuesto || []).map((d: any) => ({
      id: d.id,
      tratamiento_id: d.catalogo_tratamiento_id,
      nombre: d.catalogo_tratamientos?.nombre ?? "Ítem",
      descripcion: d.catalogo_tratamientos?.descripcion ?? null,
      moneda: d.catalogo_tratamientos?.moneda ?? "PEN",
      cantidad: Number(d.cantidad) || 1,
      precio_unitario: Number(d.precio_unitario),
      subtotal: Number(d.subtotal),
    })),
    pagos: (presupuesto.pagos || []).map((p: any) => ({
      id: p.id, monto: Number(p.monto), fecha_pago: p.fecha_pago, medio_pago_id: p.medio_pago_id,
      medio_pago_nombre: p.medio_pago?.nombre ?? "—", referencia: p.referencia, estado: p.estado, observaciones: p.observaciones,
    })),
  };
}

/**
 * Todos los presupuestos del paciente con su detalle completo (ítems y pagos) —
 * el mismo shape que getPresupuestoActivoAction pero para el historial completo,
 * no solo el más reciente.
 */
export async function getPresupuestosPacienteAction(pacienteId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("presupuestos")
    .select(`
      id, fecha_emision, total_bruto, descuento_porcentaje, descuento_monto, estado, fecha_aprobacion, notas,
      personal ( nombre, apellido ),
      detalle_presupuesto ( id, catalogo_tratamiento_id, cantidad, precio_unitario, subtotal, catalogo_tratamientos ( id, nombre, descripcion, moneda ) ),
      pagos ( id, monto, fecha_pago, medio_pago_id, referencia, estado, observaciones, medio_pago ( id, nombre ) )
    `)
    .eq("paciente_id", pacienteId)
    .order("fecha_emision", { ascending: false });

  return (data || []).map((presupuesto: any) => {
    const doctor = presupuesto.personal as any;
    return {
      id: presupuesto.id,
      fecha_emision: presupuesto.fecha_emision,
      doctor_nombre: doctor ? `${doctor.nombre} ${doctor.apellido}` : null,
      total_bruto: Number(presupuesto.total_bruto),
      descuento_porcentaje: Number(presupuesto.descuento_porcentaje) || 0,
      descuento_monto: Number(presupuesto.descuento_monto) || 0,
      estado: presupuesto.estado,
      fecha_aprobacion: presupuesto.fecha_aprobacion,
      notas: presupuesto.notas,
      items: (presupuesto.detalle_presupuesto || []).map((d: any) => ({
        id: d.id,
        tratamiento_id: d.catalogo_tratamiento_id,
        nombre: d.catalogo_tratamientos?.nombre ?? "Ítem",
        descripcion: d.catalogo_tratamientos?.descripcion ?? null,
        moneda: d.catalogo_tratamientos?.moneda ?? "PEN",
        cantidad: Number(d.cantidad) || 1,
        precio_unitario: Number(d.precio_unitario),
        subtotal: Number(d.subtotal),
      })),
      pagos: (presupuesto.pagos || []).map((p: any) => ({
        id: p.id, monto: Number(p.monto), fecha_pago: p.fecha_pago, medio_pago_id: p.medio_pago_id,
        medio_pago_nombre: p.medio_pago?.nombre ?? "—", referencia: p.referencia, estado: p.estado, observaciones: p.observaciones,
      })),
    };
  });
}

export async function crearPresupuestoAction(data: {
  paciente_id: number; consulta_id: number;
  items: { catalogo_id: number; cantidad: number; precio_unitario: number }[];
  descuento_porcentaje: number; notas?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };
  const { data: personal } = await supabase.from("personal").select("id").eq("usuario_id", user.id).single();
  if (!personal) return { error: "Perfil no encontrado" };
  if (data.items.length === 0) return { error: "Agrega al menos un ítem al presupuesto" };

  const nota_clinica_id = await resolveNotaClinicaId(supabase, data.consulta_id);
  if (!nota_clinica_id) return { error: "No se encontró la nota clínica de esta consulta." };

  const total_bruto = data.items.reduce((acc, it) => acc + it.cantidad * it.precio_unitario, 0);
  const descuento_monto = (total_bruto * (data.descuento_porcentaje || 0)) / 100;

  const { data: presupuesto, error: pErr } = await supabase
    .from("presupuestos")
    .insert({
      paciente_id: data.paciente_id,
      doctor_id: personal.id,
      nota_clinica_id,
      total_bruto,
      descuento_porcentaje: data.descuento_porcentaje || 0,
      descuento_monto,
      estado: "pendiente",
      notas: data.notas || null,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (pErr || !presupuesto) {
    console.error("crearPresupuestoAction error:", pErr);
    return { error: "No se pudo crear el presupuesto" };
  }

  const detalles = data.items.map((it) => ({
    presupuesto_id: presupuesto.id,
    catalogo_tratamiento_id: it.catalogo_id,
    cantidad: it.cantidad,
    precio_unitario: it.precio_unitario,
    subtotal: it.cantidad * it.precio_unitario,
  }));

  const { error: dErr } = await supabase.from("detalle_presupuesto").insert(detalles);
  if (dErr) {
    console.error("detalle_presupuesto error:", dErr);
    return { error: "Presupuesto creado, pero falló el detalle" };
  }

  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true, presupuesto_id: presupuesto.id };
}

export async function updateEstadoPresupuestoAction(data: { presupuesto_id: number; estado: string; paciente_id: number }) {
  const supabase = await createClient();
  const patch: any = { estado: data.estado };
  if (data.estado === "aprobado") patch.fecha_aprobacion = new Date().toISOString();
  const { error } = await supabase.from("presupuestos").update(patch).eq("id", data.presupuesto_id);
  if (error) return { error: "No se pudo actualizar el estado del presupuesto" };
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function deletePresupuestoAction(presupuestoId: number, pacienteId: number) {
  const supabase = await createClient();
  await supabase.from("pagos").delete().eq("presupuesto_id", presupuestoId);
  await supabase.from("detalle_presupuesto").delete().eq("presupuesto_id", presupuestoId);
  await supabase.from("presupuestos").delete().eq("id", presupuestoId);
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

export async function registrarPagoAction(data: {
  presupuesto_id: number; monto: number; medio_pago_id: number | null; referencia?: string; observaciones?: string; paciente_id: number;
}) {
  const supabase = await createClient();
  if (!data.monto || data.monto <= 0) return { error: "El monto debe ser mayor a 0" };

  const { error } = await supabase.from("pagos").insert({
    presupuesto_id: data.presupuesto_id,
    monto: data.monto,
    medio_pago_id: data.medio_pago_id,
    referencia: data.referencia || null,
    observaciones: data.observaciones || null,
    estado: "hecho",
  });

  if (error) {
    console.error("registrarPagoAction error:", error);
    return { error: "No se pudo registrar el pago" };
  }
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function anularPagoAction(pagoId: number, pacienteId: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("pagos").update({ estado: "anulado" }).eq("id", pagoId);
  if (error) return { error: "No se pudo anular el pago" };
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

// ── Galería clínica (tab "Archivos") ────────────────────────────────────────
// archivos_clinicos no tiene paciente_id directo — se llega por dos caminos
// posibles (diagnostico_id o consulta_id, ambos nullable), cada uno resuelto
// hasta historia_clinica.paciente_id. Se combinan y deduplican por id.

async function firmarUrls(supabase: SupabaseClient, archivos: any[]) {
  return Promise.all(
    archivos.map(async (a: any) => {
      if (a.url && !a.url.startsWith("http")) {
        const { data: signed } = await supabase.storage.from("archivos_clinicos").createSignedUrl(a.url, 60 * 60);
        return { ...a, displayUrl: signed?.signedUrl || a.url };
      }
      return { ...a, displayUrl: a.url };
    }),
  );
}

export async function getArchivosPacienteAction(pacienteId: number) {
  const supabase = await createClient();

  const [viaDiagnostico, viaConsulta] = await Promise.all([
    supabase
      .from("archivos_clinicos")
      .select(`id, nombre_archivo, url, tipo_archivo, categoria, descripcion, fecha_subida, tam_bytes, anotaciones,
        personal!subido_por ( nombre, apellido, url_firma_digital, especialidad ( especialidad ) ),
        diagnostico!inner ( nota_clinica!inner ( historia_clinica!inner ( paciente_id ) ) )`)
      .eq("diagnostico.nota_clinica.historia_clinica.paciente_id", pacienteId),
    supabase
      .from("archivos_clinicos")
      .select(`id, nombre_archivo, url, tipo_archivo, categoria, descripcion, fecha_subida, tam_bytes, anotaciones,
        personal!subido_por ( nombre, apellido, url_firma_digital, especialidad ( especialidad ) ),
        consultas!inner ( nota_clinica!inner ( historia_clinica!inner ( paciente_id ) ) )`)
      .eq("consultas.nota_clinica.historia_clinica.paciente_id", pacienteId),
  ]);

  const porId = new Map<number, any>();
  for (const a of [...(viaDiagnostico.data || []), ...(viaConsulta.data || [])]) {
    porId.set(a.id, a);
  }

  const archivos = Array.from(porId.values()).sort(
    (a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime(),
  );

  return firmarUrls(supabase, archivos);
}

/** Datos reales de la sede del usuario actual — para membrete de exportación. */
export async function getSedeInfoAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("sede ( nombre_clinica, direccion, telefono, email_contacto )")
    .eq("id", user.id)
    .single();

  return (data?.sede as any) ?? null;
}

/** Sube un archivo clínico general (fuera del flujo de diagnóstico), ligado a la consulta activa. */
export async function subirArchivoGeneralAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: personal } = await supabase.from("personal").select("id").eq("usuario_id", user.id).single();
  if (!personal) return { error: "Perfil no encontrado" };

  const consulta_id = Number(formData.get("consulta_id"));
  const paciente_id = formData.get("paciente_id") as string;
  const categoria = (formData.get("categoria") as string) || "otros";
  const descripcion = (formData.get("descripcion") as string) || null;
  const file = formData.get("archivo") as File;
  if (!file || file.size === 0) return { error: "Selecciona un archivo" };

  const ext = file.name.split(".").pop();
  const safeName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const filePath = `private/consultas/${consulta_id}/${safeName}`;

  const { error: uploadError } = await supabase.storage.from("archivos_clinicos").upload(filePath, file);
  if (uploadError) {
    console.error("Error subiendo archivo:", uploadError);
    return { error: "No se pudo subir el archivo" };
  }

  const { error: insertError } = await supabase.from("archivos_clinicos").insert({
    nombre_archivo: file.name,
    url: filePath,
    tipo_archivo: file.type.startsWith("image/") ? "image" : "pdf",
    categoria,
    descripcion,
    tam_bytes: file.size,
    consulta_id,
    subido_por: personal.id,
    fecha_subida: new Date().toISOString(),
  });

  if (insertError) {
    console.error("Error insertando archivo:", insertError);
    return { error: "No se pudo registrar el archivo" };
  }

  if (paciente_id) revalidatePath(`/pacientes/${paciente_id}`);
  return { success: true };
}
