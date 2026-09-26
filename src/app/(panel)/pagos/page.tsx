import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { getPagosDashboardSedeAction } from "./actions";
import { getMediosPagoAction, getSedeInfoAction } from "../pacientes/[id]/consulta.actions";
import {
  checkCajaAbiertaAction,
  getCategoriasIngresoAction,
  getCategoriasEgresoAction,
  getTiposMonedaAction,
  getUltimoCierreCajaAction,
  getAjustesAperturaPendientesAction,
} from "./caja.actions";
import { PagosView } from "./components/PagosView";
import { CajaManager } from "./components/CajaManager";
import { AjusteAperturaObligatorio } from "./components/AjusteAperturaObligatorio";
import { Suspense } from "react";

async function PagosDataLoader() {
  const [mediosPago, sede, estadoCaja, categoriasIn, categoriasEg, monedas] = await Promise.all([
    getMediosPagoAction(),
    getSedeInfoAction(),
    checkCajaAbiertaAction(),
    getCategoriasIngresoAction(),
    getCategoriasEgresoAction(),
    getTiposMonedaAction(),
  ]);

  if (!estadoCaja.caja) {
    const cierreAnterior = await getUltimoCierreCajaAction();
    return <CajaManager mediosPago={mediosPago} initialCierreAnterior={cierreAnterior} />;
  }

  // Verificar si hay ajustes de apertura obligatorios pendientes
  const infoAjustes = await getAjustesAperturaPendientesAction(estadoCaja.caja.id);
  if (infoAjustes.ajustes.length > 0) {
    return (
      <AjusteAperturaObligatorio
        cajaId={estadoCaja.caja.id}
        ajustesPendientes={infoAjustes.ajustes}
        fechaCierreAnterior={infoAjustes.fecha_cierre_anterior}
        fechaAperturaActual={infoAjustes.fecha_apertura_actual}
        categoriasIngreso={categoriasIn}
        categoriasEgreso={categoriasEg}
        monedas={monedas}
      />
    );
  }

  const dashboard = await getPagosDashboardSedeAction(estadoCaja.caja.id);

  return (
    <PagosView
      initialDashboard={dashboard}
      mediosPago={mediosPago}
      categoriasIngreso={categoriasIn}
      categoriasEgreso={categoriasEg}
      tiposMoneda={monedas}
      sede={sede}
      cajaAbiertaId={estadoCaja.caja.id}
    />
  );
}

function LoaderSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-6 w-full h-full animate-pulse">
 <div className="h-8 bg-slate-200 rounded-lg w-1/4"></div>
      <div className="flex gap-6 h-full">
 <div className="flex-1 bg-slate-200 rounded-2xl h-[600px]"></div>
 <div className="w-[300px] bg-slate-200 rounded-2xl h-[600px]"></div>
      </div>
    </div>
  );
}

export default async function PagosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let rol = "";
  if (user) {
    const { data: usr } = await supabase.from("usuarios").select("rol ( rol )").eq("id", user.id).single();
    rol = (usr?.rol as any)?.rol ?? "";
  }

  if (rol !== "asistente" && rol !== "doctor_admin") {
    redirect("/dashboard");
  }

  return (
    <>
      <Header title="Pagos" />
      <div className="flex-1 overflow-hidden flex flex-col">
        <Suspense fallback={<LoaderSkeleton />}>
          <PagosDataLoader />
        </Suspense>
      </div>
    </>
  );
}
