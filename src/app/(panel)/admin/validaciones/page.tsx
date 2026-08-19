import { Header } from "@/components/layout/Header";
import { getValidacionesPendientesAction } from "@/app/(panel)/validaciones/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ValidacionesView } from "./components/ValidacionesView";

export default async function ValidacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usr } = await supabase.from("usuarios").select("rol (rol), sede_id").eq("id", user.id).single();
  const rol = (usr?.rol as any)?.rol;
  const sedeId = usr?.sede_id;

  if (rol !== "admin" && rol !== "superadmin") {
    redirect("/dashboard");
  }

  const validaciones = sedeId ? await getValidacionesPendientesAction(sedeId) : [];

  return (
    <>
      <Header />
      <ValidacionesView validaciones={validaciones as any[]} sedeId={sedeId} />
    </>
  );
}
