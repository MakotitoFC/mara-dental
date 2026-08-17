import { Header } from "@/components/layout/Header";
import { NuevoPacienteForm } from "./components/NuevoPacienteForm";

export default function NuevoPacientePage() {
  return (
    <>
      <Header title="Pacientes" />
      <div className="flex-1 overflow-y-auto no-scrollbar overflow-x-hidden">
        <NuevoPacienteForm />
      </div>
    </>
  );
}
