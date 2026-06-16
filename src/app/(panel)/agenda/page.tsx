import { Topbar } from "@/components/layout/Topbar";
import { AgendaView } from "./components/AgendaView";

export default async function AgendaPage() {
  return (
    <>
      <Topbar title="Calendario de Citas" />
      <div className="flex-1 overflow-hidden flex flex-col">
        <AgendaView />
      </div>
    </>
  );
}
