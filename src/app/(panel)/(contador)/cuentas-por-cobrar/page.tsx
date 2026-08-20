import { redirect } from "next/navigation";

export default function CuentasPorCobrarPage() {
  redirect("/presupuestos?filtro=pendientes");
}
