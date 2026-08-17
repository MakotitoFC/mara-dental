import { Header } from "@/components/layout/Header";
import { PacientesView } from "./components/PacientesView";
import { getDoctorPacientesAction } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PacientesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: usr } = await supabase.from("usuarios").select("rol ( rol )").eq("id", user.id).single();
    const rol = (usr?.rol as any)?.rol ?? "";
    if (rol === "admin" || rol === "superadmin") redirect("/admin/dashboard");
  }

  const pacientes = await getDoctorPacientesAction();

  return (
    <>
      <Header title="Pacientes" />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <PacientesView initialData={pacientes} />
      </div>
    </>
  );
}
