import { NextResponse } from "next/server";
import { getAlertasAction } from "@/components/layout/alertas.actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAlertasAction();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[API /api/alertas] Error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
