import { Topbar } from "@/components/layout/Topbar";
import { NuevoPacienteForm } from "./components/NuevoPacienteForm";

export default function NuevoPacientePage() {
  return (
    <>
      <Topbar title="Pacientes" />
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <NuevoPacienteForm />
      </div>
    </>
  );
}
