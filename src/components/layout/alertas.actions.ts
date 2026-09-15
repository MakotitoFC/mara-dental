"use server";

import { createClient } from "@/lib/supabase/server";

function calcularEdad(fechaNacimiento: string): number {
  if (!fechaNacimiento) return 0;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento + "T00:00:00");
  if (isNaN(nacimiento.getTime())) return 0;
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

function diasHastaCumple(fechaNacimiento: string, hoy: Date): number | null {
  if (!fechaNacimiento) return null;
  const parts = fechaNacimiento.split("-");
  if (parts.length < 3) return null;
  const mes = Number(parts[1]), dia = Number(parts[2]);
  if (!mes || !dia || isNaN(mes) || isNaN(dia)) return null;
  const año = hoy.getFullYear();
  let proximo = new Date(año, mes - 1, dia);
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (proximo < hoySinHora) proximo = new Date(año + 1, mes - 1, dia);
  return Math.round((proximo.getTime() - hoySinHora.getTime()) / 86400000);
}

const EMPTY = { citasProximas: [], cumpleanos: [], alergias: [], tratamientosPendientes: [], mensajesNoLeidos: [], notificacionesSistema: [], mensajesTelegram: [] };

export interface AlertaCitaProxima {
  id: string;
  pacienteNombre: string;
  fecha: string;
  horaInicio: string;
  tipoConsulta: string;
}

export interface AlertaCumpleanos {
  id: string;
  nombre: string;
  edad: number;
  fecha: string;
  esHoy: boolean;
}

export interface AlertaAlergias {
  id: string;
  pacienteNombre: string;
  horaInicio: string;
  alergias: string[];
}

export interface AlertaTratamiento {
  id: string;
  pacienteNombre: string;
  fase: string;
  estado: string;
}

export interface AlertaMensaje {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  cantidad: number;
}

export interface AlertaNotificacion {
  id: string;
  titulo: string;
  mensaje: string;
  link?: string;
  created_at: string;
}

export interface AlertaTelegram {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  tipoMensaje: string;
  mensaje: string;
  estadoEnvio: string;
  fechaEnvio: string;
}

export interface AlertasData {
  citasProximas: AlertaCitaProxima[];
  cumpleanos: AlertaCumpleanos[];
  alergias: AlertaAlergias[];
  tratamientosPendientes: AlertaTratamiento[];
  mensajesNoLeidos?: AlertaMensaje[];
  notificacionesSistema?: AlertaNotificacion[];
  mensajesTelegram?: AlertaTelegram[];
}

function fmtHoraCita(fecha: string, horaInicio: string) {
  const [h, m] = (horaInicio || "00:00:00").split(":");
  let hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  const hora = `${hh}:${m} ${ampm}`;

  const ts = new Date(`${fecha}T${horaInicio || "00:00:00"}`);
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  let dia = "Próximamente";
  if (ts.toDateString() === hoy.toDateString()) dia = "Hoy";
  else if (ts.toDateString() === manana.toDateString()) dia = "Mañana";
  else dia = ts.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });

  return `${dia} · ${hora}`;
}

import { getAdminClient } from "@/lib/supabase/admin";

export async function getAlertasAction(): Promise<AlertasData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const admin = getAdminClient();

  // 1. Obtener rol del usuario actual
  const { data: usuarioData } = await admin
    .from("usuarios")
    .select("rol_id, sede_id, rol ( rol )")
    .eq("id", user.id)
    .single();

  const rolName = ((usuarioData?.rol as any)?.rol || "").toLowerCase();
  const isDoctor = rolName === "doctor" || usuarioData?.rol_id === 1;

  const now = new Date();
  const hoyStr = now.toISOString().split("T")[0];
  const en48h = new Date(now.getTime() + 48 * 3600 * 1000);
  const limiteStr = en48h.toISOString().split("T")[0];
  const hace90dias = new Date(now.getTime() - 90 * 86400000).toISOString();
  const hace24h = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();

  // 2. Si es Doctor, obtener los IDs de pacientes que atiende este doctor
  let docPacienteIdsSet: Set<string> = new Set();
  if (isDoctor) {
    const [citasDoc, consultasDoc, pacientesDoc, sedePacientesDoc] = await Promise.all([
      admin.from("citas").select("paciente_id").eq("doctor_id", user.id),
      admin.from("consultas").select("nota_clinica_id").eq("doctor_id", user.id),
      admin.from("pacientes").select("id").eq("creado_por", user.id),
      usuarioData?.sede_id
        ? admin.from("pacientes").select("id").eq("sede_id", usuarioData.sede_id)
        : Promise.resolve({ data: [] }),
    ]);

    (citasDoc.data || []).forEach((c: any) => { if (c.paciente_id) docPacienteIdsSet.add(String(c.paciente_id)); });
    (pacientesDoc.data || []).forEach((p: any) => { if (p.id) docPacienteIdsSet.add(String(p.id)); });
    (sedePacientesDoc.data || []).forEach((p: any) => { if (p.id) docPacienteIdsSet.add(String(p.id)); });

    const notaIds = (consultasDoc.data || []).map((c: any) => c.nota_clinica_id).filter(Boolean);
    if (notaIds.length > 0) {
      const { data: notas } = await admin
        .from("nota_clinica")
        .select("historia_clinica ( paciente_id )")
        .in("id", notaIds);
      (notas || []).forEach((n: any) => {
        const pid = (n.historia_clinica as any)?.paciente_id;
        if (pid) docPacienteIdsSet.add(String(pid));
      });
    }
  }

  const docPacienteIds = Array.from(docPacienteIdsSet);

  let citasQuery = admin
    .from("citas")
    .select("id, fecha, hora_inicio, tipo_consulta_id, tipo_consulta ( id, tipo_consulta, color ), estado, paciente_id, pacientes ( id, nombre, apellido, alergias )")
    .gte("fecha", hoyStr)
    .lte("fecha", limiteStr)
    .neq("estado", "cancelada")
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (isDoctor) {
    citasQuery = citasQuery.eq("doctor_id", user.id);
  } else if (usuarioData?.sede_id) {
    // Si no es doctor (ej: asistente), filtrar citas por su sede
    citasQuery = citasQuery.eq("sede_id", usuarioData.sede_id);
  }

  let consultasQuery = admin
    .from("consultas")
    .select(`
      id,
      cita_id,
      citas ( pacientes ( id, nombre, apellido ) ),
      diagnostico!consulta_origen_id (
        id, "esTratado",
        tratamiento ( id, plan_tratamiento ( id, fase, estado ) )
      )
    `)
    .gte("fecha_consulta", hace90dias)
    .order("fecha_consulta", { ascending: false })
    .limit(40);

  if (isDoctor) {
    consultasQuery = consultasQuery.eq("doctor_id", user.id);
  }

  let unreadMessages: any[] = [];
  if (isDoctor) {
    if (docPacienteIds.length > 0) {
      const { data: msgData } = await admin
        .from("messages")
        .select("paciente_id")
        .eq("direction", "inbound")
        .eq("is_read", false)
        .in("paciente_id", docPacienteIds);
      unreadMessages = msgData || [];
    }
  } else {
    let msgQuery = admin
      .from("messages")
      .select("paciente_id")
      .eq("direction", "inbound")
      .eq("is_read", false);

    if (usuarioData?.sede_id) {
      const { data: sedePacs } = await admin.from("pacientes").select("id").eq("sede_id", usuarioData.sede_id);
      const sIds = (sedePacs || []).map((p: any) => p.id);
      if (sIds.length > 0) {
        msgQuery = msgQuery.in("paciente_id", sIds);
      }
    }
    const { data: msgData } = await msgQuery;
    unreadMessages = msgData || [];
  }

  // Envíos de Telegram
  let telegramMensajes: any[] = [];
  if (!isDoctor || docPacienteIds.length > 0) {
    let telegramQuery = admin
      .from("mensajes_telegram")
      .select("id, paciente_id, tipo_mensaje, mensaje, estado_envio, fecha_envio, pacientes ( nombre, apellido )")
      .gte("fecha_envio", hace24h)
      .order("fecha_envio", { ascending: false })
      .limit(10);

    if (isDoctor) telegramQuery = telegramQuery.in("paciente_id", docPacienteIds);

    const { data: tgData } = await telegramQuery;
    telegramMensajes = tgData || [];
  }

  let pacientesQuery = admin
    .from("pacientes")
    .select("id, nombre, apellido, fecha_nacimiento")
    .eq("activo", true);

  if (usuarioData?.sede_id && !isDoctor) {
    pacientesQuery = pacientesQuery.eq("sede_id", usuarioData.sede_id);
  }

  const [citasRes, pacientesRes, consultasRes] = await Promise.all([
    citasQuery,
    pacientesQuery,
    consultasQuery,
  ]);

  const messagesRes = { data: unreadMessages };

  const citasProximas: AlertaCitaProxima[] = (citasRes.data || [])
    .filter((c: any) => {
      const ts = new Date(`${c.fecha}T${(c.hora_inicio || "00:00:00").slice(0, 8)}`);
      return ts.getTime() >= now.getTime() && ts.getTime() <= en48h.getTime();
    })
    .map((c: any) => ({
      id: String(c.id),
      pacienteNombre: `${c.pacientes?.nombre ?? ""} ${c.pacientes?.apellido ?? ""}`.trim(),
      fecha: c.fecha,
      horaInicio: (c.hora_inicio || "").slice(0, 5),
      tipoConsulta: (Array.isArray(c.tipo_consulta) ? c.tipo_consulta[0]?.tipo_consulta : c.tipo_consulta?.tipo_consulta) || "",
    }));

  const cumpleanos: AlertaCumpleanos[] = (pacientesRes.data || [])
    .map((p: any) => {
      if (!p.fecha_nacimiento) return null;
      const dias = diasHastaCumple(p.fecha_nacimiento, now);
      if (dias === null || dias > 7) return null;
      return {
        id: String(p.id),
        nombre: `${p.nombre} ${p.apellido}`.trim(),
        edad: calcularEdad(p.fecha_nacimiento) + (dias === 0 ? 0 : 1),
        fecha: p.fecha_nacimiento,
        esHoy: dias === 0,
        _dias: dias,
      };
    })
    .filter((x: any): x is NonNullable<typeof x> => x !== null)
    .sort((a: any, b: any) => a._dias - b._dias)
    .map(({ _dias, ...rest }: any) => rest);

  const alergias: AlertaAlergias[] = (citasRes.data || [])
    .filter((c: any) => c.fecha === hoyStr && c.pacientes?.alergias && c.pacientes.alergias.length > 0)
    .map((c: any) => ({
      id: String(c.id),
      pacienteNombre: `${c.pacientes?.nombre ?? ""} ${c.pacientes?.apellido ?? ""}`.trim(),
      horaInicio: fmtHoraCita(c.fecha, c.hora_inicio),
      alergias: c.pacientes.alergias,
    }));

  const tratamientosPendientes: AlertaTratamiento[] = [];
  const tratamientosMap: Record<string, AlertaTratamiento> = {};

  for (const c of consultasRes.data || []) {
    const pacienteNombre = `${(c as any).citas?.pacientes?.nombre ?? ""} ${(c as any).citas?.pacientes?.apellido ?? ""}`.trim();
    for (const d of (c as any).diagnostico || []) {
      if (!d.esTratado) continue;
      for (const t of d.tratamiento || []) {
        for (const p of t.plan_tratamiento || []) {
          if (p.estado === "Terminado") continue;
          tratamientosPendientes.push({
            id: String(p.id),
            pacienteNombre: pacienteNombre || "Paciente",
            fase: p.fase,
            estado: p.estado,
          });
        }
      }
    }
    if (tratamientosPendientes.length >= 8) break;
  }

  const pacientesInfo = Object.fromEntries(
    (pacientesRes.data || []).map((p: any) => [String(p.id), `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim()])
  );

  const mensajesMap: Record<string, AlertaMensaje> = {};
  (messagesRes.data || []).forEach((m: any) => {
    if (!mensajesMap[m.paciente_id]) {
      mensajesMap[m.paciente_id] = {
        id: `msg-${m.paciente_id}`,
        pacienteId: String(m.paciente_id),
        pacienteNombre: pacientesInfo[m.paciente_id] || "Paciente",
        cantidad: 0,
      };
    }
    mensajesMap[m.paciente_id].cantidad++;
  });

  const mensajesNoLeidos: AlertaMensaje[] = Object.values(mensajesMap).map((m: any) => ({
    ...m,
    id: `msg-${m.pacienteId}-${m.cantidad}`
  }));

  const { data: notifData } = await admin
    .from("notificaciones")
    .select("id, titulo, mensaje, link, created_at")
    .eq("destinatario_id", user.id)
    .eq("leido", false)
    .order("created_at", { ascending: false })
    .limit(10);

  const notificacionesSistema: AlertaNotificacion[] = notifData || [];

  const mensajesTelegram: AlertaTelegram[] = telegramMensajes.map((m: any) => ({
    id: `tg-${m.id}`,
    pacienteId: String(m.paciente_id),
    pacienteNombre: `${m.pacientes?.nombre ?? ""} ${m.pacientes?.apellido ?? ""}`.trim() || "Paciente",
    tipoMensaje: m.tipo_mensaje || "",
    mensaje: m.mensaje || "",
    estadoEnvio: m.estado_envio || "",
    fechaEnvio: m.fecha_envio,
  }));

  return { citasProximas, cumpleanos, alergias, tratamientosPendientes: tratamientosPendientes.slice(0, 8), mensajesNoLeidos, notificacionesSistema, mensajesTelegram };
}

export async function markNotificacionLeidaAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = getAdminClient();
  await admin.from("notificaciones").update({ leido: true }).eq("id", id).eq("destinatario_id", user.id);
  return { success: true };
}

export async function markMessagesAsReadForPacienteAction(pacienteId: string) {
  const admin = getAdminClient();
  await admin.from("messages")
    .update({ is_read: true })
    .eq("paciente_id", pacienteId)
    .eq("direction", "inbound")
    .eq("is_read", false);
  return { success: true };
}
