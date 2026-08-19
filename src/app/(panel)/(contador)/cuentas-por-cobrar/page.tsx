import { getCuentasPorCobrarAction } from "../contador.actions";
import CuentasPorCobrarClient from "./ClientView";

export default async function CuentasPorCobrarPage() {
  const data = await getCuentasPorCobrarAction();
  return <CuentasPorCobrarClient initialData={data} />;
}
