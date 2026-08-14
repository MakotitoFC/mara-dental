import { fetchDashboardData, fetchSelectOptions } from "./actions";
import DashboardCharts from "./DashboardCharts";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Obtenemos el perfil del usuario para conocer su rol y sede
  const { data: profile } = await supabase
    .from("usuarios")
    .select("rol_id, rol(rol), sede_id")
    .eq("id", user.id)
    .single();

  const userRole = (profile?.rol as any)?.rol || "";
  const userSedeId = profile?.sede_id || 0;

  // Defaults según requerimientos (Mes y año actual, Moneda = 1 PEN)
  const d = new Date();
  const defaultFecha = d.toISOString().split("T")[0]; // Hoy
  const defaultFiltro = "mes"; // Por defecto mes
  const defaultAgrupacion = "dia"; // Ver evolución día a día por defecto

  const paramSedeId = params.sedeId ? Number(params.sedeId) : userSedeId;
  const paramMonedaId = params.monedaId ? Number(params.monedaId) : 1;
  const paramMedioPagoId = params.medioPagoId ? Number(params.medioPagoId) : null;
  const paramAgrupacion = (params.agrupacion as string) || defaultAgrupacion;
  const paramFiltro = (params.filtro as string) || defaultFiltro;
  const paramFecha = (params.fecha as string) || defaultFecha;

  // Ejecución paralela de SSR para cargar opciones de filtros y datos del dashboard
  const [options, data] = await Promise.all([
    fetchSelectOptions(),
    fetchDashboardData({
      sedeId: paramSedeId,
      agrupacion: paramAgrupacion,
      filtro: paramFiltro,
      fecha: paramFecha,
      monedaId: paramMonedaId,
      medioPagoId: paramMedioPagoId,
    })
  ]);

  return (
    <>
      <Header title="Dashboard Directivo" />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DashboardCharts
          data={data}
          options={options}
          userRole={userRole}
          userSedeId={userSedeId}
        />
      </div>
    </>
  );
}
