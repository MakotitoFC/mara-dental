"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Icon } from "@/components/ui/Icon";
import { MovimientosCajaView } from "./components/MovimientosCajaView";
import CajaTurnosClient from "./ClientView";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface CajaPageClientProps {
  turnosData: any[];
}

export default function CajaPageClient({ turnosData }: CajaPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"movimientos" | "turnos">(
    tabParam === "turnos" ? "turnos" : "movimientos"
  );

  useEffect(() => {
    if (tabParam === "turnos") {
      setActiveTab("turnos");
    } else if (tabParam === "movimientos" || !tabParam) {
      setActiveTab("movimientos");
    }
  }, [tabParam]);

  const handleTabChange = (tab: "movimientos" | "turnos") => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "movimientos") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  return (
    <>
      <Header title={activeTab === "movimientos" ? "Movimientos de Caja" : "Turnos de Caja"} />
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50 overflow-y-auto">
        {/* Banner Superior con Pestañas */}
        <header className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto w-full">
            <div className="min-w-0">
              <h1 className="text-[16px] md:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Icon name="wallet" size={20} className="text-cyan-600 shrink-0" />
                <span>Control de Caja</span>
              </h1>
              <p className="text-[12px] md:text-[13px] text-slate-500 mt-0.5">
                {activeTab === "movimientos"
                  ? "Auditoría en tiempo real de ingresos, egresos y movimientos de tu sede."
                  : "Historial de aperturas, cierres y arqueo de turnos de caja."}
              </p>
            </div>

            {/* Selector de pestañas */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl self-start sm:self-auto border border-slate-200/70 shadow-2xs">
              <button
                type="button"
                onClick={() => handleTabChange("movimientos")}
                className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-[12.5px] sm:text-[13px] font-semibold transition-all cursor-pointer ${
                  activeTab === "movimientos"
                    ? "bg-white text-cyan-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon
                  name="receipt_long"
                  size={17}
                  className={activeTab === "movimientos" ? "text-cyan-600" : "text-slate-400"}
                />
                <span>Movimientos</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("turnos")}
                className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-[12.5px] sm:text-[13px] font-semibold transition-all cursor-pointer ${
                  activeTab === "turnos"
                    ? "bg-white text-cyan-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon
                  name="history"
                  size={17}
                  className={activeTab === "turnos" ? "text-cyan-600" : "text-slate-400"}
                />
                <span>Turnos de Caja</span>
              </button>
            </div>
          </div>
        </header>

        {/* Contenedor del contenido */}
        <div className="flex-1 min-h-0 flex flex-col">
          {activeTab === "movimientos" ? (
            <MovimientosCajaView />
          ) : (
            <CajaTurnosClient initialData={turnosData} hideHeader />
          )}
        </div>
      </div>
    </>
  );
}
