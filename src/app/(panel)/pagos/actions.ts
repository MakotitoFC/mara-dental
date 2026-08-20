"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export interface CuotaPendiente {
  id: string;
  numero_cuota: number;
  monto: number;
  fecha_vencimiento: string;
  estado: string;
  movimiento_caja_id?: string | null;
}

export interface PresupuestoPendiente {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  paciente_documento: string | null;
  telegram_chat_id: string | null;
  fecha_emision: string;
  estado?: string;
  esPagado?: boolean;
  tratamiento: string;
  total_neto: number;
  pagado: number;
  saldo: number;
  moneda: string;
  cuotas: CuotaPendiente[];
}

export interface PagoHistorial {
  id: string;
  paciente_nombre: string;
  monto: number;
  tipo?: "I" | "E";
  medio_pago_nombre: string;
  categoria_nombre?: string;
  fecha_pago: string;
  moneda: string;
}

export interface MetodoPagoResumen {
  nombre: string;
  monto: number;
  porcentaje: number;
}

export interface PagosDashboardSede {
  pendientes: PresupuestoPendiente[];
  ingresosHoy: number;
  egresosHoy: number;
  comprobantesHoy: number;
  metodosPago: MetodoPagoResumen[];
  historial: PagoHistorial[];
}

const VACIO: PagosDashboardSede = { pendientes: [], ingresosHoy: 0, egresosHoy: 0, comprobantesHoy: 0, metodosPago: [], historial: [] };

/** Cualquier camino sin datos reales (sin sesión, sin sede, sin pacientes,
 * error de consulta) devuelve el estado vacío real — se loguea el motivo
 * exacto para poder diagnosticar si en algún punto debería haber datos
 * reales y no los hay (RLS, sede mal resuelta, etc). */
function conDiagnostico(motivo: string): PagosDashboardSede {
  console.log(`[getPagosDashboardSedeAction] ${motivo} → sin datos, mostrando estado vacío`);
  return VACIO;
}

/** Panel de pagos de la sede: pendientes de cobro, ingresos/egresos/comprobantes de
 * hoy, desglose por método de pago e historial reciente — todo en una sola
 * consulta. Incluye cobros de presupuestos y movimientos libres (ingresos/egresos). */
export async function getPagosDashboardSedeAction(): Promise<PagosDashboardSede> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return VACIO;

  const { data: usr } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (!usr?.sede_id) return conDiagnostico("No se pudo resolver sede_id del asistente");

  const adminClient = getAdminClient();
  const hoyStr = new Date().toISOString().split("T")[0];
  const inicioMesStr = hoyStr.substring(0, 8) + "01";

  // Obtenemos todos los movimientos de la sede a través del join con caja_turno
  const { data: ultimosMovimientos, error: ultimosErr } = await adminClient
    .from("movimiento_caja")
    .select(`
      id, monto, estado, fecha, observacion,
      categoria:categoria_id ( nombre, tipo ),
      medio_pago ( nombre ), 
      caja_turno!inner ( sede_id ),
      presupuestos ( paciente_id, pacientes ( nombre, apellido ) ),
      cliente_pago ( nombre, apellidos ),
      proveedores ( nombre )
    `)
    .neq("estado", "anulado")
    .eq("caja_turno.sede_id", usr.sede_id)
    .gte("fecha", inicioMesStr)
    .order("fecha", { ascending: false });

  if (ultimosErr) {
    console.error("[getPagosDashboardSedeAction] Error obteniendo movimientos:", ultimosErr.message);
  }

  const pendientes: PresupuestoPendiente[] = []; // Se cargan dinámicamente desde el cliente
  const historialTodo: PagoHistorial[] = [];
  const metodoAcc = new Map<string, number>();
  let ingresosHoy = 0;
  let egresosHoy = 0;
  let comprobantesHoy = 0;

  for (const pg of ultimosMovimientos || []) {
    const medioRaw = (pg as any).medio_pago;
    const medio = Array.isArray(medioRaw) ? medioRaw[0] : medioRaw;
    const nombreMedio = medio?.nombre || "Otro";
    const montoRaw = Number(pg.monto);
    const catRaw = (pg as any).categoria;
    const cat = Array.isArray(catRaw) ? catRaw[0] : catRaw;
    const tipo = cat?.tipo || (montoRaw < 0 ? "E" : "I");
    const montoAbs = Math.abs(montoRaw);

    // Resolver nombre legible del concepto
    let nombreConcepto = "Movimiento";
    const pInfo = (pg as any).presupuestos?.pacientes;
    const pac = Array.isArray(pInfo) ? pInfo[0] : pInfo;
    const cliInfo = (pg as any).cliente_pago;
    const cli = Array.isArray(cliInfo) ? cliInfo[0] : cliInfo;
    const provInfo = (pg as any).proveedores;
    const prov = Array.isArray(provInfo) ? provInfo[0] : provInfo;

    if (pac) {
      nombreConcepto = `${pac.nombre ?? ""} ${pac.apellido ?? ""}`.trim() || "Paciente";
    } else if (cli) {
      nombreConcepto = `${cli.nombre ?? ""} ${cli.apellidos ?? ""}`.trim() || "Cliente Externo";
    } else if (prov) {
      nombreConcepto = prov.nombre || "Proveedor";
    } else if (pg.observacion) {
      nombreConcepto = pg.observacion;
    } else if (cat?.nombre) {
      nombreConcepto = cat.nombre;
    } else {
      nombreConcepto = tipo === "E" ? "Egreso Libre" : "Ingreso Libre";
    }

    if (historialTodo.length < 8) {
      historialTodo.push({
        id: String(pg.id),
        paciente_nombre: nombreConcepto,
        monto: montoAbs,
        tipo: tipo === "E" ? "E" : "I",
        medio_pago_nombre: nombreMedio,
        categoria_nombre: cat?.nombre,
        fecha_pago: pg.fecha,
        moneda: "PEN",
      });
    }

    // Solo sumamos ingresos al desglose de métodos de cobro
    if (tipo === "I") {
      metodoAcc.set(nombreMedio, (metodoAcc.get(nombreMedio) ?? 0) + montoAbs);
    }

    const fechaStr = String(pg.fecha || "");
    if (fechaStr.startsWith(hoyStr)) {
      if (tipo === "E") {
        egresosHoy += montoAbs;
      } else {
        ingresosHoy += montoAbs;
      }
      comprobantesHoy += 1;
    }
  }

  const totalMetodos = Array.from(metodoAcc.values()).reduce((acc, v) => acc + v, 0);
  const metodosPago: MetodoPagoResumen[] = Array.from(metodoAcc.entries())
    .map(([nombre, monto]) => ({ nombre, monto, porcentaje: totalMetodos > 0 ? Math.round((monto / totalMetodos) * 100) : 0 }))
    .sort((a, b) => b.monto - a.monto);

  return {
    pendientes,
    ingresosHoy,
    egresosHoy,
    comprobantesHoy,
    metodosPago,
    historial: historialTodo,
  };
}

/** Envía el comprobante de pago por Telegram (llamada directa a la Bot API,
 * mismo TELEGRAM_TOKEN que usa src/app/api/telegram/route.ts) y deja
 * registro en `mensajes_telegram` para el historial de Comunicaciones del
 * admin. Nunca lanza — si el paciente no tiene Telegram configurado o el
 * envío falla, devuelve un error informativo sin afectar el pago ya guardado. */
export async function enviarVoucherPagoAction(pacienteId: string, chatId: string | null, texto: string) {
  if (!chatId) return { error: "Paciente sin Telegram configurado" };

  const token = process.env.TELEGRAM_TOKEN;
  if (!token) return { error: "Falta configurar TELEGRAM_TOKEN en el backend" };

  let enviado = false;
  let telegramError: string | null = null;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texto }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.description || "Error al enviar el comprobante a Telegram");
    enviado = true;
  } catch (err: any) {
    telegramError = err?.message || "Error al enviar el comprobante";
  }

  try {
    const supabase = await createClient();
    await supabase.from("mensajes_telegram").insert({
      paciente_id: pacienteId,
      tipo_mensaje: "voucher_pago",
      mensaje: texto,
      estado_envio: enviado ? "enviado" : "fallido",
      fecha_envio: new Date().toISOString(),
      chat_id: chatId,
    });
  } catch (logErr) {
    console.error("No se pudo registrar el mensaje en mensajes_telegram:", logErr);
  }

  if (!enviado) return { error: telegramError || "No se pudo enviar el comprobante" };
  return { success: true };
}

export async function buscarPresupuestosPendientesAction(query: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: usr } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (!usr?.sede_id) return [];

  const adminClient = getAdminClient();

  // Handle full names by splitting query
  const parts = query.trim().split(/\s+/).filter(Boolean);
  let orQuery = "";
  if (parts.length === 1) {
    orQuery = `nombre.ilike.%${parts[0]}%,apellido.ilike.%${parts[0]}%,dni.ilike.%${parts[0]}%`;
  } else if (parts.length >= 2) {
    // If multiple words, assume first is name and second is last name, or both in name
    orQuery = `and(nombre.ilike.%${parts[0]}%,apellido.ilike.%${parts[1]}%),and(nombre.ilike.%${parts[0]} ${parts[1]}%)`;
  }

  // Buscar pacientes por nombre o documento en la sede
  const { data: pacientes, error: pacErr } = await adminClient
    .from("pacientes")
    .select("id, nombre, apellido, dni, telegram_chat_id")
    .eq("sede_id", usr.sede_id)
    .eq("activo", true)
    .or(orQuery)
    .limit(20);

  if (pacErr) {
    console.error("Error buscando pacientes:", pacErr.message);
  }

  if (!pacientes || pacientes.length === 0) return [];
  const pacienteIds = pacientes.map(p => String(p.id));
  const pacienteMap = new Map(pacientes.map(p => [String(p.id), p]));

  // Obtener presupuestos aprobados o pagados para estos pacientes
  const { data: presupuestos } = await adminClient
    .from("presupuestos")
    .select(`
      id, fecha_emision, total_bruto, descuento_monto, estado, paciente_id,
      detalle_presupuesto ( id, catalogo_tratamientos ( nombre, moneda ) ),
      movimiento_caja ( id, monto, estado, fecha, medio_pago_id, medio_pago ( nombre ) ),
      cuotas ( id, numero_cuota, monto, fecha_vencimiento, estado, movimiento_caja_id )
    `)
    .in("paciente_id", pacienteIds)
    .in("estado", ["aprobado", "pagado"])
    .order("fecha_emision", { ascending: false });

  const pendientes: PresupuestoPendiente[] = [];

  for (const p of presupuestos || []) {
    const pacienteId = String(p.paciente_id);
    const pac = pacienteMap.get(pacienteId);
    if (!pac) continue;

    const totalNeto = Number(p.total_bruto) - Number(p.descuento_monto || 0);
    const pagosHechos = (p.movimiento_caja || []).filter((pg: any) => pg.estado === "confirmado");
    const pagado = pagosHechos.reduce((acc: number, pg: any) => acc + Number(pg.monto), 0);

    const detalles = Array.isArray(p.detalle_presupuesto) ? p.detalle_presupuesto : (p.detalle_presupuesto ? [p.detalle_presupuesto] : []);
    const nombresTratamiento = detalles
      .map((d: any) => { const c = Array.isArray(d.catalogo_tratamientos) ? d.catalogo_tratamientos[0] : d.catalogo_tratamientos; return c?.nombre; })
      .filter(Boolean);
    const primeraMoneda = (() => {
      const d = detalles[0];
      const c = d ? (Array.isArray(d.catalogo_tratamientos) ? d.catalogo_tratamientos[0] : d.catalogo_tratamientos) : null;
      return c?.moneda || "PEN";
    })();

    const saldo = Math.max(0, totalNeto - pagado);
    const esPagado = p.estado === "pagado" || (saldo <= 0.009 && pagado > 0);

    // Incluir presupuestos con saldo pendiente (aprobados) O totalmente pagados (para solicitar devolución)
    if (saldo > 0.009 || esPagado) {
      pendientes.push({
        id: String(p.id),
        paciente_id: pacienteId,
        paciente_nombre: `${pac.nombre ?? ""} ${pac.apellido ?? ""}`.trim(),
        paciente_documento: pac.dni ?? null,
        telegram_chat_id: pac.telegram_chat_id ?? null,
        fecha_emision: p.fecha_emision,
        estado: p.estado,
        esPagado: esPagado,
        tratamiento: nombresTratamiento.slice(0, 2).join(" + ") || "Tratamiento",
        total_neto: totalNeto,
        pagado,
        saldo: esPagado ? 0 : saldo,
        moneda: primeraMoneda,
        cuotas: (p.cuotas || []).sort((a: any, b: any) => a.numero_cuota - b.numero_cuota),
      });
    }
  }

  return pendientes;
}

/** Obtiene un presupuesto específico por su ID (usado cuando el usuario hace click en una notificación) */
export async function getPresupuestoPorIdAction(presupuestoId: string): Promise<PresupuestoPendiente | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = getAdminClient();
  const { data: p, error } = await adminClient
    .from("presupuestos")
    .select(`
      id, fecha_emision, total_bruto, descuento_monto, estado, paciente_id,
      pacientes ( id, nombre, apellido, dni, telegram_chat_id ),
      detalle_presupuesto ( id, catalogo_tratamientos ( nombre, moneda ) ),
      movimiento_caja ( id, monto, estado, fecha, medio_pago_id, medio_pago ( nombre ) ),
      cuotas ( id, numero_cuota, monto, fecha_vencimiento, estado, movimiento_caja_id )
    `)
    .eq("id", presupuestoId)
    .maybeSingle();

  if (error || !p) return null;

  const pacRaw = (p as any).pacientes;
  const pac = Array.isArray(pacRaw) ? pacRaw[0] : pacRaw;
  const pacienteId = String(p.paciente_id);

  const totalNeto = Number(p.total_bruto) - Number(p.descuento_monto || 0);
  const pagosHechos = (p.movimiento_caja || []).filter((pg: any) => pg.estado === "confirmado");
  const pagado = pagosHechos.reduce((acc: number, pg: any) => acc + Number(pg.monto), 0);

  const detalles = Array.isArray(p.detalle_presupuesto) ? p.detalle_presupuesto : (p.detalle_presupuesto ? [p.detalle_presupuesto] : []);
  const nombresTratamiento = detalles
    .map((d: any) => { const c = Array.isArray(d.catalogo_tratamientos) ? d.catalogo_tratamientos[0] : d.catalogo_tratamientos; return c?.nombre; })
    .filter(Boolean);
  const primeraMoneda = (() => {
    const d = detalles[0];
    const c = d ? (Array.isArray(d.catalogo_tratamientos) ? d.catalogo_tratamientos[0] : d.catalogo_tratamientos) : null;
    return c?.moneda || "PEN";
  })();

  const saldo = Math.max(0, totalNeto - pagado);
  const esPagado = p.estado === "pagado" || (saldo <= 0.009 && pagado > 0);

  return {
    id: String(p.id),
    paciente_id: pacienteId,
    paciente_nombre: pac ? `${pac.nombre ?? ""} ${pac.apellido ?? ""}`.trim() : "Paciente",
    paciente_documento: pac?.dni ?? null,
    telegram_chat_id: pac?.telegram_chat_id ?? null,
    fecha_emision: p.fecha_emision,
    estado: p.estado,
    esPagado: esPagado,
    tratamiento: nombresTratamiento.slice(0, 2).join(" + ") || "Tratamiento",
    total_neto: totalNeto,
    pagado,
    saldo: esPagado ? 0 : saldo,
    moneda: primeraMoneda,
    cuotas: (p.cuotas || []).sort((a: any, b: any) => a.numero_cuota - b.numero_cuota),
  };
}

/** Obtiene todos los detalles de un movimiento de pago para imprimir/descargar su comprobante */
export async function getComprobantePagoDetalleAction(movimientoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = getAdminClient();
  const { data: mov, error } = await adminClient
    .from("movimiento_caja")
    .select(`
      id, monto, fecha, referencia, observacion, estado,
      tipo_moneda ( moneda ),
      medio_pago ( nombre ),
      categoria:categoria_id ( nombre, tipo ),
      comprobante_pago:comprobante_pago!comprobante_pago_movimiento_caja_id_fkey ( id, tipo_comprobante, estado, fecha_emision ),
      caja_turno ( sede:sede_id ( id, nombre_clinica, direccion, telefono, email_contacto ) ),
      cliente_pago:cliente_id ( id, nombre, apellidos, dni, pasaporte, carnet_extranjeria ),
      proveedores:proveedor_id ( id, nombre, ruc, telefono, email, direccion ),
      presupuestos:presupuesto_id (
        id, total_bruto, descuento_monto, estado,
        pacientes ( id, nombre, apellido, dni, telefono, email ),
        detalle_presupuesto ( precio_unitario, catalogo_tratamientos ( nombre, moneda, precio ) ),
        cuotas ( id, numero_cuota, monto, fecha_vencimiento, estado, movimiento_caja_id )
      )
    `)
    .eq("id", movimientoId)
    .maybeSingle();

  if (error || !mov) {
    console.error("[getComprobantePagoDetalleAction] Error:", error);
    return null;
  }

  const sede = (mov.caja_turno as any)?.sede || null;
  const moneda = (mov.tipo_moneda as any)?.moneda || "PEN";
  const medioPago = (mov.medio_pago as any)?.nombre || "Efectivo";
  const comprobante = Array.isArray(mov.comprobante_pago) ? mov.comprobante_pago[0] : mov.comprobante_pago;
  const tipoComprobante = comprobante?.tipo_comprobante || (Number(mov.monto) < 0 ? "recibo" : "boleta");

  const pres = Array.isArray(mov.presupuestos) ? mov.presupuestos[0] : mov.presupuestos;
  const pac = pres ? (Array.isArray(pres.pacientes) ? pres.pacientes[0] : pres.pacientes) : null;
  const cli = Array.isArray(mov.cliente_pago) ? mov.cliente_pago[0] : mov.cliente_pago;
  const prov = Array.isArray(mov.proveedores) ? mov.proveedores[0] : mov.proveedores;

  const pacienteNombre = pac ? `${pac.nombre ?? ""} ${pac.apellido ?? ""}`.trim() : null;
  const pagadorNombre = cli ? `${cli.nombre ?? ""} ${cli.apellidos ?? ""}`.trim() : (prov?.nombre || pacienteNombre || "Cliente");
  const pagadorDoc = cli?.dni || cli?.pasaporte || cli?.carnet_extranjeria || pac?.dni || prov?.ruc || null;

  let cuotaInfo = null;
  if (pres && pres.cuotas) {
    const cuota = (pres.cuotas || []).find((c: any) => c.movimiento_caja_id === mov.id);
    if (cuota) {
      cuotaInfo = {
        numero_cuota: cuota.numero_cuota,
        total_cuotas: pres.cuotas.length,
        monto: Number(cuota.monto),
        fecha_vencimiento: cuota.fecha_vencimiento,
      };
    }
  }

  const tratamientos = pres?.detalle_presupuesto
    ? (Array.isArray(pres.detalle_presupuesto) ? pres.detalle_presupuesto : [pres.detalle_presupuesto])
        .map((d: any) => {
          const c = Array.isArray(d.catalogo_tratamientos) ? d.catalogo_tratamientos[0] : d.catalogo_tratamientos;
          return {
            nombre: c?.nombre || "Tratamiento",
            precio: d.precio_unitario ? Number(d.precio_unitario) : (c?.precio ? Number(c.precio) : null),
          };
        })
    : [];

  const totalPresupuesto = pres ? Number(pres.total_bruto) - Number(pres.descuento_monto || 0) : null;

  return {
    id: mov.id,
    comprobante_id: comprobante?.id || mov.id,
    tipo_comprobante: tipoComprobante,
    fecha: mov.fecha,
    monto: Math.abs(Number(mov.monto)),
    tipo: Number(mov.monto) < 0 ? "E" : "I",
    moneda,
    medio_pago: medioPago,
    referencia: mov.referencia,
    observacion: mov.observacion,
    sede,
    paciente_nombre: pacienteNombre,
    pagador_nombre: pagadorNombre,
    pagador_documento: pagadorDoc,
    es_tercero: Boolean(cli && pac && cli.id !== pac.id),
    cuota: cuotaInfo,
    presupuesto: pres ? {
      id: pres.id,
      total: totalPresupuesto,
      tratamientos,
    } : null,
  };
}

/** Solicita al administrador la aprobación de una devolución y anulación de presupuesto pagado */
export async function solicitarDevolucionPresupuestoAction(presupuestoId: string, motivo: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  if (!motivo || motivo.trim() === "") {
    return { error: "Debe ingresar un motivo para la devolución." };
  }

  const { data: usr } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (!usr?.sede_id) return { error: "Usuario sin sede asignada" };

  const adminClient = getAdminClient();

  // Verificar si ya existe una solicitud pendiente para este presupuesto
  const { data: existente } = await adminClient
    .from("solicitud_validacion")
    .select("id")
    .eq("referencia_id", presupuestoId)
    .eq("tipo_accion", "devolucion_presupuesto")
    .eq("estado", "pendiente")
    .maybeSingle();

  if (existente) {
    return { error: "Ya existe una solicitud de devolución pendiente para este presupuesto." };
  }

  // Insertar la solicitud de validación
  const { data: nuevaSolicitud, error: insErr } = await adminClient
    .from("solicitud_validacion")
    .insert({
      sede_id: usr.sede_id,
      solicitante_id: user.id,
      tipo_accion: "devolucion_presupuesto",
      referencia_id: presupuestoId,
      estado: "pendiente",
      comentarios: motivo.trim(),
    })
    .select()
    .single();

  if (insErr) {
    console.error("[solicitarDevolucionPresupuestoAction] Error:", insErr);
    return { error: "Error creando la solicitud de validación" };
  }

  // Obtener datos del solicitante para el broadcast
  const { data: personal } = await adminClient
    .from("personal")
    .select("nombre, apellido")
    .eq("usuario_id", user.id)
    .maybeSingle();

  // Notificar a administradores de la sede
  const { data: admins } = await adminClient
    .from("usuarios")
    .select("id, rol:rol_id ( rol )")
    .eq("sede_id", usr.sede_id)
    .eq("activo", true);

  const adminUserIds = (admins || [])
    .filter((a: any) => {
      const r = Array.isArray(a.rol) ? a.rol[0]?.rol : a.rol?.rol;
      return r === "admin" || r === "administrador";
    })
    .map((a: any) => a.id);

  for (const adminId of adminUserIds) {
    await adminClient.from("notificaciones").insert({
      destinatario_id: adminId,
      generado_por_id: user.id,
      titulo: "Solicitud de Devolución",
      mensaje: `${personal ? `${personal.nombre} ${personal.apellido}` : "Un asistente"} solicitó la devolución y anulación de un presupuesto pagado. Motivo: ${motivo.trim()}`,
      link: "/admin/validaciones",
    });
  }

  // 1. Broadcast para las alertas de campana del Header en tiempo real
  try {
    const headerChannel = adminClient.channel("header_alerts_messages");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), 1000);
      headerChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try {
            for (const aid of adminUserIds) {
              await headerChannel.send({
                type: "broadcast",
                event: "NEW_NOTIFICACION",
                payload: { destinatario_id: aid },
              });
            }
          } catch (e) {}
          setTimeout(() => {
            clearTimeout(timer);
            resolve();
          }, 300);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          clearTimeout(timer);
          resolve();
        }
      });
    });
  } catch (e) {}

  // 2. Obtener info detallada del presupuesto para el broadcast de ValidacionesView
  let presupuestoInfo: any = null;
  const [{ data: p }, { data: movList }] = await Promise.all([
    adminClient
      .from("presupuestos")
      .select(`
        id, total_bruto, descuento_monto, estado,
        pacientes ( id, nombre, apellido, dni, telegram_chat_id ),
        detalle_presupuesto ( catalogo_tratamientos ( nombre, moneda ) ),
        cuotas ( id, numero_cuota, monto, fecha_vencimiento, estado, movimiento_caja_id )
      `)
      .eq("id", presupuestoId)
      .maybeSingle(),
    adminClient
      .from("movimiento_caja")
      .select("id, monto, estado")
      .eq("presupuesto_id", presupuestoId)
      .eq("estado", "confirmado"),
  ]);

  if (p) {
    const pacRaw = p.pacientes;
    const pac = Array.isArray(pacRaw) ? pacRaw[0] : pacRaw;
    const detalles = Array.isArray(p.detalle_presupuesto) ? p.detalle_presupuesto : (p.detalle_presupuesto ? [p.detalle_presupuesto] : []);
    const tratamientos = detalles
      .map((d: any) => {
        const c = Array.isArray(d.catalogo_tratamientos) ? d.catalogo_tratamientos[0] : d.catalogo_tratamientos;
        return c?.nombre;
      })
      .filter(Boolean);
    const primerCat = (detalles[0] as any)?.catalogo_tratamientos;
    const moneda = (Array.isArray(primerCat) ? primerCat[0]?.moneda : primerCat?.moneda) || "PEN";
    const totalNeto = Number(p.total_bruto) - Number(p.descuento_monto || 0);

    const cuotasList = (p.cuotas || []).sort((a: any, b: any) => a.numero_cuota - b.numero_cuota);
    const cuotasPagadas = cuotasList.filter((c: any) => c.movimiento_caja_id != null || c.estado === "pagado");

    let montoPagado = (movList || []).reduce((acc: number, c: any) => acc + Math.abs(Number(c.monto)), 0);
    if (montoPagado === 0) {
      if (p.estado === "pagado") {
        montoPagado = totalNeto;
      } else if (cuotasPagadas.length > 0) {
        montoPagado = cuotasPagadas.reduce((acc: number, c: any) => acc + Number(c.monto), 0);
      }
    }

    presupuestoInfo = {
      id: p.id,
      paciente_nombre: pac ? `${pac.nombre ?? ""} ${pac.apellido ?? ""}`.trim() : "Paciente no especificado",
      paciente_dni: pac?.dni ?? null,
      tratamiento: tratamientos.slice(0, 2).join(" + ") || "Tratamiento",
      total_neto: totalNeto,
      moneda,
      cuotas: cuotasList,
      cuotas_total: cuotasList.length,
      cuotas_pagadas_count: cuotasPagadas.length,
      monto_pagado: montoPagado,
      tiene_pagos: montoPagado > 0 || cuotasPagadas.length > 0,
      pagos_count: (movList || []).length,
    };
  }

  // 3. Enviar broadcast a ValidacionesView con toda la información enriquecida
  try {
    const channel = adminClient.channel("validaciones_view");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), 1000);
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try {
            await channel.send({
              type: "broadcast",
              event: "NEW_VALIDACION",
              payload: {
                ...nuevaSolicitud,
                solicitante: personal ? { nombre: personal.nombre, apellido: personal.apellido } : { nombre: "Personal", apellido: "" },
                presupuesto_info: presupuestoInfo,
              },
            });
          } finally {
            clearTimeout(timer);
            resolve();
          }
        }
      });
    });
  } catch (bcErr) {
    console.error("Error broadcast validacion:", bcErr);
  }

  return { success: true };
}
