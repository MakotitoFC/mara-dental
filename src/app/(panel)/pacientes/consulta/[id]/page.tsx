import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { getConsultaDetalleAction } from "./actions";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";
import { DiagnosticoForm } from "./components/DiagnosticoForm";

export default async function ConsultaDetallePage({params}: {params: Promise<{ id: string }>}) {
  const { id } = await params;
  const detalle = await getConsultaDetalleAction(id);
  
  if (!detalle) notFound();

  const { consulta, paciente, diagnostico } = detalle;

  return (
    <>
      <Topbar title="Detalle de Consulta" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
        
        {/* Navigation / Header */}
        <div className="max-w-4xl mx-auto">
          <Link href={`/pacientes/${paciente.id}`} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-cyan-600 transition-colors mb-4">
            <Icon name="arrow_back" size={14} />
            Volver a la ficha del paciente
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{paciente.nombre_completo}</h1>
              <div className="flex items-center gap-3 mt-1.5 text-[13px] text-slate-500">
                <span className="flex items-center gap-1"><Icon name="badge_id" size={14} /> DNI: {paciente.dni}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1"><Icon name="calendar_today" size={14} /> {new Date(consulta.fecha).toLocaleDateString()}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1"><Icon name="person" size={14} /> {consulta.doctor_nombre}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Columna Izquierda: Anamnesis (Solo lectura) */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
                    <Icon name="medical_services" size={18} />
                  </div>
                  <h2 className="font-semibold text-slate-800">Anamnesis</h2>
                </div>

                <div className="space-y-4">
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

                  {Object.keys(consulta.examen_fisico).filter(k => k !== 'tipo').length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Examen Físico / Signos</p>
                      <div className="flex flex-col gap-2">
                        {Object.entries(consulta.examen_fisico).map(([k, v]) => {
                          if (k === 'tipo') return null;
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

            {/* Columna Derecha: Diagnóstico y Acciones */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {diagnostico ? (
                // Vista de lectura si ya existe diagnóstico
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Icon name="check_circle" size={18} />
                      </div>
                      <h2 className="font-semibold text-slate-800">Diagnóstico Establecido</h2>
                    </div>
                    {diagnostico.es_definitivo ? (
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wide">Definitivo</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide">Presuntivo</span>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-[14px] text-slate-800 font-medium">{diagnostico.diagnostico_texto}</p>
                    
                    {diagnostico.cie10 && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[11px] font-bold text-slate-500">{diagnostico.cie10.codigo}</span>
                        <span className="text-[12px] text-slate-700">{diagnostico.cie10.descripcion}</span>
                      </div>
                    )}

                    {diagnostico.archivos.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Archivos Adjuntos</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {diagnostico.archivos.map((a: any) => (
                            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0">
                                <Icon name={a.tipo_archivo === "pdf" ? "description" : "image"} size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-slate-800 truncate">{a.nombre_archivo}</p>
                                <p className="text-[10px] text-slate-500">{a.categoria}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Future modules placeholder */}
                  <div className="mt-8 p-6 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-50/50">
                    <Icon name="construction" size={32} className="text-slate-300 mb-3" />
                    <p className="text-[14px] font-semibold text-slate-700 mb-1">Módulos siguientes</p>
                    <p className="text-[12px] text-slate-500 max-w-sm">El Plan de trabajo, Tratamientos, Recetas y Recomendaciones se habilitarán pronto.</p>
                  </div>
                </div>
              ) : (
                // Formulario de creación
                <DiagnosticoForm consultaId={Number(consulta.id)} hcId={consulta.hc_id} />
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
