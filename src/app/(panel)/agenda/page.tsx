import { Header } from "@/components/layout/Header";
import { AgendaView } from "./components/AgendaView";

export default async function AgendaPage() {
  return (
    <>
      <Header title="Calendario de Citas" />
      <div className="flex-1 overflow-hidden flex flex-col">
        <AgendaView />
      </div>
    </>
  );
}
