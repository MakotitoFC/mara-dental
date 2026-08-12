import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_ESTADOS = ["pendiente", "en proceso", "hecho"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { estado } = body;

    if (!estado || !ALLOWED_ESTADOS.includes(estado)) {
      return NextResponse.json({ error: `Estado no válido. Valores permitidos: ${ALLOWED_ESTADOS.join(", ")}` }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    // Intentar actualizar con updated_at
    let updateRes = await supabase
      .from("plan_tratamiento")
      .update({ estado, updated_at: nowIso })
      .eq("id", id);

    if (updateRes.error && updateRes.error.message.includes("updated_at")) {
      // Fallback si la columna updated_at no existe en la BD
      updateRes = await supabase
        .from("plan_tratamiento")
        .update({ estado })
        .eq("id", id);
    }

    if (updateRes.error) {
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, estado });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al actualizar estado" }, { status: 500 });
  }
}
