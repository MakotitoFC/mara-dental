import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { HistoriaView } from "./components/HistoriaView";
import { getDetallePacienteAction } from "./actions";

export default async function PacienteDetallePage({params,}: {params: Promise<{ id: string }>;}) {
  const { id } = await params;
  const detalle = await getDetallePacienteAction(id);
  if (!detalle) notFound();

  return (
    <>
      <Topbar title="Historia clínica" />
      <div className="flex-1 overflow-y-auto">
        <HistoriaView 
          paciente={detalle.paciente} 
          citas={detalle.citas} 
          notas={detalle.notas} 
        />
      </div>
    </>
  );
}
