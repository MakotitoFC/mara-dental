import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AgendaView } from "./components/AgendaView";
import { getCitasRealesAction, getCitasSedeAction, getDoctoresSedeAction } from "./actions";
import { Suspense } from "react";

async function AgendaDataLoader({ isAsistente, preTratamientoId, prePacienteId, rol }: { isAsistente: boolean, preTratamientoId?: string, prePacienteId?: string, rol: string }) {
  const [initialCitas, doctores] = await Promise.all([
    isAsistente ? getCitasSedeAction() : getCitasRealesAction(),
    isAsistente ? getDoctoresSedeAction() : Promise.resolve([]),
  ]);

  return <AgendaView initialCitas={initialCitas} preTratamientoId={preTratamientoId} prePacienteId={prePacienteId} role={rol} doctores={doctores} />;
}

function LoaderSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-6 w-full h-full animate-pulse">
 <div className="h-10 bg-slate-200 rounded-lg w-full mb-4"></div>
 <div className="h-full bg-slate-200 rounded-2xl w-full flex-1"></div>
    </div>
  );
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let rol = "";
  if (user) {
    const { data: usr } = await supabase.from("usuarios").select("rol ( rol )").eq("id", user.id).single();
    rol = (usr?.rol as any)?.rol ?? "";
  }

  if (rol === "admin" || rol === "superadmin") redirect("/admin/dashboard");

  const isAsistente = rol === "asistente";

  const preTratamientoId = typeof resolvedSearchParams.tratamiento_id === 'string' ? resolvedSearchParams.tratamiento_id : undefined;
  const prePacienteId = typeof resolvedSearchParams.paciente_id === 'string' ? resolvedSearchParams.paciente_id : undefined;

  return (
    <>
      <Header title="Calendario de Citas" />
      <div className="flex-1 overflow-hidden flex flex-col">
        <Suspense fallback={<LoaderSkeleton />}>
          <AgendaDataLoader isAsistente={isAsistente} preTratamientoId={preTratamientoId} prePacienteId={prePacienteId} rol={rol} />
        </Suspense>
      </div>
    </>
  );
}
