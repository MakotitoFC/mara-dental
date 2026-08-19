"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getValidacionesPendientesAction(sedeId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("solicitud_validacion")
    .select(`
      id,
      tipo_accion,
      referencia_id,
      estado,
      fecha_solicitud,
      comentarios,
      usuarios!solicitante_id(
        personal(nombre, apellido)
      )
    `)
    .eq("sede_id", sedeId)
    .eq("estado", "pendiente")
    .order("fecha_solicitud", { ascending: false });

  if (error) {
    console.error("[getValidacionesPendientesAction]", error);
    return [];
  }

  return data.map((d: any) => ({
    ...d,
    solicitante: {
      nombre: d.usuarios?.personal?.[0]?.nombre || d.usuarios?.personal?.nombre || "Usuario",
      apellido: d.usuarios?.personal?.[0]?.apellido || d.usuarios?.personal?.apellido || "Desconocido",
    }
  }));
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

  // Ejecutar lógica según el tipo de acción si es aprobada
  if (accion === "aprobar") {
    if (solicitud.tipo_accion === "eliminar_cuotas") {
      const presupuestoId = solicitud.referencia_id;
      // Eliminar cuotas usando admin client para saltar RLS
      const supabaseAdmin = getAdminClient();
      const { error: delErr } = await supabaseAdmin.from("cuotas").delete().eq("presupuesto_id", presupuestoId);
      if (delErr) {
        return { error: "Error eliminando las cuotas. Revise dependencias." };
      }
    }
  }

  // Actualizar la solicitud
  const { error: updErr } = await supabase.from("solicitud_validacion").update({
    estado: nuevoEstado,
    aprobador_id: user.id,
    fecha_respuesta: new Date().toISOString(),
    comentarios: comentarios || null
  }).eq("id", id);

  if (updErr) return { error: "Error actualizando la solicitud" };

  revalidatePath("/validaciones");
  // En caso de eliminar cuotas se revalida la vista de pagos
  revalidatePath("/pagos");
  return { success: true };
}
