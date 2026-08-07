"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface PerfilProfesional {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  num_colegiatura: string | null;
  especialidad: string | null;
  firma_url: string | null;
}

export interface HorarioRango {
  id: number;
  hora_inicio: string;
  hora_fin: string;
}

export async function getPerfilProfesionalAction(): Promise<PerfilProfesional | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: personal, error: personalError } = await supabase
    .from("personal")
    .select("nombre, apellido, email, telefono, num_colegiatura, url_firma_digital, especialidad ( especialidad )")
    .eq("usuario_id", user.id)
    .single();

  if (!personal) {
    console.error(`[getPerfilProfesionalAction] Sin fila en "personal" para usuario_id=${user.id} (${user.email}):`, personalError);
    return null;
  }

  let firmaUrl: string | null = personal.url_firma_digital;
  if (firmaUrl && !firmaUrl.startsWith("http")) {
    const { data: signed, error: signError } = await supabase.storage.from("archivos_clinicos").createSignedUrl(firmaUrl, 60 * 60);
    if (signError) console.error(`[getPerfilProfesionalAction] Error firmando URL de firma (path="${firmaUrl}"):`, signError);
    firmaUrl = signed?.signedUrl ?? null;
  }

  const especialidadRaw = personal.especialidad as any;
  const especialidad = Array.isArray(especialidadRaw) ? especialidadRaw[0] : especialidadRaw;

  return {
    nombre: personal.nombre,
    apellido: personal.apellido,
    email: personal.email,
    telefono: personal.telefono,
    num_colegiatura: personal.num_colegiatura,
    especialidad: especialidad?.especialidad ?? null,
    firma_url: firmaUrl,
  };
}

export async function updateFirmaDigitalAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const file = formData.get("firma") as File;
  if (!file || file.size === 0) return { error: "Selecciona una imagen" };

  const ext = file.name.split(".").pop();
  const filePath = `private/firmas/${user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("archivos_clinicos").upload(filePath, file, { upsert: true });
  if (uploadError) {
    console.error("Error subiendo firma:", uploadError);
    return { error: "No se pudo subir la firma" };
  }

  const { data: updated, error: updateError } = await supabase
    .from("personal")
    .update({ url_firma_digital: filePath, updated_at: new Date().toISOString() })
    .eq("usuario_id", user.id)
    .select("usuario_id, url_firma_digital");

  if (updateError) {
    console.error("Error actualizando firma:", updateError);
    return { error: "No se pudo actualizar la firma" };
  }

  if (!updated || updated.length === 0) {
    console.error(`[updateFirmaDigitalAction] UPDATE afectó 0 filas para usuario_id=${user.id} — probable bloqueo de RLS en "personal" (política de UPDATE faltante o mal configurada).`);
    return { error: "La firma se subió pero no se pudo guardar en tu perfil (0 filas actualizadas — revisa los permisos de la tabla personal)." };
  }

  revalidatePath("/configuracion");
  return { success: true };
}

/** Determina el ID correcto para `horarios_medico.medico_id` según el usuario actual. */
async function resolveMedicoId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string> {
  const { data: personal } = await supabase.from("personal").select("id").eq("usuario_id", userId).single();
  const candidates = [userId];
  if (personal?.id && personal.id !== userId) candidates.push(personal.id);

  const { data: rows } = await supabase
    .from("horarios_medico")
    .select("medico_id")
    .in("medico_id", candidates)
    .limit(1);

  if (rows && rows.length > 0) {
    return rows[0].medico_id as string;
  }
  return candidates[candidates.length - 1];
}

export async function getHorariosAction(): Promise<Record<number, HorarioRango[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const base: Record<number, HorarioRango[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  if (!user) return base;

  // Se consulta con ambos candidatos posibles de "medico_id" (auth.users.id y
  // personal.id) directamente en una sola query — evita depender de un paso
  // previo de "resolución" que, si la tabla está bloqueada por RLS, siempre
  // fallaría igual y terminaría escondiendo el horario real.
  const { data: personal } = await supabase.from("personal").select("id").eq("usuario_id", user.id).single();
  const candidates = [user.id];
  if (personal?.id && personal.id !== user.id) candidates.push(personal.id);

  const { data, error } = await supabase
    .from("horarios_medico")
    .select("id, medico_id, dia_semana, hora_inicio, hora_fin")
    .in("medico_id", candidates)
    .order("dia_semana", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (error) {
    console.error("[getHorariosAction] Error obteniendo horario del médico (¿RLS en horarios_medico?):", error, "candidates:", candidates);
  } else {
    console.log(`[getHorariosAction] candidates=${JSON.stringify(candidates)} filas encontradas=${data?.length ?? 0}`);
  }

  for (const row of data || []) {
    if (!base[row.dia_semana]) base[row.dia_semana] = [];
    base[row.dia_semana].push({
      id: row.id,
      hora_inicio: (row.hora_inicio as string).slice(0, 5),
      hora_fin: (row.hora_fin as string).slice(0, 5),
    });
  }
  return base;
}

export async function saveHorarioDiaAction(diaSemana: number, rangos: { hora_inicio: string; hora_fin: string }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const medicoId = await resolveMedicoId(supabase, user.id);

  const { error: deleteError } = await supabase
    .from("horarios_medico")
    .delete()
    .eq("medico_id", medicoId)
    .eq("dia_semana", diaSemana);

  if (deleteError) {
    console.error("Error borrando horario:", deleteError);
    return { error: "No se pudo actualizar el horario" };
  }

  if (rangos.length > 0) {
    const { error: insertError } = await supabase.from("horarios_medico").insert(
      rangos.map((r) => ({ medico_id: medicoId, dia_semana: diaSemana, hora_inicio: r.hora_inicio, hora_fin: r.hora_fin }))
    );
    if (insertError) {
      console.error("Error guardando horario:", insertError);
      return { error: "No se pudo guardar el nuevo horario" };
    }
  }

  revalidatePath("/configuracion");
  return { success: true };
}
