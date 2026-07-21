import { Header } from "@/components/layout/Header";
import { PacientesView } from "./components/PacientesView";

export default async function PacientesPage() {
  return (
    <>
      <Header title="Pacientes" />
      <div className="flex-1 overflow-y-auto">
        <PacientesView />
      </div>
    </>
  );
}
