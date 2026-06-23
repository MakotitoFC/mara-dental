export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { Icon } from "@/components/ui/Icon";
import {
  getConsultaDetalleAction,
  getPlanTrabajoAction,
  getTratamientosAction,
  getRecetasAction,
  getRecomendacionesConsultaAction,
  getPresupuestoActivoAction,
  getMediosPagoAction,
} from "./actions";
import { getOdontogramasAction } from "../../[id]/odontograma.actions";
import { ConsultaFlow } from "./components/ConsultaFlow";

export default async function ConsultaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detalle = await getConsultaDetalleAction(id);

  if (!detalle) notFound();

  const { consulta, paciente, diagnostico } = detalle;

  const [planTrabajo, tratamientos, recetas, recomendaciones, odontogramas, presupuesto, mediosPago] = await Promise.all([
    diagnostico ? getPlanTrabajoAction(diagnostico.id) : Promise.resolve([]),
    diagnostico ? getTratamientosAction(diagnostico.id) : Promise.resolve([]),
    diagnostico ? getRecetasAction(diagnostico.id) : Promise.resolve([]),
    getRecomendacionesConsultaAction(Number(id)),
    getOdontogramasAction(paciente.id),
    getPresupuestoActivoAction(paciente.paciente_id_num),
    getMediosPagoAction(),
  ]);

  const hasOdontograma = (odontogramas as any[]).some((o: any) => (o.findings?.length ?? 0) > 0);

  return (
    <>
      <Topbar
        breadcrumbs={[
          { label: "Calendario", href: "/agenda" },
          { label: "Pacientes", href: "/pacientes" },
          { label: paciente.nombre_completo, href: `/pacientes/${paciente.id}` },
          { label: "Consulta" },
        ]}
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 md:p-6 bg-slate-50/50">

        {/* Header del paciente */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-[17px] sm:text-[22px] font-bold text-slate-900 leading-tight">
            {paciente.nombre_completo}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[13px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Icon name="badge" size={14} className="shrink-0" />
              {paciente.dni}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
            <span className="flex items-center gap-1.5">
              <Icon name="calendar_today" size={14} className="shrink-0" />
              <span suppressHydrationWarning>{new Date(consulta.fecha).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
            <span className="flex items-center gap-1.5">
              <Icon name="person" size={14} className="shrink-0" />
              {consulta.doctor_nombre}
            </span>
            {consulta.cita_estado === "hecha" && (
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <Icon name="verified" size={14} className="shrink-0" /> Cita finalizada
              </span>
            )}
          </div>
        </div>

        <ConsultaFlow
          consulta={consulta}
          paciente={paciente}
          diagnostico={diagnostico}
          planTrabajo={planTrabajo as any}
          tratamientos={tratamientos as any}
          recetas={recetas as any}
          recomendaciones={recomendaciones as any}
          hasOdontograma={hasOdontograma}
          presupuesto={presupuesto as any}
          mediosPago={mediosPago as any}
        />
      </div>
    </>
  );
}
