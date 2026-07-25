import { Header } from "@/components/layout/Header";
import { PacientesView } from "./components/PacientesView";
import { getDoctorPacientesAction } from "./actions";

export default async function PacientesPage() {
  const pacientes = await getDoctorPacientesAction();
  
  return (
    <>
      <Header title="Pacientes" />
      <div className="flex-1 overflow-y-auto">
        <PacientesView initialData={pacientes} />
      </div>
    </>
  );
}
