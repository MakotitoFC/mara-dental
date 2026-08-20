"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function generarCuotasAction(data: {
  presupuesto_id: string;
  cuotas: { numero_cuota: number; monto: number; fecha_vencimiento: string }[];
  paciente_id: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  // Validate that sum matches total? The frontend should ensure this.
  const records = data.cuotas.map(c => ({
    presupuesto_id: data.presupuesto_id,
    numero_cuota: c.numero_cuota,
    monto: c.monto,
    fecha_vencimiento: c.fecha_vencimiento,
    estado: "pendiente"
  }));

  const { error } = await supabase.from("cuotas").insert(records);
  if (error) {
    console.error("Error generando cuotas:", error.message);
    return { error: "No se pudieron generar las cuotas" };
  }

  // Eliminamos revalidatePath("/pagos") porque el estado local (React) ahora se encarga
  // de mostrar las cuotas inmediatamente sin hacer esperar al servidor 3 segundos.
  // Solo revalidamos la ficha del paciente en 2do plano.
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { success: true };
}

export async function eliminarCuotasAction(presupuestoId: string, pacienteId: string) {
  const supabase = await createClient();
  
  // Verify if there's an approved validation request
  const { data: solicitud } = await supabase
    .from("solicitud_validacion")
    .select("id")
    .eq("referencia_id", presupuestoId)
    .eq("tipo_accion", "eliminar_cuotas")
    .eq("estado", "aprobada")
    .order("fecha_respuesta", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!solicitud) {
    return { error: "No hay una solicitud aprobada para eliminar las cuotas de este presupuesto." };
  }

  // Delete cuotas that are 'pendiente'
  const { error } = await supabase
    .from("cuotas")
    .delete()
    .eq("presupuesto_id", presupuestoId)
    .eq("estado", "pendiente");

  if (error) {
    console.error("Error eliminando cuotas:", error.message);
    return { error: "Error al eliminar las cuotas pendientes" };
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/pagos");
  return { success: true };
}

export async function getCuotasPresupuestoAction(presupuestoId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cuotas")
    .select("*")
    .eq("presupuesto_id", presupuestoId)
    .order("numero_cuota", { ascending: true });

  if (error) return [];
  return data || [];
}

export async function solicitarValidacionAction(referenciaId: string, tipoAccion: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: usr } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (!usr?.sede_id) return { error: "No se pudo resolver la sede" };

  // check if there's already a pending request
  const { data: existente } = await supabase
    .from("solicitud_validacion")
    .select("id")
    .eq("referencia_id", referenciaId)
    .eq("tipo_accion", tipoAccion)
    .eq("estado", "pendiente")
    .maybeSingle();

  if (existente) return { error: "Ya existe una solicitud pendiente para esta acción." };

  const { data: newRow, error } = await supabase.from("solicitud_validacion").insert({
    sede_id: usr.sede_id,
    solicitante_id: user.id,
    tipo_accion: tipoAccion,
    referencia_id: referenciaId,
  }).select("id, fecha_solicitud").single();

  if (error) {
    console.error("Error creando solicitud:", error.message);
    return { error: "Error al crear la solicitud" };
  }

  const adminClient = getAdminClient();

  // Obtenemos el nombre para el broadcast y la notificación usando adminClient
  const { data: per } = await adminClient.from("personal").select("nombre, apellido").eq("usuario_id", user.id).maybeSingle();
  const nombre = per?.nombre || "Personal";
  const apellido = per?.apellido || "";

  // Generar notificaciones para los admins
  const { data: admins } = await adminClient.from("usuarios").select("id, rol(rol)").eq("sede_id", usr.sede_id);
  const adminIds = admins?.filter((a: any) => {
    const r = Array.isArray(a.rol) ? a.rol[0] : a.rol;
    return r?.rol === "admin" || r?.rol === "superadmin";
  }).map(a => a.id) || [];

  if (adminIds.length > 0) {
    const notifs = adminIds.map(aid => ({
      destinatario_id: aid,
      generado_por_id: user.id,
      titulo: "Nueva Validación Pendiente",
      mensaje: `${nombre} ${apellido}`.trim() + ` solicitó autorización para: ${tipoAccion === "eliminar_cuotas" ? "Eliminar Cuotas" : tipoAccion}.`,
      link: "/admin/validaciones"
    }));
    await adminClient.from("notificaciones").insert(notifs);
    
    // Broadcast confiable para las notificaciones del header
    try {
      const channel = adminClient.channel("header_alerts_messages");
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          resolve();
        }, 1000);

        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try {
              for (const aid of adminIds) {
                await channel.send({ type: "broadcast", event: "NEW_NOTIFICACION", payload: { destinatario_id: aid } });
              }
            } catch (e) {}
            setTimeout(() => {
              clearTimeout(timer);
              resolve();
            }, 300);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            clearTimeout(timer);
            resolve();
          }
        });
      });
    } catch (e) {}
  }

  // Obtener info detallada del presupuesto para el broadcast de la vista de validaciones
  let presupuestoInfo: any = null;
  if (tipoAccion === "eliminar_cuotas") {
    const { data: p } = await adminClient
      .from("presupuestos")
      .select(`
        id, total_bruto, descuento_monto,
        pacientes ( nombre, apellido, dni ),
        detalle_presupuesto ( catalogo_tratamientos ( nombre, moneda ) ),
        cuotas ( id, numero_cuota, monto, fecha_vencimiento, estado, movimiento_caja_id )
      `)
      .eq("id", referenciaId)
      .maybeSingle();

    if (p) {
      const pacRaw = (p as any).pacientes;
      const pac = Array.isArray(pacRaw) ? pacRaw[0] : pacRaw;
      const detalles = Array.isArray(p.detalle_presupuesto) ? p.detalle_presupuesto : (p.detalle_presupuesto ? [p.detalle_presupuesto] : []);
      const tratamientos = detalles
        .map((d: any) => (Array.isArray(d.catalogo_tratamientos) ? d.catalogo_tratamientos[0] : d.catalogo_tratamientos)?.nombre)
        .filter(Boolean);
      const primerCat = (detalles[0] as any)?.catalogo_tratamientos;
      const moneda = (Array.isArray(primerCat) ? primerCat[0]?.moneda : primerCat?.moneda) || "PEN";
      const totalNeto = Number(p.total_bruto) - Number(p.descuento_monto || 0);

      const cuotasList = (p.cuotas || []).sort((a: any, b: any) => a.numero_cuota - b.numero_cuota);
      const cuotasPagadas = cuotasList.filter((c: any) => c.movimiento_caja_id != null || c.estado === "pagado");
      const montoPagado = cuotasPagadas.reduce((acc: number, c: any) => acc + Number(c.monto), 0);

      presupuestoInfo = {
        paciente_nombre: pac ? `${pac.nombre ?? ""} ${pac.apellido ?? ""}`.trim() : "Paciente no especificado",
        paciente_dni: pac?.dni ?? null,
        tratamiento: tratamientos.slice(0, 2).join(" + ") || "Tratamiento",
        total_neto: totalNeto,
        moneda,
        cuotas: cuotasList,
        cuotas_total: cuotasList.length,
        cuotas_pagadas_count: cuotasPagadas.length,
        monto_pagado: montoPagado,
        tiene_pagos: cuotasPagadas.length > 0,
      };
    }
  }

  // Broadcast confiable para validaciones_view
  try {
    const adminClient2 = getAdminClient();
    const channel2 = adminClient2.channel("validaciones_view");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        resolve();
      }, 1000);

      channel2.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel2.send({
              type: "broadcast",
              event: "NEW_VALIDACION",
              payload: {
                id: newRow.id,
                sede_id: usr.sede_id,
                solicitante_id: user.id,
                tipo_accion: tipoAccion,
                referencia_id: referenciaId,
                estado: "pendiente",
                fecha_solicitud: newRow.fecha_solicitud,
                solicitante: { nombre, apellido },
                presupuesto_info: presupuestoInfo
              }
            });
          } catch (e) {}
          setTimeout(() => {
            clearTimeout(timer);
            resolve();
          }, 300);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timer);
          resolve();
        }
      });
    });
  } catch (e) {}

  return { success: true };
}

export async function getSolicitudValidacionAction(referenciaId: string, tipoAccion: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("solicitud_validacion")
    .select("estado, comentarios")
    .eq("referencia_id", referenciaId)
    .eq("tipo_accion", tipoAccion)
    .order("fecha_solicitud", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

export async function getPeticionesPendientesSedeAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: usr } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (!usr?.sede_id) return [];

  // Used by Admin
  const { data, error } = await supabase
    .from("solicitud_validacion")
    .select(`
      id, tipo_accion, referencia_id, estado, fecha_solicitud,
      usuarios!solicitante_id ( personal ( nombre, apellido ) )
    `)
    .eq("sede_id", usr.sede_id)
    .eq("estado", "pendiente")
    .order("fecha_solicitud", { ascending: false });

  if (error) {
    console.error("Error:", error.message);
    return [];
  }

  return data.map((d: any) => ({
    id: d.id,
    tipo_accion: d.tipo_accion,
    referencia_id: d.referencia_id,
    fecha_solicitud: d.fecha_solicitud,
    solicitante_nombre: d.usuarios?.personal ? `${d.usuarios.personal.nombre} ${d.usuarios.personal.apellido}`.trim() : "Asistente",
  }));
}

export async function resolverPeticionAction(solicitudId: string, aprobado: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("solicitud_validacion")
    .update({
      estado: aprobado ? "aprobada" : "rechazada",
      aprobador_id: user.id,
      fecha_respuesta: new Date().toISOString()
    })
    .eq("id", solicitudId);

  if (error) return { error: "Error al actualizar solicitud" };
  
  revalidatePath("/admin/validacion");
  return { success: true };
}
