import { DashboardShell } from "@/components/layout/DashboardShell";
import { Topbar } from "@/components/layout/Topbar";
import { PacientesView } from "./components/PacientesView";

export default function PacientesPage() {
  return (
    <DashboardShell>
      <Topbar title="Pacientes" />
      <div className="flex-1 overflow-y-auto">
        <PacientesView />
      </div>
    </DashboardShell>
  );
}
