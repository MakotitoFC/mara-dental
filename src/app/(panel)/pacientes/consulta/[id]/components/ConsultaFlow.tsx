"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { AnamnesisPhase } from "./AnamnesisPhase";
import { ExamenFisicoPhase } from "./ExamenFisicoPhase";
import { OdontogramaTab } from "../../../[id]/components/OdontogramaTab";
import { OdontogramaComparador } from "./OdontogramaComparador";
import { DiagnosticoForm } from "./DiagnosticoForm";
import { DiagnosticoCard } from "./DiagnosticoCard";
import { PlanTrabajoSection } from "./PlanTrabajoSection";
import { TratamientoSection } from "./TratamientoSection";
import { RecetaSection } from "./RecetaSection";
import { RecomendacionesSection } from "./RecomendacionesSection";
import { PresupuestoPhase } from "./PresupuestoPhase";

type TabKey = "clinica" | "odontograma" | "diagnostico" | "receta" | "presupuesto";

export function ConsultaFlow(props: {
  consulta: any;
  paciente: any;
  diagnostico: any | null;
  planTrabajo: any[];
  tratamientos: any[];
  recetas: any[];
  recomendaciones: any[];
  hasOdontograma: boolean;
  presupuesto: any | null;
  mediosPago: { id: number; nombre: string }[];
}) {
  const {
    consulta, paciente, diagnostico, planTrabajo, tratamientos,
    recetas, recomendaciones, hasOdontograma, presupuesto, mediosPago,
  } = props;

  const consultaId = Number(consulta.id);
  const examenKeys = Object.keys(consulta.examen_fisico || {}).filter(k => k !== "tipo");

  const done = {
    clinica: Boolean(consulta.motivo?.trim()) || examenKeys.length > 0,
    odontograma: hasOdontograma,
    diagnostico: Boolean(diagnostico),
    receta: recetas.length > 0,
    presupuesto: Boolean(presupuesto),
  };

  const TABS: { key: TabKey; label: string; icon: string; opcional?: boolean }[] = [
    { key: "clinica",     label: "Clínica",            icon: "clinical_notes" },
    { key: "odontograma", label: "Odontograma",        icon: "dentistry" },
    { key: "diagnostico", label: "Diagnóstico",        icon: "biotech" },
    { key: "receta",      label: "Receta",             icon: "medication", opcional: true },
    { key: "presupuesto", label: "Presupuesto / Pago", icon: "payments" },
  ];

  const [active, setActive] = useState<TabKey>("clinica");

  const sugeridos = tratamientos.map((t: any) => ({
    catalogo_tratamiento_id: t.catalogo_tratamiento_id,
    nombre: t.nombre,
    precio: Number(t.precio) || 0,
    moneda: t.moneda || "PEN",
  })).filter((s: any) => s.catalogo_tratamiento_id);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Pestañas ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto flex" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
          {TABS.map(t => {
            const on = active === t.key;
            return (
              <button key={t.key} onClick={() => setActive(t.key)}
                className={`relative flex-none flex flex-col items-center gap-1 px-5 py-3 transition-colors border-0 whitespace-nowrap ${
                  on ? "text-cyan-600" : "text-slate-400 hover:text-slate-600"
                }`}>
                {on && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-cyan-500 rounded-t-full" />}
                <div className="relative flex items-center justify-center">
                  <Icon name={t.icon} size={20} />
                  {done[t.key] && !on && (
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                  )}
                </div>
                <span className="text-[10px] font-semibold leading-tight mt-0.5">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div>
        {/* 1 · Clínica: motivo + examen (datos dinámicos de hoy) */}
        {active === "clinica" && (
          <div className="flex flex-col gap-4 sm:gap-5">
            <AnamnesisPhase consultaId={consultaId} motivo={consulta.motivo} observaciones={consulta.observaciones} />
            <ExamenFisicoPhase consultaId={consultaId} examenFisico={consulta.examen_fisico || {}} />
          </div>
        )}

        {/* 2 · Odontograma + comparador histórico */}
        {active === "odontograma" && (
          <div className="flex flex-col gap-4 sm:gap-5">
            <OdontogramaComparador pacienteId={paciente.id} />
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600 shrink-0">
                  <Icon name="dentistry" size={18} />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold text-slate-800">Odontograma actual</h2>
                  <p className="text-[11px] text-slate-400">Pinta los hallazgos por pieza dentaria</p>
                </div>
              </div>
              <div className="p-2 sm:p-4">
                <OdontogramaTab paciente={paciente} />
              </div>
            </div>
          </div>
        )}

        {/* 3 · Diagnóstico unificado: diagnóstico + tratamientos + plan de trabajo */}
        {active === "diagnostico" && (
          <div className="flex flex-col gap-4 sm:gap-5">
            {diagnostico ? (
              <>
                <DiagnosticoCard diagnostico={diagnostico} consultaId={consultaId} />
                <TratamientoSection diagnosticoId={diagnostico.id} consultaId={consultaId} initial={tratamientos as any} enabled />
                <PlanTrabajoSection diagnosticoId={diagnostico.id} consultaId={consultaId} initial={planTrabajo as any} enabled />
              </>
            ) : (
              <DiagnosticoForm consultaId={consultaId} hcId={consulta.hc_id} />
            )}
          </div>
        )}

        {/* 4 · Receta (opcional) */}
        {active === "receta" && (
          <div className="flex flex-col gap-4 sm:gap-5">
            {diagnostico ? (
              <>
                <RecetaSection
                  diagnosticoId={diagnostico.id}
                  consultaId={consultaId}
                  initial={recetas as any}
                  enabled
                  pacienteNombre={paciente.nombre_completo}
                  telefono={paciente.telefono}
                  dni={paciente.dni}
                  doctorNombre={consulta.doctor_nombre}
                  diagnosticoTexto={diagnostico.diagnostico_texto}
                />
                <RecomendacionesSection consultaId={consultaId} initial={recomendaciones as any} enabled />
              </>
            ) : (
              <GateDiagnostico onIr={() => setActive("diagnostico")} />
            )}
          </div>
        )}

        {/* 5 · Presupuesto / Pago (precargado desde tratamientos) */}
        {active === "presupuesto" && (
          <PresupuestoPhase
            consultaId={consultaId}
            pacienteId={paciente.paciente_id_num}
            sugeridos={sugeridos}
            presupuesto={presupuesto}
            mediosPago={mediosPago}
          />
        )}
      </div>
    </div>
  );
}

function GateDiagnostico({ onIr }: { onIr: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-500">
        <Icon name="info" size={24} />
      </div>
      <p className="text-[14px] font-semibold text-slate-800">Primero registra el diagnóstico</p>
      <p className="text-[12px] text-slate-500 max-w-xs">Las recetas dependen de un diagnóstico registrado en esta consulta.</p>
      <button onClick={onIr} className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[12px] font-semibold transition-colors">
        <Icon name="biotech" size={15} /> Ir al diagnóstico
      </button>
    </div>
  );
}
