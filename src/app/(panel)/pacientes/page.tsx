import { Topbar } from "@/components/layout/Topbar";
import { PacientesView } from "./components/PacientesView";

export default async function PacientesPage() {
  return (
    <>
      <Topbar title="Pacientes" />
      <div className="flex-1 overflow-y-auto">
        <PacientesView />
      </div>
    </>
  );
}
