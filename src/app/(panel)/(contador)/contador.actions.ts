"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

// -----------------------------------------------------------------------------
// Categorías
// -----------------------------------------------------------------------------

export async function getCategoriasAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categoria_movimiento")
    .select("*")
    .order("nombre");
  
  if (error) throw error;
  return data;
}

export async function saveCategoriaAction(formData: any) {
  const supabase = await createClient();
  
  if (formData.id) {
    const { error } = await supabase
      .from("categoria_movimiento")
      .update({
        nombre: formData.nombre,
        tipo: formData.tipo,
        descripcion: formData.descripcion,
        activo: formData.activo,
        afecto_igv: formData.afecto_igv,
        cuenta_contable: formData.cuenta_contable
      })
      .eq("id", formData.id);
    
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("categoria_movimiento")
      .insert({
        nombre: formData.nombre,
        tipo: formData.tipo,
        descripcion: formData.descripcion,
        activo: formData.activo,
        afecto_igv: formData.afecto_igv,
        cuenta_contable: formData.cuenta_contable
      });
      
    if (error) return { success: false, error: error.message };
  }
  
  return { success: true };
}

export async function toggleCategoriaActivoAction(id: number, activo: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categoria_movimiento")
    .update({ activo })
    .eq("id", id);
    
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// -----------------------------------------------------------------------------
// Tipo de Cambio
// -----------------------------------------------------------------------------

export async function getTipoCambioAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tipo_cambio")
    .select("*")
    .order("fecha", { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function saveTipoCambioAction(formData: any) {
  const supabase = await createClient();
  
  if (formData.id) {
    const { error } = await supabase
      .from("tipo_cambio")
      .update({
        fecha: formData.fecha,
        compra: formData.compra,
        venta: formData.venta,
        fuente: formData.fuente
      })
      .eq("id", formData.id);
    
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("tipo_cambio")
      .insert({
        fecha: formData.fecha,
        compra: formData.compra,
        venta: formData.venta,
        fuente: formData.fuente
      });
      
    if (error) return { success: false, error: error.message };
  }
  
  return { success: true };
}

export async function deleteTipoCambioAction(id: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tipo_cambio")
    .delete()
    .eq("id", id);
    
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// -----------------------------------------------------------------------------
// Proveedores
// -----------------------------------------------------------------------------

export async function getProveedoresAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .order("nombre");
  
  if (error) throw error;
  return data;
}

export async function saveProveedorAction(formData: any) {
  const supabase = await createClient();
  
  if (formData.id) {
    const { error } = await supabase
      .from("proveedores")
      .update({
        nombre: formData.nombre,
        ruc: formData.ruc,
        telefono: formData.telefono,
        email: formData.email,
        direccion: formData.direccion,
        activo: formData.activo
      })
      .eq("id", formData.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("proveedores")
      .insert({
        nombre: formData.nombre,
        ruc: formData.ruc,
        telefono: formData.telefono,
        email: formData.email,
        direccion: formData.direccion,
        activo: formData.activo
      });
    if (error) return { success: false, error: error.message };
  }
  return { success: true };
}

export async function toggleProveedorActivoAction(id: string, activo: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("proveedores")
    .update({ activo })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// -----------------------------------------------------------------------------
// Clientes Pago
// -----------------------------------------------------------------------------

export async function getClientesPagoAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cliente_pago")
    .select("*")
    .order("nombre");
  
  if (error) throw error;
  return data;
}

export async function saveClientePagoAction(formData: any) {
  const supabase = await createClient();
  
  if (formData.id) {
    const { error } = await supabase
      .from("cliente_pago")
      .update({
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        dni: formData.dni || null,
        pasaporte: formData.pasaporte || null,
        carnet_extranjeria: formData.carnet_extranjeria || null
      })
      .eq("id", formData.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("cliente_pago")
      .insert({
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        dni: formData.dni || null,
        pasaporte: formData.pasaporte || null,
        carnet_extranjeria: formData.carnet_extranjeria || null
      });
    if (error) return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteClientePagoAction(id: string) {
  const supabase = await createClient();
  // Verificar si está referenciado en movimientos de caja
  const { count, error: countErr } = await supabase
    .from("movimiento_caja")
    .select("*", { count: 'exact', head: true })
    .eq("cliente_id", id);
    
  if (countErr) return { success: false, error: countErr.message };
  if (count && count > 0) {
    return { success: false, error: "El cliente está referenciado en uno o más movimientos de caja y no puede ser eliminado." };
  }

  const { error } = await supabase
    .from("cliente_pago")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// -----------------------------------------------------------------------------
// Caja Turnos
// -----------------------------------------------------------------------------

export async function getCajaTurnosAction() {
  const adminClient = getAdminClient();
  const { data: turnos, error } = await adminClient
    .from("caja_turno")
    .select(`
      id, fecha_apertura, fecha_cierre, usuario_id,
      sede:sede_id (id, nombre_clinica)
    `)
    .order("fecha_apertura", { ascending: false })
    .limit(100);
  
  if (error) throw error;
  if (!turnos || turnos.length === 0) return [];

  const turnoIds = turnos.map((t: any) => t.id);
  const userIds = Array.from(new Set(turnos.map((t: any) => t.usuario_id).filter(Boolean)));

  const [{ data: movimientos }, { data: personalData }] = await Promise.all([
    adminClient
      .from("movimiento_caja")
      .select("caja_turno_id, monto, estado, observacion, categoria:categoria_id (nombre, tipo)")
      .in("caja_turno_id", turnoIds)
      .eq("estado", "confirmado"),
    userIds.length > 0
      ? adminClient.from("personal").select("usuario_id, email, nombre, apellido").in("usuario_id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const movsByTurno = new Map<string, any[]>();
  (movimientos || []).forEach((m: any) => {
    const tid = String(m.caja_turno_id);
    if (!movsByTurno.has(tid)) movsByTurno.set(tid, []);
    movsByTurno.get(tid)!.push(m);
  });

  const usersMap = new Map<string, any>();
  (personalData || []).forEach((p: any) => usersMap.set(String(p.usuario_id), p));

  return turnos.map((turno: any) => {
    const movs = movsByTurno.get(String(turno.id)) || [];
    let ingresos = 0;
    let egresos = 0;
    let devoluciones = 0;

    movs.forEach((m: any) => {
      const rawMonto = Number(m.monto);
      const montoAbs = Math.abs(rawMonto);
      const cat = Array.isArray(m.categoria) ? m.categoria[0] : m.categoria;
      const catNombre = (cat?.nombre || "").toLowerCase();
      const obs = (m.observacion || "").toLowerCase();
      const esDevolucion = catNombre.includes("devoluci") || obs.includes("devoluci");

      if (esDevolucion) {
        devoluciones += montoAbs;
      } else if (cat?.tipo === "I" && rawMonto > 0) {
        ingresos += montoAbs;
      } else if (cat?.tipo === "E" || rawMonto < 0) {
        egresos += montoAbs;
      }
    });

    const balance = ingresos - egresos - devoluciones;

    return {
      ...turno,
      usuario: usersMap.get(String(turno.usuario_id)) || null,
      ingresos,
      egresos,
      devoluciones,
      balance,
    };
  });
}

export async function getMovimientosCajaAction(turnoId: string) {
  const adminClient = getAdminClient();
  
  const [{ data: turno, error: turnoErr }, { data: movimientos, error: movErr }] = await Promise.all([
    adminClient
      .from("caja_turno")
      .select(`
        *,
        sede:sede_id (id, nombre_clinica)
      `)
      .eq("id", turnoId)
      .single(),
    adminClient
      .from("movimiento_caja")
      .select(`
        *,
        moneda:tipo_moneda_id (moneda),
        categoria:categoria_id (nombre, tipo),
        medio_pago:medio_pago_id (nombre),
        presupuestos:presupuesto_id (
          id,
          pacientes ( nombre, apellido )
        )
      `)
      .eq("caja_turno_id", turnoId)
      .order("fecha", { ascending: true }),
  ]);
    
  if (turnoErr) throw turnoErr;
  if (movErr) throw movErr;
  
  let personalData: any = null;
  if (turno.usuario_id) {
    const { data: pd } = await adminClient
      .from("personal")
      .select("usuario_id, email, nombre, apellido")
      .eq("usuario_id", turno.usuario_id)
      .maybeSingle();
    personalData = pd || null;
  }
  
  turno.usuario = personalData;

  const movsFormatted = (movimientos || []).map((m: any) => {
    const cat = Array.isArray(m.categoria) ? m.categoria[0] : m.categoria;
    const catNombre = (cat?.nombre || "").toLowerCase();
    const obs = (m.observacion || "").toLowerCase();
    const esDevolucion = catNombre.includes("devoluci") || obs.includes("devoluci");
    
    let pacienteNombre = "";
    if (m.presupuestos) {
      const p = Array.isArray(m.presupuestos) ? m.presupuestos[0] : m.presupuestos;
      const pac = p ? (Array.isArray(p.pacientes) ? p.pacientes[0] : p.pacientes) : null;
      if (pac) pacienteNombre = `${pac.nombre ?? ""} ${pac.apellido ?? ""}`.trim();
    }

    return {
      ...m,
      es_devolucion: esDevolucion,
      paciente_nombre: pacienteNombre,
    };
  });

  return { turno, movimientos: movsFormatted };
}

export async function toggleConciliadoAction(movimientoId: string, conciliado: boolean) {
  const adminClient = getAdminClient();
  const { error } = await adminClient
    .from("movimiento_caja")
    .update({ 
      conciliado,
      fecha_conciliacion: conciliado ? new Date().toISOString() : null
    })
    .eq("id", movimientoId);
    
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// -----------------------------------------------------------------------------
// Comprobantes
// -----------------------------------------------------------------------------

export async function getComprobantesAction() {
  const adminClient = getAdminClient();
  const { data, error } = await adminClient
    .from("comprobante_pago")
    .select(`
      *,
      paciente:paciente_id (id, nombre, apellido, dni),
      cliente:cliente_id (id, nombre, apellidos, dni, pasaporte, carnet_extranjeria),
      movimiento:movimiento_caja_id (
        id, fecha, monto, referencia, observacion, estado,
        medio_pago:medio_pago_id (id, nombre),
        caja_turno:caja_turno_id (id, fecha_apertura, sede:sede_id (nombre_clinica)),
        presupuesto:presupuesto_id (
          id, fecha_emision, total_bruto, descuento_monto, estado,
          detalle_presupuesto ( catalogo_tratamientos (nombre, moneda) ),
          cuotas ( id, numero_cuota, monto, estado, fecha_vencimiento )
        )
      )
    `)
    .order("fecha_emision", { ascending: false })
    .limit(200);
  
  if (error) throw error;
  return data || [];
}

export async function anularComprobanteAction(id: string, motivo: string) {
  const adminClient = getAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const fechaAnulacion = new Date().toISOString();

  // 1. Anular comprobante
  const { error } = await adminClient
    .from("comprobante_pago")
    .update({ 
      estado: "anulado", 
      motivo_anulacion: motivo,
      anulado_por: user.id,
      fecha_anulacion: fechaAnulacion,
    })
    .eq("id", id);
    
  if (error) return { success: false, error: error.message };
  
  // 2. Anular movimiento de caja vinculado si existía
  await adminClient
    .from("movimiento_caja")
    .update({ 
      estado: "anulado",
      motivo_anulacion: motivo,
      anulado_por: user.id,
      fecha_anulacion: fechaAnulacion,
    })
    .eq("comprobante_pago_id", id);

  return { success: true };
}

// -----------------------------------------------------------------------------
// Presupuestos y Cobranzas (Optimizado con Paginación y Búsqueda)
// -----------------------------------------------------------------------------

export async function getSedesListAction() {
  const adminClient = getAdminClient();
  const { data } = await adminClient
    .from("sedes")
    .select("id, nombre_clinica")
    .eq("activo", true)
    .order("nombre_clinica");
  return data || [];
}

export async function getPresupuestosPaginadosAction({
  page = 1,
  pageSize = 10,
  query = "",
  filtro = "todos",
  sedeId = "",
}: {
  page?: number;
  pageSize?: number;
  query?: string;
  filtro?: string;
  sedeId?: string;
}) {
  const adminClient = getAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let baseQuery = adminClient
    .from("presupuestos")
    .select(`
      id, fecha_emision, total_bruto, descuento_monto, estado, notas,
      paciente:paciente_id (
        id, nombre, apellido, dni,
        sede:sede_id (id, nombre_clinica)
      ),
      doctor:doctor_id (id),
      movimiento_caja ( id, monto, estado ),
      cuotas ( id, numero_cuota, monto, estado, fecha_vencimiento, movimiento_caja_id ),
      detalle_presupuesto ( catalogo_tratamientos (nombre, moneda) )
    `, { count: "exact" });

  // Filtro por Estado
  if (filtro === "pendientes") {
    baseQuery = baseQuery.eq("estado", "aprobado");
  } else if (filtro === "pagados") {
    baseQuery = baseQuery.eq("estado", "pagado");
  } else if (filtro === "rechazados") {
    baseQuery = baseQuery.in("estado", ["rechazado", "anulado"]);
  }

  // Ordenar descendente por fecha
  baseQuery = baseQuery.order("fecha_emision", { ascending: false });

  // Traer lista paginada
  const { data: rawList, error, count } = await baseQuery.range(from, to);

  if (error) {
    console.error("Error buscando presupuestos:", error);
    return { data: [], total: 0, totalPages: 1 };
  }

  // Resolver doctores y mapear info enriquecida
  const doctorUserIds = Array.from(new Set((rawList || []).map((p: any) => p.doctor_id).filter(Boolean)));
  let doctorMap = new Map<string, string>();
  if (doctorUserIds.length > 0) {
    const { data: docData } = await adminClient
      .from("personal")
      .select("usuario_id, nombre, apellido")
      .in("usuario_id", doctorUserIds);
    (docData || []).forEach((d: any) => {
      doctorMap.set(String(d.usuario_id), `${d.nombre ?? ""} ${d.apellido ?? ""}`.trim());
    });
  }

  const processed = (rawList || []).map((p: any) => {
    const pac = Array.isArray(p.paciente) ? p.paciente[0] : p.paciente;
    const pacSede = pac ? (Array.isArray(pac.sede) ? pac.sede[0] : pac.sede) : null;
    const totalNeto = Number(p.total_bruto) - Number(p.descuento_monto || 0);

    const pagosConfirmados = (p.movimiento_caja || [])
      .filter((m: any) => m.estado === "confirmado")
      .reduce((acc: number, curr: any) => acc + Math.abs(Number(curr.monto)), 0);

    const cuotasList = (p.cuotas || []).sort((a: any, b: any) => a.numero_cuota - b.numero_cuota);
    const cuotasPendientesCount = cuotasList.filter((c: any) => c.estado === "pendiente" && !c.movimiento_caja_id).length;

    const saldo = p.estado === "pagado" ? 0 : Math.max(0, totalNeto - pagosConfirmados);
    const esPagado = p.estado === "pagado" || (saldo <= 0.009 && pagosConfirmados > 0);

    const detalles = Array.isArray(p.detalle_presupuesto) ? p.detalle_presupuesto : (p.detalle_presupuesto ? [p.detalle_presupuesto] : []);
    const tratamientos = detalles
      .map((d: any) => {
        const c = Array.isArray(d.catalogo_tratamientos) ? d.catalogo_tratamientos[0] : d.catalogo_tratamientos;
        return c?.nombre;
      })
      .filter(Boolean);

    const primerCat = (detalles[0] as any)?.catalogo_tratamientos;
    const moneda = (Array.isArray(primerCat) ? primerCat[0]?.moneda : primerCat?.moneda) || "PEN";

    return {
      id: p.id,
      fecha_emision: p.fecha_emision,
      estado: p.estado,
      es_pagado: esPagado,
      total_neto: totalNeto,
      pagado: pagosConfirmados,
      saldo: saldo,
      moneda: moneda,
      paciente: pac ? {
        id: pac.id,
        nombre_completo: `${pac.nombre ?? ""} ${pac.apellido ?? ""}`.trim(),
        dni: pac.dni,
        sede_nombre: pacSede?.nombre_clinica || "Sede MaraDental",
        sede_id: pacSede?.id,
      } : null,
      doctor_nombre: doctorMap.get(String(p.doctor_id)) || "Doctor",
      tratamientos: tratamientos.join(" + ") || "Tratamiento Odontológico",
      cuotas: cuotasList,
      cuotas_pendientes_count: cuotasPendientesCount,
      movimientos: p.movimiento_caja || [],
    };
  });

  // Filtro adicional en memoria por query o sedeId si fue aplicado
  let finalList = processed;
  if (query.trim()) {
    const q = query.toLowerCase().trim();
    finalList = finalList.filter((p: any) =>
      p.paciente?.nombre_completo.toLowerCase().includes(q) ||
      (p.paciente?.dni && p.paciente.dni.includes(q))
    );
  }

  if (sedeId) {
    finalList = finalList.filter((p: any) => String(p.paciente?.sede_id) === String(sedeId));
  }

  const totalRecords = count ?? finalList.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  return {
    data: finalList,
    total: totalRecords,
    totalPages: totalPages,
  };
}

// -----------------------------------------------------------------------------
// Dashboard y KPIs
// -----------------------------------------------------------------------------

export async function getDashboardContadorAction() {
  const adminClient = getAdminClient();
  const now = new Date();
  
  // 1. Obtener Cuentas por Cobrar Total (todos los presupuestos aprobados con saldo pendiente de pago)
  const { data: presupuestosAprobados } = await adminClient
    .from("presupuestos")
    .select(`
      id, total_bruto, descuento_monto, estado,
      movimiento_caja ( id, monto, estado )
    `)
    .eq("estado", "aprobado");

  let totalPorCobrar = 0;
  (presupuestosAprobados || []).forEach((p: any) => {
    const totalNeto = Number(p.total_bruto) - Number(p.descuento_monto || 0);
    const pagosConfirmados = (p.movimiento_caja || [])
      .filter((m: any) => m.estado === "confirmado")
      .reduce((acc: number, curr: any) => acc + Math.abs(Number(curr.monto)), 0);
    const saldo = Math.max(0, totalNeto - pagosConfirmados);
    totalPorCobrar += saldo;
  });
  
  // 2. Obtener movimientos confirmados (excluyendo anulados)
  const { data: movimientos, error: movErr } = await adminClient
    .from("movimiento_caja")
    .select(`
      fecha, monto, estado, observacion,
      categoria:categoria_id(nombre, tipo)
    `)
    .eq("estado", "confirmado");
    
  if (movErr) throw movErr;
  
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let ingresosMes = 0;
  let egresosMes = 0;
  let devolucionesMes = 0;
  
  // Para evolución de los últimos 6 meses
  const ultimos6Meses: { [key: string]: { name: string, ingresos: number, egresos: number, devoluciones: number, monthValue: number } } = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const monthName = d.toLocaleString('es-ES', { month: 'short' });
    ultimos6Meses[key] = {
      name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      ingresos: 0,
      egresos: 0,
      devoluciones: 0,
      monthValue: d.getTime()
    };
  }

  // Agrupar movimientos separando devoluciones de egresos operativos
  (movimientos || []).forEach((m: any) => {
    const d = new Date(m.fecha);
    const mYear = d.getFullYear();
    const mMonth = d.getMonth();
    const rawMonto = Number(m.monto);
    const montoAbs = Math.abs(rawMonto);

    const cat = Array.isArray(m.categoria) ? m.categoria[0] : m.categoria;
    const catNombre = (cat?.nombre || "").toLowerCase();
    const obs = (m.observacion || "").toLowerCase();
    const esDevolucion = catNombre.includes("devoluci") || obs.includes("devoluci");

    const isIngreso = cat?.tipo === "I" && !esDevolucion && rawMonto > 0;
    const isEgreso = (cat?.tipo === "E" || rawMonto < 0) && !esDevolucion;
    
    // Si es del mes actual
    if (mYear === currentYear && mMonth === currentMonth) {
      if (esDevolucion) {
        devolucionesMes += montoAbs;
      } else if (isIngreso) {
        ingresosMes += montoAbs;
      } else if (isEgreso) {
        egresosMes += montoAbs;
      }
    }
    
    // Para gráfica de evolución (6 meses)
    const key = `${mYear}-${mMonth}`;
    if (ultimos6Meses[key]) {
      if (esDevolucion) {
        ultimos6Meses[key].devoluciones += montoAbs;
      } else if (isIngreso) {
        ultimos6Meses[key].ingresos += montoAbs;
      } else if (isEgreso) {
        ultimos6Meses[key].egresos += montoAbs;
      }
    }
  });

  const chartEvolucion = Object.values(ultimos6Meses).sort((a, b) => a.monthValue - b.monthValue);

  return {
    kpis: {
      ingresosMes,
      egresosMes,
      devolucionesMes,
      balanceMes: ingresosMes - egresosMes - devolucionesMes,
      totalPorCobrar
    },
    chartEvolucion
  };
}

// -----------------------------------------------------------------------------
// Reportes (Excel)
// -----------------------------------------------------------------------------

export async function getReporteFinancieroAction(startDate: string, endDate: string) {
  const adminClient = getAdminClient();
  
  // Obtener movimientos en el rango de fechas
  const { data: movimientos, error } = await adminClient
    .from("movimiento_caja")
    .select(`
      id, fecha, monto, observacion, referencia, estado, motivo_anulacion, fecha_anulacion,
      categoria:categoria_id(nombre, tipo, afecto_igv, cuenta_contable),
      moneda:tipo_moneda_id(moneda),
      medio_pago:medio_pago_id(id, nombre),
      caja_turno:caja_turno_id(sede:sede_id(nombre_clinica)),
      presupuestos:presupuesto_id(
        id,
        pacientes(nombre, apellido, dni)
      )
    `)
    .gte("fecha", startDate + "T00:00:00Z")
    .lte("fecha", endDate + "T23:59:59Z")
    .order("fecha", { ascending: true });
    
  if (error) throw error;
  
  // Obtener comprobantes emitidos en el rango
  const { data: comprobantes, error: compErr } = await adminClient
    .from("comprobante_pago")
    .select(`
      id, fecha_emision, tipo_comprobante, serie, numero, moneda, monto_total, estado, motivo_anulacion, fecha_anulacion, movimiento_caja_id,
      paciente:paciente_id(id, nombre, apellido, dni),
      cliente:cliente_id(id, nombre, apellidos, dni, pasaporte, carnet_extranjeria),
      movimiento:movimiento_caja_id(id, estado, monto, fecha, medio_pago:medio_pago_id(nombre))
    `)
    .gte("fecha_emision", startDate + "T00:00:00Z")
    .lte("fecha_emision", endDate + "T23:59:59Z")
    .order("fecha_emision", { ascending: true });
    
  if (compErr) throw compErr;
  
  return {
    movimientos: (movimientos || []).map((m: any) => {
      const cat = Array.isArray(m.categoria) ? m.categoria[0] : m.categoria;
      const catNombre = (cat?.nombre || "").toLowerCase();
      const obs = (m.observacion || "").toLowerCase();
      const esDevolucion = catNombre.includes("devoluci") || obs.includes("devoluci");

      let pacienteNombre = "";
      if (m.presupuestos) {
        const p = Array.isArray(m.presupuestos) ? m.presupuestos[0] : m.presupuestos;
        const pac = p ? (Array.isArray(p.pacientes) ? p.pacientes[0] : p.pacientes) : null;
        if (pac) pacienteNombre = `${pac.nombre ?? ""} ${pac.apellido ?? ""}`.trim();
      }

      return {
        ...m,
        es_devolucion: esDevolucion,
        paciente_nombre: pacienteNombre,
        sede_nombre: m.caja_turno?.sede?.nombre_clinica || "Sede Principal",
      };
    }),
    comprobantes: (comprobantes || []).map((c: any) => {
      let doc = "-";
      let nombre = "Consumidor Final";
      let tipo = "General";

      if (c.cliente) {
        doc = c.cliente.dni || c.cliente.pasaporte || c.cliente.carnet_extranjeria || "-";
        nombre = `${c.cliente.nombre} ${c.cliente.apellidos || ""}`.trim();
        tipo = "Tercero";
      } else if (c.paciente) {
        doc = c.paciente.dni || "-";
        nombre = `${c.paciente.nombre} ${c.paciente.apellido || ""}`.trim();
        tipo = "Paciente";
      }

      return {
        ...c,
        receptor_nombre: nombre,
        receptor_doc: doc,
        receptor_tipo: tipo,
        movimiento_estado: c.movimiento?.estado || "Sin movimiento",
      };
    })
  };
}
