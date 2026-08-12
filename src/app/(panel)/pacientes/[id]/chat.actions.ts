"use server";

import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function checkChatPermissions(pacienteId: string): Promise<{ allowed: boolean; isDoctor: boolean; isAdmin: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, isDoctor: false, isAdmin: false, error: "Usuario no autenticado" };
  }

  // 1. Obtener rol del usuario actual
  const { data: userData } = await supabase
    .from("usuarios")
    .select("rol_id, rol ( rol )")
    .eq("id", user.id)
    .single();

  const rolName = ((userData?.rol as any)?.rol || "").toLowerCase();
  const isAdmin = rolName === "admin" || rolName === "superadmin" || userData?.rol_id === 2 || userData?.rol_id === 3;
  const isDoctor = rolName === "doctor" || userData?.rol_id === 1;

  // Admins y Superadmins tienen permiso global para supervisar chats
  if (isAdmin) {
    return { allowed: true, isDoctor: false, isAdmin: true };
  }

  if (isDoctor) {
    // a) ¿Es el creador del paciente?
    const { data: p } = await supabase
      .from("pacientes")
      .select("id, creado_por")
      .eq("id", pacienteId)
      .single();

    if (p && String(p.creado_por) === String(user.id)) {
      return { allowed: true, isDoctor: true, isAdmin: false };
    }

    // b) ¿Tiene citas registradas con este paciente?
    const { data: citas } = await supabase
      .from("citas")
      .select("id")
      .eq("paciente_id", pacienteId)
      .eq("doctor_id", user.id)
      .limit(1);

    if (citas && citas.length > 0) {
      return { allowed: true, isDoctor: true, isAdmin: false };
    }

    // c) ¿Tiene consultas registradas con este paciente?
    const { data: hc } = await supabase
      .from("historia_clinica")
      .select("id")
      .eq("paciente_id", pacienteId)
      .maybeSingle();

    if (hc) {
      const { data: notas } = await supabase
        .from("nota_clinica")
        .select("id")
        .eq("historia_clinica_id", hc.id);

      const notaIds = (notas || []).map((n) => n.id);
      if (notaIds.length > 0) {
        const { data: consultas } = await supabase
          .from("consultas")
          .select("id")
          .in("nota_clinica_id", notaIds)
          .eq("doctor_id", user.id)
          .limit(1);

        if (consultas && consultas.length > 0) {
          return { allowed: true, isDoctor: true, isAdmin: false };
        }
      }
    }
  }

  return {
    allowed: false,
    isDoctor,
    isAdmin: false,
    error: "No tienes permiso para acceder al chat de este paciente. Solo el médico tratante o administradores pueden acceder."
  };
}

export async function getChatInfoAction(pacienteId: string, page: number = 0, limit: number = 20) {
  const perm = await checkChatPermissions(pacienteId);
  if (!perm.allowed) {
    return {
      allowed: false,
      error: perm.error || "No tienes permiso para acceder a este chat",
      paciente: null,
      messages: [],
    };
  }

  const supabase = await createClient();

  // Marcar mensajes como leídos si estamos cargando la primera página
  if (page === 0) {
    await supabase.from("messages")
      .update({ is_read: true })
      .eq("paciente_id", pacienteId)
      .eq("direction", "inbound")
      .eq("is_read", false);
  }

  const { data: paciente, error: pacError } = await supabase
    .from("pacientes")
    .select("nombre, apellido, telegram_chat_id, telegram_link_code, chat_activated_at")
    .eq("id", pacienteId)
    .single();

  if (pacError || !paciente) {
    console.error("Error fetching paciente chat info:", pacError);
    return null;
  }

  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select(`
      id, telegram_message_id, content, direction, file_url, file_type, file_name, file_size, is_read, sent_at, created_at,
      created_by,
      usuarios:created_by (
        personal:personal (nombre, apellido)
      )
    `)
    .eq("paciente_id", pacienteId)
    .order("sent_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (msgError) {
    console.error("Error fetching messages:", msgError);
  }

  const sortedMessages = (messages || []).reverse();

  return {
    allowed: true,
    paciente,
    messages: sortedMessages.map((m: any) => ({
      ...m,
      doctor_nombre: m.usuarios?.personal?.length > 0 
        ? `${m.usuarios.personal[0].nombre} ${m.usuarios.personal[0].apellido}`
        : null
    }))
  };
}

export async function generateChatLinkAction(pacienteId: string) {
  const perm = await checkChatPermissions(pacienteId);
  if (!perm.allowed) {
    return { error: perm.error || "No tienes permiso para generar código de enlace para este paciente" };
  }

  const supabase = await createClient();
  const code = uuidv4();

  const { error } = await supabase
    .from("pacientes")
    .update({ telegram_link_code: code })
    .eq("id", pacienteId);

  if (error) {
    console.error("Error generating link code:", error);
    return { error: "No se pudo generar el código de invitación" };
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true, code };
}

export async function sendMessageAction(pacienteId: string, text?: string, fileUrl?: string, fileName?: string, fileType?: string, fileSize?: number, presignedUrl?: string) {
  const perm = await checkChatPermissions(pacienteId);
  if (!perm.allowed) {
    return { error: perm.error || "No tienes permiso para enviar mensajes a este paciente" };
  }

  const supabase = await createClient();

  // 1. Get paciente info for telegram_chat_id
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("telegram_chat_id")
    .eq("id", pacienteId)
    .single();

  if (!paciente || !paciente.telegram_chat_id) {
    return { error: "El paciente no tiene activado el chat de Telegram" };
  }

  const telegramApi = process.env.TELEGRAM_API;
  if (!telegramApi) return { error: "Falta configuración TELEGRAM_API" };

  let telegramMessageId = null;

  try {
    // 2. Send to Telegram
    if (fileUrl && presignedUrl) {
      const endpoint = fileType?.startsWith("image/") ? "sendPhoto" : "sendDocument";
      const payload: any = {
        chat_id: paciente.telegram_chat_id,
        caption: text || ""
      };
      
      if (endpoint === "sendPhoto") {
        payload.photo = presignedUrl;
      } else {
        payload.document = presignedUrl;
      }

      const res = await fetch(`${telegramApi}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!data.ok) throw new Error(data.description || "Error sending file to Telegram");
      telegramMessageId = data.result.message_id;
    } else if (text) {
      const res = await fetch(`${telegramApi}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: paciente.telegram_chat_id,
          text: text
        })
      });
      
      const data = await res.json();
      if (!data.ok) throw new Error(data.description || "Error sending text to Telegram");
      telegramMessageId = data.result.message_id;
    }
  } catch (error: any) {
    console.error("Telegram API Error:", error);
    return { error: `No se pudo enviar a Telegram: ${error.message}` };
  }

  // 3. Save to messages table
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const { data: insertedData, error: insertError } = await supabase
    .from("messages")
    .insert({
      paciente_id: pacienteId,
      created_by: userId,
      telegram_message_id: telegramMessageId,
      content: text || null,
      direction: "outbound",
      file_url: fileUrl || null,
      file_type: fileType || null,
      file_name: fileName || null,
      file_size: fileSize || null,
      is_read: false,
      sent_at: new Date().toISOString()
    })
    .select(`
      id, telegram_message_id, content, direction, file_url, file_type, file_name, file_size, is_read, sent_at, created_at,
      created_by,
      usuarios:created_by (
        personal:personal (nombre, apellido)
      )
    `)
    .single();

  if (insertError) {
    console.error("Error inserting message:", insertError);
    return { error: "Error guardando el mensaje en la base de datos" };
  }

  const usuarioRaw: any = Array.isArray(insertedData.usuarios) ? insertedData.usuarios[0] : insertedData.usuarios;
  const personalRaw: any = Array.isArray(usuarioRaw?.personal) ? usuarioRaw.personal[0] : usuarioRaw?.personal;

  const newMessage = {
    ...insertedData,
    doctor_nombre: personalRaw ? `${personalRaw.nombre} ${personalRaw.apellido}` : null,
  };

  return { success: true, message: newMessage };
}

export async function uploadChatAttachmentAction(formData: FormData) {
  const pacienteId = formData.get("pacienteId") as string;
  if (!pacienteId) return { error: "Faltan datos" };

  const perm = await checkChatPermissions(pacienteId);
  if (!perm.allowed) {
    return { error: perm.error || "No tienes permiso para subir archivos en este chat" };
  }

  const file = formData.get("file") as File;
  if (!file) return { error: "Falta el archivo" };

  const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const objectKey = `messages/${pacienteId}/outbound/${fileName}`;
  
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type || "application/octet-stream",
    });

    await r2Client.send(command);
    
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
    });
    const presignedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 3600 });
    
    const fileUrl = `${process.env.R2_PUBLIC_CUSTOM_DOMAIN}/${objectKey}`;
    return { success: true, url: fileUrl, presignedUrl };
  } catch (error: any) {
    console.error("Error subiendo a R2:", error);
    return { error: "No se pudo subir el archivo a R2" };
  }
}
