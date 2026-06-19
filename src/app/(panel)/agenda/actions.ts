"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function searchPatients(query: string) {
  const supabase = await createClient();
  
  if (!query || query.trim().length < 2) return [];

  const isDni = /^\d+$/.test(query.trim());

  let req = supabase
    .from("pacientes")
    .select("id, nombre, apellido, dni, activo")
    .eq("activo", true);

  if (isDni) {
    req = req.eq("dni", query.trim());
  } else {
    // Search in nombre or apellido using ilike for case-insensitive partial match
    req = req.or(`nombre.ilike.%${query.trim()}%,apellido.ilike.%${query.trim()}%`);
  }

  const { data, error } = await req.limit(10);
  if (error) {
    console.error("Error buscando pacientes:", error);
    return [];
  }
  return data || [];
}

export async function createCitaAction(data: {
  paciente_id: number;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string; // HH:MM
  hora_fin: string; // HH:MM
  tipo_consulta: string;
  estado: string;
  notas: string;
}, force: boolean = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado" };
  }

  // Obtener el ID del doctor basado en el usuario logueado
  const { data: personal, error: pError } = await supabase
    .from("personal")
    .select("id")
    .eq("usuario_id", user.id)
    .single();
  console.log(user.id)
  if (pError || !personal) {
    return { error: "No se encontró el perfil de médico asociado a este usuario." };
  }

  const doctor_id = personal.id;

  // Validación de horario (a menos que el doctor haya forzado la excepción)
  if (!force) {
    // Obtener el día de la semana para la base de datos (1=Lunes, 7=Domingo)
    const dateObj = new Date(data.fecha + "T00:00:00");
    let jsDay = dateObj.getDay(); // 0 es Domingo
    let dbDay = jsDay === 0 ? 7 : jsDay;

    const { data: horarios, error: hError } = await supabase
      .from("horarios_medico")
      .select("*")
      .eq("medico_id", doctor_id)
      .eq("dia_semana", dbDay);

    if (hError) {
      return { error: "Error consultando los horarios del médico." };
    }

    if (!horarios || horarios.length === 0) {
      return { 
        error: `No tienes horario de atención registrado para este día. ¿Deseas hacer una excepción y agendar de todas formas?`,
        requiresConfirmation: true 
      };
    }

    // Verificar si la cita está dentro de algún bloque de atención
    // Agregamos ":00" si viene solo como HH:MM
    const requestedStart = data.hora_inicio.length === 5 ? data.hora_inicio + ":00" : data.hora_inicio;
    const requestedEnd = data.hora_fin.length === 5 ? data.hora_fin + ":00" : data.hora_fin;

    const isValid = horarios.some(h => {
      return requestedStart >= h.hora_inicio && requestedEnd <= h.hora_fin;
    });

    if (!isValid) {
      return { 
        error: `La hora ingresada (${data.hora_inicio} - ${data.hora_fin}) se encuentra fuera de tu horario de atención. ¿Deseas guardarla como excepción?`,
        requiresConfirmation: true 
      };
    }
  }

  // Insertar la cita
  const { error: insertError } = await supabase.from("citas").insert({
    paciente_id: data.paciente_id,
    doctor_id,
    fecha: data.fecha,
    hora_inicio: data.hora_inicio,
    hora_fin: data.hora_fin,
    tipo_consulta: data.tipo_consulta,
    estado: data.estado,
    notas: data.notas || null,
  });

  if (insertError) {
    console.error("Error insertando cita:", insertError);
    return { error: "Ocurrió un error inesperado al guardar la cita en la base de datos." };
  }

  revalidatePath("/agenda"); // Refrescar la caché de Next.js
  return { success: true };
}

export async function deleteCitaAction(citaId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("citas").delete().eq("id", citaId);
  if (error) return { error: "Error al eliminar la cita" };
  revalidatePath("/agenda");
  return { success: true };
}

export async function updateCitaAction(citaId: string, data: {
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string;
  tipo_consulta?: string;
  estado?: string;
  notas?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("citas").update(data).eq("id", citaId);
  if (error) return { error: "Error al actualizar la cita" };
  revalidatePath("/agenda");
  return { success: true };
}

export async function getCitasRealesAction() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: personal } = await supabase
    .from("personal")
    .select("id")
    .eq("usuario_id", user.id)
    .single();

  if (!personal) return [];

  const { data: citas, error } = await supabase
    .from("citas")
    .select(`
      id,
      fecha,
      hora_inicio,
      hora_fin,
      tipo_consulta,
      estado,
      notas,
      pacientes (
        id,
        nombre,
        apellido,
        alergias
      ),
      personal (
        nombre,
        apellido
      )
    `)
    .eq("doctor_id", personal.id);

  if (error) {
    console.error("Error fetching citas reales:", error);
    return [];
  }

  return citas.map((c: any) => {
    let alergiasArr: string[] = [];
    if (Array.isArray(c.pacientes?.alergias)) {
      alergiasArr = c.pacientes.alergias;
    } else if (typeof c.pacientes?.alergias === "string") {
      try { alergiasArr = JSON.parse(c.pacientes.alergias); } catch { /* ignore */ }
    }

    return {
      id: String(c.id),
      paciente_id: String(c.pacientes?.id),
      paciente_nombre: `${c.pacientes?.nombre} ${c.pacientes?.apellido}`.trim(),
      alergias: alergiasArr,
      tipo_consulta: c.tipo_consulta || "",
      doctor_nombre: `Dr. ${c.personal?.apellido}`,
      fecha: c.fecha,
      hora_inicio: c.hora_inicio.slice(0, 5),
      hora_fin: c.hora_fin.slice(0, 5),
      estado: c.estado || "programada",
      notas: c.notas ?? undefined,
    };
  });
}
