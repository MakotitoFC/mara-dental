"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function checkCajaAbiertaAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  // Verifica si tiene una caja abierta
  const { data: cajaAbierta, error } = await supabase
    .from("caja_turno")
    .select("id, fecha_apertura")
    .eq("usuario_id", user.id)
    .is("fecha_cierre", null)
    .order("fecha_apertura", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: "Error consultando estado de caja" };

  return { caja: cajaAbierta || null };
}

export async function abrirCajaAction(montosIniciales: { medio_pago_id: number; monto: number }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: usr } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (!usr?.sede_id) return { error: "No se pudo resolver la sede" };

  // 1. Verificar que no tenga ya una caja abierta
  const { data: existente } = await supabase
    .from("caja_turno")
    .select("id")
    .eq("usuario_id", user.id)
    .is("fecha_cierre", null)
    .maybeSingle();

  if (existente) return { error: "Ya existe un turno de caja abierto. Ciérrelo primero." };

  // 2. Abrir caja
  const { data: caja, error: errCaja } = await supabase
    .from("caja_turno")
    .insert({
      sede_id: usr.sede_id,
      usuario_id: user.id,
      fecha_apertura: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (errCaja || !caja) return { error: "No se pudo abrir la caja" };

  // 3. Insertar montos iniciales
  if (montosIniciales.length > 0) {
    const records = montosIniciales.map(m => ({
      caja_turno_id: caja.id,
      medio_pago_id: m.medio_pago_id,
      monto: m.monto,
      evento: "apertura"
    }));
    await supabase.from("medio_pago_caja_monto").insert(records);
  }

  revalidatePath("/pagos");
  return { success: true, caja_id: caja.id };
}

export interface MovimientoCierreItem {
  id: string;
  fecha: string;
  monto: number;
  tipo: "I" | "E";
  medio_pago_id: number;
  medio_pago_nombre: string;
  categoria_nombre: string;
  descripcion: string;
  referencia: string | null;
  paciente_o_entidad: string;
  estado: string;
  conciliado: boolean;
  es_devolucion: boolean;
}

export interface ResumenMedioCierre {
  medio_pago_id: number;
  nombre: string;
  apertura: number;
  ingresos: number;
  egresos: number;
  devoluciones: number;
  neto: number;
  esperado: number;
  es_efectivo: boolean;
}

export interface DetalleCierreCaja {
  caja_id: string;
  fecha_apertura: string;
  sede_nombre: string;
  usuario_nombre: string;
  resumen_medios: ResumenMedioCierre[];
  movimientos: MovimientoCierreItem[];
  total_ingresos: number;
  total_egresos: number;
  total_esperado_efectivo: number;
  apertura_efectivo: number;
  total_movimientos: number;
  total_conciliados: number;
}

export async function getDetalleCierreCajaAction(cajaId: string): Promise<DetalleCierreCaja | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Obtener caja_turno
  const { data: caja, error: cajaErr } = await supabase
    .from("caja_turno")
    .select(`
      id, fecha_apertura, fecha_cierre, sede_id, usuario_id,
      sede ( nombre_clinica )
    `)
    .eq("id", cajaId)
    .single();

  if (cajaErr || !caja) {
    console.error("Error obteniendo caja_turno:", cajaErr);
    return null;
  }

  // 2. Obtener nombre del usuario (personal)
  const { data: per } = await supabase
    .from("personal")
    .select("nombre, apellido")
    .eq("usuario_id", caja.usuario_id)
    .maybeSingle();
  const usuarioNombre = per ? `${per.nombre} ${per.apellido}`.trim() : "Asistente";
  const sedeNombre = (caja.sede as any)?.nombre_clinica || "Sede MaraDental";

  // 3. Obtener todos los medios de pago disponibles
  const { data: mediosPago } = await supabase.from("medio_pago").select("id, nombre").order("id");
  const listaMedios = mediosPago || [];

  // 4. Obtener montos de apertura
  const { data: iniciales } = await supabase
    .from("medio_pago_caja_monto")
    .select("medio_pago_id, monto")
    .eq("caja_turno_id", cajaId)
    .eq("evento", "apertura");

  const mapaApertura = new Map<number, number>();
  (iniciales || []).forEach((i) => mapaApertura.set(i.medio_pago_id, Number(i.monto)));

  // 5. Obtener todos los movimientos del turno
  const { data: movimientosRaw } = await supabase
    .from("movimiento_caja")
    .select(`
      id, fecha, monto, referencia, observacion, estado, conciliado, fecha_conciliacion,
      medio_pago_id,
      medio_pago ( id, nombre ),
      categoria_movimiento:categoria_id ( id, nombre, tipo ),
      cliente_pago:cliente_id ( id, nombre, apellidos ),
      proveedores:proveedor_id ( id, nombre ),
      presupuestos:presupuesto_id (
        id,
        pacientes ( nombre, apellido )
      )
    `)
    .eq("caja_turno_id", cajaId)
    .order("fecha", { ascending: false });

  const movimientosList = movimientosRaw || [];

  // 6. Procesar items individuales
  const items: MovimientoCierreItem[] = [];
  let totalIngresos = 0;
  let totalEgresos = 0;
  let totalConciliados = 0;

  // Mapas por medio de pago
  const mapaIngresos = new Map<number, number>();
  const mapaEgresos = new Map<number, number>();
  const mapaDevoluciones = new Map<number, number>();

  for (const m of movimientosList) {
    const rawMonto = Number(m.monto);
    const cat = Array.isArray(m.categoria_movimiento) ? m.categoria_movimiento[0] : m.categoria_movimiento;
    const isEgreso = (cat?.tipo === "E") || rawMonto < 0;
    const montoAbs = Math.abs(rawMonto);

    const mp = Array.isArray(m.medio_pago) ? m.medio_pago[0] : m.medio_pago;
    const medioId = m.medio_pago_id || mp?.id || 1;
    const medioNombre = mp?.nombre || "Efectivo";

    const catNombre = cat?.nombre || (isEgreso ? "Egreso" : "Ingreso");
    const esDevolucion = catNombre.toLowerCase().includes("devoluci") || (m.observacion || "").toLowerCase().includes("devoluci");

    // Identificar paciente o proveedor
    let entidad = "General";
    if (m.presupuestos) {
      const pres = Array.isArray(m.presupuestos) ? m.presupuestos[0] : m.presupuestos;
      const pac = pres ? (Array.isArray(pres.pacientes) ? pres.pacientes[0] : pres.pacientes) : null;
      if (pac) entidad = `${pac.nombre ?? ""} ${pac.apellido ?? ""}`.trim();
    } else if (m.cliente_pago) {
      const cli = Array.isArray(m.cliente_pago) ? m.cliente_pago[0] : m.cliente_pago;
      if (cli) entidad = `${cli.nombre ?? ""} ${cli.apellidos ?? ""}`.trim();
    } else if (m.proveedores) {
      const prov = Array.isArray(m.proveedores) ? m.proveedores[0] : m.proveedores;
      if (prov) entidad = prov.nombre;
    }

    const isConciliado = Boolean(m.conciliado);
    if (isConciliado) totalConciliados++;

    if (m.estado !== "anulado") {
      if (isEgreso) {
        totalEgresos += montoAbs;
        mapaEgresos.set(medioId, (mapaEgresos.get(medioId) || 0) + montoAbs);
        if (esDevolucion) {
          mapaDevoluciones.set(medioId, (mapaDevoluciones.get(medioId) || 0) + montoAbs);
        }
      } else {
        totalIngresos += montoAbs;
        mapaIngresos.set(medioId, (mapaIngresos.get(medioId) || 0) + montoAbs);
      }
    }

    items.push({
      id: m.id,
      fecha: m.fecha,
      monto: montoAbs,
      tipo: isEgreso ? "E" : "I",
      medio_pago_id: medioId,
      medio_pago_nombre: medioNombre,
      categoria_nombre: catNombre,
      descripcion: m.observacion || (isEgreso ? "Egreso de caja" : "Cobro de tratamiento"),
      referencia: m.referencia || null,
      paciente_o_entidad: entidad,
      estado: m.estado || "confirmado",
      conciliado: isConciliado,
      es_devolucion: esDevolucion,
    });
  }

  // 7. Consolidar resumen por cada medio de pago
  const resumenMedios: ResumenMedioCierre[] = listaMedios.map((mp) => {
    const esEfectivo = mp.nombre.toLowerCase().includes("efectivo");
    const apertura = mapaApertura.get(mp.id) || 0;
    const ingresos = mapaIngresos.get(mp.id) || 0;
    const egresos = mapaEgresos.get(mp.id) || 0;
    const devoluciones = mapaDevoluciones.get(mp.id) || 0;
    const neto = ingresos - egresos;
    const esperado = esEfectivo ? (apertura + neto) : neto;

    return {
      medio_pago_id: mp.id,
      nombre: mp.nombre,
      apertura,
      ingresos,
      egresos,
      devoluciones,
      neto,
      esperado,
      es_efectivo: esEfectivo,
    };
  });

  const efectivoObj = resumenMedios.find((r) => r.es_efectivo);
  const aperturaEfectivo = efectivoObj ? efectivoObj.apertura : 0;
  const totalEsperadoEfectivo = efectivoObj ? efectivoObj.esperado : 0;

  return {
    caja_id: cajaId,
    fecha_apertura: caja.fecha_apertura,
    sede_nombre: sedeNombre,
    usuario_nombre: usuarioNombre,
    resumen_medios: resumenMedios,
    movimientos: items,
    total_ingresos: totalIngresos,
    total_egresos: totalEgresos,
    total_esperado_efectivo: totalEsperadoEfectivo,
    apertura_efectivo: aperturaEfectivo,
    total_movimientos: items.length,
    total_conciliados: totalConciliados,
  };
}

export async function toggleConciliacionMovimientoAction(movimientoId: string, conciliado: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("movimiento_caja")
    .update({
      conciliado: conciliado,
      fecha_conciliacion: conciliado ? new Date().toISOString() : null,
    })
    .eq("id", movimientoId);

  if (error) return { error: "Error actualizando estado de conciliación" };
  return { success: true };
}

export async function conciliarTodosMovimientosAction(cajaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("movimiento_caja")
    .update({
      conciliado: true,
      fecha_conciliacion: new Date().toISOString(),
    })
    .eq("caja_turno_id", cajaId);

  if (error) return { error: "Error conciliando movimientos" };
  return { success: true };
}

export async function cerrarCajaAction(
  cajaId: string,
  montosCierre: { medio_pago_id: number; monto: number }[],
  observaciones?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  // 1. Cerrar turno en caja_turno
  const { error: errCierre } = await supabase
    .from("caja_turno")
    .update({ fecha_cierre: new Date().toISOString() })
    .eq("id", cajaId);

  if (errCierre) return { error: "No se pudo cerrar la caja" };

  // 2. Insertar montos de cierre
  if (montosCierre.length > 0) {
    const records = montosCierre.map((m) => ({
      caja_turno_id: cajaId,
      medio_pago_id: m.medio_pago_id,
      monto: m.monto,
      evento: "cierre",
    }));
    await supabase.from("medio_pago_caja_monto").insert(records);
  }

  // 3. Confirmar y marcar todos los movimientos del turno como conciliados
  await supabase
    .from("movimiento_caja")
    .update({
      estado: "confirmado",
      conciliado: true,
      fecha_conciliacion: new Date().toISOString(),
    })
    .eq("caja_turno_id", cajaId);

  revalidatePath("/pagos");
  return { success: true };
}

export async function getMontosEsperadosCajaAction(cajaId: string) {
  const detalle = await getDetalleCierreCajaAction(cajaId);
  if (!detalle) return [];
  return detalle.resumen_medios.map((r) => ({
    medio_pago_id: r.medio_pago_id,
    monto: r.esperado,
  }));
}

export async function getMediosPagoParaCajaAction() {
  const supabase = await createClient();
  const { data } = await supabase.from("medio_pago").select("id, nombre").order("nombre");
  return data || [];
}

export async function getCategoriasIngresoAction() {
  const supabase = await createClient();
  const { data } = await supabase.from("categoria_movimiento").select("id, nombre").eq("tipo", "I").eq("activo", true).order("nombre");
  return data || [];
}

export async function getCategoriasEgresoAction() {
  const supabase = await createClient();
  const { data } = await supabase.from("categoria_movimiento").select("id, nombre").eq("tipo", "E").eq("activo", true).order("nombre");
  return data || [];
}

export async function getTiposMonedaAction() {
  const supabase = await createClient();
  const { data } = await supabase.from("tipo_moneda").select("id, moneda").order("id");
  return data || [];
}

export async function searchProveedoresAction(query: string) {
  if (!query) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("proveedores")
    .select("id, nombre, ruc")
    .or(`nombre.ilike.%${query}%,ruc.ilike.%${query}%`)
    .limit(10);
  return data || [];
}

export async function searchClientesPagoAction(query: string) {
  if (!query) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("cliente_pago")
    .select("id, nombre, apellidos, dni, pasaporte, carnet_extranjeria")
    .or(`nombre.ilike.%${query}%,apellidos.ilike.%${query}%,dni.ilike.%${query}%,pasaporte.ilike.%${query}%,carnet_extranjeria.ilike.%${query}%`)
    .limit(10);
  return data || [];
}

export async function registrarMovimientoLibreAction(data: {
  caja_turno_id: string;
  monto: number;
  categoria_id: number;
  medio_pago_id: number;
  tipo_moneda_id: number;
  referencia: string;
  observacion: string;
  tipo: "I" | "E";
  tipo_comprobante?: string;
  proveedor?: {
    id?: string;
    nombre?: string;
    ruc?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
  };
  cliente_pago?: {
    id?: number;
    nombres?: string;
    apellidos?: string;
    tipo_documento?: string;
    numero_documento?: string;
  };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: usr } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (!usr?.sede_id) return { error: "No se pudo resolver la sede" };

  let proveedorId = data.proveedor?.id || null;
  if (data.tipo === "E" && data.proveedor && !proveedorId) {
    const { data: newProv, error: pErr } = await supabase.from("proveedores").insert({
      nombre: data.proveedor.nombre,
      ruc: data.proveedor.ruc || null,
      telefono: data.proveedor.telefono || null,
      email: data.proveedor.email || null,
      estado: "confirmado"
    }).select("id").single();
    if (pErr) return { error: "No se pudo registrar el nuevo proveedor" };
    proveedorId = newProv.id;
  }

  let clientePId = data.cliente_pago?.id || null;
  if (data.tipo === "I" && data.cliente_pago && !clientePId) {
    const { data: newCli, error: cliErr } = await supabase.from("cliente_pago").insert({
      nombre: data.cliente_pago.nombres,
      apellidos: data.cliente_pago.apellidos,
      dni: data.cliente_pago.tipo_documento === "DNI" ? data.cliente_pago.numero_documento : null,
      pasaporte: data.cliente_pago.tipo_documento === "Pasaporte" ? data.cliente_pago.numero_documento : null,
      carnet_extranjeria: data.cliente_pago.tipo_documento === "CE" ? data.cliente_pago.numero_documento : null,
    }).select("id").single();
    if (cliErr) return { error: "No se pudo registrar el nuevo cliente" };
    clientePId = newCli.id;
  }

  // Generar comprobante de pago
  let comprobanteId = null;
  const tipoComp = data.tipo_comprobante || (data.tipo === "I" ? "boleta" : "recibo");
  const { data: comp, error: compErr } = await supabase.from("comprobante_pago").insert({
    sede_id: usr.sede_id,
    tipo_comprobante: tipoComp,
    cliente_id: clientePId,
    moneda: "PEN",
    monto_exonerado: Math.abs(data.monto),
    monto_total: Math.abs(data.monto),
    emitido_por: user.id,
    estado: "emitido"
  }).select("id").single();

  if (!compErr && comp) {
    comprobanteId = comp.id;
  }

  const { data: mov, error } = await supabase.from("movimiento_caja").insert({
    caja_turno_id: data.caja_turno_id,
    monto: data.tipo === "E" ? -Math.abs(data.monto) : Math.abs(data.monto),
    categoria_id: data.categoria_id,
    medio_pago_id: data.medio_pago_id,
    proveedor_id: proveedorId,
    cliente_id: clientePId,
    referencia: data.referencia || null,
    observacion: data.observacion || null,
    usuario_id: user.id,
    estado: "confirmado",
    comprobante_pago_id: comprobanteId,
    tipo_moneda_id: data.tipo_moneda_id
  }).select("id").single();

  if (error) {
    console.error("Error al registrar movimiento libre:", error.message);
    return { error: "No se pudo registrar el movimiento." };
  }

  if (comprobanteId && mov) {
    await supabase.from("comprobante_pago").update({ movimiento_caja_id: mov.id }).eq("id", comprobanteId);
  }

  revalidatePath("/pagos");
  return { success: true, movimiento_id: mov?.id };
}
