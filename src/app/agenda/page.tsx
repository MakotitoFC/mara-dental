import { DashboardShell } from "@/components/layout/DashboardShell";
import { Topbar } from "@/components/layout/Topbar";
import { AgendaView } from "./components/AgendaView";

export default function AgendaPage() {
  return (
    <DashboardShell>
      <Topbar title="Calendario de Citas" />
      <div className="flex-1 overflow-hidden flex flex-col">
        <AgendaView />
      </div>
    </DashboardShell>
  );
}
