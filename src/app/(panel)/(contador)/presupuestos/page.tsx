import { getPresupuestosAction } from "../contador.actions";
import PresupuestosClient from "./ClientView";

export default async function PresupuestosPage() {
  const data = await getPresupuestosAction();
  return <PresupuestosClient initialData={data} />;
}
