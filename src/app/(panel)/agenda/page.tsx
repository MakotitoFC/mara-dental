import { Header } from "@/components/layout/Header";
import { AgendaView } from "./components/AgendaView";
import { getCitasRealesAction } from "./actions";

export default async function AgendaPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const initialCitas = await getCitasRealesAction();
  
  const preTratamientoId = typeof searchParams.tratamiento_id === 'string' ? searchParams.tratamiento_id : undefined;
  const prePacienteId = typeof searchParams.paciente_id === 'string' ? searchParams.paciente_id : undefined;

  return (
    <>
      <Header title="Calendario de Citas" />
      <div className="flex-1 overflow-hidden flex flex-col">
        <AgendaView initialCitas={initialCitas} preTratamientoId={preTratamientoId} prePacienteId={prePacienteId} />
      </div>
    </>
  );
}
