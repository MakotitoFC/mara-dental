"use server";

import { createClient } from "@/lib/supabase/server";

export interface DashboardFilters {
  sedeId: number;
  agrupacion: string; // 'anio', 'mes', 'dia'
  filtro: string;     // 'todos', 'anio', 'mes'
  fecha: string;      // YYYY-MM-DD
  monedaId?: number;
  medioPagoId?: number | null;
}

export async function fetchDashboardData(f: DashboardFilters) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: profile } = await supabase.from("usuarios").select("rol(rol), sede_id").eq("id", user.id).single();
  const userRole = (profile?.rol as any)?.rol || "";
  const userSedeId = profile?.sede_id || 0;

  // Enforce Sede security
  const safeSedeId = userRole === "superadmin" ? f.sedeId : userSedeId;

  const [
    { data: tasaMedicos },
    { data: tasaSede },
    { data: pacientesNuevos },
    { data: finanzas },
    { data: egresos },
    { data: tratamientos },
    { data: tasaAprobacion },
    { data: ticketPromedio },
    { data: ocupacion }
  ] = await Promise.all([
    supabase.rpc('dashboard_tasa_medicos', { p_sede_id: safeSedeId, p_filtro: f.filtro, p_fecha: f.fecha }),
    supabase.rpc('dashboard_tasa_sede', { p_sede_id: safeSedeId, p_agrupacion: f.agrupacion, p_filtro: f.filtro, p_fecha: f.fecha }),
    supabase.rpc('dashboard_pacientes_nuevos', { p_sede_id: safeSedeId, p_agrupacion: f.agrupacion, p_filtro: f.filtro, p_fecha: f.fecha }),
    supabase.rpc('dashboard_finanzas_sede', { p_sede_id: safeSedeId, p_tipo_moneda_id: f.monedaId || 1, p_medio_pago_id: f.medioPagoId, p_agrupacion: f.agrupacion, p_filtro: f.filtro, p_fecha: f.fecha }),
    supabase.rpc('dashboard_egresos_por_categoria', { p_sede_id: safeSedeId, p_tipo_moneda_id: f.monedaId || 1, p_filtro: f.filtro, p_fecha: f.fecha }),
    supabase.rpc('dashboard_tratamientos_frecuencias', { p_sede_id: safeSedeId, p_filtro: f.filtro, p_fecha: f.fecha }),
    supabase.rpc('dashboard_tasa_conversion_presupuestos', { p_sede_id: safeSedeId, p_agrupacion: f.agrupacion, p_filtro: f.filtro, p_fecha: f.fecha }),
    supabase.rpc('dashboard_ticket_promedio', { p_sede_id: safeSedeId, p_agrupacion: f.agrupacion, p_filtro: f.filtro, p_fecha: f.fecha }),
    supabase.rpc('dashboard_ocupacion_medico', { p_sede_id: safeSedeId, p_agrupacion: f.agrupacion, p_filtro: f.filtro, p_fecha: f.fecha })
  ]);

  return {
    tasaMedicos: tasaMedicos || [],
    tasaSede: tasaSede || [],
    pacientesNuevos: pacientesNuevos || [],
    finanzas: finanzas || [],
    egresos: egresos || [],
    tratamientos: tratamientos || [],
    tasaAprobacion: tasaAprobacion || [],
    ticketPromedio: ticketPromedio || [],
    ocupacion: ocupacion || []
  };
}

export async function fetchSelectOptions() {
  const supabase = await createClient();
  const [
    { data: sedes },
    { data: monedas },
    { data: mediosPago }
  ] = await Promise.all([
    supabase.from('sede').select('id, nombre_clinica'),
    supabase.from('tipo_moneda').select('id, moneda'),
    supabase.from('medio_pago').select('id, nombre')
  ]);

  return {
    sedes: sedes || [],
    monedas: monedas || [],
    mediosPago: mediosPago || []
  };
}
