export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { getConsultaDetalleAction, getPlanTrabajoAction, getTratamientosAction, getRecetaAction } from "./actions";
import { Icon } from "@/components/ui/Icon";
import { DiagnosticoForm } from "./components/DiagnosticoForm";
import { DiagnosticoCard } from "./components/DiagnosticoCard";
import { PlanTrabajoSection } from "./components/PlanTrabajoSection";
import { TratamientoSection } from "./components/TratamientoSection";
import { RecetaSection } from "./components/RecetaSection";
import { RecomendacionesSection } from "./components/RecomendacionesSection";

export default async function ConsultaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detalle = await getConsultaDetalleAction(id);

  if (!detalle) notFound();

  const { consulta, paciente, diagnostico } = detalle;

  const planTrabajo = diagnostico ? await getPlanTrabajoAction(diagnostico.id) : [];
  const tratamientos = diagnostico ? await getTratamientosAction(diagnostico.id) : [];
  const receta = diagnostico ? await getRecetaAction(diagnostico.id) : null;

  return (
    <>
      <Topbar
        breadcrumbs={[
          { label: "Pacientes", href: "/pacientes" },
          { label: paciente.nombre_completo, href: `/pacientes/${paciente.id}` },
          { label: "Consulta" },
        ]}
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 md:p-6 bg-slate-50/50">

        {/* Header del paciente */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-[20px] sm:text-[24px] font-bold text-slate-900 leading-tight">
            {paciente.nombre_completo}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[12px] sm:text-[13px] text-slate-500">
            <span className="flex items-center gap-1">
              <Icon name="badge" size={13} className="shrink-0" />
              {paciente.dni}
            </span>
            <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300 shrink-0" />
            <span className="flex items-center gap-1">
              <Icon name="calendar_today" size={13} className="shrink-0" />
              {new Date(consulta.fecha).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300 shrink-0" />
            <span className="flex items-center gap-1">
              <Icon name="person" size={13} className="shrink-0" />
              {consulta.doctor_nombre}
            </span>
          </div>
        </div>

        {/* Columnas principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* Anamnesis */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600 shrink-0">
                  <Icon name="medical_services" size={18} />
                </div>
                <h2 className="text-[14px] font-semibold text-slate-800">Anamnesis</h2>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Motivo de consulta</p>
                  <p className="text-[13px] text-slate-800 font-medium">{consulta.motivo}</p>
                </div>

                {consulta.observaciones && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Observaciones</p>
                    <p className="text-[13px] text-slate-700 leading-relaxed">{consulta.observaciones}</p>
                  </div>
                )}

                {Object.keys(consulta.examen_fisico).filter(k => k !== "tipo").length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Examen físico / Signos</p>
                    <div className="flex flex-col gap-2">
                      {Object.entries(consulta.examen_fisico).map(([k, v]) => {
                        if (k === "tipo") return null;
                        return (
                          <div key={k} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            <span className="text-[12px] font-medium text-slate-600">{k}</span>
                            <span className="text-[12px] font-semibold text-slate-800">{v as string}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Diagnóstico + secciones definitivas */}
          <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-5">
            {diagnostico ? (
              <>
                <DiagnosticoCard diagnostico={diagnostico} consultaId={Number(consulta.id)} />

                <PlanTrabajoSection
                  diagnosticoId={diagnostico.id}
                  consultaId={Number(consulta.id)}
                  initial={planTrabajo as any}
                  enabled={diagnostico.es_definitivo}
                />
                <TratamientoSection
                  diagnosticoId={diagnostico.id}
                  consultaId={Number(consulta.id)}
                  initial={tratamientos as any}
                  enabled={diagnostico.es_definitivo}
                />
                <RecetaSection
                  diagnosticoId={diagnostico.id}
                  consultaId={Number(consulta.id)}
                  initial={receta as any}
                  enabled={diagnostico.es_definitivo}
                />
                <RecomendacionesSection
                  consultaId={Number(consulta.id)}
                  enabled={diagnostico.es_definitivo}
                />
              </>
            ) : (
              <DiagnosticoForm consultaId={Number(consulta.id)} hcId={consulta.hc_id} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
