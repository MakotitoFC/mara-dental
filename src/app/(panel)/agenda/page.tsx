import { Header } from "@/components/layout/Header";
import { AgendaView } from "./components/AgendaView";
import { getCitasRealesAction } from "./actions";

export default async function AgendaPage() {
  const initialCitas = await getCitasRealesAction();
  
  return (
    <>
      <Header title="Calendario de Citas" />
      <div className="flex-1 overflow-hidden flex flex-col">
        <AgendaView initialCitas={initialCitas} />
      </div>
    </>
  );
}
