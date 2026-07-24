"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- TIPOS DE CONSULTA ---
export async function getTiposConsultaAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tipo_consulta")
    .select("*")
    .order("tipo_consulta");
  
  if (error) {
    console.error("Error obteniendo tipos de consulta", error);
    return [];
  }
  return data;
}

export async function createTipoConsultaAction(data: { tipo_consulta: string; color: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("tipo_consulta").insert({
    tipo_consulta: data.tipo_consulta.trim(),
    color: data.color,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}

export async function updateTipoConsultaAction(id: string, data: { tipo_consulta: string; color: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tipo_consulta")
    .update({
      tipo_consulta: data.tipo_consulta.trim(),
      color: data.color,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}

export async function deleteTipoConsultaAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tipo_consulta").delete().eq("id", id);
  if (error) return { error: "No se puede eliminar. Es posible que existan consultas vinculadas a este tipo." };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}

// --- TIPOS DE ARCHIVO ---
export async function getTiposArchivoAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tipo_archivo")
    .select("*")
    .order("tipo_archivo");
  
  if (error) {
    console.error("Error obteniendo tipos de archivo", error);
    return [];
  }
  return data;
}

export async function createTipoArchivoAction(tipo_archivo: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tipo_archivo").insert({
    tipo_archivo: tipo_archivo.trim(),
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}

export async function updateTipoArchivoAction(id: string, tipo_archivo: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tipo_archivo")
    .update({
      tipo_archivo: tipo_archivo.trim(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}

export async function deleteTipoArchivoAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tipo_archivo").delete().eq("id", id);
  if (error) return { error: "No se puede eliminar. Existen archivos vinculados a este tipo." };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}
