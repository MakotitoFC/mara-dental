"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export interface CuotaPendiente {
  id: string;
  numero_cuota: number;
  monto: number;
  fecha_vencimiento: string;
  estado: string;
}

export interface PresupuestoPendiente {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  paciente_documento: string | null;
  telegram_chat_id: string | null;
  fecha_emision: string;
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
  medio_pago_nombre: string;
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
  comprobantesHoy: number;
  metodosPago: MetodoPagoResumen[];
  historial: PagoHistorial[];
}

const VACIO: PagosDashboardSede = { pendientes: [], ingresosHoy: 0, comprobantesHoy: 0, metodosPago: [], historial: [] };

/** Cualquier camino sin datos reales (sin sesión, sin sede, sin pacientes,
 * error de consulta) devuelve el estado vacío real — se loguea el motivo
 * exacto para poder diagnosticar si en algún punto debería haber datos
 * reales y no los hay (RLS, sede mal resuelta, etc). */
function conDiagnostico(motivo: string): PagosDashboardSede {
  console.log(`[getPagosDashboardSedeAction] ${motivo} → sin datos, mostrando estado vacío`);
  return VACIO;
}

/** Panel de pagos de la sede: pendientes de cobro, ingresos/comprobantes de
 * hoy, desglose por método de pago e historial reciente — todo en una sola
 * consulta. Los nombres de paciente se resuelven con una consulta DIRECTA a
 * `pacientes` (no embebida en `presupuestos`), el mismo truco que ya usa
 * dashboard/actions.ts para esquivar el bloqueo de RLS en el embed. */
export async function getPagosDashboardSedeAction(): Promise<PagosDashboardSede> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return VACIO;

  const { data: usr } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (!usr?.sede_id) return conDiagnostico("No se pudo resolver sede_id del asistente");

  const { data: pacientesSede, error: pacError } = await supabase
    .from("pacientes")
    .select("id, nombre, apellido, dni, telegram_chat_id")
    .eq("sede_id", usr.sede_id)
    .eq("activo", true);

  if (pacError) {
    console.error("[getPagosDashboardSedeAction] Error obteniendo pacientes de la sede:", pacError.message);
    return conDiagnostico("Error consultando pacientes de la sede");
  }

  const pacienteIds = (pacientesSede || []).map((p: any) => String(p.id));
  if (pacienteIds.length === 0) return conDiagnostico(`Sede ${usr.sede_id} sin pacientes activos`);

  const pacienteNombreById = new Map((pacientesSede || []).map((p: any) => [String(p.id), `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim()]));
  const pacienteDocumentoById = new Map((pacientesSede || []).map((p: any) => [String(p.id), p.dni ?? null]));
  const pacienteChatById = new Map((pacientesSede || []).map((p: any) => [String(p.id), p.telegram_chat_id ?? null]));

  // "presupuestos" (y "detalle_presupuesto") están bloqueadas por RLS para el
  // rol asistente — confirmado: 0 filas incluso consultando la tabla directa
  // sin filtros adicionales, para un presupuesto ya aprobado y verificado a
  // existir vía el cliente admin. Se usa el cliente admin acá, siempre
  // scopeado a los pacienteIds ya resueltos arriba con el cliente normal
  // (nunca a un parámetro que venga del cliente) — mismo patrón (Opción A)
  // que agenda/actions.ts y consulta.actions.ts.
  const adminClient = getAdminClient();
  const { data: presupuestos, error } = await adminClient
    .from("presupuestos")
    .select(`
      id, fecha_emision, total_bruto, descuento_monto, estado, paciente_id,
      detalle_presupuesto ( id, catalogo_tratamientos ( nombre, moneda ) ),
      movimiento_caja ( id, monto, estado, fecha, medio_pago_id, medio_pago ( nombre ) ),
      cuotas ( id, numero_cuota, monto, fecha_vencimiento, estado )
    `)
    .in("paciente_id", pacienteIds)
    .order("fecha_emision", { ascending: false });

  if (error) {
    console.error("[getPagosDashboardSedeAction] Error obteniendo presupuestos de la sede:", error.message);
    return conDiagnostico("Error consultando presupuestos de la sede");
  }

  const hoyStr = new Date().toISOString().split("T")[0];

  const pendientes: PresupuestoPendiente[] = [];
  const historialTodo: PagoHistorial[] = [];
  const metodoAcc = new Map<string, number>();
  let ingresosHoy = 0;
  let comprobantesHoy = 0;

  for (const p of presupuestos || []) {
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

    if (p.estado === "aprobado") {
      const saldo = totalNeto - pagado;
      if (saldo > 0.009) {
        pendientes.push({
          id: String(p.id),
          paciente_id: pacienteId,
          paciente_nombre: pacienteNombreById.get(pacienteId) || "Paciente",
          paciente_documento: pacienteDocumentoById.get(pacienteId) ?? null,
          telegram_chat_id: pacienteChatById.get(pacienteId) ?? null,
          fecha_emision: p.fecha_emision,
          tratamiento: nombresTratamiento.slice(0, 2).join(" + ") || "Tratamiento",
          total_neto: totalNeto,
          pagado,
          saldo,
          moneda: primeraMoneda,
          cuotas: (p.cuotas || []).sort((a: any, b: any) => a.numero_cuota - b.numero_cuota),
        });
      }
    }

    for (const pg of pagosHechos) {
      const medioRaw = (pg as any).medio_pago;
      const medio = Array.isArray(medioRaw) ? medioRaw[0] : medioRaw;
      const nombreMedio = medio?.nombre || "Otro";
      const monto = Number(pg.monto);

      historialTodo.push({
        id: String(pg.id),
        paciente_nombre: pacienteNombreById.get(pacienteId) || "Paciente",
        monto,
        medio_pago_nombre: nombreMedio,
        fecha_pago: pg.fecha,
        moneda: primeraMoneda,
      });

      metodoAcc.set(nombreMedio, (metodoAcc.get(nombreMedio) ?? 0) + monto);

      if (typeof pg.fecha === "string" && pg.fecha.startsWith(hoyStr)) {
        ingresosHoy += monto;
        comprobantesHoy += 1;
      }
    }
  }

  historialTodo.sort((a, b) => (b.fecha_pago || "").localeCompare(a.fecha_pago || ""));
  pendientes.sort((a, b) => b.fecha_emision.localeCompare(a.fecha_emision));

  const totalMetodos = Array.from(metodoAcc.values()).reduce((acc, v) => acc + v, 0);
  const metodosPago: MetodoPagoResumen[] = Array.from(metodoAcc.entries())
    .map(([nombre, monto]) => ({ nombre, monto, porcentaje: totalMetodos > 0 ? Math.round((monto / totalMetodos) * 100) : 0 }))
    .sort((a, b) => b.monto - a.monto);

  if (pendientes.length === 0 && historialTodo.length === 0) {
    return conDiagnostico(`Sede ${usr.sede_id} sin presupuestos/pagos reales`);
  }

  return {
    pendientes,
    ingresosHoy,
    comprobantesHoy,
    metodosPago,
    historial: historialTodo.slice(0, 8),
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
