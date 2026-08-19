import { getCajaTurnosAction } from "../contador.actions";
import CajaTurnosClient from "./ClientView";

export default async function CajaTurnosPage() {
  const data = await getCajaTurnosAction();
  return <CajaTurnosClient initialData={data} />;
}
