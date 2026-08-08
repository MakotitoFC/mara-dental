"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAdminClient } from "@/lib/supabase/admin";
import { fetchDoctoresSede } from "../agenda/actions";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

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
    try {
      const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: firmaUrl });
      firmaUrl = await getSignedUrl(r2Client, command, { expiresIn: 60 * 60 });
    } catch (signError) {
      console.error(`[getPerfilProfesionalAction] Error firmando URL de firma en R2 (path="${firmaUrl}"):`, signError);
      firmaUrl = null;
    }
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
  const objectKey = `firmas/${user.id}/${Date.now()}.${ext}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      Body: buffer,
      ContentType: file.type,
    }));
  } catch (uploadError) {
    console.error("Error subiendo firma a R2:", uploadError);
    return { error: "No se pudo subir la firma" };
  }

  const { data: updated, error: updateError } = await supabase
    .from("personal")
    .update({ url_firma_digital: objectKey, updated_at: new Date().toISOString() })
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

export interface DoctorHorarioSede {
  id: string;
  nombre: string;
  apellido: string;
  especialidad: string | null;
  horarios: Record<number, HorarioRango[]>;
}

/** Horarios de TODOS los médicos de la sede del asistente que llama —
 * `sede_id` siempre se resuelve server-side desde la propia fila de quien
 * invoca (nunca desde un parámetro del cliente), así que solo puede ver
 * médicos de su misma sede. `fetchDoctoresSede` ya usa el cliente admin
 * (Opción A) porque "usuarios" está bloqueada por RLS para lecturas
 * cross-usuario del rol asistente. Nota: `personal` no tiene columna `id`
 * propia — su PK es `usuario_id`, que ES `usuarios.id` — así que
 * `horarios_medico.medico_id` se resuelve directo contra `doctor.id`, sin
 * necesidad de candidatos alternativos. */
export async function getHorariosSedeAction(): Promise<DoctorHorarioSede[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: usr } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (!usr?.sede_id) return [];

  const doctores = await fetchDoctoresSede(usr.sede_id);
  if (doctores.length === 0) return [];

  const doctorIds = doctores.map((d) => d.id);

  const adminClient = getAdminClient();
  const { data: horarios, error } = await adminClient
    .from("horarios_medico")
    .select("id, medico_id, dia_semana, hora_inicio, hora_fin")
    .in("medico_id", doctorIds)
    .order("dia_semana", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (error) {
    console.error("[getHorariosSedeAction] Error obteniendo horarios de la sede:", error);
  }

  return doctores
    .map((d) => {
      const base: Record<number, HorarioRango[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
      for (const row of horarios || []) {
        if (row.medico_id !== d.id) continue;
        if (!base[row.dia_semana]) base[row.dia_semana] = [];
        base[row.dia_semana].push({
          id: row.id,
          hora_inicio: (row.hora_inicio as string).slice(0, 5),
          hora_fin: (row.hora_fin as string).slice(0, 5),
        });
      }
      return {
        id: d.id,
        nombre: d.nombre,
        apellido: d.apellido,
        especialidad: d.especialidad,
        horarios: base,
      };
    })
    .sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`));
}

/** Guarda el horario de un día para UN médico de la sede del asistente. El
 * ID del médico llega del cliente, así que antes de escribir se valida que
 * pertenezca a la MISMA sede resuelta server-side para quien llama — nunca
 * se confía en el sede_id del médico objetivo sin esa verificación. */
export async function saveHorarioMedicoDiaAction(medicoUsuarioId: string, diaSemana: number, rangos: { hora_inicio: string; hora_fin: string }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: usr } = await supabase.from("usuarios").select("sede_id").eq("id", user.id).single();
  if (!usr?.sede_id) return { error: "No se pudo resolver tu sede" };

  const doctoresSede = await fetchDoctoresSede(usr.sede_id);
  const doctor = doctoresSede.find((d) => d.id === medicoUsuarioId);
  if (!doctor) return { error: "Ese médico no pertenece a tu sede" };

  const adminClient = getAdminClient();

  const { error: deleteError } = await adminClient
    .from("horarios_medico")
    .delete()
    .eq("medico_id", medicoUsuarioId)
    .eq("dia_semana", diaSemana);

  if (deleteError) {
    console.error("[saveHorarioMedicoDiaAction] Error borrando horario:", deleteError);
    return { error: "No se pudo actualizar el horario" };
  }

  if (rangos.length > 0) {
    const { error: insertError } = await adminClient.from("horarios_medico").insert(
      rangos.map((r) => ({ medico_id: medicoUsuarioId, dia_semana: diaSemana, hora_inicio: r.hora_inicio, hora_fin: r.hora_fin }))
    );
    if (insertError) {
      console.error("[saveHorarioMedicoDiaAction] Error guardando horario:", insertError);
      return { error: "No se pudo guardar el nuevo horario" };
    }
  }

  revalidatePath("/configuracion");
  return { success: true };
}
