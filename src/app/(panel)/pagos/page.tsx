import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { getPagosDashboardSedeAction } from "./actions";
import { getMediosPagoAction, getSedeInfoAction } from "../pacientes/[id]/consulta.actions";
import { PagosView } from "./components/PagosView";

export default async function PagosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let rol = "";
  if (user) {
    const { data: usr } = await supabase.from("usuarios").select("rol ( rol )").eq("id", user.id).single();
    rol = (usr?.rol as any)?.rol ?? "";
  }

  if (rol !== "asistente") {
    redirect("/dashboard");
  }

  const [dashboard, mediosPago, sede] = await Promise.all([
    getPagosDashboardSedeAction(),
    getMediosPagoAction(),
    getSedeInfoAction(),
  ]);

  return (
    <>
      <Header title="Pagos" />
      <div className="flex-1 overflow-hidden flex flex-col">
        <PagosView
          initialDashboard={dashboard}
          mediosPago={mediosPago}
          sede={sede}
        />
      </div>
    </>
  );
}
