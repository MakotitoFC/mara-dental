import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { getPaciente } from "@/lib/mock-pacientes";
import { HistoriaView } from "./components/HistoriaView";

export default async function PacienteDetallePage({params,}: {params: Promise<{ id: string }>;}) {
  const { id } = await params;
  const paciente = getPaciente(id);
  if (!paciente) notFound();

  return (
    <>
      <Topbar title="Historia clínica" />
      <div className="flex-1 overflow-y-auto">
        <HistoriaView paciente={paciente} />
      </div>
    </>
  );
}
