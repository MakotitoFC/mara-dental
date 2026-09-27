// src/app/(panel)/offline-shell/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";

// Importación de los componentes REALES de Fase 1
import { DashboardView } from "../dashboard/components/DashboardView";
import { AgendaView } from "../agenda/components/AgendaView";
import { PacientesView } from "../pacientes/components/PacientesView";
import { HistoriaView } from "../pacientes/[id]/components/HistoriaView";
import PresupuestosClient from "../(contador)/presupuestos/ClientView";
import { PagosView } from "../pagos/components/PagosView";
import CajaPageClient from "../(contador)/caja/CajaPageClient";

import {
  getAgendaData,
  getPacientesData,
  getPacienteDetailData,
  getPresupuestosData,
  getPagosData,
  getCajaData,
  getDashboardData,
} from "@/lib/offline/data-access";

export default function OfflineShellPage() {
  const [pathname, setPathname] = useState<string>("/dashboard");
  const [loading, setLoading] = useState(true);
  const [viewData, setViewData] = useState<any>(null);

  useEffect(() => {
    const currentPath = window.location.pathname;
    setPathname(currentPath);

    async function loadDataForRoute() {
      setLoading(true);
      try {
        if (currentPath.startsWith("/agenda")) {
          const res = await getAgendaData();
          setViewData(res);
        } else if (currentPath.startsWith("/pacientes/")) {
          const id = currentPath.split("/")[2];
          const res = await getPacienteDetailData(id);
          setViewData(res);
        } else if (currentPath.startsWith("/pacientes")) {
          const res = await getPacientesData();
          setViewData(res);
        } else if (currentPath.startsWith("/presupuestos") || currentPath.startsWith("/cuentas-por-cobrar")) {
          const filtro = currentPath.startsWith("/cuentas-por-cobrar") ? "pendientes" : "todos";
          const res = await getPresupuestosData(filtro);
          setViewData(res);
        } else if (currentPath.startsWith("/pagos")) {
          const res = await getPagosData();
          setViewData(res);
        } else if (currentPath.startsWith("/caja")) {
          const res = await getCajaData();
          setViewData(res);
        } else {
          // Default: Dashboard
          const res = await getDashboardData();
          setViewData(res);
        }
      } catch (err) {
        console.error("[OfflineShell] Error cargando datos de ruta offline:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDataForRoute();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-cyan-600 animate-spin" />
          <p className="text-[13px] text-slate-500 font-medium">Cargando datos locales...</p>
        </div>
      </div>
    );
  }

  // 1. Ruta /agenda
  if (pathname.startsWith("/agenda")) {
    return (
      <>
        <Header title="Calendario de Citas" />
        <div className="flex-1 overflow-hidden flex flex-col">
          <AgendaView
            initialCitas={viewData?.citas || []}
            doctores={viewData?.doctores || []}
            role="doctor_admin"
          />
        </div>
      </>
    );
  }

  // 2. Ruta /pacientes/[id]
  if (pathname.startsWith("/pacientes/")) {
    if (!viewData) {
      return (
        <>
          <Header
            breadcrumbs={[
              { label: "Pacientes", href: "/pacientes" },
              { label: "Ficha médica" },
            ]}
          />
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
            <div className="max-w-md w-full p-6 bg-white rounded-2xl border border-slate-200 shadow-xs text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Icon name="cloud_off" size={24} />
              </div>
              <h3 className="text-[15px] font-bold text-slate-900">
                Ficha no disponible sin conexión
              </h3>
              <p className="text-[12.5px] text-slate-500 leading-relaxed">
                Esta historia clínica no fue abierta previamente con conexión a internet. Conéctate a internet para sincronizar la ficha completa de este paciente.
              </p>
            </div>
          </div>
        </>
      );
    }

    const { detalle, historial, datosCasos } = viewData;
    const nombreCompleto = [detalle?.paciente?.nombre, detalle?.paciente?.apellido]
      .filter(Boolean)
      .join(" ") || "Paciente";

    return (
      <>
        <Header
          breadcrumbs={[
            { label: "Pacientes", href: "/pacientes" },
            { label: nombreCompleto },
          ]}
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          <HistoriaView
            paciente={detalle?.paciente}
            citas={detalle?.citas || []}
            notas={detalle?.notas || []}
            historial={historial || []}
            datosCasos={datosCasos || []}
          />
        </div>
      </>
    );
  }

  // 3. Ruta /pacientes
  if (pathname.startsWith("/pacientes")) {
    return (
      <>
        <Header title="Pacientes" />
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <PacientesView initialData={viewData?.pacientes || []} />
        </div>
      </>
    );
  }

  // 4. Ruta /presupuestos y /cuentas-por-cobrar
  if (pathname.startsWith("/presupuestos") || pathname.startsWith("/cuentas-por-cobrar")) {
    return <PresupuestosClient initialResult={viewData} sedes={[]} />;
  }

  // 5. Ruta /pagos
  if (pathname.startsWith("/pagos")) {
    return (
      <>
        <Header title="Caja y Pagos" />
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <PagosView
            initialDashboard={viewData?.dashboard}
            mediosPago={viewData?.mediosPago || []}
            categoriasIngreso={viewData?.categoriasIngreso || []}
            categoriasEgreso={viewData?.categoriasEgreso || []}
            tiposMoneda={viewData?.tiposMoneda || []}
            sede={viewData?.sede || null}
            cajaAbiertaId={viewData?.cajaAbiertaId || "caja-offline"}
          />
        </div>
      </>
    );
  }

  // 6. Ruta /caja
  if (pathname.startsWith("/caja")) {
    return <CajaPageClient turnosData={viewData?.turnosData || []} />;
  }

  // 7. Ruta por defecto: /dashboard
  return (
    <>
      <Header />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <DashboardView data={viewData} />
      </div>
    </>
  );
}
