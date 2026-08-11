import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Obtener información del archivo para borrarlo del storage
    const { data: archivo, error: findError } = await supabase
      .from("archivos_clinicos")
      .select("id, url")
      .eq("id", id)
      .single();

    if (findError || !archivo) {
      return NextResponse.json({ error: "El archivo no fue encontrado" }, { status: 404 });
    }

    // Intentar borrar del storage R2 o Supabase
    if (archivo.url) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: archivo.url,
        });
        await r2Client.send(command);
      } catch (storageErr) {
        console.error("Error al borrar del bucket R2:", storageErr);
      }

      try {
        await supabase.storage.from("archivos_clinicos").remove([archivo.url]);
      } catch (sbErr) {
        // Ignorar si no estaba en Supabase
      }
    }

    // Hard delete de la base de datos
    const { error: dbError } = await supabase
      .from("archivos_clinicos")
      .delete()
      .eq("id", id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al eliminar archivo" }, { status: 500 });
  }
}
