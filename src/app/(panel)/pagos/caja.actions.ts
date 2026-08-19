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

export async function cerrarCajaAction(cajaId: string, montosCierre: { medio_pago_id: number; monto: number }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  // 1. Cerrar caja
  const { error: errCierre } = await supabase
    .from("caja_turno")
    .update({ fecha_cierre: new Date().toISOString() })
    .eq("id", cajaId)
    .eq("usuario_id", user.id);

  if (errCierre) return { error: "No se pudo cerrar la caja" };

  // 2. Insertar montos de cierre
  if (montosCierre.length > 0) {
    const records = montosCierre.map(m => ({
      caja_turno_id: cajaId,
      medio_pago_id: m.medio_pago_id,
      monto: m.monto,
      evento: "cierre"
    }));
    await supabase.from("medio_pago_caja_monto").insert(records);
  }

  // 3. Confirmar movimientos (conciliación automática por defecto)
  await supabase
    .from("movimiento_caja")
    .update({ estado: "confirmado", conciliado: true, fecha_conciliacion: new Date().toISOString() })
    .eq("caja_turno_id", cajaId)
    .eq("estado", "pendiente");

  revalidatePath("/pagos");
  return { success: true };
}

export async function getMontosEsperadosCajaAction(cajaId: string) {
  const supabase = await createClient();
  
  const { data: iniciales } = await supabase
    .from("medio_pago_caja_monto")
    .select("medio_pago_id, monto")
    .eq("caja_turno_id", cajaId)
    .eq("evento", "apertura");

  const { data: movimientos } = await supabase
    .from("movimiento_caja")
    .select("medio_pago_id, monto, categoria_movimiento ( tipo )")
    .eq("caja_turno_id", cajaId)
    .neq("estado", "anulado");

  const esperados = new Map<number, number>();
  
  if (iniciales) {
    iniciales.forEach(i => esperados.set(i.medio_pago_id, Number(i.monto)));
  }

  if (movimientos) {
    movimientos.forEach((m: any) => {
      const isEgreso = m.categoria_movimiento?.tipo === "E" || Number(m.monto) < 0;
      const amount = Math.abs(Number(m.monto));
      const current = esperados.get(m.medio_pago_id) || 0;
      esperados.set(m.medio_pago_id, isEgreso ? current - amount : current + amount);
    });
  }

  return Array.from(esperados.entries()).map(([medio_pago_id, monto]) => ({ medio_pago_id, monto }));
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

  let proveedorId = data.proveedor?.id || null;
  if (data.tipo === "E" && data.proveedor && !proveedorId) {
    const { data: newProv, error: pErr } = await supabase.from("proveedores").insert({
      nombre: data.proveedor.nombre,
      ruc: data.proveedor.ruc || null,
      telefono: data.proveedor.telefono || null,
      email: data.proveedor.email || null,
      estado: "confirmado" // No activo boolean, just creating with confirm
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

  const { error } = await supabase.from("movimiento_caja").insert({
    caja_turno_id: data.caja_turno_id,
    monto: data.tipo === "E" ? -Math.abs(data.monto) : Math.abs(data.monto),
    categoria_id: data.categoria_id,
    medio_pago_id: data.medio_pago_id,
    proveedor_id: proveedorId,
    cliente_id: clientePId,
    referencia: data.referencia || null,
    observacion: data.observacion || null,
    usuario_id: user.id,
    estado: "pendiente",
    tipo_moneda_id: data.tipo_moneda_id
  });

  if (error) {
    console.error("Error al registrar movimiento libre:", error.message);
    return { error: "No se pudo registrar el movimiento." };
  }

  revalidatePath("/pagos");
  return { success: true };
}
