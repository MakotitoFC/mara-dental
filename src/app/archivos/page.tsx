import { DashboardShell } from "@/components/layout/DashboardShell";
import { Topbar } from "@/components/layout/Topbar";
import { ArchivosView } from "./components/ArchivosView";

export default function ArchivosPage() {
  return (
    <DashboardShell>
      <Topbar title="Archivos Clínicos" />
      <div className="flex-1 overflow-y-auto">
        <ArchivosView />
      </div>
    </DashboardShell>
  );
}
