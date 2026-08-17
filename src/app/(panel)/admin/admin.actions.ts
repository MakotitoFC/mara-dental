"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function getDashboardMetricsAction(rangoFechas: { inicio?: string; fin?: string }, sedeId?: number) {
  const supabase = await createClient();

  // 1. Ganancias (KPI + Gráfico)
  let qGanancias = supabase.from("v_ganancias_mensuales_sede").select("*");
  if (sedeId) qGanancias = qGanancias.eq("sede_id", sedeId);
  // Filtros de fecha aproximados: la vista agrupa por mes.
  // Podríamos filtrar la vista si le pasamos filtros base a la consulta
  
  const { data: gananciasData, error: errG } = await qGanancias;
  if (errG) console.error("Error v_ganancias_mensuales_sede:", errG);

  // 2. Pacientes Nuevos
  let qPacientes = supabase.from("v_pacientes_por_mes_sede").select("*");
  if (sedeId) qPacientes = qPacientes.eq("sede_id", sedeId);

  const { data: pacientesData, error: errP } = await qPacientes;
  if (errP) console.error("Error v_pacientes_por_mes_sede:", errP);

  // 3. Tasa de Ocupación
  let qCitas = supabase.from("v_tasa_citas_sede").select("*");
  if (sedeId) qCitas = qCitas.eq("sede_id", sedeId);

  const { data: citasData, error: errC } = await qCitas;
  if (errC) console.error("Error v_tasa_citas_sede:", errC);

  // 4. Sedes (para los selectores)
  const { data: sedes } = await supabase.from("sede").select("id, nombre_clinica");

  return {
    ganancias: gananciasData || [],
    pacientes: pacientesData || [],
    citas: citasData || [],
    sedes: sedes || []
  };
}



export async function getAuditoriaLogsAction({
  accion,
  usuario,
  tabla,
  fecha,
  page = 1,
}: {
  accion?: string;
  usuario?: string;
  tabla?: string;
  fecha?: string;
  page?: number;
} = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("logs_auditoria")
    .select(`*, usuarios!inner(personal(nombre, apellido, email))`, { count: "exact" })
    .order("fecha", { ascending: false });

  if (accion) query = query.ilike("accion", `%${accion}%`);
  if (tabla) query = query.ilike("tabla_afectada", `%${tabla}%`);
  if (usuario) {
    const u = `%${usuario}%`;
    query = query.or(`personal.nombre.ilike.${u},personal.apellido.ilike.${u}`, { referencedTable: "usuarios" });
  }
  
  if (fecha) {
    if (fecha.length === 4) { // Es un año (e.g. "2026")
      query = query.gte("fecha", `${fecha}-01-01`).lt("fecha", `${Number(fecha) + 1}-01-01`);
    } else { // Fecha específica "YYYY-MM-DD"
      query = query.gte("fecha", `${fecha} 00:00:00`).lt("fecha", `${fecha} 23:59:59`);
    }
  }

  const limit = 5;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count } = await query.range(from, to);
  return { data: data || [], count: count || 0 };
}

export async function getReportePagosAction() {
  const supabase = await createClient();
  const { data } = await supabase.from("pagos").select(`
    id, monto, fecha_pago, estado, medio_pago(nombre),
    presupuesto:presupuesto_id(paciente_id, pacientes(nombre, apellido, sede_id, sede(nombre_clinica)))
  `).order("fecha_pago", { ascending: false });
  return data || [];
}

export async function getReporteCitasAction() {
  const supabase = await createClient();
  const { data } = await supabase.from("citas").select(`
    id, fecha, hora_inicio, estado, tipo_consulta,
    pacientes(nombre, apellido, dni),
    personal(nombre, apellido)
  `).order("fecha", { ascending: false });
  return data || [];
}

export async function getMetricasPersonalAction() {
  const supabase = await createClient();
  
  // Obtenemos al personal médico
  const { data: personalList } = await supabase.from("personal").select("id, nombre, apellido, puesto(puesto), especialidad(especialidad)");
  if (!personalList) return [];

  // Obtenemos citas atendidas por doctor
  const { data: citas } = await supabase.from("citas").select("doctor_id").eq("estado", "atendida");
  // Obtenemos presupuestos generados (aprobados o pagados) por doctor
  const { data: presupuestos } = await supabase.from("presupuestos").select("doctor_id, total_bruto, descuento_monto").in("estado", ["aprobado", "pagado"]);

  return personalList.map((doc: any) => {
    const docCitas = citas?.filter(c => c.doctor_id === doc.id) || [];
    const docPresupuestos = presupuestos?.filter(p => p.doctor_id === doc.id) || [];
    const totalGenerado = docPresupuestos.reduce((acc, curr) => acc + (Number(curr.total_bruto) - Number(curr.descuento_monto)), 0);
    
    return {
      id: doc.id,
      nombreCompleto: `${doc.nombre} ${doc.apellido}`,
      puesto: doc.puesto?.puesto || "N/A",
      especialidad: doc.especialidad?.especialidad || "General",
      citasAtendidas: docCitas.length,
      presupuestosCerrados: docPresupuestos.length,
      ingresosGenerados: totalGenerado
    };
  });
}

export async function getComunicacionesAction() {
  const supabase = await createClient();
  
  const { data: mensajes } = await supabase.from("mensajes_telegram").select(`
    id, tipo_mensaje, mensaje, estado_envio, fecha_envio, chat_id,
    pacientes (nombre, apellido)
  `).order("fecha_envio", { ascending: false }).limit(50);
  
  return mensajes || [];
}

export async function getCatalogoAction() {
  const supabase = await createClient();
  const { data } = await supabase.from("catalogo_tratamientos").select("*").order("nombre");
  return data || [];
}

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** getAdminClient() bypassa RLS por completo — antes de usarlo hay que
 * verificar server-side (con el cliente normal, sujeto a RLS) que quien
 * llama es realmente admin/superadmin. Sin este check, cualquier usuario
 * autenticado (asistente incluido) podía invocar estas server actions
 * directamente y escribir en catalogo_tratamientos/cie10 con privilegios
 * completos, sin pasar por RLS ni por ninguna verificación de rol. */
async function requireAdminRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
  const { data } = await supabase.from("usuarios").select("rol(rol)").eq("id", user.id).single();
  const rolRaw = data?.rol as any;
  const rol = (Array.isArray(rolRaw) ? rolRaw[0]?.rol : rolRaw?.rol) as string | undefined;
  if (rol !== "admin" && rol !== "superadmin") throw new Error("Sin permisos");
}

export async function toggleTratamientoActivoAction(id: number, activo: boolean) {
  await requireAdminRole();
  const supabase = getAdminClient();
  const { error } = await supabase.from("catalogo_tratamientos").update({ activo }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function saveTratamientoAction(data: any) {
  await requireAdminRole();
  const supabase = getAdminClient();
  if (data.id) {
    const { error } = await supabase.from("catalogo_tratamientos").update(data).eq("id", data.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("catalogo_tratamientos").insert([data]);
    if (error) return { error: error.message };
  }
  return { success: true };
}

export async function getCie10Action() {
  const supabase = await createClient();
  const { data } = await supabase.from("cie10").select("*").order("codigo");
  return data || [];
}

export async function saveCie10Action(data: any) {
  await requireAdminRole();
  const supabase = getAdminClient();
  const payload = {
    ...data,
    estado: data.estado !== undefined ? data.estado : true,
  };
  if (payload.codigo_antiguo) {
    const { codigo_antiguo, ...updateData } = payload;
    const { error } = await supabase.from("cie10").update(updateData).eq("codigo", codigo_antiguo);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("cie10").insert([payload]);
    if (error) return { error: error.message };
  }
  return { success: true };
}

export async function softDeleteCie10Action(codigo: string) {
  const supabase = getAdminClient();
  const { error } = await supabase.from("cie10").update({ estado: false }).eq("codigo", codigo);
  if (error) return { error: error.message };
  return { success: true };
}

// --- ROLES CRUD ---
export async function getRolesAdminAction() {
  const supabase = await createClient();
  const { data } = await supabase.from("rol").select("*").order("id");
  return data || [];
}

export async function saveRolAdminAction(data: any) {
  const supabase = getAdminClient();
  if (data.id) {
    const { error } = await supabase.from("rol").update({ rol: data.rol, descripcion: data.descripcion, estado: data.estado }).eq("id", data.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("rol").insert([{ rol: data.rol, descripcion: data.descripcion, estado: data.estado !== undefined ? data.estado : true }]);
    if (error) return { error: error.message };
  }
  return { success: true };
}

export async function softDeleteRolAction(id: number) {
  const supabase = getAdminClient();
  const { error } = await supabase.from("rol").update({ estado: false }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

// --- PUESTOS CRUD ---
export async function getPuestosAdminAction() {
  const supabase = await createClient();
  const { data } = await supabase.from("puesto").select("*").order("id");
  return data || [];
}

export async function savePuestoAdminAction(data: any) {
  const supabase = getAdminClient();
  if (data.id) {
    const { error } = await supabase.from("puesto").update({ puesto: data.puesto, descripcion: data.descripcion, estado: data.estado }).eq("id", data.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("puesto").insert([{ puesto: data.puesto, descripcion: data.descripcion, estado: data.estado !== undefined ? data.estado : true }]);
    if (error) return { error: error.message };
  }
  return { success: true };
}

export async function softDeletePuestoAction(id: number) {
  const supabase = getAdminClient();
  const { error } = await supabase.from("puesto").update({ estado: false }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

// --- ESPECIALIDADES CRUD ---
export async function getEspecialidadesAdminAction() {
  const supabase = await createClient();
  const { data } = await supabase.from("especialidad").select("*").order("id");
  return data || [];
}

export async function saveEspecialidadAdminAction(data: any) {
  const supabase = getAdminClient();
  if (data.id) {
    const { error } = await supabase.from("especialidad").update({ especialidad: data.especialidad, descripcion: data.descripcion, estado: data.estado }).eq("id", data.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("especialidad").insert([{ especialidad: data.especialidad, descripcion: data.descripcion, estado: data.estado !== undefined ? data.estado : true }]);
    if (error) return { error: error.message };
  }
  return { success: true };
}

export async function softDeleteEspecialidadAction(id: number) {
  const supabase = getAdminClient();
  const { error } = await supabase.from("especialidad").update({ estado: false }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}
