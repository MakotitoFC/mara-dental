import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { HistoriaView } from "./components/HistoriaView";
import { getDetallePacienteAction, getHistorialConsultasAction } from "./actions";

export default async function PacienteDetallePage({params,}: {params: Promise<{ id: string }>;}) {
  const { id } = await params;
  const [detalle, historial] = await Promise.all([
    getDetallePacienteAction(id),
    getHistorialConsultasAction(id),
  ]);
  if (!detalle) notFound();

  const nombreCompleto = [detalle.paciente.nombre, detalle.paciente.apellido].filter(Boolean).join(" ") || "Paciente";

  return (
    <>
      <Header breadcrumbs={[{ label: "Pacientes", href: "/pacientes" }, { label: nombreCompleto }]} />
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <HistoriaView
          paciente={detalle.paciente}
          citas={detalle.citas}
          notas={detalle.notas}
          historial={historial}
        />
      </div>
    </>
  );
}
