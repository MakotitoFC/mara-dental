"use server";

import { createClient } from "@/lib/supabase/server";
// import { doctoresMockDeSede } from "../agenda/components/doctoresMock";
function doctoresMockDeSede(sedeId: string | number, excludeUserId?: string) {
  return [];
}

export interface CitaAgendada {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  telefono: string | null;
  fecha: string;
  hora_inicio:string;
  hora_fin: string;
  estado: string;
  tipo_consulta_id: string;
}

export interface CumpleañosHoy {
  id: string;
  nombre: string;
  edad: number;
}

export interface DashboardData {
  citas: CitaAgendada[];
  cumpleañosHoy: CumpleañosHoy[];
  statsCitasHoy: number;
  statsCompletas: number;
  statsPendientes: number;
  statsPacientesMes: number;
  recordatoriosPendientes: number;
}

function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento + "T00:00:00");
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

export async function getDashboardDataAction(): Promise<DashboardData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const hoy = new Date();
  const hoyStr = hoy.toISOString().split("T")[0];
  const mesHoy = hoy.getMonth() + 1;
  const diaHoy = hoy.getDate();
  const inicioMesStr = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split("T")[0];

  const [citasRes, pacientesRes, recordatoriosRes, citasMesRes] = await Promise.all([
    supabase
      .from("citas")
      .select(`id, fecha, hora_inicio, hora_fin, tipo_consulta_id, estado, pacientes ( id, nombre, apellido, telefono )`)
      .eq("doctor_id", user.id)
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true }),
    supabase
      .from("pacientes")
      .select("id, nombre, apellido, fecha_nacimiento")
      .eq("activo", true),
    supabase
      .from("recordatorios")
      .select("id, citas!inner(doctor_id)")
      .eq("enviado", false)
      .eq("citas.doctor_id", user.id),
    supabase
      .from("citas")
      .select("paciente_id")
      .eq("doctor_id", user.id)
      .gte("fecha", inicioMesStr)
      .lte("fecha", hoyStr),
  ]);

  const citas: CitaAgendada[] = (citasRes.data || []).map((c: any) => ({
    id: String(c.id),
    paciente_id: String(c.pacientes?.id),
    paciente_nombre: `${c.pacientes?.nombre ?? ""} ${c.pacientes?.apellido ?? ""}`.trim(),
    telefono: c.pacientes?.telefono ?? null,
    fecha: c.fecha,
    tipo_consulta_id: c.tipo_consulta_id || "",
    hora_inicio: (c.hora_inicio || "").slice(0, 5),
    hora_fin: (c.hora_fin || "").slice(0, 5),
    estado: c.estado || "programada",
  }));

  const cumpleañosHoy: CumpleañosHoy[] = (pacientesRes.data || [])
    .filter((p: any) => {
      if (!p.fecha_nacimiento) return false;
      const [, mes, dia] = p.fecha_nacimiento.split("-").map(Number);
      return mes === mesHoy && dia === diaHoy;
    })
    .map((p: any) => ({
      id: String(p.id),
      nombre: `${p.nombre} ${p.apellido}`.trim(),
      edad: calcularEdad(p.fecha_nacimiento),
    }));

  const citasHoy = citas.filter((c) => c.fecha === hoyStr);
  const statsPacientesMes = new Set((citasMesRes.data || []).map((c: any) => String(c.paciente_id))).size;

  return {
    citas,
    cumpleañosHoy,
    statsCitasHoy: citasHoy.length,
    statsCompletas: citasHoy.filter((c) => c.estado === "hecho").length,
    statsPendientes: citasHoy.filter((c) => c.estado === "programada").length,
    statsPacientesMes,
    recordatoriosPendientes: (recordatoriosRes.data || []).length,
  };
}

// ── Dashboard del asistente — resumen operativo de toda la sede ────────────
// A diferencia de getDashboardDataAction (un solo doctor = el usuario
// logueado), este junta las citas de HOY de todos los médicos de la sede
// (lista mock temporal, ver agenda/components/doctoresMock.ts).

function timeToMinLocal(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export interface FlujoPacienteHoy {
  id: string;
  hora_inicio: string;
  hora_fin: string;
  paciente_id: string;
  paciente_nombre: string;
  doctor_id: string;
  doctor_nombre: string;
  tipo_consulta_id: string;
  estado: string;
}

export interface DoctorDisponibilidad {
  id: string;
  nombre: string;
  apellido: string;
  estado: "en_consulta" | "libre" | "ausente";
  detalle: string;
}

export interface AlertaLogistica {
  id: string;
  texto: string;
}

export interface CumpleañosHoyConTelegram extends CumpleañosHoy {
  telegram_chat_id: string | null;
}

export interface DashboardAsistenteData {
  fechaHoy: string;
  citasHoy: FlujoPacienteHoy[];
  statsCitasHoy: number;
  statsProgramadas: number;
  statsCanceladas: number;
  statsHuecosLibres: number;
  disponibilidad: DoctorDisponibilidad[];
  alertas: AlertaLogistica[];
  cumpleañosHoy: CumpleañosHoyConTelegram[];
}

export async function getDashboardAsistenteDataAction(): Promise<DashboardAsistenteData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: usr } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (!usr?.sede_id) return null;

  const ahora = new Date();
  const hoyStr = ahora.toISOString().split("T")[0];
  const horaActual = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
  const jsDay = ahora.getDay();
  const diaSemanaHoy = jsDay === 0 ? 7 : jsDay; // 1=Lunes..7=Domingo, igual que createCitaAction

  const doctores = doctoresMockDeSede(usr.sede_id, user.id);
  const doctorIds = doctores.map((d) => d.id);
  const doctorNombreById = new Map(doctores.map((d) => [d.id, `Dr. ${d.apellido}`]));

  if (doctorIds.length === 0) {
    return {
      fechaHoy: hoyStr, citasHoy: [], statsCitasHoy: 0, statsProgramadas: 0, statsCanceladas: 0,
      statsHuecosLibres: 0, disponibilidad: [], alertas: [], cumpleañosHoy: [],
    };
  }

  const [citasRes, horariosRes, pacientesSedeRes] = await Promise.all([
    supabase
      .from("citas")
      .select("id, hora_inicio, hora_fin, tipo_consulta_id, estado, doctor_id, paciente_id")
      .in("doctor_id", doctorIds)
      .eq("fecha", hoyStr)
      .order("hora_inicio", { ascending: true }),
    supabase
      .from("horarios_medico")
      .select("medico_id, hora_inicio, hora_fin")
      .in("medico_id", doctorIds)
      .eq("dia_semana", diaSemanaHoy),
    supabase
      .from("pacientes")
      .select("id, nombre, apellido, fecha_nacimiento, telegram_chat_id")
      .eq("sede_id", usr.sede_id)
      .eq("activo", true),
  ]);

  const citasRaw = citasRes.data || [];

  // Nombres de paciente por consulta SEPARADA (no embebida en el select de
  // citas) — el embed citas→pacientes falla por RLS para citas de médicos
  // que no son el propio asistente; esta consulta directa a pacientes,
  // igual que ya hace getDashboardDataAction para cumpleañosHoy, sí funciona.
  const pacienteIds = Array.from(new Set(citasRaw.map((c: any) => c.paciente_id).filter(Boolean)));
  const { data: pacientesCitas } = pacienteIds.length > 0
    ? await supabase.from("pacientes").select("id, nombre, apellido").in("id", pacienteIds)
    : { data: [] as any[] };
  const pacienteNombreById = new Map((pacientesCitas || []).map((p: any) => [String(p.id), `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim()]));

  const citasHoy: FlujoPacienteHoy[] = citasRaw.map((c: any) => ({
    id: String(c.id),
    hora_inicio: (c.hora_inicio || "").slice(0, 5),
    hora_fin: (c.hora_fin || "").slice(0, 5),
    paciente_id: String(c.paciente_id ?? ""),
    paciente_nombre: pacienteNombreById.get(String(c.paciente_id)) || "Paciente",
    doctor_id: String(c.doctor_id),
    doctor_nombre: doctorNombreById.get(String(c.doctor_id)) ?? "Médico",
    tipo_consulta_id: c.tipo_consulta_id || "",
    estado: c.estado || "programada",
  }));

  const statsProgramadas = citasHoy.filter((c) => c.estado === "programada").length;
  const statsCanceladas = citasHoy.filter((c) => c.estado === "cancelada").length;

  // Huecos libres y disponibilidad por médico — se calculan con el horario
  // de hoy (horarios_medico) menos el tiempo ya ocupado por citas no
  // canceladas de ese médico hoy.
  const horariosPorDoctor = new Map<string, { hora_inicio: string; hora_fin: string }[]>();
  for (const h of horariosRes.data || []) {
    const id = String(h.medico_id);
    if (!horariosPorDoctor.has(id)) horariosPorDoctor.set(id, []);
    horariosPorDoctor.get(id)!.push({ hora_inicio: (h.hora_inicio as string).slice(0, 5), hora_fin: (h.hora_fin as string).slice(0, 5) });
  }

  let statsHuecosLibres = 0;
  const disponibilidad: DoctorDisponibilidad[] = doctores.map((doc) => {
    const rangos = horariosPorDoctor.get(doc.id) || [];
    const citasDoc = citasHoy.filter((c) => c.doctor_id === doc.id && c.estado !== "cancelada");

    // Huecos libres del día (en bloques de 30min), sumados al total de la sede.
    const minutosOcupados = citasDoc.reduce((acc, c) => acc + Math.max(0, timeToMinLocal(c.hora_fin) - timeToMinLocal(c.hora_inicio)), 0);
    const minutosTrabajo = rangos.reduce((acc, r) => acc + Math.max(0, timeToMinLocal(r.hora_fin) - timeToMinLocal(r.hora_inicio)), 0);
    statsHuecosLibres += Math.max(0, Math.floor((minutosTrabajo - minutosOcupados) / 30));

    // Estado actual del médico.
    const citaActual = citasDoc.find((c) => c.hora_inicio <= horaActual && horaActual < c.hora_fin);
    if (citaActual) {
      return { id: doc.id, nombre: doc.nombre, apellido: doc.apellido, estado: "en_consulta", detalle: `En consulta (hasta ${citaActual.hora_fin})` };
    }
    const rangoActivo = rangos.find((r) => r.hora_inicio <= horaActual && horaActual < r.hora_fin);
    if (rangoActivo) {
      const proximaCita = citasDoc
        .filter((c) => c.hora_inicio > horaActual)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))[0];
      const libreHasta = proximaCita ? proximaCita.hora_inicio : rangoActivo.hora_fin;
      return { id: doc.id, nombre: doc.nombre, apellido: doc.apellido, estado: "libre", detalle: `Libre hasta ${libreHasta}` };
    }
    return { id: doc.id, nombre: doc.nombre, apellido: doc.apellido, estado: "ausente", detalle: "Sin horario hoy" };
  });

  // Alertas logísticas — derivadas de datos reales (citas canceladas hoy),
  // sin inventar categorías de alerta sin respaldo en BD.
  const alertas: AlertaLogistica[] = citasHoy
    .filter((c) => c.estado === "cancelada")
    .map((c) => ({ id: c.id, texto: `${c.paciente_nombre} canceló su cita de las ${c.hora_inicio} con ${c.doctor_nombre}` }));

  const mesHoy = ahora.getMonth() + 1;
  const diaHoy = ahora.getDate();
  const cumpleañosHoy: CumpleañosHoyConTelegram[] = (pacientesSedeRes.data || [])
    .filter((p: any) => {
      if (!p.fecha_nacimiento) return false;
      const [, mes, dia] = p.fecha_nacimiento.split("-").map(Number);
      return mes === mesHoy && dia === diaHoy;
    })
    .map((p: any) => ({
      id: String(p.id),
      nombre: `${p.nombre} ${p.apellido}`.trim(),
      edad: calcularEdad(p.fecha_nacimiento),
      telegram_chat_id: p.telegram_chat_id ?? null,
    }));

  return {
    fechaHoy: hoyStr,
    citasHoy,
    statsCitasHoy: citasHoy.length,
    statsProgramadas,
    statsCanceladas,
    statsHuecosLibres,
    disponibilidad,
    alertas,
    cumpleañosHoy,
  };
}

/** Envía un saludo de cumpleaños por Telegram — mismo patrón que
 * enviarVoucherPagoAction en pagos/actions.ts (llamada directa a la Bot API
 * + registro en mensajes_telegram), pero con su propio tipo_mensaje. */
export async function enviarSaludoCumpleañosAction(pacienteId: string, chatId: string | null, texto: string) {
  if (!chatId) return { error: "Paciente sin Telegram configurado" };

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { error: "Falta configurar TELEGRAM_BOT_TOKEN en el backend" };

  let enviado = false;
  let telegramError: string | null = null;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texto }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.description || "Error al enviar el saludo a Telegram");
    enviado = true;
  } catch (err: any) {
    telegramError = err?.message || "Error al enviar el saludo";
  }

  try {
    const supabase = await createClient();
    await supabase.from("mensajes_telegram").insert({
      paciente_id: pacienteId,
      tipo_mensaje: "saludo_cumpleanos",
      mensaje: texto,
      estado_envio: enviado ? "enviado" : "fallido",
      fecha_envio: new Date().toISOString(),
      chat_id: chatId,
    });
  } catch (logErr) {
    console.error("No se pudo registrar el saludo en mensajes_telegram:", logErr);
  }

  if (!enviado) return { error: telegramError || "No se pudo enviar el saludo" };
  return { success: true };
}
