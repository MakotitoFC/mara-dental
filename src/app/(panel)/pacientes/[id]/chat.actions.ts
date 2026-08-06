"use server";

import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";

export async function getChatInfoAction(pacienteId: string, page: number = 0, limit: number = 20) {
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
    .select("telegram_chat_id, telegram_link_code, chat_activated_at")
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

  // Invertir para que los más antiguos queden arriba
  const sortedMessages = (messages || []).reverse();

  return {
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
      // It's a file
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
      // It's just text
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
      is_read: false, // The patient hasn't read it yet
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

  const newMessage = {
    ...insertedData,
    doctor_nombre: insertedData.usuarios?.personal?.length > 0 
      ? `${insertedData.usuarios.personal[0].nombre} ${insertedData.usuarios.personal[0].apellido}`
      : null
  };

  return { success: true, message: newMessage };
}

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function uploadChatAttachmentAction(formData: FormData) {
  const supabase = await createClient();
  const file = formData.get("file") as File;
  const pacienteId = formData.get("pacienteId") as string;
  
  if (!file || !pacienteId) return { error: "Faltan datos" };

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
    
    // Generate a presigned URL valid for 1 hour for Telegram to download
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
