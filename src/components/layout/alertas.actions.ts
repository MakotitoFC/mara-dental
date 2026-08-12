"use server";

import { createClient } from "@/lib/supabase/server";

function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento + "T00:00:00");
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

/** Días calendario hasta el próximo cumpleaños (0 = hoy, maneja el corte de año). */
function diasHastaCumple(fechaNacimiento: string, hoy: Date): number | null {
  const [, mesStr, diaStr] = fechaNacimiento.split("-");
  const mes = Number(mesStr), dia = Number(diaStr);
  if (!mes || !dia) return null;
  const año = hoy.getFullYear();
  let proximo = new Date(año, mes - 1, dia);
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (proximo < hoySinHora) proximo = new Date(año + 1, mes - 1, dia);
  return Math.round((proximo.getTime() - hoySinHora.getTime()) / 86400000);
}

const EMPTY = { citasProximas: [], cumpleanos: [], alergias: [], tratamientosPendientes: [], mensajesNoLeidos: [] };

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

export interface AlertasData {
  citasProximas: AlertaCitaProxima[];
  cumpleanos: AlertaCumpleanos[];
  alergias: AlertaAlergias[];
  tratamientosPendientes: AlertaTratamiento[];
  mensajesNoLeidos?: AlertaMensaje[];
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

export async function getAlertasAction(): Promise<AlertasData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const now = new Date();
  const hoyStr = now.toISOString().split("T")[0];
  const en48h = new Date(now.getTime() + 48 * 3600 * 1000);
  const limiteStr = en48h.toISOString().split("T")[0];
  const hace90dias = new Date(now.getTime() - 90 * 86400000).toISOString();

  const [citasRes, pacientesRes, consultasRes, messagesRes] = await Promise.all([
    supabase
      .from("citas")
      .select("id, fecha, hora_inicio, tipo_consulta, estado, paciente_id, pacientes ( id, nombre, apellido, alergias )")
      .eq("doctor_id", user.id)
      .gte("fecha", hoyStr)
      .lte("fecha", limiteStr)
      .neq("estado", "cancelada")
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true }),
    supabase
      .from("pacientes")
      .select("id, nombre, apellido, fecha_nacimiento")
      .eq("activo", true),
    supabase
      .from("consultas")
      .select(`
        id,
        cita_id,
        citas ( pacientes ( id, nombre, apellido ) ),
        diagnostico!diagnostico_consulta_origen_id_fkey (
          id, "esTratado",
          tratamiento ( id, plan_tratamiento ( id, fase, estado ) )
        )
      `)
      .eq("doctor_id", user.id)
      .gte("fecha_consulta", hace90dias)
      .order("fecha_consulta", { ascending: false })
      .limit(40),
    supabase
      .from("messages")
      .select("paciente_id")
      .eq("direction", "inbound")
      .eq("is_read", false),
  ]);

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
      tipoConsulta: c.tipo_consulta || "",
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

  return { citasProximas, cumpleanos, alergias, tratamientosPendientes: tratamientosPendientes.slice(0, 8), mensajesNoLeidos };
}
