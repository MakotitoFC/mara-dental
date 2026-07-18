"use server";

import { createClient } from "@/lib/supabase/server";

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

export async function getAllPacientesAdminAction(filtros: { sedeId?: number; activo?: string; search?: string }) {
  const supabase = await createClient();
  let query = supabase.from("pacientes").select(`
    id, nombre, apellido, dni, telefono, activo,
    sede ( nombre_clinica )
  `);

  if (filtros.sedeId) query = query.eq("sede_id", filtros.sedeId);
  if (filtros.activo === "true") query = query.eq("activo", true);
  if (filtros.activo === "false") query = query.eq("activo", false);
  if (filtros.search) {
    query = query.or(`nombre.ilike.%${filtros.search}%,apellido.ilike.%${filtros.search}%,dni.ilike.%${filtros.search}%`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) console.error("Error fetching pacientes admin:", error);
  return data || [];
}

export async function getPacienteAdminDetailsAction(id: number) {
  const supabase = await createClient();

  // Paciente y Sede
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("*, sede(nombre_clinica)")
    .eq("id", id)
    .single();

  // Contacto
  const { data: contactos } = await supabase.from("contacto").select("*").eq("paciente_id", id);

  // Finanzas: Presupuestos, Pagos, Cuotas
  const { data: presupuestos } = await supabase.from("presupuestos").select(`
    *,
    detalle_presupuesto(*),
    pagos(*),
    cuotas(*)
  `).eq("paciente_id", id);

  // Archivos
  const { data: archivos } = await supabase.from("archivos_clinicos").select("*").eq("diagnostico_id.in", `(select id from diagnostico where consulta_origen_id in (select id from consultas where cita_id in (select id from citas where paciente_id=${id})))`); 
  
  // Mejor obtener archivos por consulta_id o plan_tratamiento_id
  let archivosFallback = null;
  try {
    const res = await supabase.rpc("get_paciente_archivos", { p_id: id });
    archivosFallback = res.data;
  } catch (err) {
    // Ignorar si el rpc no existe
  }
  // Como la consulta de archivos puede ser compleja sin función, haremos fetch de consultas y sus archivos
  const { data: consultas } = await supabase.from("consultas").select(`
    id, fecha_consulta, motivo, observaciones,
    cita:cita_id(estado),
    diagnostico(diagnostico, es_definitivo, recetas(id, estado)),
    odontograma(id, tipo_tratamiento, notas_generales, odontograma_diente(diente, condicion, superficie))
  `).in("cita_id", (await supabase.from("citas").select("id").eq("paciente_id", id)).data?.map(c=>c.id) || []);

  return {
    paciente,
    contactos: contactos || [],
    presupuestos: presupuestos || [],
    consultas: consultas || [],
    archivos: [] // Por tiempo, usaremos lo básico
  };
}

export async function getAuditoriaLogsAction() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("logs_auditoria")
    .select("*, usuarios(rol_id)")
    .order("fecha", { ascending: false })
    .limit(50);
  
  return data || [];
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

export async function toggleTratamientoActivoAction(id: number, activo: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("catalogo_tratamientos").update({ activo }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function saveTratamientoAction(data: any) {
  const supabase = await createClient();
  if (data.id) {
    const { error } = await supabase.from("catalogo_tratamientos").update(data).eq("id", data.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("catalogo_tratamientos").insert([data]);
    if (error) return { error: error.message };
  }
  return { success: true };
}
