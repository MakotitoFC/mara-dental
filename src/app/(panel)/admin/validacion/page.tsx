import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { getPeticionesPendientesSedeAction } from "../../pagos/cuotas.actions";
import { ValidacionView } from "./components/ValidacionView";

export default async function ValidacionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let rol = "";
  if (user) {
    const { data: usr } = await supabase.from("usuarios").select("rol ( rol )").eq("id", user.id).single();
    rol = (usr?.rol as any)?.rol ?? "";
  }

  // Only admin or superadmin can see validation page
  if (rol !== "admin" && rol !== "superadmin") {
    redirect("/dashboard");
  }

  const peticiones = await getPeticionesPendientesSedeAction();

  return (
    <>
      <Header title="Validación y Permisos" />
 <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 bg-slate-50">
        <ValidacionView initialPeticiones={peticiones} />
      </div>
    </>
  );
}
