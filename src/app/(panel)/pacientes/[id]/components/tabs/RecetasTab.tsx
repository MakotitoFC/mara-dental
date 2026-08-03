"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { RecetaSkeleton } from "@/components/ui/ConsultaSkeletons";
import { RecetaSection, PrescriptionRow, RecetaDetailModal, handlePrint, handleDownloadPdf, buildTelegramLink, type DocData } from "../consulta/RecetaSection";
import { getRecetasPacienteAction, getSedeInfoAction } from "../../consulta.actions";
import type { ClinicaInfo } from "@/lib/reportExport";

function Notice({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
      <Icon name="info" size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
      <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

/** Historial de recetas del paciente, con el mismo diseño de renglón que la vista activa — usado cuando no hay una consulta activa. */
function RecetasHistorial({ recetas, pacienteNombre, telefono, dni }: { recetas: any[]; pacienteNombre: string; telefono: string; dni: string }) {
  const [sede, setSede] = useState<ClinicaInfo | null>(null);
  const [viewing, setViewing] = useState<DocData | null>(null);
  useEffect(() => { getSedeInfoAction().then(setSede).catch(() => {}); }, []);

  if (recetas.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 py-10 text-center text-slate-400 dark:text-slate-500">
        <Icon name="medication" size={28} className="opacity-30 mx-auto mb-2" />
        <p className="text-[12px]">Sin recetas registradas aún</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {recetas.flatMap((r) =>
        r.medicamentos.map((m: any) => {
          const docData: DocData = { pacienteNombre, doctorNombre: r.doctor_nombre, fecha: r.fecha_emision, diagnostico: r.diagnostico_texto, medicamentos: r.medicamentos };
          return (
            <PrescriptionRow
              key={m.id}
              medicamento={m}
              estado={r.estado}
              fechaEmision={r.fecha_emision}
              doctorNombre={r.doctor_nombre}
              onView={() => setViewing(docData)}
              onDownload={() => handleDownloadPdf(docData, sede)}
              onPrint={() => handlePrint(docData)}
              onSend={() => window.open(buildTelegramLink(docData), "_blank")}
            />
          );
        }),
      )}
      <AnimatePresence>
        {viewing && <RecetaDetailModal data={viewing} dni={dni} onClose={() => setViewing(null)} />}
      </AnimatePresence>
    </div>
  );
}

export function RecetasTab({ paciente, consultaId, data, loading, refetch }: {
  paciente: any;
  consultaId?: string | null;
  data: any;
  loading: boolean;
  refetch: () => void;
}) {
  const pacienteId = String(paciente.id);

  const [historialPaciente, setHistorialPaciente] = useState<any[] | null>(null);
  const fetchHistorialPaciente = useCallback(async () => {
    const list = await getRecetasPacienteAction(String(pacienteId));
    setHistorialPaciente(list);
  }, [pacienteId]);

  useEffect(() => {
    if (!consultaId) fetchHistorialPaciente();
  }, [consultaId, fetchHistorialPaciente]);

  if (!consultaId) {
    if (historialPaciente === null) return <RecetaSkeleton />;
    return (
      <div className="flex flex-col gap-4">
        <Notice text="Estás viendo el historial completo del paciente. Inicia una consulta desde Timeline para emitir una nueva receta." />
        <RecetasHistorial recetas={historialPaciente} pacienteNombre={paciente.nombre_completo} telefono={paciente.telefono ?? ""} dni={paciente.dni ?? ""} />
      </div>
    );
  }

  if (loading || !data) return <RecetaSkeleton />;

  const diagnostico = data.diagnostico;

  if (!diagnostico) {
    return (
      <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
        <Icon name="info" size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400">Registra primero el diagnóstico de esta consulta para poder emitir una receta.</p>
      </div>
    );
  }

  return (
    <RecetaSection
      diagnosticoId={diagnostico.id}
      pacienteId={String(pacienteId)}
      initial={data.recetas ?? []}
      pacienteNombre={paciente.nombre_completo}
      telefono={paciente.telefono ?? ""}
      dni={paciente.dni ?? ""}
      doctorNombre={data.consulta?.doctor_nombre ?? "Doctor"}
      diagnosticoTexto={diagnostico.diagnostico_texto ?? ""}
      onSaved={refetch}
    />
  );
}
