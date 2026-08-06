"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function getPlantillasAction() {
  const supabase = await createClient();

  const { data: plantillas, error } = await supabase
    .from("plantilla")
    .select(`
      *,
      usuarios!plantilla_subido_por_fkey (
        personal ( nombre, apellido )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching plantillas:", error);
    return [];
  }

  // Firmar URLs con R2
  const result = await Promise.all(
    (plantillas || []).map(async (p: any) => {
      let displayUrl = p.url;
      let downloadUrl = p.url;
      if (p.url && !p.url.startsWith("http")) {
        try {
          const commandDisplay = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: p.url,
          });
          displayUrl = await getSignedUrl(r2Client, commandDisplay, { expiresIn: 60 * 60 });

          const commandDownload = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: p.url,
            ResponseContentDisposition: `attachment; filename="${p.nombre_archivo}"`,
          });
          downloadUrl = await getSignedUrl(r2Client, commandDownload, { expiresIn: 60 * 60 });
        } catch (err) {
          console.error("Error signing URL with R2:", err);
        }
      }
      return {
        ...p,
        displayUrl,
        downloadUrl,
        subido_por_nombre: p.usuarios?.personal 
          ? `${p.usuarios.personal.nombre} ${p.usuarios.personal.apellido}`
          : "Desconocido",
      };
    })
  );

  return result;
}

export async function uploadPlantillaAction(formData: FormData) {
  const supabase = await createClient();
  const file = formData.get("file") as File;
  const descripcion = formData.get("descripcion") as string;
  const anotaciones = formData.get("anotaciones") as string;
  const isGlobal = formData.get("isGlobal") === "true"; // Si es true, sede_id = null

  if (!file) throw new Error("No se proporcionó archivo");

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Usuario no autenticado");

  // Validar si el usuario es admin/superadmin (aunque RLS lo protege, es buena práctica)
  const { data: userProfile } = await supabase
    .from("usuarios")
    .select("sede_id, rol(rol)")
    .eq("id", user.id)
    .single();

  const rolName = userProfile?.rol?.rol;
  if (rolName !== "admin" && rolName !== "superadmin") {
    throw new Error("No tienes permisos para subir plantillas");
  }

  // Subir archivo al bucket de R2
  const fileExt = file.name.split('.').pop();
  const filePath = `plantillas/${crypto.randomUUID()}.${fileExt}`;
  
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filePath,
      Body: buffer,
      ContentType: file.type,
    }));
  } catch (uploadError) {
    console.error("Error uploading to R2:", uploadError);
    throw new Error("Error al subir archivo a R2");
  }

  // Determinar sede_id
  let targetSedeId = null;
  if (!isGlobal) {
    targetSedeId = userProfile.sede_id; // Se sube a la sede del admin
  }

  // Insertar en BD
  const categoria = (file.type === "application/pdf" || file.name.endsWith(".pdf")) ? "pdf" : "image";

  const { error: insertError } = await supabase
    .from("plantilla")
    .insert({
      nombre_archivo: file.name,
      url: filePath,
      categoria,
      descripcion,
      anotaciones_extras: anotaciones,
      sede_id: targetSedeId,
      subido_por: user.id
    });

  if (insertError) {
    // Intentar borrar archivo subido si falló inserción
    try {
      await r2Client.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: filePath,
      }));
    } catch (e) {
      console.error("Error deleting from R2 after DB insert fail:", e);
    }
    throw insertError;
  }

  revalidatePath("/plantillas");
}

export async function deletePlantillaAction(id: number, urlPath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  // Eliminar de Storage R2
  if (urlPath && !urlPath.startsWith("http")) {
    try {
      await r2Client.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: urlPath,
      }));
    } catch (storageError) {
      console.error("Error borrando archivo de R2:", storageError);
    }
  }

  // Eliminar registro
  const { error: dbError } = await supabase
    .from("plantilla")
    .delete()
    .eq("id", id);

  if (dbError) throw dbError;

  revalidatePath("/plantillas");
}
