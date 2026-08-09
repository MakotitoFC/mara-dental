import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { AgendaView } from "./components/AgendaView";
import { getCitasRealesAction, getCitasSedeAction, getDoctoresSedeAction } from "./actions";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let rol = "";
  if (user) {
    const { data: usr } = await supabase.from("usuarios").select("rol ( rol )").eq("id", user.id).single();
    rol = (usr?.rol as any)?.rol ?? "";
  }
  
  const isAsistente = rol === "asistente";

  const preTratamientoId = typeof resolvedSearchParams.tratamiento_id === 'string' ? resolvedSearchParams.tratamiento_id : undefined;
  const prePacienteId = typeof resolvedSearchParams.paciente_id === 'string' ? resolvedSearchParams.paciente_id : undefined;

  const [initialCitas, doctores] = await Promise.all([
    isAsistente ? getCitasSedeAction() : getCitasRealesAction(),
    isAsistente ? getDoctoresSedeAction() : Promise.resolve([]),
  ]);

  return (
    <>
      <Header title="Calendario de Citas" />
      <div className="flex-1 overflow-hidden flex flex-col">
        <AgendaView initialCitas={initialCitas} preTratamientoId={preTratamientoId} prePacienteId={prePacienteId} role={rol} doctores={doctores} />
      </div>
    </>
  );
}
