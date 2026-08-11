import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardView } from "./components/DashboardView";
import { DashboardAsistenteView } from "./components/DashboardAsistenteView";
import { getDashboardDataAction, getDashboardAsistenteDataAction } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let rol = "";
  if (user) {
    const { data: usr } = await supabase.from("usuarios").select("rol ( rol )").eq("id", user.id).single();
    rol = (usr?.rol as any)?.rol ?? "";
  }

  if (rol === "admin" || rol === "superadmin") {
    redirect("/admin/dashboard");
  }

  if (rol === "asistente") {
    const data = await getDashboardAsistenteDataAction();
    return (
      <>
        <Header />
        <DashboardAsistenteView
          data={
            data ?? {
              fechaHoy: "", citasHoy: [], statsCitasHoy: 0, statsProgramadas: 0, statsCanceladas: 0,
              statsHuecosLibres: 0, disponibilidad: [], alertas: [], cumpleañosHoy: [],
            }
          }
        />
      </>
    );
  }

  const data = await getDashboardDataAction();

  return (
    <>
      <Header />
      <DashboardView
        data={
          data ?? { citas: [], cumpleañosHoy: [], statsCitasHoy: 0, statsCompletas: 0, statsPendientes: 0, statsPacientesMes: 0, recordatoriosPendientes: 0 }
        }
      />
    </>
  );
}
