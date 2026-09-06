"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

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

  // Usamos cliente con service role para funciones analíticas de agregación
  // garantizando que las políticas de RLS de tablas transaccionales no filtren reportes directivos.
  // La seguridad de sede ya está estrictamente validada en safeSedeId.
  const adminClient = getAdminClient();

  const [
    { data: tasaMedicos, error: errTasaMedicos },
    { data: tasaSede, error: errTasaSede },
    { data: pacientesNuevos, error: errPacientesNuevos },
    { data: finanzas, error: errFinanzas },
    { data: egresos, error: errEgresos },
    { data: tratamientos, error: errTratamientos },
    { data: tasaAprobacion, error: errTasaAprobacion },
    { data: ticketPromedio, error: errTicketPromedio },
    { data: ocupacion, error: errOcupacion }
  ] = await Promise.all([
    adminClient.rpc('dashboard_tasa_medicos', { p_sede_id: safeSedeId, p_filtro: f.filtro, p_fecha: f.fecha }),
    adminClient.rpc('dashboard_tasa_sede', { p_sede_id: safeSedeId, p_agrupacion: f.agrupacion, p_filtro: f.filtro, p_fecha: f.fecha }),
    adminClient.rpc('dashboard_pacientes_nuevos', { p_sede_id: safeSedeId, p_agrupacion: f.agrupacion, p_filtro: f.filtro, p_fecha: f.fecha }),
    adminClient.rpc('dashboard_finanzas_sede', { p_sede_id: safeSedeId, p_tipo_moneda_id: f.monedaId || 1, p_medio_pago_id: f.medioPagoId, p_agrupacion: f.agrupacion, p_filtro: f.filtro, p_fecha: f.fecha }),
    adminClient.rpc('dashboard_egresos_por_categoria', { p_sede_id: safeSedeId, p_tipo_moneda_id: f.monedaId || 1, p_filtro: f.filtro, p_fecha: f.fecha }),
    adminClient.rpc('dashboard_tratamientos_frecuencias', { p_sede_id: safeSedeId, p_filtro: f.filtro, p_fecha: f.fecha }),
    adminClient.rpc('dashboard_tasa_conversion_presupuestos', { p_sede_id: safeSedeId, p_agrupacion: f.agrupacion, p_filtro: f.filtro, p_fecha: f.fecha }),
    adminClient.rpc('dashboard_ticket_promedio', { p_sede_id: safeSedeId, p_agrupacion: f.agrupacion, p_filtro: f.filtro, p_fecha: f.fecha }),
    adminClient.rpc('dashboard_ocupacion_medico', { p_sede_id: safeSedeId, p_agrupacion: f.agrupacion, p_filtro: f.filtro, p_fecha: f.fecha })
  ]);

  if (errFinanzas) console.error("Error dashboard_finanzas_sede:", errFinanzas);
  if (errEgresos) console.error("Error dashboard_egresos_por_categoria:", errEgresos);
  if (errTratamientos) console.error("Error dashboard_tratamientos_frecuencias:", errTratamientos);
  if (errTicketPromedio) console.error("Error dashboard_ticket_promedio:", errTicketPromedio);

  return {
    tasaMedicos: tasaMedicos || [],
    tasaSede: tasaSede || [],
    pacientesNuevos: pacientesNuevos || [],
    finanzas: (finanzas || []).map((item: any) => {
      const ing = Math.abs(Number(item.ingresos || 0));
      const egr = Math.abs(Number(item.egresos || 0));
      return {
        ...item,
        ingresos: ing,
        egresos: egr,
        ganancias: item.ganancias !== undefined ? Number(item.ganancias) : (ing - egr)
      };
    }),
    egresos: (egresos || []).map((item: any) => ({
      ...item,
      total_gastado: Math.abs(Number(item.total_gastado || 0))
    })),
    tratamientos: tratamientos || [],
    tasaAprobacion: tasaAprobacion || [],
    ticketPromedio: (ticketPromedio || []).map((item: any) => ({
      ...item,
      ingreso_total: Number(item.ingreso_total || 0),
      ticket_promedio: Number(item.ticket_promedio || 0)
    })),
    ocupacion: ocupacion || []
  };
}

export async function fetchSelectOptions() {
  const adminClient = getAdminClient();
  const [
    { data: sedes },
    { data: monedas },
    { data: mediosPago }
  ] = await Promise.all([
    adminClient.from('sede').select('id, nombre_clinica, logo_url, telefono, email_contacto, direccion').order('id', { ascending: true }),
    adminClient.from('tipo_moneda').select('id, moneda').order('id', { ascending: true }),
    adminClient.from('medio_pago').select('id, nombre').order('id', { ascending: true })
  ]);

  return {
    sedes: sedes || [],
    monedas: monedas || [],
    mediosPago: mediosPago || []
  };
}
