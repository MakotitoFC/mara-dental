import { getDashboardContadorAction } from "../contador.actions";
import ContadorDashboardClient from "./ClientView";

export const dynamic = "force-dynamic";

export default async function ContadorDashboardPage() {
  const data = await getDashboardContadorAction();
  return <ContadorDashboardClient initialData={data} />;
}
