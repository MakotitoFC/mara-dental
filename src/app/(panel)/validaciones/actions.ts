"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getValidacionesPendientesAction(sedeId: number) {
  const adminClient = getAdminClient();
  const { data, error } = await adminClient
    .from("solicitud_validacion")
    .select(`
      id,
      tipo_accion,
      referencia_id,
      estado,
      fecha_solicitud,
      comentarios,
      solicitante_id
    `)
    .eq("sede_id", sedeId)
    .eq("estado", "pendiente")
    .order("fecha_solicitud", { ascending: false });

  if (error || !data) {
    console.error("[getValidacionesPendientesAction]", error);
    return [];
  }

  const solicitanteIds = Array.from(new Set(data.map(d => d.solicitante_id).filter(Boolean)));
  const presupuestoIds = Array.from(
    new Set(
      data
        .filter(d => d.tipo_accion === "eliminar_cuotas" || d.tipo_accion === "devolucion_presupuesto")
        .map(d => d.referencia_id)
        .filter(Boolean)
    )
  );

  // 1. Obtener datos reales de los solicitantes (personal)
  const personalMap = new Map<string, { nombre: string; apellido: string }>();
  if (solicitanteIds.length > 0) {
    const { data: personalList } = await adminClient
      .from("personal")
      .select("usuario_id, nombre, apellido")
      .in("usuario_id", solicitanteIds);
    (personalList || []).forEach((p: any) => {
      personalMap.set(String(p.usuario_id), { nombre: p.nombre || "Personal", apellido: p.apellido || "" });
    });
  }

  // 2. Obtener datos detallados de los presupuestos y sus cuotas / pagos
  const presupuestoMap = new Map<string, any>();
  if (presupuestoIds.length > 0) {
    const [{ data: presList }, { data: movList }] = await Promise.all([
      adminClient
        .from("presupuestos")
        .select(`
          id, total_bruto, descuento_monto, estado,
          pacientes ( id, nombre, apellido, dni, telegram_chat_id ),
          detalle_presupuesto ( catalogo_tratamientos ( nombre, moneda ) ),
          cuotas ( id, numero_cuota, monto, fecha_vencimiento, estado, movimiento_caja_id )
        `)
        .in("id", presupuestoIds),
      adminClient
        .from("movimiento_caja")
        .select("id, presupuesto_id, monto, estado")
        .in("presupuesto_id", presupuestoIds)
        .eq("estado", "confirmado"),
    ]);

    const movsByPres = new Map<string, any[]>();
    (movList || []).forEach((m: any) => {
      const pid = String(m.presupuesto_id);
      if (!movsByPres.has(pid)) movsByPres.set(pid, []);
      movsByPres.get(pid)!.push(m);
    });

    (presList || []).forEach((p: any) => {
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
      
      const pagosConfirmados = movsByPres.get(String(p.id)) || [];
      let montoPagado = pagosConfirmados.reduce((acc: number, c: any) => acc + Math.abs(Number(c.monto)), 0);

      // Si el presupuesto está pagado pero no se encontraron filas o es pago único registrado
      if (montoPagado === 0) {
        if (p.estado === "pagado") {
          montoPagado = totalNeto;
        } else if (cuotasPagadas.length > 0) {
          montoPagado = cuotasPagadas.reduce((acc: number, c: any) => acc + Number(c.monto), 0);
        }
      }

      presupuestoMap.set(String(p.id), {
        id: p.id,
        paciente_id: pac?.id ?? null,
        paciente_nombre: pac ? `${pac.nombre ?? ""} ${pac.apellido ?? ""}`.trim() : "Paciente no especificado",
        paciente_dni: pac?.dni ?? null,
        telegram_chat_id: pac?.telegram_chat_id ?? null,
        tratamiento: tratamientos.slice(0, 2).join(" + ") || "Tratamiento",
        total_neto: totalNeto,
        moneda,
        cuotas: cuotasList,
        cuotas_total: cuotasList.length,
        cuotas_pagadas_count: cuotasPagadas.length,
        monto_pagado: montoPagado,
        tiene_pagos: montoPagado > 0 || cuotasPagadas.length > 0,
        pagos_count: pagosConfirmados.length,
      });
    });
  }

  return data.map((d: any) => {
    const sol = personalMap.get(String(d.solicitante_id)) || { nombre: "Personal", apellido: "" };
    const pInfo = presupuestoMap.get(String(d.referencia_id)) || null;

    return {
      ...d,
      solicitante: sol,
      presupuesto_info: pInfo,
    };
  });
}

export async function responderValidacionAction(id: string, accion: "aprobar" | "rechazar", comentarios?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const nuevoEstado = accion === "aprobar" ? "aprobada" : "rechazada";

  if (accion === "rechazar" && (!comentarios || comentarios.trim() === "")) {
    return { error: "Debe ingresar un comentario para rechazar la solicitud." };
  }

  // Obtenemos la solicitud para saber de qué trata
  const { data: solicitud } = await supabase.from("solicitud_validacion").select("*").eq("id", id).single();
  if (!solicitud) return { error: "Solicitud no encontrada" };

  const supabaseAdmin = getAdminClient();

  // Ejecutar lógica según el tipo de acción si es aprobada
  if (accion === "aprobar") {
    if (solicitud.tipo_accion === "eliminar_cuotas") {
      const presupuestoId = solicitud.referencia_id;
      const { error: delErr } = await supabaseAdmin.from("cuotas").delete().eq("presupuesto_id", presupuestoId);
      if (delErr) {
        return { error: "Error eliminando las cuotas. Revise dependencias." };
      }
    } else if (solicitud.tipo_accion === "devolucion_presupuesto") {
      const presupuestoId = solicitud.referencia_id;
      const motivoAnulacion = solicitud.comentarios || "Devolución aprobada por administración";
      const fechaAnulacion = new Date().toISOString();

      // 1. Obtener presupuesto, paciente y movimientos de caja
      const { data: pres, error: presErr } = await supabaseAdmin
        .from("presupuestos")
        .select(`
          id, total_bruto, descuento_monto,
          pacientes ( id, nombre, apellido, dni, telegram_chat_id ),
          movimiento_caja ( id, monto, estado, tipo_moneda_id, medio_pago_id ),
          cuotas ( id, estado )
        `)
        .eq("id", presupuestoId)
        .single();

      if (presErr || !pres) {
        return { error: "No se encontró el presupuesto a anular." };
      }

      const pagosConfirmados = (pres.movimiento_caja || []).filter((m: any) => m.estado === "confirmado");
      const totalDevolver = pagosConfirmados.reduce((acc: number, m: any) => acc + Math.abs(Number(m.monto)), 0);

      // 2. Anular todos los movimientos de caja confirmados de este presupuesto
      for (const mov of pagosConfirmados) {
        await supabaseAdmin
          .from("movimiento_caja")
          .update({
            estado: "anulado",
            motivo_anulacion: motivoAnulacion,
            anulado_por: user.id,
            fecha_anulacion: fechaAnulacion,
          })
          .eq("id", mov.id);

        // Anular los comprobantes vinculados
        await supabaseAdmin
          .from("comprobante_pago")
          .update({
            estado: "anulado",
            motivo_anulacion: motivoAnulacion,
            anulado_por: user.id,
            fecha_anulacion: fechaAnulacion,
          })
          .eq("movimiento_caja_id", mov.id);
      }

      // 3. Registrar movimiento de Egreso de Caja por Devolución
      // Buscar dinámicamente categoría de egreso "Devoluciones"
      const { data: catDev } = await supabaseAdmin
        .from("categoria_movimiento")
        .select("id")
        .ilike("nombre", "%devoluci%")
        .eq("tipo", "E")
        .limit(1)
        .maybeSingle();

      // Buscar caja activa de la sede
      const { data: cajaAbierta } = await supabaseAdmin
        .from("caja_turno")
        .select("id")
        .eq("sede_id", solicitud.sede_id)
        .is("fecha_cierre", null)
        .order("fecha_apertura", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cajaAbierta && totalDevolver > 0) {
        await supabaseAdmin.from("movimiento_caja").insert({
          caja_turno_id: cajaAbierta.id,
          fecha: fechaAnulacion,
          monto: -Math.abs(totalDevolver),
          tipo_moneda_id: pagosConfirmados[0]?.tipo_moneda_id || 1,
          categoria_id: catDev?.id || null,
          medio_pago_id: pagosConfirmados[0]?.medio_pago_id || 1,
          observacion: `Devolución por anulación de Presupuesto #${presupuestoId.slice(0, 8).toUpperCase()}. Motivo: ${motivoAnulacion}`,
          presupuesto_id: presupuestoId,
          usuario_id: user.id,
          estado: "confirmado",
        });
      }

      // 4. Cambiar estado del presupuesto a 'rechazado'
      await supabaseAdmin
        .from("presupuestos")
        .update({
          estado: "rechazado",
          notas: `Devolución y anulación aprobada. Motivo: ${motivoAnulacion}`,
        })
        .eq("id", presupuestoId);

      // 5. Marcar cuotas como anuladas si existían
      if (pres.cuotas && pres.cuotas.length > 0) {
        await supabaseAdmin
          .from("cuotas")
          .update({ estado: "anulado" })
          .eq("presupuesto_id", presupuestoId);
      }

      // 6. Notificar al paciente por Telegram si tiene chat_id
      const pac = Array.isArray(pres.pacientes) ? pres.pacientes[0] : pres.pacientes;
      if (pac?.telegram_chat_id) {
        try {
          const textoTelegram = `🧾 MaraDental\n\nEstimado(a) ${pac.nombre}, le informamos que la anulación y devolución de su presupuesto por el monto de S/ ${totalDevolver.toFixed(2)} ha sido procesada con éxito.\nMotivo: ${motivoAnulacion}.`;
          await supabaseAdmin.from("mensajes_telegram").insert({
            paciente_id: pac.id,
            tipo_mensaje: "devolucion_pago",
            mensaje: textoTelegram,
            estado_envio: "enviado",
            fecha_envio: fechaAnulacion,
            chat_id: pac.telegram_chat_id,
          });
        } catch (tgErr) {
          console.error("Error registrando mensaje Telegram de devolución:", tgErr);
        }
      }
    }
  }

  // Actualizar la solicitud
  const { error: updErr } = await supabaseAdmin.from("solicitud_validacion").update({
    estado: nuevoEstado,
    aprobador_id: user.id,
    fecha_respuesta: new Date().toISOString(),
    comentarios: comentarios || null
  }).eq("id", id);

  if (updErr) return { error: "Error actualizando la solicitud" };

  const tituloAccion = solicitud.tipo_accion === "eliminar_cuotas" 
    ? "Eliminación de Cuotas" 
    : (solicitud.tipo_accion === "devolucion_presupuesto" ? "Devolución de Presupuesto" : solicitud.tipo_accion);

  // Crear notificación para el solicitante
  await supabaseAdmin.from("notificaciones").insert({
    destinatario_id: solicitud.solicitante_id,
    generado_por_id: user.id,
    titulo: `Solicitud ${nuevoEstado === "aprobada" ? "Aprobada" : "Rechazada"}`,
    mensaje: `Tu solicitud de ${tituloAccion} ha sido ${nuevoEstado}. ${comentarios ? `Comentario: ${comentarios}` : ""}`,
    link: `/pagos?presupuestoId=${solicitud.referencia_id}`
  });

  // Enviar broadcast confiable con timeout rápido
  try {
    const channel = supabaseAdmin.channel("header_alerts_messages");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        resolve();
      }, 1000);

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.send({
              type: 'broadcast',
              event: 'NEW_NOTIFICACION',
              payload: {
                destinatario_id: solicitud.solicitante_id,
                titulo: `Solicitud ${nuevoEstado === "aprobada" ? "Aprobada" : "Rechazada"}`,
                mensaje: `Tu solicitud de ${tituloAccion} ha sido ${nuevoEstado}.`,
                link: `/pagos?presupuestoId=${solicitud.referencia_id}`
              }
            });
          } finally {
            clearTimeout(timer);
            resolve();
          }
        }
      });
    });
  } catch (err) {
    console.error("Error broadcast:", err);
  }

  revalidatePath("/admin/validaciones");
  revalidatePath("/pagos");
  return { success: true };
}
