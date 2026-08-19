"use server";

import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("caja_turno")
    .select(`
      id, fecha_apertura, fecha_cierre, usuario_id,
      sede:sede_id (id, nombre_clinica)
    `)
    .order("fecha_apertura", { ascending: false });
  
  if (error) throw error;

  // Para cada turno, calculamos un aproximado de ingresos/egresos si queremos, 
  // pero lo haremos más simple o con una vista en la BD si existe.
  // Por ahora lo resolvemos consultando movimientos
  const { data: movimientos, error: movError } = await supabase
    .from("movimiento_caja")
    .select("caja_turno_id, monto, categoria:categoria_id (tipo)")
    .eq("estado", "confirmado");
    
  if (movError) throw movError;

  const userIds = Array.from(new Set(data.map(d => d.usuario_id)));
  let personalData: any[] = [];
  if (userIds.length > 0) {
    const { data: pd } = await supabase.from("personal").select("usuario_id, email, nombre, apellido").in("usuario_id", userIds);
    personalData = pd || [];
  }

  return data.map((turno: any) => {
    const movs = movimientos.filter(m => m.caja_turno_id === turno.id);
    const ingresos = movs.filter(m => m.categoria?.tipo === 'I').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const egresos = movs.filter(m => m.categoria?.tipo === 'E').reduce((acc, curr) => acc + Number(curr.monto), 0);
    
    return {
      ...turno,
      usuario: personalData.find(p => p.usuario_id === turno.usuario_id) || null,
      ingresos,
      egresos,
      balance: ingresos - egresos
    };
  });
}

export async function getMovimientosCajaAction(turnoId: string) {
  const supabase = await createClient();
  
  // Obtener la información del turno
  const { data: turno, error: turnoErr } = await supabase
    .from("caja_turno")
    .select(`
      *,
      sede:sede_id (nombre_clinica)
    `)
    .eq("id", turnoId)
    .single();
    
  if (turnoErr) throw turnoErr;
  
  // Obtener los movimientos
  const { data: movimientos, error: movErr } = await supabase
    .from("movimiento_caja")
    .select(`
      *,
      moneda:tipo_moneda_id (moneda),
      categoria:categoria_id (nombre, tipo),
      medio_pago:medio_pago_id (nombre)
    `)
    .eq("caja_turno_id", turnoId)
    .order("fecha", { ascending: true });
    
  if (movErr) throw movErr;
  
  const allUserIds = new Set<string>();
  if (turno.usuario_id) allUserIds.add(turno.usuario_id);
  movimientos.forEach(m => {
    if (m.usuario_id) allUserIds.add(m.usuario_id);
  });
  
  let personalData: any[] = [];
  if (allUserIds.size > 0) {
    const { data: pd } = await supabase.from("personal").select("usuario_id, email, nombre, apellido").in("usuario_id", Array.from(allUserIds));
    personalData = pd || [];
  }
  
  turno.usuario = personalData.find(p => p.usuario_id === turno.usuario_id) || null;
  const movsMap = movimientos.map((m: any) => ({
    ...m,
    usuario: personalData.find(p => p.usuario_id === m.usuario_id) || null
  }));
  
  return { turno, movimientos: movsMap };
}

export async function toggleConciliadoAction(movimientoId: string, conciliado: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comprobante_pago")
    .select(`
      *,
      paciente:paciente_id (nombre, apellido),
      cliente:cliente_id (nombre, apellidos)
    `)
    .order("fecha_emision", { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function anularComprobanteAction(id: string, motivo: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("comprobante_pago")
    .update({ 
      estado: "anulado", 
      motivo_anulacion: motivo,
      anulado_por: user.id,
      fecha_anulacion: new Date().toISOString()
    })
    .eq("id", id);
    
  if (error) return { success: false, error: error.message };
  
  // Opcional: anular también el movimiento de caja asociado
  await supabase
    .from("movimiento_caja")
    .update({ 
      estado: "anulado",
      motivo_anulacion: motivo,
      anulado_por: user.id,
      fecha_anulacion: new Date().toISOString()
    })
    .eq("comprobante_pago_id", id);

  return { success: true };
}

// -----------------------------------------------------------------------------
// Cuentas por Cobrar (Cuotas Pendientes)
// -----------------------------------------------------------------------------

export async function getCuentasPorCobrarAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cuotas")
    .select(`
      *,
      presupuesto:presupuesto_id (
        id, total_bruto,
        paciente:paciente_id (nombre, apellido)
      )
    `)
    .eq("estado", "pendiente")
    .order("fecha_vencimiento", { ascending: true });
  
  if (error) throw error;
  return data;
}

// -----------------------------------------------------------------------------
// Presupuestos
// -----------------------------------------------------------------------------

export async function getPresupuestosAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("presupuestos")
    .select(`
      *,
      paciente:paciente_id (nombre, apellido),
      doctor:doctor_id (id)
    `)
    .order("fecha_emision", { ascending: false });
  
  if (error) throw error;
  
  const userIds = Array.from(new Set(data.map(d => d.doctor_id)));
  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from("personal")
      .select("usuario_id, nombre, apellido")
      .in("usuario_id", userIds);
      
    return data.map(d => ({
      ...d,
      doctor_info: usersData?.find((u: any) => u.usuario_id === d.doctor_id) || null
    }));
  }
  
  return data;
}

// -----------------------------------------------------------------------------
// Dashboard y KPIs
// -----------------------------------------------------------------------------

export async function getDashboardContadorAction() {
  const supabase = await createClient();
  const now = new Date();
  
  // 1. Obtener Cuentas por Cobrar Total
  const { data: pendientes } = await supabase
    .from("cuotas")
    .select("monto")
    .eq("estado", "pendiente");
    
  const totalPorCobrar = (pendientes || []).reduce((acc, curr) => acc + Number(curr.monto), 0);
  
  // 2. Obtener movimientos confirmados
  // No filtramos por mes aquí para poder construir la data de los últimos 6 meses.
  // En un sistema muy grande, esto debería hacerse con una función RPC en DB.
  const { data: movimientos, error: movErr } = await supabase
    .from("movimiento_caja")
    .select("fecha, monto, categoria_id, estado, sede:caja_turno_id(sede_id), categoria:categoria_id(tipo)")
    .eq("estado", "confirmado");
    
  if (movErr) throw movErr;
  
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let ingresosMes = 0;
  let egresosMes = 0;
  
  // Para evolución de los últimos 6 meses
  const ultimos6Meses: { [key: string]: { name: string, ingresos: number, egresos: number, monthValue: number } } = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const monthName = d.toLocaleString('es-ES', { month: 'short' });
    ultimos6Meses[key] = { name: monthName, ingresos: 0, egresos: 0, monthValue: d.getTime() };
  }

  // Agrupar movimientos
  (movimientos || []).forEach((m: any) => {
    const d = new Date(m.fecha);
    const mYear = d.getFullYear();
    const mMonth = d.getMonth();
    const isIngreso = m.categoria?.tipo === 'I';
    const monto = Number(m.monto);
    
    // Si es del mes actual
    if (mYear === currentYear && mMonth === currentMonth) {
      if (isIngreso) ingresosMes += monto;
      else egresosMes += monto;
    }
    
    // Para gráfica de evolución (6 meses)
    const key = `${mYear}-${mMonth}`;
    if (ultimos6Meses[key]) {
      if (isIngreso) ultimos6Meses[key].ingresos += monto;
      else ultimos6Meses[key].egresos += monto;
    }
  });

  const chartEvolucion = Object.values(ultimos6Meses).sort((a, b) => a.monthValue - b.monthValue);

  return {
    kpis: {
      ingresosMes,
      egresosMes,
      balanceMes: ingresosMes - egresosMes,
      totalPorCobrar
    },
    chartEvolucion
  };
}

// -----------------------------------------------------------------------------
// Reportes (Excel)
// -----------------------------------------------------------------------------

export async function getReporteFinancieroAction(startDate: string, endDate: string) {
  const supabase = await createClient();
  
  // Obtener movimientos en el rango de fechas
  const { data: movimientos, error } = await supabase
    .from("movimiento_caja")
    .select(`
      id, fecha, monto, observacion, referencia, estado,
      categoria:categoria_id(nombre, tipo, afecto_igv, cuenta_contable),
      moneda:tipo_moneda_id(moneda),
      medio_pago:medio_pago_id(nombre),
      sede:caja_turno_id(sede_id)
    `)
    .gte("fecha", startDate + "T00:00:00Z")
    .lte("fecha", endDate + "T23:59:59Z")
    .order("fecha", { ascending: true });
    
  if (error) throw error;
  
  // Obtener comprobantes emitidos en el rango
  const { data: comprobantes, error: compErr } = await supabase
    .from("comprobante_pago")
    .select(`
      id, fecha_emision, tipo_comprobante, serie, numero, moneda, monto_total, estado,
      paciente:paciente_id(nombre, apellido),
      cliente:cliente_id(nombre, apellidos)
    `)
    .gte("fecha_emision", startDate + "T00:00:00Z")
    .lte("fecha_emision", endDate + "T23:59:59Z")
    .order("fecha_emision", { ascending: true });
    
  if (compErr) throw compErr;
  
  return {
    movimientos: movimientos || [],
    comprobantes: comprobantes || []
  };
}
