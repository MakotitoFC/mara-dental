import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  try {
    // Si la URL es de nuestro bucket privado R2 y NO está ya firmada, generamos un presigned URL y redirigimos
    if (
      process.env.R2_PUBLIC_CUSTOM_DOMAIN && 
      url.startsWith(process.env.R2_PUBLIC_CUSTOM_DOMAIN) && 
      !url.includes("X-Amz-Signature")
    ) {
      const objectKey = url.replace(`${process.env.R2_PUBLIC_CUSTOM_DOMAIN}/`, "");
      const searchParams = req.nextUrl.searchParams;
      const explicitType = searchParams.get("type");
      
      let responseContentType: string | undefined = explicitType || undefined;
      if (!responseContentType) {
        if (objectKey.endsWith(".ogg") || objectKey.endsWith(".oga")) responseContentType = "audio/ogg";
        else if (objectKey.endsWith(".mp3")) responseContentType = "audio/mpeg";
        else if (objectKey.endsWith(".wav")) responseContentType = "audio/wav";
      }

      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: objectKey,
        ...(responseContentType ? { ResponseContentType: responseContentType } : {}),
      });
      const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

      // Si es audio, proxyear la petición para mantener los headers Range y evitar problemas de redirección 302
      if (responseContentType && responseContentType.startsWith("audio/")) {
        const fetchHeaders = new Headers();
        if (req.headers.has("range")) {
          fetchHeaders.set("range", req.headers.get("range")!);
        }
        
        const proxyRes = await fetch(presignedUrl, { headers: fetchHeaders });
        const resHeaders = new Headers();
        proxyRes.headers.forEach((value, key) => {
          resHeaders.set(key, value);
        });
        resHeaders.set("Access-Control-Allow-Origin", "*");
        
        return new NextResponse(proxyRes.body, {
          status: proxyRes.status,
          statusText: proxyRes.statusText,
          headers: resHeaders
        });
      }

      return NextResponse.redirect(presignedUrl, {
        status: 302,
        headers: {
          "Cache-Control": "public, max-age=3000, s-maxage=3000",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

    // Para cualquier otra URL externa, actuamos como un proxy normal
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return new NextResponse("Failed to fetch image", { status: res.status });

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
