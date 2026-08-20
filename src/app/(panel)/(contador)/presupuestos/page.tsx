import { getPresupuestosPaginadosAction, getSedesListAction } from "../contador.actions";
import PresupuestosClient from "./ClientView";

export default async function PresupuestosPage() {
  const [initialResult, sedes] = await Promise.all([
    getPresupuestosPaginadosAction({ page: 1, pageSize: 10, filtro: "todos" }),
    getSedesListAction()
  ]);

  return <PresupuestosClient initialResult={initialResult} sedes={sedes} />;
}
