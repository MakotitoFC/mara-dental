import { Suspense } from "react";
import { getCajaTurnosAction } from "../contador.actions";
import CajaPageClient from "./CajaPageClient";

export default async function CajaPage() {
  const data = await getCajaTurnosAction();

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-cyan-600 animate-spin" />
            <p className="text-[13px] text-slate-500 font-medium">Cargando control de caja...</p>
          </div>
        </div>
      }
    >
      <CajaPageClient turnosData={data} />
    </Suspense>
  );
}
