"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { doctoresMockDeSede } from "./components/doctoresMock";
import type { DoctorLite } from "./components/agendaUtils";

/**
 * Médicos de la sede — TEMPORAL vía datos mock (ver doctoresMock.ts).
 * `usuarios`/`rol` están bloqueados por RLS a la propia fila del usuario
 * logueado y se descartó tocar policies o usar la service_role key, así que
 * hoy no hay forma de enumerar en vivo a los demás usuarios de la sede.
 * Usado SOLO por `getDoctoresSedeAction`/`getCitasSedeAction` (exclusivas
 * del rol asistente) — `getCitasRealesAction`, que usa la vista de doctor,
 * no pasa por aquí.
 */
function fetchDoctoresSede(sedeId: string, excludeUserId: string): DoctorLite[] {
  return doctoresMockDeSede(sedeId, excludeUserId);
}

export async function searchPatients(query: string) {
  const supabase = await createClient();
  
  if (!query || query.trim().length < 2) return [];

  const isDni = /^\d+$/.test(query.trim());

  const { data, error } = await supabase.rpc("buscar_pacientes_sede", { 
    busqueda: query.trim(), 
    es_dni: isDni 
  });
  if (error) {
    console.error("Error buscando pacientes:", error);
    return [];
  }
  return data || [];
}

export async function createPacienteRapidoAction(data: {
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
  telefono: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: usr, error: usrErr } = await supabase
    .from("usuarios")
    .select("sede_id")
    .eq("id", user.id)
    .single();

  if (usrErr || !usr?.sede_id) {
    return { error: "No se pudo determinar la sede del usuario." };
  }

  const { data: newPatient, error } = await supabase.rpc("crear_paciente_rapido", {
    p_nombre: data.nombre,
    p_apellido: data.apellido,
    p_dni: data.dni,
    p_fecha_nacimiento: data.fecha_nacimiento,
    p_telefono: data.telefono,
    p_sede_id: usr.sede_id
  }).single();

  if (error) {
    console.error("Error al crear paciente rápido:", error);
    return { error: "Error al registrar el paciente." };
  }
  
  return { success: true, paciente: newPatient };
}

export async function createCitaAction(data: {
  paciente_id: string;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string; // HH:MM
  hora_fin: string; // HH:MM
  tipo_consulta_id: string;
  estado: string;
  notas: string;
  tratamiento_id?: string;
  doctor_id?: string; // permite al asistente crear la cita para un médico específico
}, force: boolean = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado" };
  }

  // El ID del doctor es directamente el user.id según la nueva BD — salvo que
  // el asistente esté creando la cita en la columna de un médico específico.
  const doctor_id = data.doctor_id || user.id;

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
      // Turno nocturno (cruza medianoche, ej. 20:00–08:00): hora_inicio > hora_fin.
      // La cita es válida si cae completa en el tramo antes de medianoche o en el de madrugada.
      if (h.hora_inicio > h.hora_fin) {
        return requestedStart >= h.hora_inicio || requestedEnd <= h.hora_fin;
      }
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
    tipo_consulta_id: data.tipo_consulta_id,
    estado: data.estado,
    notas: data.notas || null,
    tratamiento_id: data.tratamiento_id || null,
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
  tipo_consulta_id?: string;
  estado?: string;
  notas?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("citas").update(data).eq("id", citaId);
  if (error) return { error: "Error al actualizar la cita" };
  revalidatePath("/agenda");
  return { success: true };
}

const CITA_SELECT = `
  id,
  fecha,
  hora_inicio,
  hora_fin,
  tipo_consulta_id,
  estado,
  notas,
  doctor_id,
  paciente_id,
  pacientes (
    id,
    nombre,
    apellido,
    alergias
  ),
  usuarios (
    personal (
      nombre,
      apellido
    )
  )
`;

function mapCitaRow(c: any) {
  const paciente = Array.isArray(c.pacientes) ? c.pacientes[0] : c.pacientes;

  if (!paciente) {
    console.error(`[mapCitaRow] cita id=${c.id} sin datos de paciente embebidos (paciente_id=${c.paciente_id ?? "?"}) — ¿RLS bloqueando "pacientes" o paciente_id inválido?`);
  }

  let alergiasArr: string[] = [];
  if (Array.isArray(paciente?.alergias)) {
    alergiasArr = paciente.alergias;
  } else if (typeof paciente?.alergias === "string") {
    try { alergiasArr = JSON.parse(paciente.alergias); } catch { /* ignore */ }
  }

  return {
    id: String(c.id),
    paciente_id: String(paciente?.id ?? c.paciente_id ?? ""),
    paciente_nombre: paciente ? `${paciente.nombre ?? ""} ${paciente.apellido ?? ""}`.trim() : "Paciente",
    alergias: alergiasArr,
    tipo_consulta_id: c.tipo_consulta_id || "",
    doctor_id: String(c.doctor_id),
    doctor_nombre: `Dr. ${c.usuarios?.personal?.[0]?.apellido || "Médico"}`,
    fecha: c.fecha,
    hora_inicio: c.hora_inicio.slice(0, 5),
    hora_fin: c.hora_fin.slice(0, 5),
    estado: c.estado || "programada",
    notas: c.notas ?? undefined,
  };
}

export async function getCitasRealesAction() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // El ID del doctor es directamente el user.id
  const doctor_id = user.id;

  const { data: citas, error } = await supabase
    .from("citas")
    .select(CITA_SELECT)
    .eq("doctor_id", doctor_id);

  if (error) {
    console.error("Error fetching citas reales:", error);
    return [];
  }

  return citas.map(mapCitaRow);
}

/** Lista de médicos de la sede del asistente logueado — para el calendario
 * multi-doctor. Ver `fetchDoctoresSede` para la limitación conocida. */
export async function getDoctoresSedeAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { console.error("[getDoctoresSedeAction] Sin usuario autenticado"); return []; }

  const { data: usr, error: usrError } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (usrError || !usr?.sede_id) {
    console.error(`[getDoctoresSedeAction] No se pudo resolver sede_id para usuario_id=${user.id}:`, usrError);
    return [];
  }

  return fetchDoctoresSede(usr.sede_id, user.id);
}

/** Citas de TODOS los médicos de la sede del asistente logueado (no solo las
 * del usuario actual) — usado por el calendario multi-doctor. */
export async function getCitasSedeAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { console.error("[getCitasSedeAction] Sin usuario autenticado"); return []; }

  const { data: usr, error: usrError } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (usrError || !usr?.sede_id) {
    console.error(`[getCitasSedeAction] No se pudo resolver sede_id para usuario_id=${user.id}:`, usrError);
    return [];
  }

  const doctores = fetchDoctoresSede(usr.sede_id, user.id);
  if (doctores.length === 0) return [];
  const doctorIds = doctores.map((d) => d.id);

  const { data: citas, error } = await supabase
    .from("citas")
    .select(CITA_SELECT)
    .in("doctor_id", doctorIds);

  if (error) {
    console.error("[getCitasSedeAction] Error fetching citas de la sede:", error);
    return [];
  }

  // El nombre embebido citas→usuarios→personal viene vía el cliente normal
  // (sujeto a RLS) y puede salir vacío para médicos que no son el usuario
  // logueado — se sobreescribe con el nombre real ya resuelto arriba vía
  // la lista mock.
  const nombreById = new Map(doctores.map((d) => [d.id, `Dr. ${d.apellido}`]));
  return citas.map(mapCitaRow).map((c) => ({ ...c, doctor_nombre: nombreById.get(c.doctor_id) ?? c.doctor_nombre }));
}

export async function getPatientByIdAction(pacienteId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pacientes")
    .select("id, nombre, apellido, dni")
    .eq("id", pacienteId)
    .single();
  if (!data) return null;
  return { id: String(data.id), nombre: data.nombre, apellido: data.apellido, dni: data.dni };
}
