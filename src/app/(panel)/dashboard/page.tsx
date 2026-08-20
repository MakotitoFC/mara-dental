import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardView } from "./components/DashboardView";
import { DashboardAsistenteView } from "./components/DashboardAsistenteView";
import { getDashboardDataAction, getDashboardAsistenteDataAction } from "./actions";
import { Suspense } from "react";

async function DashboardAsistenteLoader() {
  const data = await getDashboardAsistenteDataAction();
  return (
    <DashboardAsistenteView
      data={
        data ?? {
          fechaHoy: "", citasHoy: [], statsCitasHoy: 0, statsProgramadas: 0, statsCanceladas: 0,
          statsHuecosLibres: 0, disponibilidad: [], alertas: [], cumpleañosHoy: [],
        }
      }
    />
  );
}

async function DashboardAdminLoader() {
  const data = await getDashboardDataAction();
  return (
    <DashboardView
      data={
        data ?? { citas: [], cumpleañosHoy: [], statsCitasHoy: 0, statsCompletas: 0, statsPendientes: 0, statsPacientesMes: 0, recordatoriosPendientes: 0 }
      }
    />
  );
}

function LoaderSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-6 w-full h-full animate-pulse">
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
      </div>
      <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
    </div>
  );
}

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

  return (
    <>
      <Header />
      <Suspense fallback={<LoaderSkeleton />}>
        {rol === "asistente" ? <DashboardAsistenteLoader /> : <DashboardAdminLoader />}
      </Suspense>
    </>
  );
}
