"use server";

import { createClient } from "@/lib/supabase/server";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { revalidatePath } from "next/cache";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// ── Helpers internos ────────────────────────────────────────────────────────

/** Resuelve el id de `tipo_moneda` para una moneda dada, creándola si la
 * tabla todavía no tiene esa fila (catálogo trivial, sin riesgo en auto-crear). */
async function resolveTipoMonedaId(supabase: SupabaseClient, moneda: string): Promise<number | null> {
  const { data: existente } = await supabase.from("tipo_moneda").select("id").eq("moneda", moneda).maybeSingle();
  if (existente) return existente.id;

  const { data: creado, error } = await supabase.from("tipo_moneda").insert({ moneda }).select("id").single();
  if (error) {
    console.error(`[resolveTipoMonedaId] No se pudo crear tipo_moneda "${moneda}":`, error);
    return null;
  }
  return creado.id;
}

/** Turno de caja abierto del usuario (fecha_cierre IS NULL) — si no hay
 * ninguno, abre uno nuevo. Se maneja de forma transparente, sin UI de
 * apertura/cierre de caja (fuera de alcance por ahora). */
async function resolveCajaTurnoAbierto(supabase: SupabaseClient, usuarioId: string, sedeId: number): Promise<string | null> {
  const { data: abierto } = await supabase
    .from("caja_turno")
    .select("id")
    .eq("usuario_id", usuarioId)
    .is("fecha_cierre", null)
    .order("fecha_apertura", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (abierto) return abierto.id;

  const { data: nuevo, error } = await supabase
    .from("caja_turno")
    .insert({ sede_id: sedeId, usuario_id: usuarioId, fecha_apertura: new Date().toISOString() })
    .select("id")
    .single();
  if (error) {
    console.error("[resolveCajaTurnoAbierto] No se pudo abrir un turno de caja:", error);
    return null;
  }
  return nuevo.id;
}

/** consultas → nota_clinica_id (ya viene directo en la fila de consultas). */
async function resolveNotaClinicaId(supabase: SupabaseClient, consultaId: string): Promise<number | null> {
  const { data } = await supabase.from("consultas").select("nota_clinica_id").eq("id", consultaId).single();
  return data?.nota_clinica_id ?? null;
}

/**
 * plan_tratamiento no se referencia por diagnóstico directo — la cadena real
 * es diagnostico → tratamiento → plan_tratamiento. Se usa el tratamiento más
 * reciente registrado para ese diagnóstico (el flujo natural es: primero se
 * registra el tratamiento, luego se planifican sus fases).
 */
async function resolveTratamientoIdParaDiagnostico(supabase: SupabaseClient, diagnosticoId: string): Promise<number | null> {
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
async function resolveConsultaIdsParaPaciente(supabase: SupabaseClient, pacienteId: string): Promise<number[]> {
  const { data: hc } = await supabase.from("historia_clinica").select("id").eq("paciente_id", pacienteId).maybeSingle();
  if (!hc) return [];
  const { data: notas } = await supabase.from("nota_clinica").select("id").eq("historia_clinica_id", hc.id);
  const notaIds = (notas || []).map((n) => n.id);
  if (notaIds.length === 0) return [];
  const { data: consultas } = await supabase.from("consultas").select("id").in("nota_clinica_id", notaIds);
  return (consultas || []).map((c) => c.id);
}

// ── Consulta activa — bundle consolidado para los tabs de la Ficha ─────────

import { unstable_noStore as noStore } from "next/cache";

export async function getConsultaActivaAction(consultaId: string, pacienteId: string) {
  noStore();
  const supabase = await createClient();

  const { data: consulta, error } = await supabase
    .from("consultas")
    .select(`
      id, fecha_consulta, motivo, observaciones, examen_fisico, cita_id, nota_clinica_id,
      citas ( id, estado ),
      usuarios ( personal ( nombre, apellido, url_firma_digital, num_colegiatura, especialidad ( especialidad ) ) )
    `)
    .eq("id", consultaId)
    .single();

  if (error || !consulta) {
    console.error("Error fetching consulta activa", error);
    return null;
  }

  const personalRaw = (consulta.usuarios as any)?.personal ?? null;
  const personalInfo = personalRaw ? {
    nombre: personalRaw.nombre,
    apellido: personalRaw.apellido,
    url_firma_digital: personalRaw.url_firma_digital ?? null,
    num_colegiatura: personalRaw.num_colegiatura ?? null,
    especialidad: Array.isArray(personalRaw.especialidad) ? (personalRaw.especialidad[0] ?? null) : (personalRaw.especialidad ?? null),
  } : null;

  const { data: diagnosticosRaw, error: diagnosticosError } = await supabase
    .from("diagnostico")
    .select(`
      id, diagnostico, "esTratado", es_definitivo, fecha_deteccion,
      cie10(id, codigo, descripcion),
      archivos_clinicos ( id, nombre_archivo, url, tipo_archivo_id, categoria, fecha_subida, tam_bytes, anotaciones, tipo_archivo (id, tipo_archivo) )
    `)
    .eq("consulta_origen_id", consultaId)
    .order("fecha_deteccion", { ascending: false });

  if (diagnosticosError) console.error("[getConsultaActivaAction] Error obteniendo diagnósticos:", diagnosticosError);

  const diagnosticos = diagnosticosRaw
    ? await Promise.all(
        diagnosticosRaw.map(async (d: any) => {
          const archivosFirmados = await firmarUrls(supabase, d.archivos_clinicos || []);
          return {
            id: d.id,
            diagnostico_texto: d.diagnostico,
            es_tratado: d.esTratado,
            es_definitivo: d.es_definitivo,
            fecha_deteccion: d.fecha_deteccion,
            cie10: d.cie10,
            archivos: archivosFirmados.map((a: any) => ({ ...a, personal: personalInfo })),
          };
        })
      )
    : [];

  const diagnostico = diagnosticos.length > 0 ? diagnosticos[0] : null;

  const [tratamientos, recetas, recomendaciones, presupuestos, mediosPago] = await Promise.all([
    diagnostico ? getTratamientosAction(diagnostico.id) : Promise.resolve([]),
    diagnostico ? getRecetasAction(diagnostico.id) : Promise.resolve([]),
    getRecomendacionesConsultaAction(consultaId),
    getPresupuestosNotaClinicaAction(consulta.nota_clinica_id),
    getMediosPagoAction(),
  ]);

  const doctorName = personalInfo ? `${personalInfo.nombre} ${personalInfo.apellido}`.trim() : "Doctor";
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
    planTrabajo: [], // Mantener para compatibilidad si algún componente lo usa todavía
    tratamientos,
    recetas,
    recomendaciones,
    presupuestos,
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
export async function getDiagnosticosPacienteAction(pacienteId: string) {
  noStore();
  const supabase = await createClient();


  const { data: diagnosticosRaw, error } = await supabase
    .from("diagnostico")
    .select(`
      id, diagnostico, "esTratado", es_definitivo, fecha_deteccion, consulta_origen_id,
      cie10(id, codigo, descripcion),
      archivos_clinicos ( id, nombre_archivo, url, tipo_archivo_id, categoria, fecha_subida, tam_bytes, anotaciones, tipo_archivo (id, tipo_archivo) ),
      nota_clinica!inner ( historia_clinica!inner ( paciente_id ) ),
      consultas!consulta_origen_id ( usuarios ( personal ( nombre, apellido, url_firma_digital, num_colegiatura, especialidad ( especialidad ) ) ) )
    `)
    .eq("nota_clinica.historia_clinica.paciente_id", pacienteId)
    .order("fecha_deteccion", { ascending: false });

  if (error) console.error("[getDiagnosticos] error:", error);
  console.log("[getDiagnosticos] diagnosticosRaw:", diagnosticosRaw?.length);

  if (!diagnosticosRaw) return [];

  const procesarArchivos = async (archivos: any[], personal: any) => {
    if (!archivos || archivos.length === 0) return [];
    return await Promise.all(
      archivos.map(async (a: any) => {
        let tipo_str = "desconocido";
        if (a.tipo_archivo && typeof a.tipo_archivo === "object") tipo_str = a.tipo_archivo.tipo_archivo || a.tipo_archivo.Tipo_archivo;

        if (a.url && !a.url.startsWith("http")) {
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: a.url,
            });
            const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 60 * 60 });
            return { ...a, tipo_archivo: tipo_str, displayUrl: signedUrl, personal };
          } catch (e) {
            console.error("Error signing URL with R2:", e);
            return { ...a, tipo_archivo: tipo_str, displayUrl: a.url, personal };
          }
        }
        return { ...a, tipo_archivo: tipo_str, displayUrl: a.url, personal };
      })
    );
  };

  return Promise.all(
    diagnosticosRaw.map(async (d: any) => {
      const consultaRaw = Array.isArray(d.consultas) ? d.consultas[0] : d.consultas;
      const usuariosRaw = Array.isArray(consultaRaw?.usuarios) ? consultaRaw.usuarios[0] : consultaRaw?.usuarios;
      const personalRaw = Array.isArray(usuariosRaw?.personal) ? usuariosRaw.personal[0] : usuariosRaw?.personal;
      const doctor_nombre = personalRaw ? `${personalRaw.nombre} ${personalRaw.apellido}`.trim() : null;
      const personalInfo = personalRaw ? {
        nombre: personalRaw.nombre,
        apellido: personalRaw.apellido,
        url_firma_digital: personalRaw.url_firma_digital ?? null,
        num_colegiatura: personalRaw.num_colegiatura ?? null,
        especialidad: Array.isArray(personalRaw.especialidad) ? (personalRaw.especialidad[0] ?? null) : (personalRaw.especialidad ?? null),
      } : null;

      return {
        id: d.id,
        diagnostico_texto: d.diagnostico,
        es_tratado: d.esTratado,
        es_definitivo: d.es_definitivo,
        fecha_deteccion: d.fecha_deteccion,
        consulta_id: d.consulta_origen_id,
        cie10: d.cie10,
        doctor_nombre,
        archivos: await procesarArchivos(d.archivos_clinicos || [], personalInfo),
      };
    })
  );
}

export interface ContextoClinicoPaciente {
  tipo: "fase" | "tratamiento" | "diagnostico";
  texto: string;
}

/**
 * Contexto clínico para agendar con conocimiento del tratamiento en curso —
 * usado por el asistente al crear una cita, para que el doctor sepa qué
 * procedimiento corresponde en la siguiente sesión (útil en tratamientos con
 * citas recurrentes). Solo usa datos ya registrados en BD, en este orden de
 * prioridad: (1) la siguiente fase pendiente (`estado !== "Terminado"`) del
 * plan de tratamiento del diagnóstico activo más reciente, (2) si no hay
 * fases registradas, el texto libre del tratamiento, (3) si tampoco hay
 * tratamiento, el texto del diagnóstico activo. Nunca genera contenido
 * clínico — solo reordena/etiqueta lo que ya existe.
 */
export async function getContextoClinicoPacienteAction(pacienteId: string): Promise<ContextoClinicoPaciente | null> {
  const supabase = await createClient();
  const consultaIds = await resolveConsultaIdsParaPaciente(supabase, pacienteId);
  if (consultaIds.length === 0) return null;

  const { data: diagnosticos, error: diagError } = await supabase
    .from("diagnostico")
    .select(`id, diagnostico, "esTratado", fecha_deteccion`)
    .in("consulta_origen_id", consultaIds)
    .eq("esTratado", true)
    .order("fecha_deteccion", { ascending: false })
    .limit(1);

  if (diagError) {
    console.error("[getContextoClinicoPacienteAction] Error obteniendo diagnóstico activo (¿RLS?):", diagError);
    return null;
  }

  const diagnostico = diagnosticos?.[0];
  if (!diagnostico?.diagnostico) return null;

  const tratamientoId = await resolveTratamientoIdParaDiagnostico(supabase, String(diagnostico.id));
  if (!tratamientoId) {
    return { tipo: "diagnostico", texto: diagnostico.diagnostico };
  }

  const [{ data: tratamiento }, { data: fases, error: fasesError }] = await Promise.all([
    supabase.from("tratamiento").select("tratamiento").eq("id", tratamientoId).single(),
    supabase.from("plan_tratamiento").select("fase, descripcion, estado").eq("tratamiento_id", tratamientoId).order("orden", { ascending: true }),
  ]);

  if (fasesError) {
    console.error("[getContextoClinicoPacienteAction] Error obteniendo plan de tratamiento (¿RLS?):", fasesError);
  }

  const siguienteFase = (fases || []).find((f: any) => f.estado !== "Terminado");
  if (siguienteFase?.fase) {
    return { tipo: "fase", texto: `${siguienteFase.fase}${siguienteFase.descripcion ? ` — ${siguienteFase.descripcion}` : ""}` };
  }

  if (tratamiento?.tratamiento) {
    return { tipo: "tratamiento", texto: tratamiento.tratamiento };
  }

  return { tipo: "diagnostico", texto: diagnostico.diagnostico };
}

/**
 * Todas las recetas del paciente a través de su historial completo de
 * consultas — usado por RecetasTab cuando no hay una consulta en curso.
 */
export async function getRecetasPacienteAction(pacienteId: string) {
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
      usuarios ( personal ( nombre, apellido ) ),
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
    doctor_nombre: (r.usuarios as any)?.personal ? `${(r.usuarios as any).personal.nombre} ${(r.usuarios as any).personal.apellido}`.trim() : "Doctor",
    medicamentos: r.receta_medicamento || [],
  }));
}

// ── Diagnóstico ──────────────────────────────────────────────────────────────

export async function saveDiagnosticoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: personal } = await supabase.from("personal").select("usuario_id").eq("usuario_id", user.id).single();
  if (!personal) return { error: "Perfil no encontrado" };

  const consulta_id = formData.get("consulta_id") as string;
  const paciente_id = formData.get("paciente_id") as string;
  const nota_clinica_id = await resolveNotaClinicaId(supabase, String(consulta_id));
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
    const archivosJSON = formData.get("archivos_metadata") as string;
    if (archivosJSON) {
      try {
        const archivosMeta = JSON.parse(archivosJSON);
        if (archivosMeta.length > 0) {
          const archivosParaInsertar = archivosMeta.map((a: any) => ({
            nombre_archivo: a.nombre,
            url: a.url, // R2 URL o path relativo
            tipo_archivo_id: a.tipo_archivo_id,
            categoria: a.categoria, // img o pdf
            descripcion: a.descripcion || null,
            tam_bytes: a.tam_bytes,
            diagnostico_id,
            consulta_id,
            subido_por: user.id,
            fecha_subida: new Date().toISOString(),
          }));

          const { error: archError } = await supabase.from("archivos_clinicos").insert(archivosParaInsertar);
          if (archError) console.error("Error insertando metadata de archivos", archError);
        }
      } catch (e) {
        console.error("Error parsing archivos_metadata", e);
      }
    }
  }

  if (paciente_id) revalidatePath(`/pacientes/${paciente_id}`);
  return { success: true, diagnostico_id, es_tratado };
}

export async function getTiposArchivoAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tipo_archivo").select("*").order("id");
  if (error) {
    console.error("Error fetching tipos_archivo:", error);
  }
  return data || [];
}

export async function getPresignedUploadUrlAction(filename: string, contentType: string, folder: string = "diagnostico") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  try {
    const ext = filename.split(".").pop();
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const objectKey = `${folder}/${safeName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    const publicUrl = `${process.env.R2_PUBLIC_CUSTOM_DOMAIN}/${objectKey}`;

    return { signedUrl, publicUrl, objectKey };
  } catch (error) {
    console.error("Error generating presigned URL", error);
    return { error: "No se pudo generar la URL de subida" };
  }
}



export async function updateDiagnosticoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: personal } = await supabase.from("personal").select("usuario_id").eq("usuario_id", user.id).single();
  if (!personal) return { error: "Perfil no encontrado" };

  const diagnostico_id = formData.get("diagnostico_id") as string;
  const consulta_id = formData.get("consulta_id") as string;
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
    const archivosJSON = formData.get("archivos_metadata") as string;
    if (archivosJSON) {
      try {
        const archivosMeta = JSON.parse(archivosJSON);
        if (archivosMeta.length > 0) {
          const archivosParaInsertar = archivosMeta.map((a: any) => ({
            nombre_archivo: a.nombre,
            url: a.url, // R2 URL o path relativo
            tipo_archivo_id: a.tipo_archivo_id,
            categoria: a.categoria, // img o pdf
            descripcion: a.descripcion || null,
            tam_bytes: a.tam_bytes,
            diagnostico_id,
            consulta_id,
            subido_por: user.id,
            fecha_subida: new Date().toISOString(),
          }));

          const { error: archError } = await supabase.from("archivos_clinicos").insert(archivosParaInsertar);
          if (archError) console.error("Error insertando metadata de archivos", archError);
        }
      } catch (e) {
        console.error("Error parsing archivos_metadata", e);
      }
    }
  }

  if (paciente_id) revalidatePath(`/pacientes/${paciente_id}`);
  return { success: true };
}

export async function updateAnotacionesAction(archivoId: string, anotacionesJSON: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };
  const { error } = await supabase.from("archivos_clinicos").update({ anotaciones: anotacionesJSON }).eq("id", archivoId);
  if (error) return { error: "No se pudieron guardar las anotaciones" };
  return { success: true };
}

export async function deleteArchivoClinicoAction(archivoId: string, urlPath: string, pacienteId: string) {
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

export async function getTratamientosAction(diagnosticoId: string) {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tratamiento")
    .select(`
      id, 
      tratamiento, 
      catalogo_tratamiento_id,
      catalogo_tratamientos ( nombre ),
      plan_tratamiento (
        id, fase, orden, descripcion, tiempo_estimado, estado,
        procedimiento_efectuado ( id, notas, created_at, consulta_id )
      )
    `)
    .eq("diagnostico_id", diagnosticoId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getTratamientosAction error:", error);
    return [];
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    notas: t.tratamiento as string,
    catalogo_id: t.catalogo_tratamiento_id,
    catalogo_nombre: t.catalogo_tratamientos?.nombre,
    plan: (t.plan_tratamiento || []).sort((a: any, b: any) => a.orden - b.orden).map((p: any) => ({
      id: p.id,
      fase: p.fase,
      orden: p.orden,
      descripcion: p.descripcion,
      tiempo_estimado: p.tiempo_estimado,
      estado: p.estado,
      avances: (p.procedimiento_efectuado || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((av: any) => ({
        id: av.id,
        notas: av.notas,
        fecha: av.created_at,
        consulta_id: av.consulta_id
      }))
    }))
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

export async function saveTratamientoAction(data: { diagnostico_id: string; consulta_id: string; notas: string; paciente_id: string; catalogo_tratamiento_id: number }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const nota_clinica_id = await resolveNotaClinicaId(supabase, data.consulta_id);
  if (!nota_clinica_id) return { error: "No se encontró la nota clínica de esta consulta." };

  // 1. Obtener detalles del catálogo para el precio
  const { data: catalogo } = await supabase.from("catalogo_tratamientos").select("precio").eq("id", data.catalogo_tratamiento_id).single();
  if (!catalogo) return { error: "Tratamiento del catálogo no encontrado" };

  // 2. Insertar tratamiento
  const { data: tratamiento, error } = await supabase.from("tratamiento").insert({
    diagnostico_id: data.diagnostico_id,
    nota_clinica_id,
    tratamiento: data.notas,
    catalogo_tratamiento_id: data.catalogo_tratamiento_id,
  }).select("id").single();

  if (error || !tratamiento) {
    console.error("saveTratamientoAction error:", error);
    return { error: "No se pudo guardar el tratamiento" };
  }

  // 3. Buscar presupuesto pendiente de este diagnóstico
  let presupuestoId: string | null = null;
  const { data: presExistente } = await supabase
    .from("presupuestos")
    .select("id, total_bruto")
    .eq("diagnostico_id", data.diagnostico_id)
    .eq("estado", "pendiente")
    .single();

  if (presExistente) {
    presupuestoId = presExistente.id;
    // Actualizar total
    await supabase.from("presupuestos").update({
      total_bruto: Number(presExistente.total_bruto) + Number(catalogo.precio)
    }).eq("id", presupuestoId);
  } else {
    // Crear nuevo presupuesto
    const { data: nuevoPres } = await supabase.from("presupuestos").insert({
      paciente_id: data.paciente_id,
      doctor_id: user.id,
      nota_clinica_id,
      diagnostico_id: data.diagnostico_id,
      total_bruto: catalogo.precio,
      estado: "pendiente",
    }).select("id").single();
    if (nuevoPres) presupuestoId = nuevoPres.id;
  }

  // 4. Agregar detalle_presupuesto
  if (presupuestoId) {
    await supabase.from("detalle_presupuesto").insert({
      presupuesto_id: presupuestoId,
      catalogo_tratamiento_id: data.catalogo_tratamiento_id,
      cantidad: 1,
      precio_unitario: catalogo.precio,
      subtotal: catalogo.precio,
    });
  }

  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true, id: tratamiento.id };
}

export async function editTratamientoAction(data: { id: string; notas: string; paciente_id: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("tratamiento").update({ tratamiento: data.notas }).eq("id", data.id);
  if (error) return { error: "No se pudo actualizar el tratamiento" };
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function deleteTratamientoAction(id: string, pacienteId: string) {
  const supabase = await createClient();

  // 1. Desvincular citas
  await supabase.from("citas").update({ tratamiento_id: null }).eq("tratamiento_id", id);

  // 1.5 Obtener info del tratamiento para descontarlo del presupuesto
  const { data: tratData } = await supabase.from("tratamiento")
    .select("diagnostico_id, catalogo_tratamiento_id, catalogo_tratamientos(precio)")
    .eq("id", id)
    .single();

  // 2. Obtener fases para eliminar dependencias
  const { data: fases } = await supabase.from("plan_tratamiento").select("id").eq("tratamiento_id", id);
  if (fases && fases.length > 0) {
    const faseIds = fases.map(f => f.id);
    
    // Desvincular archivos clínicos
    await supabase.from("archivos_clinicos").update({ plan_tratamiento_id: null }).in("plan_tratamiento_id", faseIds);
    
    // Eliminar avances (procedimientos efectuados)
    await supabase.from("procedimiento_efectuado").delete().in("plan_tratamiento_id", faseIds);
    
    // Eliminar fases (plan_tratamiento)
    await supabase.from("plan_tratamiento").delete().in("id", faseIds);
  }

  // 3. Eliminar tratamiento maestro
  const { error } = await supabase.from("tratamiento").delete().eq("id", id);
  if (error) {
    console.error("deleteTratamientoAction error:", error);
    return { error: "No se pudo eliminar el tratamiento" };
  }

  // 4. Descontar del presupuesto (si existe)
  if (tratData && tratData.diagnostico_id) {
    const { data: presExistente } = await supabase.from("presupuestos")
      .select("id, total_bruto")
      .eq("diagnostico_id", tratData.diagnostico_id)
      .eq("estado", "pendiente")
      .single();

    if (presExistente) {
      const precio = Number((tratData as any).catalogo_tratamientos?.precio || 0);
      
      // Actualizar total
      await supabase.from("presupuestos").update({
        total_bruto: Math.max(0, Number(presExistente.total_bruto) - precio)
      }).eq("id", presExistente.id);

      // Buscar si el item está en el detalle
      const { data: det } = await supabase.from("detalle_presupuesto")
        .select("id, cantidad, precio_unitario, subtotal")
        .eq("presupuesto_id", presExistente.id)
        .eq("catalogo_tratamiento_id", tratData.catalogo_tratamiento_id)
        .limit(1)
        .single();
      
      if (det) {
        if (det.cantidad > 1) {
          await supabase.from("detalle_presupuesto").update({
            cantidad: det.cantidad - 1,
            subtotal: Number(det.subtotal) - Number(det.precio_unitario)
          }).eq("id", det.id);
        } else {
          await supabase.from("detalle_presupuesto").delete().eq("id", det.id);
        }
      }
    }
  }
  
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

// ── Plan de trabajo ──────────────────────────────────────────────────────────

export async function savePlanTrabajoAction(data: {
  tratamiento_id: string; etapa: string; descripcion: string; tiempo_pronostico: string; estado: string; paciente_id: string;
}) {
  const supabase = await createClient();
  
  const { count } = await supabase
    .from("plan_tratamiento")
    .select("id", { count: "exact", head: true })
    .eq("tratamiento_id", data.tratamiento_id);

  const { data: newRow, error } = await supabase.from("plan_tratamiento").insert({
    tratamiento_id: data.tratamiento_id,
    fase: data.etapa,
    orden: (count ?? 0) + 1,
    descripcion: data.descripcion,
    tiempo_estimado: data.tiempo_pronostico,
    estado: data.estado,
  }).select("id").single();

  if (error || !newRow) {
    console.error("savePlanTrabajoAction error:", error);
    return { error: "No se pudo guardar la fase del plan de tratamiento" };
  }
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true, id: newRow.id };
}

export async function editPlanTrabajoAction(data: {
  id: string; etapa: string; descripcion: string; tiempo_pronostico: string; estado: string; paciente_id: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("plan_tratamiento").update({
    fase: data.etapa,
    descripcion: data.descripcion,
    tiempo_estimado: data.tiempo_pronostico,
    estado: data.estado,
  }).eq("id", data.id);

  if (error) return { error: "No se pudo actualizar la fase" };
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function deletePlanTrabajoAction(id: string, pacienteId: string) {
  const supabase = await createClient();
  
  // Desvincular archivos clínicos
  await supabase.from("archivos_clinicos").update({ plan_tratamiento_id: null }).eq("plan_tratamiento_id", id);
  
  // Eliminar avances
  await supabase.from("procedimiento_efectuado").delete().eq("plan_tratamiento_id", id);
  
  // Eliminar fase
  const { error } = await supabase.from("plan_tratamiento").delete().eq("id", id);
  if (error) {
    console.error("deletePlanTrabajoAction error:", error);
    return { error: "No se pudo eliminar la fase" };
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

export async function saveAvanceAction(data: { plan_tratamiento_id: string; consulta_id: string; notas: string; paciente_id: string }) {
  const supabase = await createClient();
  const { data: newRow, error } = await supabase.from("procedimiento_efectuado").insert({
    plan_tratamiento_id: data.plan_tratamiento_id,
    consulta_id: data.consulta_id,
    notas: data.notas,
  }).select("id, fecha").single();

  if (error || !newRow) {
    console.error("saveAvanceAction error:", error);
    return { error: "No se pudo guardar el avance" };
  }
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true, id: newRow.id, fecha: newRow.fecha };
}

// ── Receta ────────────────────────────────────────────────────────────────────

export async function getRecetasAction(diagnosticoId: string) {
  noStore();
  const supabase = await createClient();
  const { data } = await supabase
    .from("recetas")
    .select(`id, fecha_emision, estado, receta_medicamento(id, medicamento_nombre, medicamento_id, dosis, frecuencia, indicaciones)`)
    .eq("diagnostico_id", diagnosticoId)
    .order("fecha_emision", { ascending: false });
  return data || [];
}

export async function saveRecetaAction(data: {
  diagnostico_id: string; paciente_id: string;
  medicamentos: Array<{ medicamento_id?: number | null; medicamento_nombre: string; dosis: string; frecuencia: string; indicaciones: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };
  const { data: personal } = await supabase.from("personal").select("usuario_id").eq("usuario_id", user.id).single();
  if (!personal) return { error: "Perfil no encontrado" };

  const { data: receta, error: rErr } = await supabase
    .from("recetas")
    .insert({ diagnostico_id: data.diagnostico_id, doctor_id: user.id })
    .select("id").single();
  if (rErr) return { error: "No se pudo crear la receta" };

  if (data.medicamentos.length > 0) {
    await supabase.from("receta_medicamento").insert(data.medicamentos.map((m) => ({ receta_id: receta.id, ...m })));
  }
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function toggleEstadoRecetaAction(id: string, estado: string, pacienteId: string) {
  const supabase = await createClient();
  await supabase.from("recetas").update({ estado }).eq("id", id);
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

export async function deleteRecetaAction(id: string, pacienteId: string) {
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

export async function deleteMedicamentoAction(id: string, pacienteId: string) {
  const supabase = await createClient();
  await supabase.from("receta_medicamento").delete().eq("id", id);
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

// ── Recomendaciones ───────────────────────────────────────────────────────────

export async function getRecomendacionesConsultaAction(consultaId: string) {
  noStore();
  const supabase = await createClient();
  const { data } = await supabase
    .from("recomendacion")
    .select("id, contenido, created_at")
    .eq("consulta_id", consultaId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function saveRecomendacionAction(data: { consulta_id: string; contenido: string; paciente_id: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("recomendacion").insert({ consulta_id: data.consulta_id, contenido: data.contenido });
  if (error) return { error: "No se pudo guardar la recomendación" };
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function editRecomendacionAction(data: { id: string; contenido: string; paciente_id: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("recomendacion").update({ contenido: data.contenido }).eq("id", data.id);
  if (error) return { error: "No se pudo actualizar la recomendación" };
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function deleteRecomendacionAction(id: string, pacienteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recomendacion").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar la recomendación" };
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

// ── Presupuesto + Pagos ──────────────────────────────────────────────────────

// TEMPORAL: aún no hay filas cargadas en `medio_pago` en BD — mientras tanto
// se ofrecen estas opciones de ejemplo para poder seguir probando el flujo
// de "Registrar pago". OJO: como no son filas reales, si se elige una de
// estas y se confirma un pago contra un presupuesto REAL, el insert en
// `pagos.medio_pago_id` va a fallar por la FK (no existe ese id en
// `medio_pago`) — se resuelve solo insertando medios de pago reales en Supabase.
const MEDIOS_PAGO_MOCK = [
  { id: -1, nombre: "Tarjeta" },
  { id: -2, nombre: "Efectivo" },
  { id: -3, nombre: "Yape" },
];

export async function getMediosPagoAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("medio_pago").select("id, nombre").order("id");
  if (error) console.error("[getMediosPagoAction] Error obteniendo medios de pago:", error);
  if (!data || data.length === 0) {
    console.log("[getMediosPagoAction] Tabla medio_pago sin filas → usando opciones de ejemplo (Tarjeta/Efectivo/Yape)");
    return MEDIOS_PAGO_MOCK;
  }
  return data;
}

export async function getPresupuestosNotaClinicaAction(notaClinicaId: string) {
  noStore();
  const supabase = await createClient();
  if (!notaClinicaId) return [];

  const { data: presupuestos, error } = await supabase
    .from("presupuestos")
    .select(`
      id, fecha_emision, total_bruto, descuento_porcentaje, descuento_monto, estado, fecha_aprobacion, notas, diagnostico_id,
      diagnostico!inner ( diagnostico ),
      usuarios!doctor_id ( personal ( nombre, apellido ) ),
      detalle_presupuesto ( id, catalogo_tratamiento_id, cantidad, precio_unitario, subtotal, catalogo_tratamientos ( id, nombre, descripcion, moneda ) ),
      movimiento_caja ( id, monto, fecha, medio_pago_id, referencia, estado, observacion, medio_pago ( id, nombre ) )
    `)
    .eq("nota_clinica_id", notaClinicaId)
    .order("fecha_emision", { ascending: false });

  if (error) {
    console.error("Error getPresupuestosNotaClinicaAction:", error);
    return [];
  }

  return (presupuestos || []).map((presupuesto: any) => {
    const doctor = (presupuesto.usuarios as any)?.personal;
    return {
      id: presupuesto.id,
      diagnostico_id: presupuesto.diagnostico_id,
      diagnostico_nombre: presupuesto.diagnostico?.diagnostico || "Diagnóstico",
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
      pagos: (presupuesto.movimiento_caja || []).map((p: any) => ({
        id: p.id, monto: Number(p.monto), fecha_pago: p.fecha, medio_pago_id: p.medio_pago_id,
        medio_pago_nombre: p.medio_pago?.nombre ?? "—", referencia: p.referencia, estado: p.estado, observaciones: p.observacion,
      })),
    };
  });
}

/** Presupuesto más reciente del paciente (no está scoped por consulta — el esquema no lo permite). */
export async function getPresupuestoActivoAction(pacienteId: string) {
  noStore();
  const supabase = await createClient();
  if (!pacienteId) return null;

  const { data: presupuesto, error } = await supabase
    .from("presupuestos")
    .select(`
      id, fecha_emision, total_bruto, descuento_porcentaje, descuento_monto, estado, fecha_aprobacion, notas,
      usuarios!doctor_id ( personal ( nombre, apellido, url_firma_digital, num_colegiatura, especialidad ( especialidad ) ) ),
      detalle_presupuesto ( id, catalogo_tratamiento_id, cantidad, precio_unitario, subtotal, catalogo_tratamientos ( id, nombre, descripcion, moneda ) ),
      movimiento_caja ( id, monto, fecha, medio_pago_id, referencia, estado, observacion, medio_pago ( id, nombre ) )
    `)
    .eq("paciente_id", pacienteId)
    .order("fecha_emision", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error getPresupuestoActivoAction:", error);
  }

  if (!presupuesto) return null;

  const doctor = (presupuesto.usuarios as any)?.personal;
  const doctorEspecialidad = Array.isArray(doctor?.especialidad) ? doctor.especialidad[0] : doctor?.especialidad;

  return {
    id: presupuesto.id,
    fecha_emision: presupuesto.fecha_emision,
    doctor_nombre: doctor ? `${doctor.nombre} ${doctor.apellido}` : null,
    doctor_especialidad: doctorEspecialidad?.especialidad ?? null,
    doctor_num_colegiatura: doctor?.num_colegiatura ?? null,
    doctor_firma_url: doctor?.url_firma_digital ?? null,
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
    pagos: (presupuesto.movimiento_caja || []).map((p: any) => ({
      id: p.id, monto: Number(p.monto), fecha_pago: p.fecha, medio_pago_id: p.medio_pago_id,
      medio_pago_nombre: p.medio_pago?.nombre ?? "—", referencia: p.referencia, estado: p.estado, observaciones: p.observacion,
    })),
  };
}

/**
 * Todos los presupuestos del paciente con su detalle completo (ítems y pagos) —
 * el mismo shape que getPresupuestoActivoAction pero para el historial completo,
 * no solo el más reciente.
 */
export async function getPresupuestosPacienteAction(pacienteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("presupuestos")
    .select(`
      id, fecha_emision, total_bruto, descuento_porcentaje, descuento_monto, estado, fecha_aprobacion, notas,
      usuarios!doctor_id ( personal ( nombre, apellido, url_firma_digital, num_colegiatura, especialidad ( especialidad ) ) ),
      detalle_presupuesto ( id, catalogo_tratamiento_id, cantidad, precio_unitario, subtotal, catalogo_tratamientos ( id, nombre, descripcion, moneda ) ),
      movimiento_caja ( id, monto, fecha, medio_pago_id, referencia, estado, observacion, medio_pago ( id, nombre ) )
    `)
    .eq("paciente_id", pacienteId)
    .order("fecha_emision", { ascending: false });

  if (error) {
    console.error("Error getPresupuestosPacienteAction:", error);
  }

  return (data || []).map((presupuesto: any) => {
    const doctor = (presupuesto.usuarios as any)?.personal;
    const doctorEspecialidad = Array.isArray(doctor?.especialidad) ? doctor.especialidad[0] : doctor?.especialidad;
    return {
      id: presupuesto.id,
      fecha_emision: presupuesto.fecha_emision,
      doctor_nombre: doctor ? `${doctor.nombre} ${doctor.apellido}` : null,
      doctor_especialidad: doctorEspecialidad?.especialidad ?? null,
      doctor_num_colegiatura: doctor?.num_colegiatura ?? null,
      doctor_firma_url: doctor?.url_firma_digital ?? null,
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
      pagos: (presupuesto.movimiento_caja || []).map((p: any) => ({
        id: p.id, monto: Number(p.monto), fecha_pago: p.fecha, medio_pago_id: p.medio_pago_id,
        medio_pago_nombre: p.medio_pago?.nombre ?? "—", referencia: p.referencia, estado: p.estado, observaciones: p.observacion,
      })),
    };
  });
}

export async function crearPresupuestoAction(data: {
  paciente_id: string; consulta_id: string;
  items: { catalogo_id: string; cantidad: number; precio_unitario: number }[];
  descuento_porcentaje: number; notas?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };
  const { data: personal } = await supabase.from("personal").select("usuario_id").eq("usuario_id", user.id).single();
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
      doctor_id: user.id,
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

export async function editPresupuestoAction(data: {
  presupuesto_id: string; paciente_id: string;
  items: { catalogo_id: string; cantidad: number; precio_unitario: number }[];
  descuento_porcentaje: number; notas?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };
  
  if (data.items.length === 0) return { error: "Agrega al menos un ítem al presupuesto" };

  const { data: presInfo } = await supabase.from("presupuestos").select("diagnostico_id, nota_clinica_id").eq("id", data.presupuesto_id).single();
  if (!presInfo || !presInfo.diagnostico_id) return { error: "El presupuesto no tiene un diagnóstico válido" };

  const { data: oldDetails } = await supabase.from("detalle_presupuesto").select("catalogo_tratamiento_id, cantidad").eq("presupuesto_id", data.presupuesto_id);

  const total_bruto = data.items.reduce((acc, it) => acc + it.cantidad * it.precio_unitario, 0);
  const descuento_monto = (total_bruto * (data.descuento_porcentaje || 0)) / 100;

  // Actualizar cabecera
  const { error: pErr } = await supabase
    .from("presupuestos")
    .update({
      total_bruto,
      descuento_porcentaje: data.descuento_porcentaje || 0,
      descuento_monto,
      notas: data.notas || null,
    })
    .eq("id", data.presupuesto_id);

  if (pErr) {
    console.error("editPresupuestoAction error:", pErr);
    return { error: "No se pudo actualizar el presupuesto" };
  }

  // Eliminar detalles anteriores
  await supabase.from("detalle_presupuesto").delete().eq("presupuesto_id", data.presupuesto_id);

  // Insertar nuevos detalles
  const detalles = data.items.map((it) => ({
    presupuesto_id: data.presupuesto_id,
    catalogo_tratamiento_id: Number(it.catalogo_id),
    cantidad: it.cantidad,
    precio_unitario: it.precio_unitario,
    subtotal: it.cantidad * it.precio_unitario,
  }));

  const { error: dErr } = await supabase.from("detalle_presupuesto").insert(detalles);
  if (dErr) {
    console.error("editPresupuestoAction detalle error:", dErr);
    return { error: "No se pudieron actualizar los ítems del presupuesto" };
  }

  // ==== SINCRONIZACIÓN CON TRATAMIENTOS ====
  const oldMap = new Map<number, number>();
  (oldDetails || []).forEach(d => oldMap.set(d.catalogo_tratamiento_id, d.cantidad));

  const newMap = new Map<number, number>();
  data.items.forEach(i => newMap.set(Number(i.catalogo_id), i.cantidad));

  const toAdd: { catId: number, count: number }[] = [];
  const toRemove: { catId: number, count: number }[] = [];

  newMap.forEach((count, catId) => {
    const oldCount = oldMap.get(catId) || 0;
    if (count > oldCount) toAdd.push({ catId, count: count - oldCount });
  });

  oldMap.forEach((oldCount, catId) => {
    const newCount = newMap.get(catId) || 0;
    if (oldCount > newCount) toRemove.push({ catId, count: oldCount - newCount });
  });

  // Agregar nuevos tratamientos
  for (const item of toAdd) {
    for (let i = 0; i < item.count; i++) {
      const { data: trat } = await supabase.from("tratamiento").insert({
        diagnostico_id: presInfo.diagnostico_id,
        nota_clinica_id: presInfo.nota_clinica_id,
        tratamiento: "Tratamiento desde Presupuesto",
        catalogo_tratamiento_id: item.catId
      }).select("id").single();

      if (trat) {
        await supabase.from("plan_tratamiento").insert({
          tratamiento_id: trat.id,
          fase: "Planeado",
          orden: 1,
          estado: "pendiente"
        });
      }
    }
  }

  // Quitar tratamientos eliminados
  for (const item of toRemove) {
    const { data: tratsToRemove } = await supabase.from("tratamiento")
      .select("id")
      .eq("diagnostico_id", presInfo.diagnostico_id)
      .eq("catalogo_tratamiento_id", item.catId)
      .limit(item.count);
    
    if (tratsToRemove && tratsToRemove.length > 0) {
      for (const t of tratsToRemove) {
        await supabase.from("citas").update({ tratamiento_id: null }).eq("tratamiento_id", t.id);
        const { data: fases } = await supabase.from("plan_tratamiento").select("id").eq("tratamiento_id", t.id);
        if (fases && fases.length > 0) {
           const faseIds = fases.map(f => f.id);
           await supabase.from("archivos_clinicos").update({ plan_tratamiento_id: null }).in("plan_tratamiento_id", faseIds);
           await supabase.from("procedimiento_efectuado").delete().in("plan_tratamiento_id", faseIds);
           await supabase.from("plan_tratamiento").delete().in("id", faseIds);
        }
        await supabase.from("tratamiento").delete().eq("id", t.id);
      }
    }
  }

  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}


export async function updateEstadoPresupuestoAction(data: { presupuesto_id: string; estado: string; paciente_id: string }) {
  const supabase = await createClient();
  const patch: any = { estado: data.estado };
  if (data.estado === "aprobado") patch.fecha_aprobacion = new Date().toISOString();
  const { error } = await supabase.from("presupuestos").update(patch).eq("id", data.presupuesto_id);
  if (error) return { error: "No se pudo actualizar el estado del presupuesto" };
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function deletePresupuestoAction(presupuestoId: string, pacienteId: string) {
  const supabase = await createClient();
  await supabase.from("movimiento_caja").delete().eq("presupuesto_id", presupuestoId);
  await supabase.from("detalle_presupuesto").delete().eq("presupuesto_id", presupuestoId);
  await supabase.from("presupuestos").delete().eq("id", presupuestoId);
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

export async function registrarPagoAction(data: {
  presupuesto_id: string; monto: number; medio_pago_id: string | null; referencia?: string; observaciones?: string; paciente_id: string;
}) {
  const supabase = await createClient();
  if (!data.monto || data.monto <= 0) return { error: "El monto debe ser mayor a 0" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: usr } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (!usr?.sede_id) return { error: "No se pudo resolver la sede del usuario" };

  const tipoMonedaId = await resolveTipoMonedaId(supabase, "PEN");
  if (!tipoMonedaId) return { error: "No se pudo resolver el tipo de moneda" };

  const cajaTurnoId = await resolveCajaTurnoAbierto(supabase, user.id, usr.sede_id);
  if (!cajaTurnoId) return { error: "No se pudo abrir un turno de caja" };

  const { error } = await supabase.from("movimiento_caja").insert({
    caja_turno_id: cajaTurnoId,
    presupuesto_id: data.presupuesto_id,
    monto: data.monto,
    medio_pago_id: data.medio_pago_id,
    tipo_moneda_id: tipoMonedaId,
    referencia: data.referencia || null,
    observacion: data.observaciones || null,
    usuario_id: user.id,
    estado: "confirmado",
  });

  if (error) {
    console.error("registrarPagoAction error:", error);
    return { error: "No se pudo registrar el pago" };
  }
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function anularPagoAction(pagoId: string, pacienteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("movimiento_caja").update({ estado: "anulado" }).eq("id", pagoId);
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
      let tipo_str = "desconocido";
      if (a.tipo_archivo && typeof a.tipo_archivo === "object") tipo_str = a.tipo_archivo.tipo_archivo || a.tipo_archivo.Tipo_archivo;
      else if (typeof a.tipo_archivo === "string") tipo_str = a.tipo_archivo;

      if (a.url && !a.url.startsWith("http")) {
        try {
          const { data, error } = await supabase.storage
            .from("archivos_clinicos")
            .createSignedUrl(a.url, 60 * 60);
          
          if (error || !data) throw new Error(error?.message || "No se pudo firmar la URL con Supabase");
          
          return { ...a, tipo_archivo: tipo_str, displayUrl: data.signedUrl };
        } catch (e) {
          // Fallback a R2 si no existe en Supabase
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: a.url,
            });
            const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 60 * 60 });
            return { ...a, tipo_archivo: tipo_str, displayUrl: signedUrl };
          } catch (r2Error) {
            console.error("Error signing URL with R2 as fallback:", r2Error);
            return { ...a, tipo_archivo: tipo_str, displayUrl: a.url };
          }
        }
      }
      return { ...a, tipo_archivo: tipo_str, displayUrl: a.url };
    }),
  );
}

export async function getArchivosPacienteAction(pacienteId: string) {
  const supabase = await createClient();

  const consultaIds = await resolveConsultaIdsParaPaciente(supabase, pacienteId);
  if (consultaIds.length === 0) return [];

  const { data: archivos, error } = await supabase
    .from("archivos_clinicos")
    .select(`id, nombre_archivo, url, tipo_archivo_id, categoria, descripcion, fecha_subida, tam_bytes, anotaciones, tipo_archivo (id, tipo_archivo),
      usuarios!subido_por ( personal ( nombre, apellido, url_firma_digital, especialidad ( especialidad ) ) )`)
    .in("consulta_id", consultaIds)
    .order("fecha_subida", { ascending: false });

  if (error || !archivos) {
    console.error("Error getArchivosPacienteAction:", error);
    return [];
  }

  const mapeados = archivos.map(a => ({
    ...a,
    personal: (a.usuarios as any)?.personal || null
  }));

  return firmarUrls(supabase, mapeados);
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

  const { data: personal } = await supabase.from("personal").select("usuario_id").eq("usuario_id", user.id).single();
  if (!personal) return { error: "Perfil no encontrado" };

  const consulta_id = formData.get("consulta_id") as string;
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
    subido_por: user.id,
    fecha_subida: new Date().toISOString(),
  });

  if (insertError) {
    console.error("Error insertando archivo:", insertError);
    return { error: "No se pudo registrar el archivo" };
  }

  if (paciente_id) revalidatePath(`/pacientes/${paciente_id}`);
  return { success: true };
}

/** Obtiene el detalle completo de una consulta para el Timeline */
export async function getConsultaDetalleTimelineAction(consultaId: string) {
  const supabase = await createClient();

  // 1. Obtener datos básicos de la consulta
  const { data: consulta, error } = await supabase
    .from("consultas")
    .select(`
      id, fecha_consulta, motivo, observaciones, examen_fisico, cita_id, nota_clinica_id, tipo_consulta_id,
      usuarios ( personal ( nombre, apellido ) )
    `)
    .eq("id", consultaId)
    .single();

  if (error || !consulta) {
    console.error("Error fetching consulta detalle", error);
    return null;
  }

  // 2. Obtener diagnósticos con CIE10 y archivos asociados a la consulta
  const { data: diagnosticosRaw, error: diagError } = await supabase
    .from("diagnostico")
    .select(`
      id, diagnostico, "esTratado", es_definitivo, fecha_deteccion,
      cie10(id, codigo, descripcion),
      archivos_clinicos ( id, nombre_archivo, url, tipo_archivo_id, categoria, fecha_subida, tam_bytes, anotaciones )
    `)
    .eq("consulta_origen_id", consultaId)
    .order("fecha_deteccion", { ascending: false });
  if (diagError) console.error("Error en diagnosticos:", diagError);

  // 3. Obtener recetas de todos los diagnósticos de esta consulta
  let recetasAll: any[] = [];
  let tratamientosAll: any[] = [];
  if (diagnosticosRaw && diagnosticosRaw.length > 0) {
    const dIds = diagnosticosRaw.map(d => d.id);
    
    const { data: recRaw, error: recError } = await supabase
      .from("recetas")
      .select(`id, diagnostico_id, fecha_emision, estado, receta_medicamento ( id, medicamento_nombre, medicamento_id, dosis, frecuencia, indicaciones )`)
      .in("diagnostico_id", dIds);
    if (recError) console.error("Error en recetas:", recError);
    if (recRaw) recetasAll = recRaw;

    const { data: tratRaw, error: tratError } = await supabase
      .from("tratamiento")
      .select(`
        id, diagnostico_id, tratamiento, created_at,
        catalogo_tratamientos ( nombre, precio, moneda ),
        plan_tratamiento ( id, fase, orden, descripcion, estado, tiempo_estimado )
      `)
      .in("diagnostico_id", dIds)
      .order("created_at", { ascending: false });
    if (tratError) console.error("Error en tratamientos:", tratError);
    if (tratRaw) tratamientosAll = tratRaw;
  }

  const diagnosticos = diagnosticosRaw ? await Promise.all(
    diagnosticosRaw.map(async (d: any) => {
      const archivosFirmados = await firmarUrls(supabase, d.archivos_clinicos || []);
      const recetas = recetasAll.filter(r => r.diagnostico_id === d.id).map(r => ({
        ...r, 
        medicamentos: (r.receta_medicamento || []).map((m: any) => ({
          ...m,
          nombre: m.medicamento_nombre
        }))
      }));
      const tratamientosRaw = tratamientosAll.filter(t => t.diagnostico_id === d.id);
      
      const tratamientos = tratamientosRaw.map(t => ({
        id: t.id,
        nombre: t.catalogo_tratamientos?.nombre || "Tratamiento sin nombre",
        descripcion: t.tratamiento,
        precio: t.catalogo_tratamientos?.precio,
        moneda: t.catalogo_tratamientos?.moneda,
        fecha: t.created_at,
        plan: (t.plan_tratamiento || []).map((p: any) => ({
          ...p,
          etapa: p.fase || p.descripcion || `Etapa ${p.orden}`,
          tiempo: p.tiempo_estimado
        }))
      }));

      return {
        id: d.id,
        texto: d.diagnostico,
        es_tratado: d.esTratado,
        es_definitivo: d.es_definitivo,
        fecha_deteccion: d.fecha_deteccion,
        cie10: d.cie10,
        archivos: archivosFirmados,
        recetas,
        tratamientos
      };
    })
  ) : [];

  // 4. Obtener Odontograma, Recomendaciones y Presupuestos
  const { data: odontogramasRaw, error: odonError } = await supabase
    .from("odontograma")
    .select("id, tipo_tratamiento, created_at, odontograma_diente ( id, diente, condicion_id, superficie, descripcion )")
    .eq("consulta_id", consultaId);
  if (odonError) console.error("Error en odontograma:", odonError);

  const { data: recomendacionesRaw, error: recError } = await supabase
    .from("recomendacion")
    .select("id, contenido")
    .eq("consulta_id", consultaId)
    .order("created_at", { ascending: false });
  if (recError) console.error("Error en recomendacion:", recError);

  const { data: presupuestosRaw } = await supabase
    .from("presupuestos")
    .select(`id, total_bruto, descuento_monto, total_neto, estado, fecha_emision`)
    .eq("nota_clinica_id", consulta.nota_clinica_id)
    .order("created_at", { ascending: false });

  const doctorName = (consulta.usuarios as any)?.personal ? `${((consulta.usuarios as any).personal as any).nombre} ${((consulta.usuarios as any).personal as any).apellido}`.trim() : "Doctor";

  const { data: archivosConsultaRaw } = await supabase
    .from("archivos_clinicos")
    .select("id, nombre_archivo, url, tipo_archivo_id, categoria, fecha_subida, tam_bytes, anotaciones")
    .eq("consulta_id", consultaId);
  const archivosConsulta = await firmarUrls(supabase, archivosConsultaRaw || []);
  const archivosDiag = diagnosticos.flatMap((d: any) => d.archivos || []);
  
  // Filtrar duplicados por ID
  const allArchivosMap = new Map();
  [...archivosConsulta, ...archivosDiag].forEach(a => {
    if (a && a.id) allArchivosMap.set(a.id, a);
  });
  const archivosUnicos = Array.from(allArchivosMap.values());

  return {
    id: consulta.id,
    fecha: consulta.fecha_consulta,
    motivo: consulta.motivo,
    observaciones: consulta.observaciones,
    examen: Array.isArray(consulta.examen_fisico) 
      ? consulta.examen_fisico 
      : Object.entries((consulta.examen_fisico || {})).map(([k, v]) => ({ clave: k, valor: v })),
    doctor: doctorName,
    nota_clinica_id: consulta.nota_clinica_id,
    cita_id: consulta.cita_id ?? null,
    motivo_id: consulta.tipo_consulta_id,
    diagnosticos,
    odontogramas: odontogramasRaw || [],
    recomendaciones: recomendacionesRaw || [],
    presupuestos: presupuestosRaw || [],
    archivos: archivosUnicos,
  };
}
