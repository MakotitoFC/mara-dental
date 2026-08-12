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

export async function createTipoConsultaAction(data: { tipo_consulta: string; color: string; estado?: boolean }) {
  const supabase = await createClient();
  const { error } = await supabase.from("tipo_consulta").insert({
    tipo_consulta: data.tipo_consulta.trim(),
    color: data.color,
    estado: data.estado !== undefined ? data.estado : true,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}

export async function updateTipoConsultaAction(id: string, data: { tipo_consulta: string; color: string; estado?: boolean }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tipo_consulta")
    .update({
      tipo_consulta: data.tipo_consulta.trim(),
      color: data.color,
      estado: data.estado !== undefined ? data.estado : true,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}

export async function deleteTipoConsultaAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tipo_consulta").update({ estado: false }).eq("id", id);
  if (error) return { error: error.message };
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

export async function createTipoArchivoAction(tipo_archivo: string, estado = true) {
  const supabase = await createClient();
  const { error } = await supabase.from("tipo_archivo").insert({
    tipo_archivo: tipo_archivo.trim(),
    estado,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}

export async function updateTipoArchivoAction(id: string, tipo_archivo: string, estado = true) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tipo_archivo")
    .update({
      tipo_archivo: tipo_archivo.trim(),
      estado,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}

export async function deleteTipoArchivoAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tipo_archivo").update({ estado: false }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}

// --- CONDICION DIENTE ---
export async function getCondicionAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("condicion")
    .select("*")
    .order("condicion");
  
  if (error) {
    console.error("Error obteniendo condiciones", error);
    return [];
  }
  return data;
}

export async function createCondicionAction(data: { condicion: string; color: string; estado?: boolean }) {
  const supabase = await createClient();
  const { error } = await supabase.from("condicion").insert({
    condicion: data.condicion.trim(),
    color: data.color,
    estado: data.estado !== undefined ? data.estado : true,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}

export async function updateCondicionAction(id: string, data: { condicion: string; color: string; estado?: boolean }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("condicion")
    .update({
      condicion: data.condicion.trim(),
      color: data.color,
      estado: data.estado !== undefined ? data.estado : true,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}

export async function deleteCondicionAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("condicion").update({ estado: false }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion-tipos");
  return { success: true };
}
