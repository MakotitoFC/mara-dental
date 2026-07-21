import { Header } from "@/components/layout/Header";
import { DashboardView } from "./components/DashboardView";
import { getDashboardDataAction } from "./actions";

export default async function DashboardPage() {
  const data = await getDashboardDataAction();

  return (
    <>
      <Header />
      <DashboardView
        data={
          data ?? { citas: [], cumpleañosHoy: [], statsCitasHoy: 0, statsCompletas: 0, statsPendientes: 0, recordatoriosPendientes: 0 }
        }
      />
    </>
  );
}
