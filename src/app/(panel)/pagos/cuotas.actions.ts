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

  revalidatePath(`/pacientes/${data.paciente_id}`);
  revalidatePath("/pagos");
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

  const { error } = await supabase.from("solicitud_validacion").insert({
    sede_id: usr.sede_id,
    solicitante_id: user.id,
    tipo_accion: tipoAccion,
    referencia_id: referenciaId,
  });

  if (error) {
    console.error("Error creando solicitud:", error.message);
    return { error: "Error al crear la solicitud" };
  }

  // Fallback: Disparamos un evento de broadcast en caso de que Postgres Changes falle
  try {
    const adminClient = await getAdminClient();
    const channel = adminClient.channel("validaciones_view");
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: "broadcast",
          event: "NEW_VALIDACION",
          payload: {
            sede_id: usr.sede_id,
            solicitante_id: user.id,
            tipo_accion: tipoAccion,
            referencia_id: referenciaId,
            estado: "pendiente",
            fecha_solicitud: new Date().toISOString(),
            id: crypto.randomUUID() 
          }
        });
        setTimeout(() => adminClient.removeChannel(channel), 1000);
      }
    });
  } catch (e) {
    console.error("Broadcast failed:", e);
  }

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
