import { createClient } from "@/lib/supabase/server";
import { getPlantillasAction } from "./plantillas.actions";
import PlantillasClient from "./PlantillasClient";
import { redirect } from "next/navigation";

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
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-7xl mx-auto">
        <PlantillasClient plantillas={plantillas} userRole={userRole} />
      </div>
    </div>
  );
}
