"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getDetallePacienteAction(pacienteId: string) {
  const supabase = await createClient();

  // 1. Obtener paciente
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", pacienteId)
    .single();

  if (!paciente) return null;

  // 2. Obtener citas
  const { data: citas } = await supabase
    .from("citas")
    .select(`
      id,
      fecha,
      hora_inicio,
      tipo_consulta,
      estado,
      personal ( nombre, apellido )
    `)
    .eq("paciente_id", pacienteId)
    .order("fecha", { ascending: false });

  // 3. Obtener consultas (notas clínicas)
  const { data: consultas } = await supabase
    .from("consultas")
    .select(`
      id,
      fecha_consulta,
      motivo,
      observaciones,
      examen_fisico,
      personal ( nombre, apellido ),
      historia_clinica!inner ( paciente_id )
    `)
    .eq("historia_clinica.paciente_id", pacienteId)
    .order("fecha_consulta", { ascending: false });

  // Procesar para la vista
  // Alergias
  let alergiasArr: string[] = [];
  if (Array.isArray(paciente.alergias)) alergiasArr = paciente.alergias;
  else if (typeof paciente.alergias === "string") {
    try { alergiasArr = JSON.parse(paciente.alergias); } catch {}
  }
  // Antecedentes
  let antArr: string[] = [];
  if (Array.isArray(paciente.antecedentes)) antArr = paciente.antecedentes;
  else if (typeof paciente.antecedentes === "string") {
    try { antArr = JSON.parse(paciente.antecedentes); } catch {}
  }

  // Parsear jsonb de examen_fisico donde metemos tratamiento y medicacion del mock
  const notasMap = (consultas || []).map((c: any) => {
    let tr = undefined;
    let med = undefined;
    let type = "consulta";
    if (c.examen_fisico) {
      tr = c.examen_fisico.tratamiento;
      med = c.examen_fisico.medicacion;
      type = c.examen_fisico.tipo || "consulta";
    }
    const drName = c.personal ? `${c.personal.nombre} ${c.personal.apellido}`.trim() : "Doctor";
    return {
      id: String(c.id),
      fecha: c.fecha_consulta || "",
      doctor_nombre: drName,
      motivo: c.motivo || "",
      tipo: type, // Guardado en el jsonb en createNotaClinicaAction
      observaciones: c.observaciones || undefined,
      tratamiento: tr,
      medicacion: med
    };
  });

  const citasMap = (citas || []).map((c: any) => {
    const drName = c.personal ? `${c.personal.nombre} ${c.personal.apellido}`.trim() : "Doctor";
    return {
      id: String(c.id),
      fecha: c.fecha,
      hora: c.hora_inicio,
      servicio: c.tipo_consulta || "Consulta general",
      estado: c.estado,
      medico: drName
    };
  });

  const pFinal = {
    id: String(paciente.id),
    nombre: `${paciente.nombre} ${paciente.apellido}`.trim(),
    dni: paciente.dni,
    fecha_nacimiento: paciente.fecha_nacimiento,
    telefono: paciente.telefono,
    email: paciente.email || undefined,
    grupo_sanguineo: paciente.grupo_sanguineo || undefined,
    alergias: alergiasArr,
    antecedentes: antArr,
    activo: paciente.activo,
    ultima_visita: citasMap.length > 0 ? citasMap[0].fecha : undefined,
    proxima_cita: citasMap.find((c: any) => c.estado === 'programada' || c.estado === 'confirmada')?.fecha
  };

  return {
    paciente: pFinal,
    citas: citasMap,
    notas: notasMap
  };
}

export async function crearNotaClinicaAction(pacienteId: string, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "No autorizado" };

  const { data: personal } = await supabase
    .from("personal")
    .select("id")
    .eq("usuario_id", user.id)
    .single();

  if (!personal) return { error: "Perfil de doctor no encontrado" };

  // 1. Obtener/Crear Historia Clínica
  let { data: hc } = await supabase
    .from("historia_clinica")
    .select("id")
    .eq("paciente_id", pacienteId)
    .maybeSingle();

  if (!hc) {
    // Necesitamos paciente para iniciales y fecha_nacimiento
    const { data: paciente } = await supabase
      .from("pacientes")
      .select("nombre, apellido, fecha_nacimiento")
      .eq("id", pacienteId)
      .single();

    if (!paciente) return { error: "Paciente no encontrado" };

    // Construir base del código: 4 iniciales + YYMMDD
    const full = `${paciente.nombre} ${paciente.apellido}`.trim().split(/\s+/);
    let inits = full.map(w => w[0].toUpperCase()).join("");
    if (inits.length < 4) inits = inits.padEnd(4, "X");
    inits = inits.substring(0, 4);

    const f = paciente.fecha_nacimiento; // YYYY-MM-DD
    const yymmdd = f.substring(2, 4) + f.substring(5, 7) + f.substring(8, 10);
    const prefix = `${inits}${yymmdd}`; // 10 chars

    // Buscar en BD el máximo correlativo
    const { data: existentes } = await supabase
      .from("historia_clinica")
      .select("codigo_historia")
      .like("codigo_historia", `${prefix}%`)
      .order("codigo_historia", { ascending: false })
      .limit(1);

    let num = 0;
    if (existentes && existentes.length > 0) {
      const highest = existentes[0].codigo_historia;
      const parsedNum = parseInt(highest.substring(10), 10);
      if (!isNaN(parsedNum)) {
        num = parsedNum + 1;
      }
    }

    const codigo_historia = `${prefix}${String(num).padStart(3, "0")}`; // 13 chars (4 + 6 + 3)

    // Es uuid, supabase lo auto-genera si usamos uuid_generate_v4(), o insertamos sin id
    // Para postgres UUID, dejamos que Supabase asigne el ID si lo soporta. Pero el schema de BD.md dice:
    // "id" uuid PRIMARY KEY. No dice DEFAULT uuid_generate_v4(). 
    // Así que lo proveeremos por código.
    const newId = crypto.randomUUID();
    const insertRes = await supabase
      .from("historia_clinica")
      .insert({
         id: newId,
         paciente_id: parseInt(pacienteId, 10),
         codigo_historia
      })
      .select("id")
      .single();

    if (insertRes.error) {
       console.error("Error creando historia:", insertRes.error);
       return { error: "No se pudo crear la historia clínica." };
    }
    hc = insertRes.data;
  }

  // 1.5 Buscar Cita del Día
  const hoyStr = new Date().toLocaleDateString("en-CA"); // Formato YYYY-MM-DD
  const { data: citasHoy } = await supabase
    .from("citas")
    .select("id")
    .eq("paciente_id", pacienteId)
    .eq("doctor_id", personal.id)
    .eq("fecha", hoyStr)
    .in("estado", ["programada", "confirmada"])
    .order("hora_inicio", { ascending: true })
    .limit(1);

  const cita_id = citasHoy && citasHoy.length > 0 ? citasHoy[0].id : null;

  // 2. Insertar Consulta
  const { error } = await supabase.from("consultas").insert({
    id_historia_clinica: hc.id,
    doctor_id: personal.id,
    cita_id,
    fecha_consulta: new Date().toISOString(),
    motivo: data.motivo,
    observaciones: data.observaciones || null,
    examen_fisico: data.examen_fisico || {}
  });

  if (error) {
    console.error("Error insertando consulta:", error);
    return { error: "No se pudo guardar la nota." };
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}
