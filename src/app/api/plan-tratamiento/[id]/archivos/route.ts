import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

async function firmarUrls(supabase: any, archivos: any[]) {
  return Promise.all(
    archivos.map(async (a: any) => {
      let tipo_str = typeof a.tipo_archivo === "object" ? (a.tipo_archivo?.tipo_archivo || "Documento") : (a.tipo_archivo || "Documento");

      if (a.url && !a.url.startsWith("http")) {
        try {
          const { data, error } = await supabase.storage
            .from("archivos_clinicos")
            .createSignedUrl(a.url, 60 * 60);
          
          if (error || !data) throw new Error(error?.message || "Error Supabase storage");
          return { ...a, tipo_archivo: tipo_str, displayUrl: data.signedUrl };
        } catch (e) {
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: a.url,
            });
            const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 60 * 60 });
            return { ...a, tipo_archivo: tipo_str, displayUrl: signedUrl };
          } catch (r2Error) {
            return { ...a, tipo_archivo: tipo_str, displayUrl: a.url };
          }
        }
      }
      return { ...a, tipo_archivo: tipo_str, displayUrl: a.url };
    })
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: archivos, error } = await supabase
      .from("archivos_clinicos")
      .select("id, nombre_archivo, url, tipo_archivo_id, categoria, descripcion, fecha_subida, tam_bytes, plan_tratamiento_id, tipo_archivo(id, tipo_archivo)")
      .eq("plan_tratamiento_id", id)
      .order("fecha_subida", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const firmados = await firmarUrls(supabase, archivos || []);
    return NextResponse.json({ archivos: firmados });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al obtener archivos" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Validar existencia de plan_tratamiento_id
    const { data: plan, error: planErr } = await supabase
      .from("plan_tratamiento")
      .select("id")
      .eq("id", id)
      .single();

    if (planErr || !plan) {
      return NextResponse.json({ error: "El paso de plan de tratamiento especificado no existe." }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("archivo") as File;
    const tipo_archivo_id = formData.get("tipo_archivo_id") as string;
    const descripcion = (formData.get("descripcion") as string) || null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Selecciona un archivo válido" }, { status: 400 });
    }

    const parsedTipoId = tipo_archivo_id ? parseInt(tipo_archivo_id) : 1;
    const ext = file.name.split(".").pop();
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const objectKey = `plan-tratamiento/${id}/${safeName}`;

    // Subir a R2
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      Body: buffer,
      ContentType: file.type,
    });

    await r2Client.send(command);

    const catStr = file.type.startsWith("image/") ? "img" : "pdf";

    // Insertar en archivos_clinicos
    const { data: inserted, error: insertError } = await supabase
      .from("archivos_clinicos")
      .insert({
        nombre_archivo: file.name,
        url: objectKey,
        tipo_archivo_id: isNaN(parsedTipoId) ? 1 : parsedTipoId,
        categoria: catStr,
        descripcion,
        tam_bytes: file.size,
        plan_tratamiento_id: id,
        subido_por: user.id,
        fecha_subida: new Date().toISOString(),
      })
      .select("id, nombre_archivo, url, tipo_archivo_id, categoria, descripcion, fecha_subida, tam_bytes, plan_tratamiento_id, tipo_archivo(id, tipo_archivo)")
      .single();

    if (insertError) {
      console.error("Error al insertar archivo en BD:", insertError);
      return NextResponse.json({ error: `Error en base de datos: ${insertError.message}` }, { status: 500 });
    }

    const [signed] = await firmarUrls(supabase, [inserted]);
    return NextResponse.json({ success: true, archivo: signed });
  } catch (err: any) {
    console.error("Error en POST archivos plan-tratamiento:", err);
    return NextResponse.json({ error: err.message || "Error al subir archivo" }, { status: 500 });
  }
}
