"use server";

import { createClient } from "@/lib/supabase/server";

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

  const [citasRes, pacientesRes, recordatoriosRes] = await Promise.all([
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

  return {
    citas,
    cumpleañosHoy,
    statsCitasHoy: citasHoy.length,
    statsCompletas: citasHoy.filter((c) => c.estado === "atendida").length,
    statsPendientes: citasHoy.filter((c) => c.estado === "programada").length,
    recordatoriosPendientes: (recordatoriosRes.data || []).length,
  };
}
