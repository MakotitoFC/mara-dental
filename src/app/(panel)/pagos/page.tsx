import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { getPagosDashboardSedeAction } from "./actions";
import { getMediosPagoAction, getSedeInfoAction } from "../pacientes/[id]/consulta.actions";
import { checkCajaAbiertaAction, getCategoriasIngresoAction, getCategoriasEgresoAction, getTiposMonedaAction } from "./caja.actions";
import { PagosView } from "./components/PagosView";
import { CajaManager } from "./components/CajaManager";

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

  const [dashboard, mediosPago, sede, estadoCaja, categoriasIn, categoriasEg, monedas] = await Promise.all([
    getPagosDashboardSedeAction(),
    getMediosPagoAction(),
    getSedeInfoAction(),
    checkCajaAbiertaAction(),
    getCategoriasIngresoAction(),
    getCategoriasEgresoAction(),
    getTiposMonedaAction(),
  ]);

  return (
    <>
      <Header title="Pagos" />
      <div className="flex-1 overflow-hidden flex flex-col">
        {!estadoCaja.caja ? (
          <CajaManager mediosPago={mediosPago} />
        ) : (
          <PagosView
            initialDashboard={dashboard}
            mediosPago={mediosPago}
            categoriasIngreso={categoriasIn}
            categoriasEgreso={categoriasEg}
            tiposMoneda={monedas}
            sede={sede}
            cajaAbiertaId={estadoCaja.caja.id}
          />
        )}
      </div>
    </>
  );
}
