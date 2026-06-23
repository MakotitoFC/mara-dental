import { notFound } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { Icon } from "@/components/ui/Icon";
import { HistoriaView } from "./components/HistoriaView";
import { getDetallePacienteAction, getHistorialConsultasAction } from "./actions";

export default async function PacienteDetallePage({params,}: {params: Promise<{ id: string }>;}) {
  const { id } = await params;
  const [detalle, historial] = await Promise.all([
    getDetallePacienteAction(id),
    getHistorialConsultasAction(id),
  ]);
  if (!detalle) notFound();

  return (
    <>
      <Topbar title="Pacientes" />
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
