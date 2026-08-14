import { createClient } from "@/lib/supabase/server";
import { getPlantillasAction } from "./plantillas.actions";
import PlantillasClient from "./PlantillasClient";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";

export default async function PlantillasPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Obtener rol del usuario para permisos en UI
  const { data: profile } = await supabase
    .from("usuarios")
    .select("rol(rol)")
    .eq("id", user.id)
    .single();

  const rolRaw = profile?.rol as any;
  const rol = Array.isArray(rolRaw) ? rolRaw[0] : rolRaw;
  const userRole = rol?.rol || "doctor"; // Fallback a doctor por defecto (el más restrictivo)

  // Obtener datos (RLS filtrará las plantillas a nivel de BD, 
  // pero nosotros podemos aplicar lógica de capa de acceso si quisieramos)
  const plantillas = await getPlantillasAction();

  return (
    <>
      <Header title="Plantillas" />
      <PlantillasClient plantillas={plantillas} userRole={userRole} />
    </>
  );
}
